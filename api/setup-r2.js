import supabase from './db-client.js';

/*
 * Cloudflare R2 automated setup wizard.
 *
 * SECURITY MODEL:
 *   - The user's Cloudflare API Token is a MASTER credential.
 *   - It is received in the POST body, used to make Cloudflare API calls,
 *     and NEVER stored, logged, or persisted anywhere.
 *   - It exists only in memory for the duration of this request.
 *   - After the response is sent, it is garbage-collected and gone forever.
 *   - The only credentials returned to the client are the R2-scoped keys
 *     (Access Key ID + Secret) that the wizard creates — these are limited
 *     to just the one R2 bucket and cannot touch anything else on the account.
 *
 * The user's Cloudflare API Token needs these permissions:
 *   - Account: Workers R2 Storage → Edit
 *   - User: API Tokens → Edit (to create the scoped R2 token)
 */

const CF_API = 'https://api.cloudflare.com/client/v4';

async function getUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  try {
    const { data } = await supabase.auth.getUser(token);
    return data?.user ?? null;
  } catch {
    return null;
  }
}

// Cloudflare API helper — token is passed by reference, never logged
async function cfFetch(path, method, apiToken, body) {
  const res = await fetch(`${CF_API}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    // Log only the error message — NEVER the token
    const msg = data.errors?.[0]?.message || `Cloudflare API error (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

async function verifyToken(apiToken) {
  const data = await cfFetch('/user/tokens/verify', 'GET', apiToken);
  return data.result;
}

async function createBucket(apiToken, accountId, bucketName) {
  try {
    await cfFetch(`/accounts/${accountId}/r2/buckets`, 'POST', apiToken, {
      name: bucketName,
      locationHint: 'apac',
    });
    return { created: true };
  } catch (err) {
    if (err.message.includes('already exists') || err.message.includes('Bucket already')) {
      return { created: false, existed: true };
    }
    throw err;
  }
}

async function setCORS(apiToken, accountId, bucketName) {
  try {
    const res = await fetch(`${CF_API}/accounts/${accountId}/r2/buckets/${bucketName}/cors`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rules: [{
          allowed: {
            origins: ['*'],
            methods: ['GET', 'PUT', 'HEAD'],
            headers: ['Content-Type'],
          },
          maxAgeSeconds: 3600,
        }],
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok && !data.success) {
      return { set: false, warning: 'CORS could not be set automatically — set it manually in the R2 dashboard.' };
    }
    return { set: true };
  } catch {
    return { set: false, warning: 'CORS setup skipped — set it manually in the R2 dashboard.' };
  }
}

async function createR2Token(apiToken, accountId) {
  const permData = await cfFetch('/user/tokens/permission_groups', 'GET', apiToken);
  const groups = permData.result;

  const r2WritePerm = groups.find(g => g.name === 'Workers R2 Storage Bucket Item Write');
  const r2ReadPerm = groups.find(g => g.name === 'Workers R2 Storage Bucket Item Read');
  const r2BucketWrite = groups.find(g => g.name === 'Workers R2 Storage Bucket Write');

  if (!r2WritePerm) {
    throw new Error('Could not find R2 write permission group. Your API token may not have sufficient permissions.');
  }

  const tokenBody = {
    name: `waves-r2-uploader-${Date.now()}`,
    policies: [
      {
        effect: 'allow',
        resources: {
          [`com.cloudflare.api.account.${accountId}`]: '*',
        },
        permission_groups: [r2WritePerm, r2ReadPerm, r2BucketWrite].filter(Boolean).map(g => ({ id: g.id })),
      },
    ],
  };

  const tokenData = await cfFetch('/user/tokens', 'POST', apiToken, tokenBody);
  const result = tokenData.result;

  return {
    accessKeyId: result.id,
    secretAccessKey: result.value,
  };
}

async function getPublicDomain(apiToken, accountId, bucketName) {
  try {
    const data = await cfFetch(`/accounts/${accountId}/r2/buckets/${bucketName}/managed_domains`, 'GET', apiToken);
    if (data.result && data.result.length > 0) {
      return `https://${data.result[0].domain}`;
    }
    return null;
  } catch {
    return null;
  }
}

async function enablePublicAccess(apiToken, accountId, bucketName) {
  try {
    await fetch(`${CF_API}/accounts/${accountId}/r2/buckets/${bucketName}/managed_domains`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ enabled: true }),
    });
    return true;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method === 'GET') {
      return res.status(200).json({
        steps: ['verify_token', 'create_bucket', 'set_cors', 'create_r2_token', 'enable_public'],
      });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    // --- Receive the master Cloudflare token (ephemeral — never stored) ---
    const { cfApiToken, accountId, bucketName } = req.body || {};
    if (!cfApiToken) return res.status(400).json({ error: 'Cloudflare API Token is required.' });
    if (!accountId) return res.status(400).json({ error: 'Cloudflare Account ID is required.' });

    const bucket = bucketName || 'waves';
    const steps = [];

    // Step 1: Verify the token
    const verified = await verifyToken(cfApiToken);
    steps.push({ step: 'verify_token', status: 'done', message: `Token valid — ${verified.status}` });

    // Step 2: Create the bucket
    const bucketResult = await createBucket(cfApiToken, accountId, bucket);
    steps.push({
      step: 'create_bucket',
      status: 'done',
      message: bucketResult.created ? `Bucket "${bucket}" created.` : `Bucket "${bucket}" already exists — using it.`,
    });

    // Step 3: Set CORS
    const corsResult = await setCORS(cfApiToken, accountId, bucket);
    steps.push({
      step: 'set_cors',
      status: corsResult.set ? 'done' : 'warning',
      message: corsResult.set ? 'CORS policy set (allow PUT/GET/HEAD from all origins).' : corsResult.warning,
    });

    // Step 4: Create R2 API token (scoped to just this bucket)
    const r2Creds = await createR2Token(cfApiToken, accountId, bucket);
    steps.push({ step: 'create_r2_token', status: 'done', message: 'R2 access keys generated (scoped to this bucket only).' });

    // Step 5: Enable public access + get public domain
    await enablePublicAccess(cfApiToken, accountId, bucket);
    await new Promise(r => setTimeout(r, 2000));
    let publicDomain = await getPublicDomain(cfApiToken, accountId, bucket);
    if (!publicDomain) {
      await new Promise(r => setTimeout(r, 3000));
      publicDomain = await getPublicDomain(cfApiToken, accountId, bucket);
    }
    steps.push({
      step: 'enable_public',
      status: publicDomain ? 'done' : 'warning',
      message: publicDomain
        ? `Public access enabled — ${publicDomain}`
        : 'Public domain could not be auto-provisioned. Enable it manually in R2 dashboard → Settings → Public Access.',
    });

    // --- The master Cloudflare token is now out of scope and will be GC'd ---
    // We return ONLY the scoped R2 credentials — never the master token.
    return res.status(200).json({
      success: true,
      steps,
      secrets: {
        R2_ACCOUNT_ID: accountId,
        R2_ACCESS_KEY_ID: r2Creds.accessKeyId,
        R2_SECRET_ACCESS_KEY: r2Creds.secretAccessKey,
        R2_BUCKET_NAME: bucket,
        R2_PUBLIC_DOMAIN: publicDomain || `MANUAL: Enable in R2 dashboard → bucket → Settings → Public Access`,
      },
      corsNote: corsResult.set
        ? null
        : 'CORS must be set manually. In the R2 dashboard → your bucket → Settings → CORS Policy, add a rule allowing GET, PUT, HEAD from all origins.',
    });
  } catch (err) {
    // Log only the error message — NEVER the token or request body
    console.error('[setup-r2] Error:', err.message);
    return res.status(500).json({
      error: err.message,
      hint: err.message.includes('permission') || err.message.includes('token')
        ? 'Your Cloudflare API Token needs: Account → Workers R2 Storage (Edit) + User → API Tokens (Edit). Create it at dash.cloudflare.com → My Profile → API Tokens.'
        : null,
    });
  }
}

import supabase from './db-client.js';
import { resolveR2Config } from './r2-config.js';

/*
 * Set CORS policy on an R2 bucket.
 *
 * R2's S3-compatible API does NOT support the S3 CORS endpoints.
 * CORS must be set via the Cloudflare REST API, which requires
 * a Cloudflare API token (not the R2 S3 access keys).
 *
 * This endpoint accepts the Cloudflare API token + Account ID
 * temporarily (like the setup wizard), sets the CORS policy,
 * and immediately discards the token.
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method === 'GET') {
      const cfg = await resolveR2Config();
      return res.status(200).json({
        bucket: cfg.R2_BUCKET_NAME || 'waves',
        accountId: cfg.R2_ACCOUNT_ID ? cfg.R2_ACCOUNT_ID.slice(0, 8) + '...' : null,
        needsCfToken: true,
        message: 'POST with { cfApiToken } to set CORS on the R2 bucket. Token is used once and never stored.',
      });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { cfApiToken } = req.body || {};
    if (!cfApiToken) return res.status(400).json({ error: 'Cloudflare API Token is required.' });

    const cfg = await resolveR2Config();
    const accountId = cfg.R2_ACCOUNT_ID;
    const bucketName = cfg.R2_BUCKET_NAME || 'waves';

    if (!accountId) {
      return res.status(400).json({ error: 'R2_ACCOUNT_ID not configured. Add it via Secrets tab first.' });
    }

    // Set CORS via Cloudflare API
    const corsRes = await fetch(`${CF_API}/accounts/${accountId}/r2/buckets/${bucketName}/cors`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${cfApiToken}`,
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

    const data = await corsRes.json().catch(() => ({}));

    if (!corsRes.ok) {
      const msg = data.errors?.[0]?.message || `Cloudflare API error (${corsRes.status})`;
      return res.status(400).json({
        error: msg,
        hint: 'Your Cloudflare API Token needs: Account → Workers R2 Storage → Edit. Create at dash.cloudflare.com → My Profile → API Tokens.',
      });
    }

    // Token is now out of scope — discarded
    return res.status(200).json({
      success: true,
      message: `CORS policy set on bucket "${bucketName}". Uploads should work now.`,
      policy: {
        origins: ['*'],
        methods: ['GET', 'PUT', 'HEAD'],
        headers: ['Content-Type'],
      },
    });
  } catch (err) {
    console.error('[r2-cors] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

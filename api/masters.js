import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import supabase from './db-client.js';
import { resolveR2Config } from './r2-config.js';

/* Signed 1-hour download links for private vault files (WAV masters, stems).
   All files live on Cloudflare R2. */

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { path } = req.query || {};
    if (!path) return res.status(400).json({ error: 'path is required' });

    const cfg = await resolveR2Config();
    if (!cfg.R2_ACCOUNT_ID || !cfg.R2_ACCESS_KEY_ID || !cfg.R2_SECRET_ACCESS_KEY) {
      return res.status(503).json({
        error: 'Cloudflare R2 is not connected. Use the Auto-Setup R2 wizard in the Admin Console.',
      });
    }

    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${cfg.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: cfg.R2_ACCESS_KEY_ID,
        secretAccessKey: cfg.R2_SECRET_ACCESS_KEY,
      },
    });

    const bucketName = cfg.R2_BUCKET_NAME || 'waves';
    const key = path.replace(/^r2:/, '');

    const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    return res.status(200).json({ url, key, backend: 'r2' });
  } catch (err) {
    console.error('masters API error:', err);
    res.status(500).json({ error: err.message });
  }
}

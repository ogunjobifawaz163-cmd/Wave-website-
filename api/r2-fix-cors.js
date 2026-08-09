import supabase from './db-client.js';
import { resolveR2Config } from './r2-config.js';
import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';

/*
 * One-time CORS fix via S3 API.
 * Uses the existing R2 credentials (no Cloudflare API token needed).
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const cfg = await resolveR2Config();

    if (!cfg.R2_ACCOUNT_ID || !cfg.R2_ACCESS_KEY_ID || !cfg.R2_SECRET_ACCESS_KEY) {
      return res.status(400).json({ error: 'R2 credentials not configured.' });
    }

    const bucketName = cfg.R2_BUCKET_NAME || 'waves';

    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${cfg.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: cfg.R2_ACCESS_KEY_ID,
        secretAccessKey: cfg.R2_SECRET_ACCESS_KEY,
      },
    });

    // Set CORS via S3 PutBucketCors API
    const corsConfig = {
      CORSRules: [{
        AllowedHeaders: ['Content-Type', 'Authorization'],
        AllowedMethods: ['GET', 'PUT', 'HEAD'],
        AllowedOrigins: ['*'],
        MaxAgeSeconds: 3600,
      }],
    };

    try {
      await s3.send(new PutBucketCorsCommand({
        Bucket: bucketName,
        CORSConfiguration: corsConfig,
      }));

      return res.status(200).json({
        success: true,
        message: `CORS policy set on bucket "${bucketName}" via S3 API. Uploads should work now.`,
        policy: corsConfig,
      });
    } catch (s3Err) {
      return res.status(400).json({
        success: false,
        error: s3Err.message,
        hint: 'S3 PutBucketCors not supported. Set CORS manually in Cloudflare dashboard, or use the Fix CORS button in Admin.',
      });
    }
  } catch (err) {
    console.error('[r2-fix-cors] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

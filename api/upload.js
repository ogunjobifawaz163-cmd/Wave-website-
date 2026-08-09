import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import supabase from './db-client.js';
import { resolveR2Config } from './r2-config.js';

/*
 * Storage architecture:
 *   - Supabase  -> database + auth ONLY
 *   - Cloudflare R2 -> ALL files (artwork, audio previews, WAV masters, stems)
 *
 * R2 credentials can be configured two ways:
 *   1. Automatically via the R2 Setup Wizard (saved to site_config table)
 *   2. Manually via the Secrets tab (env vars)
 *   Env vars take priority; DB config is the fallback.
 */

const ALLOWED_AUDIO_MIMES = new Set([
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/mp4',
  'audio/aac',
  'audio/flac',
  'audio/ogg',
  'audio/x-m4a',
]);

const AUDIO_EXT_TO_MIME = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/x-m4a',
  aac: 'audio/aac',
  flac: 'audio/flac',
  ogg: 'audio/ogg',
};

const NON_AUDIO_EXT_REGEX = /\.(jpg|jpeg|png|webp|gif|avif|heic|heif|mp4|mov|avi|m4v|mkv|webm|3gp|pdf|doc|docx|txt|zip|tar|gz|rar|exe|html|css|js)$/i;

function resolveAndValidateAudioMime(fileName, contentType) {
  if (!fileName) return null;
  if (NON_AUDIO_EXT_REGEX.test(fileName)) return null;
  if (contentType && (contentType.startsWith('image/') || contentType.startsWith('video/') || contentType.startsWith('application/pdf'))) {
    return null;
  }
  if (contentType && ALLOWED_AUDIO_MIMES.has(contentType.toLowerCase())) {
    return contentType.toLowerCase();
  }
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext && AUDIO_EXT_TO_MIME[ext]) return AUDIO_EXT_TO_MIME[ext];
  return null;
}

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

const R2_SETUP_MESSAGE =
  'Cloudflare R2 is not connected yet. Use the Auto-Setup R2 wizard in the Admin Console, or add R2 credentials in the Secrets tab.';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    // GET — storage status for the dashboard
    if (req.method === 'GET') {
      const cfg = await resolveR2Config();
      const ready = !!(cfg.R2_ACCOUNT_ID && cfg.R2_ACCESS_KEY_ID && cfg.R2_SECRET_ACCESS_KEY);
      return res.status(200).json({
        backend: 'r2',
        ready,
        r2Configured: ready,
        r2PublicDomain: !!cfg.R2_PUBLIC_DOMAIN,
      });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const user = await getUser(req);
    if (!user) {
      console.warn('[upload] Unauthorized request attempt');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Resolve R2 config from env vars first, then database fallback
    const cfg = await resolveR2Config();
    if (!cfg.R2_ACCOUNT_ID || !cfg.R2_ACCESS_KEY_ID || !cfg.R2_SECRET_ACCESS_KEY) {
      console.error('[upload] R2 credentials missing — run the setup wizard or add secrets');
      return res.status(503).json({ error: R2_SETUP_MESSAGE });
    }

    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${cfg.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: cfg.R2_ACCESS_KEY_ID,
        secretAccessKey: cfg.R2_SECRET_ACCESS_KEY,
      },
    });

    const { fileName, contentType, bucket, isAudio } = req.body || {};
    if (!fileName) return res.status(400).json({ error: 'fileName is required' });

    const folder = bucket && ['artwork', 'previews', 'masters'].includes(bucket) ? bucket : 'artwork';
    const isAudioUpload = isAudio || folder === 'previews' || (folder === 'masters' && !fileName.toLowerCase().endsWith('.zip'));

    let finalContentType = contentType || 'application/octet-stream';

    // SERVER-SIDE AUDIO VALIDATION
    if (isAudioUpload) {
      const validatedMime = resolveAndValidateAudioMime(fileName, contentType);
      if (!validatedMime) {
        console.warn(`[upload] REJECTED non-audio file. fileName="${fileName}", contentType="${contentType}"`);
        return res.status(400).json({
          error: 'Invalid file type. Please upload an audio file (MP3, WAV, M4A, AAC, FLAC, or OGG).',
        });
      }
      finalContentType = validatedMime;
    }

    const bucketName = cfg.R2_BUCKET_NAME || 'waves';
    const publicDomain = cfg.R2_PUBLIC_DOMAIN;
    const safeName = String(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectKey = `${folder}/${Date.now()}_${safeName}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
      ContentType: finalContentType,
    });
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

    // Masters are private — access only through signed GET links (api/masters.js).
    // Artwork + previews are public via the R2 public domain.
    const publicUrl =
      folder === 'masters'
        ? null
        : publicDomain
          ? `${publicDomain.replace(/\/$/, '')}/${objectKey}`
          : `https://${bucketName}.${cfg.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${objectKey}`;

    return res.status(200).json({
      backend: 'r2',
      uploadUrl,
      objectKey: `r2:${objectKey}`,
      publicUrl,
      contentType: finalContentType,
      isPrivate: folder === 'masters',
    });
  } catch (err) {
    console.error('[upload] API Error:', err);
    res.status(500).json({ error: err.message });
  }
}

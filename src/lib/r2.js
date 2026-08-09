// Direct-to-Cloudflare-R2 uploads via presigned PUT URLs.
// Supabase handles database + auth; R2 handles ALL files
// (artwork, previews, WAV masters, stems).
//
// Flow:
//   1. POST /api/upload  -> presigned R2 PUT URL (auth required)
//   2. Browser PUTs the file straight to R2 — never through our server

const ALLOWED_AUDIO_EXTS = new Set(['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg']);

export function validateAudioFileFrontend(file) {
  if (!file) return 'Please select an audio file.';
  const ext = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : '';
  const type = file.type?.toLowerCase() || '';

  // Hard-reject anything that identifies as image / video / pdf
  if (type.startsWith('image/') || type.startsWith('video/') || type.startsWith('application/pdf')) {
    return 'Invalid file type. Please upload an audio file (MP3, WAV, M4A, AAC, FLAC, or OGG).';
  }

  // Must positively look like audio: known audio extension OR audio/* MIME type
  const hasAudioExt = !!ext && ALLOWED_AUDIO_EXTS.has(ext);
  const hasAudioMime = type.startsWith('audio/');
  if (!hasAudioExt && !hasAudioMime) {
    return 'Invalid file type. Please upload an audio file (MP3, WAV, M4A, AAC, FLAC, or OGG).';
  }

  return null;
}

export async function getStorageStatus() {
  try {
    const res = await fetch('/api/upload');
    if (!res.ok) return { backend: 'r2', ready: false };
    return await res.json();
  } catch {
    return { backend: 'r2', ready: false };
  }
}

export async function uploadToR2(authed, file, { bucket, isAudio = false, onProgress } = {}) {
  if (!file) throw new Error('No file selected');

  const isAudioBucket = isAudio || bucket === 'previews' || (bucket === 'masters' && !file.name.toLowerCase().endsWith('.zip'));

  if (isAudioBucket) {
    const err = validateAudioFileFrontend(file);
    if (err) throw new Error(err);
  }

  // 1. Presigned URL from the backend (auth-gated)
  const sig = await authed('/api/upload', {
    method: 'POST',
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type || '',
      bucket,
      isAudio: isAudioBucket,
    }),
  });

  if (!sig.uploadUrl) {
    throw new Error('Failed to get a Cloudflare R2 upload URL');
  }

  // 2. Direct PUT to R2 with exact Content-Type (XHR for progress events)
  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', sig.uploadUrl);
    xhr.setRequestHeader('Content-Type', sig.contentType || file.type || 'application/octet-stream');
    if (typeof onProgress === 'function') {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`R2 upload failed (${xhr.status}) — check the CORS policy on your R2 bucket allows PUT from this domain.`));
    };
    xhr.onerror = () => reject(new Error('R2 upload failed — network/CORS error. Ensure your R2 bucket CORS policy allows PUT from this domain.'));
    xhr.send(file);
  });

  return {
    backend: 'r2',
    publicUrl: sig.publicUrl,
    objectKey: sig.objectKey,
    isPrivate: sig.isPrivate,
    contentType: sig.contentType,
  };
}

export function masterRefR2(objectKey) {
  const k = String(objectKey);
  return k.startsWith('r2:') ? k : `r2:${k}`;
}

// Direct-to-Cloudinary uploads. Our API only signs the request; the file
// itself streams straight from the browser to Cloudinary's free CDN, so large
// WAV/stems files never touch our servers.
export async function uploadToCloudinary(authed, file, { bucket, resourceType }) {
  const sig = await authed('/api/upload', {
    method: 'POST',
    body: JSON.stringify({ bucket, resourceType }),
  });

  const fd = new FormData();
  fd.append('file', file);
  fd.append('api_key', sig.apiKey);
  fd.append('timestamp', String(sig.timestamp));
  fd.append('folder', sig.folder);
  fd.append('type', sig.type);
  fd.append('signature', sig.signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/${sig.resourceType}/upload`, {
    method: 'POST',
    body: fd,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Cloud upload failed');
  return data;
}

// Artwork is delivered through Cloudinary's free optimization layer.
export function optimizeImage(url, width = 1000) {
  if (typeof url !== 'string' || !url.includes('res.cloudinary.com')) return url;
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width},c_limit/`);
}

// Private masters are stored WITHOUT a public URL — we persist a descriptor
// that only the management API can turn into a signed download link.
export function masterRef(cloudinaryResult) {
  return `cldauth:${cloudinaryResult.resource_type}:${cloudinaryResult.public_id}:${cloudinaryResult.version}:${cloudinaryResult.format || 'bin'}`;
}

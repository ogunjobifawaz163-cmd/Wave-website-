import supabase from './db-client.js';

/*
 * Helper to load R2 config from the database.
 * Used by api/upload.js and api/masters.js as a fallback
 * when env vars aren't set (i.e. the wizard saved them to DB instead).
 */

let _cache = null;
let _cacheTime = 0;
const CACHE_TTL = 60_000; // 1 minute

export async function getR2Config() {
  const now = Date.now();
  if (_cache && now - _cacheTime < CACHE_TTL) return _cache;

  try {
    const { data, error } = await supabase
      .from('site_config')
      .select('key, value')
      .in('key', ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_DOMAIN']);

    if (error || !data) {
      _cache = null;
      return null;
    }

    const config = {};
    for (const row of data) {
      if (row.value) config[row.key] = row.value;
    }

    _cache = config;
    _cacheTime = now;
    return config;
  } catch {
    return null;
  }
}

/*
 * Resolves an R2 config value: env var takes priority, then DB fallback.
 */
export async function resolveR2Config() {
  const dbConfig = await getR2Config();

  return {
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID || dbConfig?.R2_ACCOUNT_ID || null,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID || dbConfig?.R2_ACCESS_KEY_ID || null,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY || dbConfig?.R2_SECRET_ACCESS_KEY || null,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME || dbConfig?.R2_BUCKET_NAME || 'waves',
    R2_PUBLIC_DOMAIN: process.env.R2_PUBLIC_DOMAIN || dbConfig?.R2_PUBLIC_DOMAIN || null,
  };
}

import supabase from './db-client.js';

/*
 * Site configuration API — stores R2 credentials and other config in the database.
 * This allows the R2 setup wizard to save credentials automatically
 * without requiring manual secret copying.
 *
 * SECURITY: Only the scoped R2 credentials are stored. The master
 * Cloudflare API token is NEVER stored here.
 */

// R2 keys that are allowed to be stored in the database
const R2_KEYS = new Set([
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_PUBLIC_DOMAIN',
]);

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

    // GET — return all config (mask secrets)
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('site_config')
        .select('key, value')
        .in('key', [...R2_KEYS]);
      if (error) throw error;

      const config = {};
      for (const row of data) {
        // Mask sensitive values for display
        if (row.key === 'R2_SECRET_ACCESS_KEY' && row.value) {
          config[row.key] = row.value.slice(0, 6) + '••••••••' + row.value.slice(-4);
        } else {
          config[row.key] = row.value;
        }
      }

      return res.status(200).json({
        r2Configured: !!(config.R2_ACCOUNT_ID && config.R2_ACCESS_KEY_ID),
        config,
      });
    }

    // POST — save R2 credentials (from the wizard)
    if (req.method === 'POST') {
      const { secrets } = req.body || {};
      if (!secrets || typeof secrets !== 'object') {
        return res.status(400).json({ error: 'secrets object is required' });
      }

      // Only allow whitelisted R2 keys — reject anything else
      const entries = Object.entries(secrets).filter(([key]) => R2_KEYS.has(key));
      if (entries.length === 0) {
        return res.status(400).json({ error: 'No valid R2 keys provided' });
      }

      // Upsert each key
      for (const [key, value] of entries) {
        if (!value || typeof value !== 'string') continue;

        const { error } = await supabase
          .from('site_config')
          .upsert(
            { key, value },
            { onConflict: 'key' }
          );
        if (error) {
          console.error(`[config] Failed to save ${key}:`, error.message);
          throw new Error(`Failed to save ${key}`);
        }
      }

      return res.status(200).json({
        saved: entries.map(([k]) => k),
        message: 'R2 credentials saved to database. Uploads are now active.',
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[config] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

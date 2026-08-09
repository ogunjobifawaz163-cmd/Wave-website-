import supabase from './db-client.js';

const PUBLIC_COLS =
  'id,title,genre,bpm,price,availability,artwork_url,preview_url,collaborators,featured,play_count,favorite_count,created_at';

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

function slugify(name) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') +
    '-' +
    Math.random().toString(36).slice(2, 6)
  );
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { slug } = req.query || {};
      if (slug) {
        const { data: pack, error } = await supabase.from('packs').select('*').eq('slug', slug).maybeSingle();
        if (error) throw error;
        if (!pack) return res.status(404).json({ error: 'Pack not found' });

        // register the view
        await supabase.from('packs').update({ views: (pack.views || 0) + 1 }).eq('id', pack.id);
        await supabase.from('events').insert({ type: 'pack_view', label: `Pack view — ${pack.name}` });

        const ids = Array.isArray(pack.beat_ids) ? pack.beat_ids : [];
        let beats = [];
        if (ids.length) {
          const { data, error: bErr } = await supabase.from('beats_v2').select(PUBLIC_COLS).in('id', ids);
          if (bErr) throw bErr;
          // preserve pack order
          beats = ids.map((id) => data.find((b) => b.id === id)).filter(Boolean);
        }
        return res.status(200).json({ pack: { ...pack, views: (pack.views || 0) + 1 }, beats });
      }

      const user = await getUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      const { data, error } = await supabase.from('packs').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data);
    }

    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method === 'POST') {
      const { name, beat_ids } = req.body;
      if (!name || !Array.isArray(beat_ids) || beat_ids.length === 0) {
        return res.status(400).json({ error: 'name and beat_ids are required' });
      }
      const { data, error } = await supabase
        .from('packs')
        .insert({ name, slug: slugify(name), beat_ids })
        .select()
        .single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'id is required' });
      const { error } = await supabase.from('packs').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('packs API error:', err);
    res.status(500).json({ error: err.message });
  }
}

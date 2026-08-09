import supabase from './db-client.js';

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const user = await getUser(req);

    if (req.method === 'GET') {
      const { id, admin } = req.query || {};
      const isAdmin = !!user && admin === '1';

      let q = supabase.from('folders').select('*');
      if (id) q = q.eq('id', id).maybeSingle();
      else q = q.order('created_at', { ascending: false });

      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json(data);
    }

    // Admin mutations below
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method === 'POST') {
      const { name, genre, emotion_tags } = req.body || {};
      if (!name) return res.status(400).json({ error: 'Folder name is required' });

      const { data, error } = await supabase
        .from('folders')
        .insert({
          name: name.trim(),
          genre: genre && String(genre).trim() ? genre.trim() : 'Afrobeats',
          emotion_tags: Array.isArray(emotion_tags) ? emotion_tags : [],
        })
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id, name, genre, emotion_tags } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Folder id is required' });

      const update = {};
      if (name !== undefined) update.name = name.trim();
      if (genre !== undefined) update.genre = genre.trim();
      if (emotion_tags !== undefined) update.emotion_tags = Array.isArray(emotion_tags) ? emotion_tags : [];

      const { data, error } = await supabase.from('folders').update(update).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Folder id is required' });

      // Unassign beats from this folder first
      await supabase.from('beats_v2').update({ folder_id: null }).eq('folder_id', id);

      const { error } = await supabase.from('folders').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('folders API error:', err);
    res.status(500).json({ error: err.message });
  }
}

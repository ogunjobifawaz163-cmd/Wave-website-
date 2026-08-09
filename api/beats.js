import supabase from './db-client.js';

const PUBLIC_COLS =
  'id,title,genre,bpm,price,availability,artwork_url,preview_url,collaborators,featured,play_count,favorite_count,folder_id,emotions,created_at';

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
      const { id, genre, emotion, folder_id, availability, featured, search, bpm_min, bpm_max, price_max, sort, limit, admin } = req.query || {};
      const isAdmin = !!user && admin === '1';

      if (id) {
        let q = supabase.from('beats_v2').select(isAdmin ? '*' : PUBLIC_COLS).eq('id', id);
        const { data, error } = await q.maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Not found' });
        if (data.availability === 'private' && !isAdmin) return res.status(404).json({ error: 'Not found' });
        return res.status(200).json(data);
      }

      let q = supabase.from('beats_v2').select(isAdmin ? '*' : PUBLIC_COLS);
      if (!isAdmin) {
        // Public user view: hide private beats
        q = q.neq('availability', 'private');
      }
      if (genre && genre !== 'All') q = q.eq('genre', genre);
      if (folder_id) q = q.eq('folder_id', Number(folder_id));
      if (availability && availability !== 'any' && availability !== 'all') q = q.eq('availability', availability);
      if (featured === '1' || featured === 'true') q = q.eq('featured', true);
      if (search) q = q.ilike('title', `%${search}%`);
      if (bpm_min) q = q.gte('bpm', Number(bpm_min));
      if (bpm_max) q = q.lte('bpm', Number(bpm_max));
      if (price_max) q = q.lte('price', Number(price_max));

      if (sort === 'plays') q = q.order('play_count', { ascending: false });
      else if (sort === 'price-asc') q = q.order('price', { ascending: true });
      else if (sort === 'price-desc') q = q.order('price', { ascending: false });
      else q = q.order('created_at', { ascending: false });

      q = q.limit(Math.min(Number(limit) || 200, 500));

      const { data, error } = await q;
      if (error) throw error;

      let filtered = data || [];
      if (emotion && emotion !== 'All') {
        filtered = filtered.filter((b) => Array.isArray(b.emotions) && b.emotions.includes(emotion));
      }

      return res.status(200).json(filtered);
    }

    // Mutations below require management auth
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method === 'POST') {
      const { title, genre, bpm, price, availability, artwork_url, preview_url, wav_path, stems_path, collaborators, featured, folder_id, emotions } = req.body;
      if (!title) return res.status(400).json({ error: 'Title is required' });
      const { data, error } = await supabase
        .from('beats_v2')
        .insert({
          title,
          genre: genre && String(genre).trim() ? genre.trim() : 'Afrobeats',
          bpm: Number(bpm) || 100,
          price: Number(price) || 0,
          availability: availability || 'available',
          artwork_url: artwork_url || '/art/default-artwork.jpeg',
          preview_url: preview_url || null,
          wav_path: wav_path || null,
          stems_path: stems_path || null,
          collaborators: collaborators || '',
          featured: !!featured,
          folder_id: folder_id ? Number(folder_id) : null,
          emotions: Array.isArray(emotions) ? emotions : [],
        })
        .select()
        .single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id, ...fields } = req.body;
      if (!id) return res.status(400).json({ error: 'id is required' });
      const allowed = ['title', 'genre', 'bpm', 'price', 'availability', 'artwork_url', 'preview_url', 'wav_path', 'stems_path', 'collaborators', 'featured', 'folder_id', 'emotions'];
      const update = {};
      for (const k of allowed) if (fields[k] !== undefined) update[k] = fields[k];
      if (update.genre !== undefined) update.genre = String(update.genre).trim();
      if (update.bpm !== undefined) update.bpm = Number(update.bpm);
      if (update.price !== undefined) update.price = Number(update.price);
      if (update.folder_id !== undefined) update.folder_id = update.folder_id ? Number(update.folder_id) : null;
      if (update.emotions !== undefined && !Array.isArray(update.emotions)) update.emotions = [];

      const { data, error } = await supabase.from('beats_v2').update(update).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'id is required' });
      const { error } = await supabase.from('beats_v2').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('beats API error:', err);
    res.status(500).json({ error: err.message });
  }
}

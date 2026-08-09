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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'POST') {
      const { name, email, artist_name, instagram, project, genre, reference_artists, description, budget, deadline } = req.body;
      if (!name || !email || !description) {
        return res.status(400).json({ error: 'name, email and description are required' });
      }
      const ig = instagram ? String(instagram).trim().replace(/^@+/, '') : '';
      const fullDescription = ig ? `${description}\n\nInstagram: @${ig}` : description;
      const { data, error } = await supabase
        .from('production_requests')
        .insert({
          name,
          email,
          artist_name: artist_name || '',
          project: project || 'Single',
          genre: genre || 'Other',
          reference_artists: reference_artists || '',
          description: fullDescription,
          budget: budget || '',
          deadline: deadline || null,
          status: 'new',
        })
        .select()
        .single();
      if (error) throw error;
      await supabase.from('events').insert({ type: 'production_request', label: `Production request — ${artist_name || name} · ${genre || 'Other'}` });
      return res.status(201).json(data);
    }

    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method === 'GET') {
      const { data, error } = await supabase.from('production_requests').select('*').order('created_at', { ascending: false }).limit(300);
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'PUT') {
      const { id, status } = req.body;
      if (!id) return res.status(400).json({ error: 'id is required' });
      const { data, error } = await supabase.from('production_requests').update({ status }).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('requests API error:', err);
    res.status(500).json({ error: err.message });
  }
}

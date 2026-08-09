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
      const { beat_id, beat_title, license_type, price, name, email, project } = req.body;
      if (!beat_id || !beat_title || !license_type || !name || !email) {
        return res.status(400).json({ error: 'beat, license, name and email are required' });
      }
      const invoice_number = 'WAV-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 5).toUpperCase();
      const { data, error } = await supabase
        .from('leases')
        .insert({
          invoice_number,
          beat_id,
          beat_title,
          license_type,
          price: Number(price) || 0,
          name,
          email,
          project: project || '',
          status: 'pending',
        })
        .select()
        .single();
      if (error) throw error;
      await supabase.from('events').insert({ type: 'lease', label: `Lease request — ${beat_title} · ${license_type} · $${price}` });
      return res.status(201).json(data);
    }

    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method === 'GET') {
      const { data, error } = await supabase.from('leases').select('*').order('created_at', { ascending: false }).limit(300);
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'PUT') {
      const { id, status } = req.body;
      if (!id) return res.status(400).json({ error: 'id is required' });
      const { data, error } = await supabase.from('leases').update({ status }).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('leases API error:', err);
    res.status(500).json({ error: err.message });
  }
}

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const user = await getUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      const { data, error } = await supabase.from('events').select('*').order('created_at', { ascending: false }).limit(300);
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { type, beat_id, label, visitor } = req.body || {};
      if (!type) return res.status(400).json({ error: 'type is required' });

      let beatTitle = null;
      if (beat_id && (type === 'play' || type === 'favorite')) {
        const { data: beat } = await supabase.from('beats_v2').select('play_count,favorite_count,title').eq('id', beat_id).maybeSingle();
        if (beat) {
          beatTitle = beat.title;
          if (type === 'play') {
            await supabase.from('beats_v2').update({ play_count: (beat.play_count || 0) + 1 }).eq('id', beat_id);
          } else if (type === 'favorite') {
            await supabase.from('beats_v2').update({ favorite_count: (beat.favorite_count || 0) + 1 }).eq('id', beat_id);
          }
        }
      }

      const finalLabel = label || (beatTitle ? `${type} — ${beatTitle}` : type);
      await supabase.from('events').insert({ type, label: finalLabel, visitor: visitor || null });

      return res.status(201).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('track API error:', err);
    res.status(500).json({ error: err.message });
  }
}

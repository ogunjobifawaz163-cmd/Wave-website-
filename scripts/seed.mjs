/* Seed script — reads .env, populates WAVES catalogue. Run: node scripts/seed.mjs */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = Object.fromEntries(
  fs
    .readFileSync('.env', 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      let v = l.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      return [l.slice(0, i).trim(), v];
    })
);

const url = env.NEXT_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}
const sb = createClient(url, key);

const AFRO = [
  'Midnight', 'Lagoon', 'Golden Hour', 'Suya & Silk', 'Island Fever', 'Palmwine', 'Eko Nights', 'Zanku Season',
  'Soft Life', 'Boju Boju', 'Cruise Control', 'Vibranium', 'Ojuelegba', 'Sugar', 'Amara', 'Dere',
  'Tropical Riddim', 'Awele', 'Fine Wine', 'Jollof', 'Kilometer', 'Low Voltage', 'Makossa Dreams', 'No Wahala',
  'Outside', 'Pressure', 'Rora', 'Shakara', 'Ivory & Ebony', 'Gidi Groove',
];
const RNB = [
  'Velvet', 'After Hours', 'Slow Motion', 'Silk', 'Late Checkout', 'Candlelight', 'Gardenia', 'Halo Effect',
  'Interlude', 'Last Call', 'Merlot', 'Nocturne', 'Quiet Storm', 'Rosewater', 'Second Skin', 'Smoke Signals',
  'Slow Burn', 'Stay Over', 'Undertow', 'Unwind', 'Violets', 'Warm Front', 'Whiskey & Honey', 'Yours Truly',
  'Four AM', 'Blue Hour', 'Suede', 'Honey Drip', 'Linger', 'Mirrors',
];
const PIANO = [
  'Emcimbini', 'Piano Prayer', 'Durban Nights', 'Kasi Lights', 'Logdrum', 'Mzansi', 'Private School', 'Sghubu',
  'Wooden Bass', 'Gold Reef', 'Soweto Sky', 'Grove', 'Late Train', 'Deep Roots', 'Night Market', 'Golden Miles',
  'Uthando', 'Piano & Pepper', 'Low Sun', 'Terrace', 'Afterglow', 'Sandton', 'Uber Black', 'Sunday Roast',
  'Half Moon', 'Bassline Therapy', 'City Lodge', 'Ke Dezemba', 'Long Way Home', 'Marimba',
];
const OTHER = [
  'Third Coast', 'Static Bloom', 'Northern Lights', 'Analog Ghost', 'VHS Summer', 'Copper Wire', 'Nylon',
  'Paper Cranes', 'Rooftop Cinema', 'Satellite', 'Telegraph', 'Neon Rain', 'Velodrome', 'Westbound', 'Kilimanjaro',
  'Monsoon', 'Polaroid', 'Quartz', 'Rivermouth', 'Solar Wind', 'Terracotta', 'Ultraviolet', 'Vantage', 'Wildflower',
  'Cassette', 'Dust & Gold', 'Fresco', 'Harbor Lights', 'Juniper', 'Indigo Child',
];

const COLLABS = ['', '', '', '', 'KEZIAH', 'TÉMI', 'J. SOLÉ', 'NOVA RAE', 'DAYO', 'RÊVE'];

function buildSet(names, genre, bpmLo, bpmHi, priceLo, priceHi, nOffset) {
  return names.map((title, i) => {
    const n = nOffset + i;
    const bpm = bpmLo + ((n * 7) % (bpmHi - bpmLo + 1));
    const priceSteps = Math.floor((priceHi - priceLo) / 10);
    const price = priceLo + ((n * 13) % (priceSteps + 1)) * 10 - (n % 3 === 0 ? 0 : 0.01 * 0) + (n % 2 === 0 ? 0 : 0);
    const availability = n % 19 === 0 ? 'private' : n % 23 === 0 ? 'sold' : 'available';
    return {
      title,
      genre,
      bpm,
      price: Math.round(price / 1) * 1 + (n % 4 === 1 ? 0 : 0),
      availability,
      artwork_url: `/art/art${(n % 6) + 1}.png`,
      preview_url: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${(n % 16) + 1}.mp3`,
      collaborators: COLLABS[n % COLLABS.length],
      featured: n % 15 === 0,
      play_count: 40 + ((n * 53) % 940),
      favorite_count: (n * 29) % 180,
      created_at: new Date(Date.now() - n * 20 * 36e5).toISOString(),
    };
  });
}

const rows = [
  ...buildSet(AFRO, 'Afrobeats', 96, 118, 99, 249, 0),
  ...buildSet(RNB, 'R&B', 68, 95, 79, 269, 1000),
  ...buildSet(PIANO, 'Amapiano', 108, 116, 129, 299, 2000),
  ...buildSet(OTHER, 'Other', 70, 140, 89, 399, 3000),
].map((r) => ({ ...r, price: Math.max(59, r.price) }));

console.log(`Seeding ${rows.length} beats…`);

// fresh start (idempotent reseeds)
await sb.from('beats').delete().gte('id', 0);
await sb.from('packs').delete().gte('id', 0);
await sb.from('leases').delete().gte('id', 0);
await sb.from('production_requests').delete().gte('id', 0);

for (let i = 0; i < rows.length; i += 40) {
  const chunk = rows.slice(i, i + 40);
  const { error } = await sb.from('beats').insert(chunk);
  if (error) {
    console.error('Insert failed:', error.message);
    process.exit(1);
  }
  console.log(`  inserted ${Math.min(i + 40, rows.length)}/${rows.length}`);
}

// private pack from the private + a few available beats
const { data: privBeats } = await sb.from('beats').select('id').eq('availability', 'private').limit(6);
const { data: someBeats } = await sb.from('beats').select('id').eq('availability', 'available').order('play_count', { ascending: false }).limit(4);
const packIds = [...(privBeats || []), ...(someBeats || [])].map((b) => b.id);
const { error: pErr } = await sb.from('packs').insert({
  name: 'WAVES — PRIVATE PACK 001',
  slug: 'waves-private-pack-001',
  beat_ids: packIds,
  views: 17,
});
if (pErr) console.error('Pack seed failed:', pErr.message);

// sample production requests
await sb.from('production_requests').insert([
  {
    name: 'Adaeze Okafor', email: 'adaeze@labelmail.com', artist_name: 'DAEZE', project: 'EP', genre: 'Afrobeats',
    reference_artists: 'Tems, Ayra Starr, Victony',
    description: 'Building a 6-track debut EP. Need 3 records — one mid-tempo confessional, one amapiano-leaning single, one slow-burn opener. Cinderella season!',
    budget: '$2,500 – $5,000', deadline: null, status: 'new',
  },
  {
    name: 'Marco Silva', email: 'marco@soulsync.io', artist_name: 'SILVA', project: 'Single', genre: 'R&B',
    reference_artists: 'Brent Faiyaz, SZA',
    description: 'Looking for a moody 80-something BPM single with live-feel keys and sub-heavy drums. Timeline is flexible, quality first.',
    budget: '$1,000 – $2,500', deadline: null, status: 'in-progress',
  },
]);

// sample leases
await sb.from('leases').insert([
  {
    invoice_number: 'WAV-DEMO1A', beat_id: 2, beat_title: 'Lagoon', license_type: 'Premium Lease', price: 338,
    name: 'Kevin Mensah', email: 'kmensah@artistmail.com', project: 'Blackstar Tape', status: 'contacted',
  },
  {
    invoice_number: 'WAV-DEMO2B', beat_id: 35, beat_title: 'Velvet', license_type: 'Basic Lease', price: 79,
    name: 'Lena Moreau', email: 'lena.vox@gmail.com', project: 'Bedroom Sessions', status: 'pending',
  },
]);

// sample events so the activity feed has history
const ev = [
  { type: 'play', label: 'Play — Midnight', visitor: 'seed_v1' },
  { type: 'play', label: 'Play — Emcimbini', visitor: 'seed_v2' },
  { type: 'favorite', label: 'Favorite — Golden Hour', visitor: 'seed_v1' },
  { type: 'inquiry', label: 'Inquiry — Durban Nights', visitor: 'seed_v3' },
  { type: 'play', label: 'Play — Velvet', visitor: 'seed_v4' },
  { type: 'pack_view', label: 'Pack view — WAVES — PRIVATE PACK 001', visitor: 'seed_v5' },
  { type: 'lease', label: 'Lease request — Velvet · Basic Lease · $79', visitor: 'seed_v2' },
  { type: 'production_request', label: 'Production request — SILVA · R&B', visitor: 'seed_v6' },
  { type: 'play', label: 'Play — Logdrum', visitor: 'seed_v7' },
  { type: 'favorite', label: 'Favorite — No Wahala', visitor: 'seed_v4' },
];
await sb.from('events').insert(ev);

const { count } = await sb.from('beats').select('*', { count: 'exact', head: true });
console.log(`Done. Beats in catalogue: ${count}`);

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
  console.error('Missing Supabase credentials');
  process.exit(1);
}
const sb = createClient(url, key);

async function setup() {
  console.log('Setting up Folders and Emotions schema...');

  // 1. Clear old beats and folders
  await sb.from('beats_v2').delete().gte('id', 0);
  await sb.from('folders').delete().gte('id', 0);

  // 2. Create default folders (Afrobeats, Trap, Amapiano, R&B + Private Unreleased Vault)
  const defaultFolders = [
    { name: 'Afrobeats Crate', genre: 'Afrobeats', emotion_tags: ['Energetic', 'Euphoric', 'Soulful'], is_public: true },
    { name: 'Trap & Drill Vault', genre: 'Trap', emotion_tags: ['Hard', 'Dark', 'Aggressive'], is_public: true },
    { name: 'Amapiano Grooves', genre: 'Amapiano', emotion_tags: ['Chill', 'Soulful', 'Rhythmic'], is_public: true },
    { name: 'R&B After Hours', genre: 'R&B', emotion_tags: ['Romantic', 'Melancholic', 'Deep'], is_public: true },
    { name: 'Unreleased Studio Folder', genre: 'Afrobeats', emotion_tags: ['Experimental', 'Dark', 'Raw'], is_public: false },
  ];

  const { data: createdFolders, error: folderErr } = await sb.from('folders').insert(defaultFolders).select();
  if (folderErr) {
    console.error('Folder creation failed:', folderErr.message);
    process.exit(1);
  }
  console.log(`Created ${createdFolders.length} beat folders.`);

  const folderMap = {};
  for (const f of createdFolders) {
    folderMap[f.genre] = f.id;
  }
  const privateFolderId = createdFolders.find((f) => !f.is_public)?.id;

  // 3. Generate beats assigned to folders and tagged with emotions
  const EMOTIONS_POOL = ['Energetic', 'Euphoric', 'Soulful', 'Hard', 'Dark', 'Aggressive', 'Chill', 'Rhythmic', 'Romantic', 'Melancholic', 'Deep', 'Nostalgic', 'Uplifting'];

  const AFRO = ['Midnight', 'Lagoon', 'Golden Hour', 'Suya & Silk', 'Island Fever', 'Palmwine', 'Eko Nights', 'Soft Life', 'Boju Boju', 'Cruise Control', 'Vibranium', 'Jollof', 'Fine Wine', 'Gidi Groove', 'Shakara'];
  const TRAP = ['808 Empire', 'Phantom', 'Night Stalker', 'Gold Chains', 'Sub Zero', 'Viper', 'Tokyo Drift', 'Venom', 'Codeine Dreams', 'Crown Jewel', 'Grim Reaper', 'Overdrive', 'Black Mask', 'Block Hot', 'Heavyweight'];
  const PIANO = ['Emcimbini', 'Piano Prayer', 'Durban Nights', 'Kasi Lights', 'Logdrum', 'Mzansi', 'Sghubu', 'Soweto Sky', 'Golden Miles', 'Terrace', 'Afterglow', 'Uber Black', 'Sunday Roast', 'Ke Dezemba', 'Marimba'];
  const RNB = ['Velvet', 'After Hours', 'Slow Motion', 'Silk', 'Late Checkout', 'Candlelight', 'Halo Effect', 'Last Call', 'Quiet Storm', 'Rosewater', 'Slow Burn', 'Whiskey & Honey', 'Blue Hour', 'Honey Drip', 'Mirrors'];

  function buildBeats(names, genre, folderId, bpmLo, bpmHi, basePrice, startIdx) {
    return names.map((title, i) => {
      const idx = startIdx + i;
      const emotion1 = EMOTIONS_POOL[(idx * 3) % EMOTIONS_POOL.length];
      const emotion2 = EMOTIONS_POOL[(idx * 7 + 1) % EMOTIONS_POOL.length];
      const emotions = Array.from(new Set([emotion1, emotion2]));

      // Some beats placed in private folder before going public!
      const isPrivateFolder = idx % 11 === 0;
      const assignedFolderId = isPrivateFolder ? privateFolderId : folderId;

      return {
        title,
        genre,
        bpm: bpmLo + ((idx * 5) % (bpmHi - bpmLo + 1)),
        price: basePrice + (idx % 4) * 20,
        availability: isPrivateFolder ? 'private' : idx % 17 === 0 ? 'sold' : 'available',
        artwork_url: `/art/art${(idx % 6) + 1}.png`,
        preview_url: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${(idx % 16) + 1}.mp3`,
        collaborators: idx % 5 === 0 ? 'KEZIAH' : idx % 7 === 0 ? 'TÉMI' : '',
        featured: idx % 6 === 0,
        play_count: 50 + ((idx * 47) % 850),
        favorite_count: (idx * 23) % 190,
        folder_id: assignedFolderId,
        emotions,
        created_at: new Date(Date.now() - idx * 18 * 36e5).toISOString(),
      };
    });
  }

  const allBeats = [
    ...buildBeats(AFRO, 'Afrobeats', folderMap['Afrobeats'], 98, 116, 149, 100),
    ...buildBeats(TRAP, 'Trap', folderMap['Trap'], 120, 150, 129, 200),
    ...buildBeats(PIANO, 'Amapiano', folderMap['Amapiano'], 108, 116, 159, 300),
    ...buildBeats(RNB, 'R&B', folderMap['R&B'], 70, 95, 119, 400),
  ];

  console.log(`Seeding ${allBeats.length} beats with folder and emotion tags...`);

  for (let i = 0; i < allBeats.length; i += 30) {
    const chunk = allBeats.slice(i, i + 30);
    const { error: bErr } = await sb.from('beats_v2').insert(chunk);
    if (bErr) {
      console.error('Beat insert error:', bErr.message);
      process.exit(1);
    }
  }

  console.log('Folders & Emotion schema setup complete!');
}

setup();

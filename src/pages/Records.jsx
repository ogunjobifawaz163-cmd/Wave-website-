import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, LayoutGrid, List, Sparkles, FolderOpen, Tag } from 'lucide-react';
import BeatCard from '../components/BeatCard';
import BeatRow from '../components/BeatRow';
import { money } from '../lib/format';

const GENRES = ['All', 'Afrobeats', 'Trap', 'Amapiano', 'R&B'];
const EMOTIONS = [
  'All',
  'Dark',
  'Energetic',
  'Soulful',
  'Hard',
  'Chill',
  'Romantic',
  'Melancholic',
  'Euphoric',
  'Rhythmic',
  'Deep',
  'Uplifting',
];

export default function Records() {
  const [params, setParams] = useSearchParams();
  const [beats, setBeats] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [q, setQ] = useState(params.get('q') || '');
  const [genre, setGenre] = useState(params.get('genre') || 'All');
  const [selectedEmotion, setSelectedEmotion] = useState(params.get('emotion') || 'All');
  const [selectedFolder, setSelectedFolder] = useState(params.get('folder') || 'all');
  const [bpm, setBpm] = useState('any');
  const [price, setPrice] = useState('any');
  const [sort, setSort] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/beats?limit=500').then((r) => r.json()).catch(() => []),
      fetch('/api/folders').then((r) => r.json()).catch(() => []),
    ])
      .then(([bData, fData]) => {
        setBeats(Array.isArray(bData) ? bData : []);
        setFolders(Array.isArray(fData) ? fData : []);
      })
      .catch(() => setError('Could not load catalogue.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = [...beats];
    const s = q.trim().toLowerCase();

    if (s) {
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(s) ||
          (b.genre || '').toLowerCase().includes(s) ||
          (b.collaborators || '').toLowerCase().includes(s) ||
          (Array.isArray(b.emotions) && b.emotions.some((e) => e.toLowerCase().includes(s)))
      );
    }

    if (genre !== 'All') list = list.filter((b) => b.genre === genre);

    if (selectedFolder !== 'all') {
      list = list.filter((b) => String(b.folder_id) === String(selectedFolder));
    }

    if (selectedEmotion !== 'All') {
      list = list.filter((b) => Array.isArray(b.emotions) && b.emotions.includes(selectedEmotion));
    }

    if (bpm !== 'any') {
      const [lo, hi] = bpm.split('-').map(Number);
      list = list.filter((b) => b.bpm >= lo && b.bpm <= hi);
    }

    if (price !== 'any') {
      const [lo, hi] = price.split('-').map(Number);
      list = list.filter((b) => Number(b.price) >= lo && Number(b.price) <= hi);
    }

    switch (sort) {
      case 'plays':
        list.sort((a, b) => (b.play_count || 0) - (a.play_count || 0));
        break;
      case 'favs':
        list.sort((a, b) => (b.favorite_count || 0) - (a.favorite_count || 0));
        break;
      case 'price-asc':
        list.sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case 'price-desc':
        list.sort((a, b) => Number(b.price) - Number(a.price));
        break;
      default:
        list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return list;
  }, [beats, q, genre, selectedFolder, selectedEmotion, bpm, price, sort]);

  const clearAll = () => {
    setQ('');
    setGenre('All');
    setSelectedFolder('all');
    setSelectedEmotion('All');
    setBpm('any');
    setPrice('any');
    setSort('newest');
    setParams({});
  };

  const activeFilters =
    (genre !== 'All') +
    (selectedFolder !== 'all') +
    (selectedEmotion !== 'All') +
    (bpm !== 'any') +
    (price !== 'any') +
    (q ? 1 : 0);

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-8">
      {/* Header */}
      <div className="pt-8 pb-6 flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="badge-ocean mb-3">BEAT CATALOG</div>
          <h1 className="font-display text-4xl sm:text-6xl font-bold text-white">Explore Beats</h1>
          <p className="text-slate-400 text-sm mt-2">Filter by genre crates, emotion tags, BPM, and mood.</p>
        </div>
        <div className="font-mono text-xs font-semibold text-slate-400 bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800">
          {loading ? 'Searching beats…' : `${filtered.length} of ${beats.length} records`}
        </div>
      </div>

      {/* Main Toolbar */}
      <div className="sticky top-[72px] z-30 bg-[#0b0c0f]/95 backdrop-blur-xl border border-slate-800 rounded-2xl p-3 mb-8 shadow-xl">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by title, genre, mood tag…"
              className="field !pl-10 !py-2.5"
            />
          </div>

          {/* Genre chips */}
          <div className="hidden lg:flex items-center gap-1.5">
            {GENRES.map((g) => (
              <button key={g} onClick={() => setGenre(g)} className={`chip ${genre === g ? 'chip-active' : ''}`}>
                {g}
              </button>
            ))}
          </div>

          {/* Filter toggle button */}
          <button onClick={() => setShowFilters(!showFilters)} className={`chip ${showFilters ? 'chip-active' : ''}`}>
            <SlidersHorizontal size={13} /> Filters {activeFilters > 0 && `(${activeFilters})`}
          </button>

          {/* Sort */}
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="field !w-auto !py-2.5 !pr-8">
            <option value="newest">Newest First</option>
            <option value="plays">Most Played</option>
            <option value="favs">Most Favorited</option>
            <option value="price-asc">Price ↑</option>
            <option value="price-desc">Price ↓</option>
          </select>

          {/* Grid/List switch */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'}`}
              aria-label="Grid view"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'}`}
              aria-label="List view"
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Emotion / Mood Tag Filter Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pt-3 mt-3 border-t border-slate-800/80 pb-1 scrollbar-none">
          <span className="font-mono text-[10px] font-bold text-sky-400 uppercase tracking-widest shrink-0 flex items-center gap-1 mr-1">
            <Tag size={12} /> Emotion:
          </span>
          {EMOTIONS.map((emo) => (
            <button
              key={emo}
              onClick={() => setSelectedEmotion(emo)}
              className={`text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap border transition-all ${
                selectedEmotion === emo
                  ? 'bg-sky-500/20 text-sky-300 border-sky-400/60 font-bold'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
              }`}
            >
              {emo}
            </button>
          ))}
        </div>

        {/* Expanded Filters Panel */}
        {showFilters && (
          <div className="flex items-center gap-3 flex-wrap pt-3 mt-3 border-t border-slate-800">
            <select value={genre} onChange={(e) => setGenre(e.target.value)} className="field !w-auto !py-2 !pr-8 lg:hidden">
              {GENRES.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>

            {folders.length > 0 && (
              <select value={selectedFolder} onChange={(e) => setSelectedFolder(e.target.value)} className="field !w-auto !py-2 !pr-8">
                <option value="all">All Public Folders</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    Folder: {f.name}
                  </option>
                ))}
              </select>
            )}

            <select value={bpm} onChange={(e) => setBpm(e.target.value)} className="field !w-auto !py-2 !pr-8">
              <option value="any">Any BPM</option>
              <option value="0-90">Under 90 BPM</option>
              <option value="91-105">91 – 105 BPM</option>
              <option value="106-116">106 – 116 BPM</option>
              <option value="117-200">117+ BPM</option>
            </select>

            <select value={price} onChange={(e) => setPrice(e.target.value)} className="field !w-auto !py-2 !pr-8">
              <option value="any">Any Price</option>
              <option value="0-150">Under {money(150)}</option>
              <option value="150-250">{money(150)} – {money(250)}</option>
              <option value="250-100000">{money(250)}+</option>
            </select>

            {activeFilters > 0 && (
              <button onClick={clearAll} className="chip !border-rose-500/50 !text-rose-400 hover:!text-white">
                <X size={12} /> Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Grid or List View */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 animate-pulse">
              <div className="aspect-square bg-slate-800 rounded-xl" />
              <div className="h-4 bg-slate-800 rounded mt-3 w-2/3" />
              <div className="h-3 bg-slate-800 rounded mt-2 w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="py-24 text-center">
          <div className="font-display text-2xl text-slate-300">{error}</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center border border-slate-800 rounded-3xl bg-slate-900/40">
          <div className="font-display text-2xl text-slate-300 mb-4">No beats match this filter combination.</div>
          <button onClick={clearAll} className="btn-ghost mx-auto">Clear filters</button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filtered.map((b, i) => (
            <BeatCard key={b.id} beat={b} queue={filtered} index={i} />
          ))}
        </div>
      ) : (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-2 divide-y divide-slate-800/60">
          {filtered.map((b, i) => (
            <BeatRow key={b.id} beat={b} queue={filtered} index={i} />
          ))}
        </div>
      )}

      <div className="h-16" />
    </div>
  );
}

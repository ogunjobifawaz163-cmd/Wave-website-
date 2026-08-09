import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, X, TrendingUp } from 'lucide-react';
import { money, catalogNo } from '../lib/format';

export default function SearchOverlay({ open, onClose }) {
  const [beats, setBeats] = useState([]);
  const [q, setQ] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQ('');
      setTimeout(() => inputRef.current?.focus(), 60);
      if (!beats.length) {
        fetch('/api/beats?limit=200')
          .then((r) => r.json())
          .then((d) => setBeats(Array.isArray(d) ? d : []))
          .catch(() => {});
      }
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return beats.filter((b) => (b.play_count || 0) > 0).sort((a, b) => (b.play_count || 0) - (a.play_count || 0)).slice(0, 7);
    return beats
      .filter(
        (b) =>
          b.title.toLowerCase().includes(s) ||
          (b.genre || '').toLowerCase().includes(s) ||
          (b.collaborators || '').toLowerCase().includes(s)
      )
      .slice(0, 9);
  }, [q, beats]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/98 backdrop-blur-2xl text-white">
      <div className="max-w-3xl mx-auto px-6 pt-24">
        <div className="flex items-center justify-between mb-8">
          <div className="badge-ocean">SEARCH CATALOGUE</div>
          <button onClick={onClose} className="p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors" aria-label="Close search">
            <X size={20} />
          </button>
        </div>
        <div className="flex items-center gap-4 border-b-2 border-slate-700 focus-within:border-sky-400 pb-4 transition-colors">
          <Search size={24} className="text-sky-400 shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Beat title, genre, artist…"
            className="w-full bg-transparent outline-none font-display text-2xl sm:text-4xl placeholder:text-slate-600 text-white"
          />
        </div>

        <div className="mt-10">
          {!q && (
            <div className="font-mono text-xs font-bold text-sky-400 flex items-center gap-2 mb-4">
              <TrendingUp size={14} /> MOST PLAYED BEATS
            </div>
          )}
          <div className="divide-y divide-slate-800/80">
            {results.map((b) => (
              <Link key={b.id} to={`/records/${b.id}`} onClick={onClose} className="group flex items-center gap-4 py-3.5 hover:bg-slate-900/60 px-3 rounded-xl transition-colors">
                <img src={b.artwork_url} alt="" className="w-12 h-12 object-cover rounded-lg border border-slate-800" loading="lazy" />
                <div className="min-w-0 flex-1">
                  <div className="font-display text-lg font-semibold truncate group-hover:text-sky-400 transition-colors">{b.title}</div>
                  <div className="font-mono text-xs text-slate-400">
                    {b.genre} · {b.bpm} BPM
                  </div>
                </div>
                <div className="font-mono text-xs text-slate-500 hidden sm:block">{catalogNo(b.id)}</div>
                <div className="font-mono text-sm font-bold text-sky-400">{money(b.price)}</div>
              </Link>
            ))}
            {q && results.length === 0 && (
              <div className="py-14 text-center">
                <div className="font-display text-xl text-slate-300">No records match “{q}”.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { Play, Pause, Heart } from 'lucide-react';
import { usePlayer } from '../lib/player';
import { money } from '../lib/format';

export default function BeatRow({ beat, queue, index }) {
  const { current, playing, playBeat, toggle, isFav, toggleFavorite } = usePlayer();
  const isCurrent = current?.id === beat.id;
  const fav = isFav(beat.id);

  return (
    <div
      className={`group grid grid-cols-[auto_auto_1fr_auto] sm:grid-cols-[28px_44px_1fr_auto_auto] items-center gap-3 sm:gap-4 py-2.5 px-3 transition-colors hover:bg-white/[0.025] ${
        isCurrent ? 'bg-white/[0.03]' : ''
      }`}
    >
      <div className="font-mono text-xs text-slate-600 w-7 text-right hidden sm:block tabular-nums">
        {String((index ?? 0) + 1).padStart(2, '0')}
      </div>

      <button
        onClick={() => (isCurrent ? toggle() : playBeat(beat, queue || [beat]))}
        className="relative w-11 h-11 shrink-0 rounded-lg overflow-hidden bg-slate-900"
        aria-label="Play"
      >
        <img src={beat.artwork_url} alt="" className="w-full h-full object-cover" loading="lazy" />
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity ${
            isCurrent ? 'opacity-100 bg-black/60 text-sky-400' : 'opacity-0 group-hover:opacity-100 bg-black/60 text-white'
          }`}
        >
          {isCurrent && playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" className="ml-0.5" />}
        </div>
      </button>

      <Link to={`/records/${beat.id}`} className="min-w-0">
        <div className={`text-[13.5px] font-semibold truncate transition-colors ${isCurrent ? 'text-sky-400' : 'text-white'}`}>
          {beat.title}
        </div>
        <div className="font-mono text-[11px] text-slate-500 mt-0.5 truncate">
          {beat.bpm} BPM · {beat.genre}
          {beat.collaborators ? ` · w/ ${beat.collaborators}` : ''}
        </div>
      </Link>

      <div className="hidden md:flex items-center gap-1.5">
        {Array.isArray(beat.emotions) &&
          beat.emotions.slice(0, 2).map((e) => (
            <span key={e} className="font-mono text-[10px] text-slate-500 border border-slate-800 rounded-md px-2 py-0.5 uppercase tracking-wide">
              {e}
            </span>
          ))}
      </div>

      <div className="flex items-center gap-1.5 justify-self-end">
        <button
          onClick={() => toggleFavorite(beat)}
          aria-label="Favorite"
          className={`p-2 rounded-lg transition-colors ${
            fav ? 'text-sky-400' : 'text-slate-600 hover:text-white'
          }`}
        >
          <Heart size={15} fill={fav ? 'currentColor' : 'none'} />
        </button>
        <Link
          to={`/records/${beat.id}`}
          className={`text-[12.5px] font-semibold rounded-lg px-3 py-1.5 transition-colors ${
            beat.availability === 'sold'
              ? 'bg-slate-900 text-slate-500 border border-slate-800'
              : 'bg-sky-500 text-white hover:bg-sky-400'
          }`}
        >
          {beat.availability === 'sold' ? 'Sold' : money(beat.price)}
        </Link>
      </div>
    </div>
  );
}

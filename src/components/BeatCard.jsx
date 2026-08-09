import { Link } from 'react-router-dom';
import { Play, Pause, Heart, Lock, ShoppingCart } from 'lucide-react';
import { usePlayer } from '../lib/player';
import { money } from '../lib/format';

export default function BeatCard({ beat, queue }) {
  const { current, playing, playBeat, toggle, isFav, toggleFavorite } = usePlayer();
  const isCurrent = current?.id === beat.id;
  const fav = isFav(beat.id);
  const soldOut = beat.availability === 'sold';
  const priv = beat.availability === 'private';

  const handlePlay = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isCurrent) toggle();
    else playBeat(beat, queue || [beat]);
  };

  const handleFav = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(beat);
  };

  return (
    <Link to={`/records/${beat.id}`} className="group block">
      {/* Artwork */}
      <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-900 border border-slate-800/80 group-hover:border-slate-700 transition-colors">
        <img
          src={beat.artwork_url}
          alt={beat.title}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* status badges */}
        {(soldOut || priv) && (
          <div className="absolute top-2.5 left-2.5 z-10">
            {soldOut ? (
              <span className="font-mono text-[9px] font-semibold tracking-wider uppercase bg-black/80 text-amber-400 px-2 py-1 rounded-md backdrop-blur-sm">
                Sold
              </span>
            ) : (
              <span className="font-mono text-[9px] font-semibold tracking-wider uppercase bg-black/80 text-slate-300 px-2 py-1 rounded-md backdrop-blur-sm inline-flex items-center gap-1">
                <Lock size={9} /> Private
              </span>
            )}
          </div>
        )}

        {/* favorite */}
        <button
          onClick={handleFav}
          aria-label="Favorite"
          className={`absolute top-2 right-2 z-10 p-2 rounded-lg backdrop-blur-sm transition-all ${
            fav
              ? 'bg-black/70 text-sky-400 opacity-100'
              : 'bg-black/50 text-white/80 opacity-0 group-hover:opacity-100 hover:text-white'
          }`}
        >
          <Heart size={14} fill={fav ? 'currentColor' : 'none'} />
        </button>

        {/* play */}
        <button
          onClick={handlePlay}
          aria-label={isCurrent && playing ? 'Pause' : 'Play'}
          className={`absolute bottom-2.5 right-2.5 z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ${
            isCurrent
              ? 'bg-sky-500 text-white opacity-100 translate-y-0'
              : 'bg-white text-slate-950 opacity-0 translate-y-1.5 group-hover:opacity-100 group-hover:translate-y-0 hover:bg-sky-500 hover:text-white'
          }`}
        >
          {isCurrent && playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
        </button>

        {isCurrent && (
          <div className="absolute bottom-0 inset-x-0 h-[3px] bg-sky-500 z-10" />
        )}
      </div>

      {/* Meta */}
      <div className="pt-2.5 px-0.5">
        <div className={`text-[14px] font-semibold leading-snug truncate transition-colors ${isCurrent ? 'text-sky-400' : 'text-white'}`}>
          {beat.title}
        </div>
        <div className="font-mono text-[11px] text-slate-500 mt-1 truncate">
          {beat.bpm} BPM · {beat.genre}
          {beat.collaborators ? ` · w/ ${beat.collaborators}` : ''}
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold bg-slate-900 border border-slate-800 group-hover:border-slate-700 text-white rounded-lg px-2.5 py-1.5 transition-colors">
            <ShoppingCart size={12} className="text-sky-400" />
            {money(beat.price)}
          </span>
          {Array.isArray(beat.emotions) && beat.emotions.length > 0 && (
            <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wide">{beat.emotions[0]}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

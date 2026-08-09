import { Link } from 'react-router-dom';
import { Heart, ArrowRight } from 'lucide-react';
import { usePlayer } from '../lib/player';
import BeatCard from '../components/BeatCard';

export default function Favorites() {
  const { favorites } = usePlayer();

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-8">
      <div className="pt-10 pb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="badge-ocean mb-3">YOUR SAVED SHELF</div>
          <h1 className="font-display text-5xl sm:text-7xl font-bold text-white">My records</h1>
        </div>
        <div className="font-mono text-xs font-semibold text-slate-400">
          {favorites.length} saved {favorites.length === 1 ? 'record' : 'records'}
        </div>
      </div>

      {favorites.length === 0 ? (
        <div className="border border-slate-800 rounded-3xl py-28 text-center bg-slate-900/40">
          <Heart size={32} className="mx-auto text-slate-600 mb-6" />
          <div className="font-display text-2xl text-slate-300 mb-3">Your shelf is empty.</div>
          <p className="text-sm text-slate-400 max-w-sm mx-auto mb-8">
            Tap the heart on any record to keep it here — no account needed, it lives on this device.
          </p>
          <Link to="/records" className="btn-ocean inline-flex">
            Start digging <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {favorites.map((b, i) => (
            <BeatCard key={b.id} beat={b} queue={favorites} index={i} />
          ))}
        </div>
      )}
      <div className="h-16" />
    </div>
  );
}

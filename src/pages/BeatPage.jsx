import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Play, Pause, Heart, Mail, FileSignature, Lock, ArrowLeft, Users, Sparkles, ShoppingBag } from 'lucide-react';
import { usePlayer, trackEvent } from '../lib/player';
import { money, catalogNo, fmtTime } from '../lib/format';
import Waveform from '../components/Waveform';
import BeatCard from '../components/BeatCard';
import LicenseModal from '../components/LicenseModal';

export default function BeatPage() {
  const { id } = useParams();
  const [beat, setBeat] = useState(null);
  const [related, setRelated] = useState([]);
  const [state, setState] = useState('loading');
  const [licenseOpen, setLicenseOpen] = useState(false);
  const { current, playing, playBeat, toggle, progress, curTime, duration, seekTo, isFav, toggleFavorite } = usePlayer();

  useEffect(() => {
    setState('loading');
    setBeat(null);
    fetch(`/api/beats?id=${id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error('not found');
        return r.json();
      })
      .then((b) => {
        setBeat(b);
        setState('ready');
        fetch(`/api/beats?genre=${encodeURIComponent(b.genre)}&limit=8`)
          .then((r) => r.json())
          .then((d) => setRelated((Array.isArray(d) ? d : []).filter((x) => x.id !== b.id).slice(0, 5)))
          .catch(() => {});
      })
      .catch(() => setState('missing'));
  }, [id]);

  if (state === 'loading') {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 pt-12">
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-12">
          <div className="aspect-square bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
          <div>
            <div className="h-4 bg-slate-800 rounded w-40 mb-6" />
            <div className="h-12 bg-slate-800 rounded w-3/4 mb-4" />
            <div className="h-4 bg-slate-800 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (state === 'missing' || !beat) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 pt-24 text-center">
        <Lock size={32} className="mx-auto text-sky-400 mb-6" />
        <h1 className="font-display text-4xl font-bold mb-3 text-white">This record is unavailable.</h1>
        <p className="text-slate-400 text-sm mb-8 max-w-md mx-auto">
          It may be private or exclusive to a private pack link from management.
        </p>
        <Link to="/records" className="btn-ocean inline-flex">Back to store</Link>
      </div>
    );
  }

  const isCurrent = current?.id === beat.id;
  const fav = isFav(beat.id);
  const soldOut = beat.availability === 'sold';
  const displayProgress = isCurrent ? progress : 0;

  const contactMgmt = () => {
    trackEvent('inquiry', beat.id, `Inquiry — ${beat.title}`);
    window.location.href = `mailto:management@waves.com.ng?subject=${encodeURIComponent(`Inquiry — “${beat.title}” (${catalogNo(beat.id)})`)}`;
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-8">
      <div className="pt-8 pb-6 flex items-center justify-between">
        <Link to="/records" className="font-mono text-xs font-semibold text-slate-400 hover:text-sky-400 transition-colors inline-flex items-center gap-2">
          <ArrowLeft size={14} /> CATALOGUE / {catalogNo(beat.id)}
        </Link>
        {soldOut && (
          <span className="badge-ocean !bg-rose-500/10 !text-rose-400 !border-rose-500/30">
            SOLDOUT EXCLUSIVELY
          </span>
        )}
      </div>

      <div className="grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-16">
        {/* artwork column */}
        <div>
          <div className="relative aspect-square border border-slate-800 rounded-3xl overflow-hidden bg-slate-950 shadow-2xl group">
            <img src={beat.artwork_url} alt={beat.title} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-[56%] group-hover:translate-x-[42%] transition-transform duration-700 h-[92%] aspect-square">
              <div className={`w-full h-full rounded-full vinyl-disc vinyl-shine ${isCurrent && playing ? 'spin-vinyl' : ''}`}>
                <div className="absolute rounded-full overflow-hidden" style={{ inset: '27%' }}>
                  <img src={beat.artwork_url} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[6%] h-[6%] rounded-full bg-slate-950" />
              </div>
            </div>
          </div>

          {/* player strip */}
          <div className="border border-slate-800 bg-slate-900/80 backdrop-blur-xl p-5 rounded-2xl mt-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => (isCurrent ? toggle() : playBeat(beat, [beat, ...related]))}
                className="w-13 h-13 shrink-0 rounded-full bg-sky-500 text-white flex items-center justify-center hover:bg-sky-400  transition-all"
                aria-label="Play preview"
              >
                {isCurrent && playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
              </button>
              <div className="flex-1 min-w-0">
                <Waveform
                  seed={beat.id}
                  bars={64}
                  height={44}
                  progress={displayProgress}
                  animated={isCurrent && playing}
                  onSeek={isCurrent ? (f) => seekTo(f) : () => playBeat(beat, [beat, ...related])}
                />
              </div>
              <div className="font-mono text-xs text-slate-400 whitespace-nowrap">
                {isCurrent ? `${fmtTime(curTime)} / ${fmtTime(duration)}` : 'PREVIEW'}
              </div>
            </div>
          </div>
          <p className="font-mono text-[10px] text-slate-400 uppercase mt-3 flex items-center gap-1.5">
            <Lock size={10} className="text-sky-400" /> Preview quality stream · Full WAV & Stems stay in private vault until licensed
          </p>
        </div>

        {/* meta column */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="badge-ocean">{beat.genre}</span>
            <span className="font-mono text-xs text-slate-300 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
              {beat.bpm} BPM
            </span>
            <span className="font-mono text-xs text-slate-500 ml-auto">{catalogNo(beat.id)}</span>
          </div>

          <h1 className="font-display text-5xl sm:text-7xl font-bold text-white leading-tight mb-4">{beat.title}</h1>
          <div className="font-mono text-xs tracking-wider uppercase text-slate-400 mb-8">
            Produced by <span className="text-sky-400 font-semibold">WAVES</span>
            {beat.collaborators ? <span> · w/ {beat.collaborators}</span> : ''}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 bg-slate-900/60 border border-slate-800 rounded-2xl divide-x divide-slate-800 mb-8">
            <div className="p-4">
              <div className="font-mono text-[10px] uppercase text-slate-400 mb-1">Genre</div>
              <div className="text-sm font-semibold text-white">{beat.genre}</div>
            </div>
            <div className="p-4">
              <div className="font-mono text-[10px] uppercase text-slate-400 mb-1">Tempo</div>
              <div className="text-sm font-semibold text-white">{beat.bpm} BPM</div>
            </div>
            <div className="p-4 border-t sm:border-t-0 border-slate-800 col-span-2 sm:col-span-1">
              <div className="font-mono text-[10px] uppercase text-slate-400 mb-1">Licence from</div>
              <div className="text-base font-bold text-sky-400">{money(beat.price)}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-6 mb-8 font-mono text-xs text-slate-400">
            <span>{(beat.play_count || 0).toLocaleString()} plays</span>
            <span>{(beat.favorite_count || 0).toLocaleString()} favorites</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <button onClick={() => (isCurrent ? toggle() : playBeat(beat, [beat, ...related]))} className="btn-ocean flex-1">
              {isCurrent && playing ? <Pause size={15} /> : <Play size={15} />}
              {isCurrent && playing ? 'Pause' : 'Play Preview'}
            </button>
            <button onClick={() => toggleFavorite(beat)} className={`btn-ghost flex-1 ${fav ? '!border-sky-500 !text-sky-400 !bg-sky-500/10' : ''}`}>
              <Heart size={15} fill={fav ? 'currentColor' : 'none'} /> {fav ? 'Saved to my records' : 'Favorite'}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setLicenseOpen(true)}
              className="btn-white flex-1"
              disabled={soldOut}
              style={soldOut ? { opacity: 0.5, pointerEvents: 'none' } : {}}
            >
              <FileSignature size={15} /> Lease beat — {money(beat.price)}
            </button>
            <button onClick={contactMgmt} className="btn-ghost flex-1">
              <Mail size={15} /> Contact management
            </button>
          </div>
        </div>
      </div>

      {/* related */}
      {related.length > 0 && (
        <section className="mt-28">
          <div className="flex items-end justify-between mb-8">
            <h2 className="font-display text-3xl font-bold text-white">More {beat.genre} pressings</h2>
            <Link to={`/records?genre=${encodeURIComponent(beat.genre)}`} className="font-mono text-xs font-bold text-sky-400 hover:text-sky-300">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {related.map((b, i) => (
              <BeatCard key={b.id} beat={b} queue={related} index={i} />
            ))}
          </div>
        </section>
      )}

      <div className="h-20" />
      {licenseOpen && <LicenseModal beat={beat} onClose={() => setLicenseOpen(false)} />}
    </div>
  );
}

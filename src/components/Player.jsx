import { Link } from 'react-router-dom';
import { Play, Pause, SkipBack, SkipForward, Heart, ChevronUp, X, Disc3 } from 'lucide-react';
import { usePlayer } from '../lib/player';
import { fmtTime, money, catalogNo } from '../lib/format';
import Vinyl from './Vinyl';
import Waveform from './Waveform';

export default function Player() {
  const p = usePlayer();
  const { current, playing, progress, curTime, duration, expanded, setExpanded, toggle, next, prev, seekTo, isFav, toggleFavorite } = p;

  if (!current) return null;
  const fav = isFav(current.id);

  if (expanded) {
    return (
      <div className="fixed inset-0 z-[70] bg-slate-950/98 backdrop-blur-2xl flex flex-col text-white">
        <div className="flex items-center justify-between px-5 sm:px-10 h-16 border-b border-slate-800/70">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
              <span className={`w-1.5 h-1.5 rounded-full bg-sky-500 ${playing ? 'pulse-dot' : ''}`} />
              Now playing
            </span>
            <span className="font-mono text-xs text-slate-600">{catalogNo(current.id)}</span>
          </div>
          <button onClick={() => setExpanded(false)} className="p-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors" aria-label="Close">
            <X size={19} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-5 sm:px-10 py-10 grid md:grid-cols-2 gap-12 items-center min-h-full">
            <div className="flex items-center justify-center">
              <Vinyl src={current.artwork_url} spinning={playing} size={Math.min(360, typeof window !== 'undefined' ? window.innerWidth - 80 : 360)} />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="badge-ocean">{current.genre}</span>
                <span className="badge-ocean">{current.bpm} BPM</span>
                <span className="font-mono text-sm font-semibold text-white ml-auto">{money(current.price)}</span>
              </div>

              <h2 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight mb-2 text-white">{current.title}</h2>
              <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-slate-500 mb-8">Produced by WAVES</div>

              <Waveform
                seed={current.id}
                bars={72}
                height={56}
                progress={progress}
                onSeek={(f) => seekTo(f)}
                className="mb-2"
              />
              <div className="flex justify-between font-mono text-xs text-slate-500 mb-8 tabular-nums">
                <span>{fmtTime(curTime)}</span>
                <span>{fmtTime(duration)}</span>
              </div>

              <div className="flex items-center gap-5 mb-10">
                <button onClick={prev} className="p-3 text-slate-400 hover:text-white transition-colors" aria-label="Previous">
                  <SkipBack size={22} />
                </button>
                <button
                  onClick={toggle}
                  className="w-14 h-14 rounded-full bg-white text-slate-950 flex items-center justify-center hover:bg-sky-500 hover:text-white transition-colors"
                  aria-label="Play or pause"
                >
                  {playing ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                </button>
                <button onClick={next} className="p-3 text-slate-400 hover:text-white transition-colors" aria-label="Next">
                  <SkipForward size={22} />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button onClick={() => toggleFavorite(current)} className={`btn-ghost ${fav ? '!border-sky-500/50 !text-sky-400' : ''}`}>
                  <Heart size={14} fill={fav ? 'currentColor' : 'none'} /> {fav ? 'Saved' : 'Favorite'}
                </button>
                <Link to={`/records/${current.id}`} onClick={() => setExpanded(false)} className="btn-ocean">
                  <Disc3 size={14} /> View & lease
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-[60] bg-[#0e1015]/97 backdrop-blur-xl border-t border-slate-800">
      {/* progress line */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-slate-800/80">
        <div className="h-full bg-sky-500 transition-[width] duration-150" style={{ width: `${(progress || 0) * 100}%` }} />
      </div>

      <div className="max-w-[1280px] mx-auto grid grid-cols-[1fr_auto_1fr] md:grid-cols-3 items-center gap-3 px-4 sm:px-6 h-[68px]">
        {/* left: artwork + title */}
        <div className="flex items-center gap-3 min-w-0">
          <Link to={`/records/${current.id}`} className="relative w-11 h-11 shrink-0 rounded-lg overflow-hidden bg-slate-900">
            <img src={current.artwork_url} alt="" className="w-full h-full object-cover" />
          </Link>
          <div className="min-w-0">
            <Link to={`/records/${current.id}`} className="block text-[13.5px] font-semibold text-white truncate hover:text-sky-400 transition-colors">
              {current.title}
            </Link>
            <div className="font-mono text-[11px] text-slate-500 mt-0.5 truncate">
              {current.bpm} BPM · {current.genre}
            </div>
          </div>
          <button
            onClick={() => toggleFavorite(current)}
            className={`p-2 rounded-lg transition-colors hidden sm:block ${fav ? 'text-sky-400' : 'text-slate-500 hover:text-white'}`}
            aria-label="Favorite"
          >
            <Heart size={15} fill={fav ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* center: controls */}
        <div className="flex items-center gap-3 sm:gap-4 justify-center">
          <button onClick={prev} className="text-slate-400 hover:text-white transition-colors hidden sm:block" aria-label="Previous">
            <SkipBack size={17} />
          </button>
          <button
            onClick={toggle}
            className="w-10 h-10 rounded-full bg-white text-slate-950 flex items-center justify-center hover:bg-sky-500 hover:text-white transition-colors"
            aria-label="Play or pause"
          >
            {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
          </button>
          <button onClick={next} className="text-slate-400 hover:text-white transition-colors hidden sm:block" aria-label="Next">
            <SkipForward size={17} />
          </button>
        </div>

        {/* right: waveform + expand */}
        <div className="hidden md:flex items-center gap-3 justify-end">
          <span className="font-mono text-[10px] text-slate-500 tabular-nums">{fmtTime(curTime)}</span>
          <Waveform seed={current.id} bars={38} height={22} progress={progress} onSeek={(f) => seekTo(f)} className="max-w-[170px]" />
          <span className="font-mono text-[10px] text-slate-500 tabular-nums">{fmtTime(duration)}</span>
          <button onClick={() => setExpanded(true)} className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors" aria-label="Expand player">
            <ChevronUp size={17} />
          </button>
        </div>

        <button onClick={() => setExpanded(true)} className="md:hidden justify-self-end p-2 text-slate-400" aria-label="Expand player">
          <ChevronUp size={19} />
        </button>
      </div>
    </div>
  );
}

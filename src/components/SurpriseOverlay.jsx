import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Disc3, RotateCcw } from 'lucide-react';
import Vinyl from './Vinyl';
import { usePlayer } from '../lib/player';

const ARTS = ['/art/art1.png', '/art/art2.png', '/art/art3.png', '/art/art4.png', '/art/art5.png', '/art/art6.png'];

export default function SurpriseOverlay({ open, onClose }) {
  const [phase, setPhase] = useState('digging');
  const [cover, setCover] = useState(ARTS[0]);
  const [picked, setPicked] = useState(null);
  const poolRef = useRef([]);
  const { playBeat } = usePlayer();

  useEffect(() => {
    if (!open) return undefined;
    setPhase('digging');
    setPicked(null);

    let cancelled = false;
    const flick = setInterval(() => {
      setCover(ARTS[Math.floor(Math.random() * ARTS.length)]);
    }, 110);

    const run = async () => {
      let pool = poolRef.current;
      if (!pool.length) {
        try {
          const res = await fetch('/api/beats?limit=200&availability=all');
          const data = await res.json();
          pool = Array.isArray(data) ? data.filter((b) => b.preview_url && b.availability !== 'sold') : [];
          poolRef.current = pool;
        } catch {
          pool = [];
        }
      }
      setTimeout(() => {
        if (cancelled) return;
        clearInterval(flick);
        if (!pool.length) {
          setPhase('found');
          return;
        }
        const beat = pool[Math.floor(Math.random() * pool.length)];
        setPicked(beat);
        setCover(beat.artwork_url);
        setPhase('found');
        playBeat(beat, pool);
      }, 1600);
    };
    run();

    return () => {
      cancelled = true;
      clearInterval(flick);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/98 backdrop-blur-2xl flex flex-col items-center justify-center px-6 text-white">
      <button onClick={onClose} className="absolute top-6 right-6 p-3 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors" aria-label="Close">
        <X size={22} />
      </button>

      <div className="badge-ocean mb-8">{phase === 'digging' ? 'DIGGING IN THE CRATES' : 'PULLED FROM THE SHELF'}</div>

      <div className="relative">
        <Vinyl src={cover} size={Math.min(320, typeof window !== 'undefined' ? window.innerWidth - 100 : 320)} spinning fast={phase === 'digging'} />
      </div>

      {phase === 'digging' ? (
        <div className="font-mono text-xs tracking-widest uppercase text-sky-400 mt-10 pulse-dot font-semibold">Shuffling vinyl records…</div>
      ) : picked ? (
        <div className="text-center mt-8 rise max-w-lg">
          <div className="font-mono text-xs text-sky-400 uppercase font-semibold mb-2">{picked.genre} · {picked.bpm} BPM</div>
          <h3 className="font-display text-4xl sm:text-5xl font-bold mb-6 text-white">{picked.title}</h3>
          <div className="flex items-center justify-center gap-3">
            <Link to={`/records/${picked.id}`} onClick={onClose} className="btn-ocean">
              <Disc3 size={14} /> View record
            </Link>
            <button
              onClick={() => {
                setPhase('digging');
                setPicked(null);
                setTimeout(() => {
                  const pool = poolRef.current;
                  if (pool.length) {
                    const beat = pool[Math.floor(Math.random() * pool.length)];
                    setPicked(beat);
                    setCover(beat.artwork_url);
                    setPhase('found');
                    playBeat(beat, pool);
                  }
                }, 1200);
              }}
              className="btn-ghost"
            >
              <RotateCcw size={14} /> Shuffle again
            </button>
          </div>
        </div>
      ) : (
        <div className="font-display text-xl text-slate-300 mt-10">The crates are empty right now.</div>
      )}
    </div>
  );
}

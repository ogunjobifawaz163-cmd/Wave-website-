import { useMemo, useRef } from 'react';
import { hashSeed, mulberry32 } from '../lib/format';

export default function Waveform({
  seed = 'waves',
  bars = 64,
  height = 52,
  progress = 0,
  onSeek,
  className = '',
}) {
  const heights = useMemo(() => {
    const rnd = mulberry32(hashSeed(String(seed)));
    const arr = [];
    for (let i = 0; i < bars; i++) {
      const t = i / bars;
      const envelope = 0.55 + 0.45 * Math.sin(t * Math.PI * (1.4 + rnd() * 1.6) + rnd() * 2);
      const noise = 0.5 + rnd() * 0.5;
      arr.push(Math.max(0.14, Math.min(1, envelope * noise)));
    }
    return arr;
  }, [seed, bars]);

  const ref = useRef(null);

  const handle = (e) => {
    if (!onSeek || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    onSeek(Math.max(0, Math.min(1, frac)));
  };

  const done = Math.floor(progress * bars);

  return (
    <div
      ref={ref}
      onClick={handle}
      className={`flex items-center gap-[2px] w-full ${onSeek ? 'cursor-pointer' : ''} ${className}`}
      style={{ height }}
    >
      {heights.map((h, i) => {
        const active = i < done;
        return (
          <div
            key={i}
            className={`flex-1 rounded-full transition-colors duration-100 ${
              active ? 'bg-sky-500' : 'bg-slate-700/70 hover:bg-slate-600'
            }`}
            style={{ height: `${h * 100}%` }}
          />
        );
      })}
    </div>
  );
}

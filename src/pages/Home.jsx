import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ArrowUpRight, Zap, Play, Pause, MapPin, Disc3,
  AudioLines, BadgeCheck, Store, Shuffle,
} from 'lucide-react';
import BeatCard from '../components/BeatCard';
import InquiryForm from '../components/InquiryForm';
import { usePlayer } from '../lib/player';
import { money } from '../lib/format';

const GENRE_TILES = [
  { name: 'Afrobeats', img: '/art/art1.png', desc: 'Log-heavy grooves & palmwine melodies' },
  { name: 'Trap', img: '/art/art4.png', desc: '808s, drill bounce & dark textures' },
  { name: 'Amapiano', img: '/art/art3.png', desc: 'Logdrum bass & soulful keys' },
  { name: 'R&B', img: '/art/art6.png', desc: 'After-hours chords & slow burn drums' },
];

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [burst, setBurst] = useState(false);
  const [hasBursted, setHasBursted] = useState(false);
  const burstTimer = useRef(null);
  const { current, playing, playBeat, toggle } = usePlayer();

  useEffect(() => {
    Promise.all([
      fetch('/api/beats?featured=1&limit=10').then((r) => r.json()).catch(() => []),
      fetch('/api/beats?limit=500').then((r) => r.json()).catch(() => []),
    ]).then(([feat, allBeats]) => {
      setFeatured(Array.isArray(feat) ? feat : []);
      setAll(Array.isArray(allBeats) ? allBeats : []);
      setLoading(false);
    });
    return () => clearTimeout(burstTimer.current);
  }, []);

  const playable = useMemo(() => all.filter((b) => b.preview_url), [all]);
  const gridBeats = featured.length >= 4 ? featured.slice(0, 5) : all.slice(0, 5);

  const burstHead = () => {
    if (!playable.length) return;
    let pick = playable[Math.floor(Math.random() * playable.length)];
    if (current && playable.length > 1) {
      while (pick.id === current.id) pick = playable[Math.floor(Math.random() * playable.length)];
    }
    playBeat(pick, playable);
    setHasBursted(true);
    setBurst(true);
    clearTimeout(burstTimer.current);
    burstTimer.current = setTimeout(() => setBurst(false), 700);
  };

  return (
    <div>
      {/* ---------- HERO — the pitch ---------- */}
      <section className={`relative border-b border-slate-800/70 overflow-hidden ${burst ? 'burst-flash' : ''}`}>
        <div
          className="absolute inset-x-0 top-0 h-[620px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 45% at 50% 30%, rgba(46,149,255,0.10), transparent 70%)' }}
        />

        <div className="relative max-w-[1280px] mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-16 text-center">
          <div className="kicker rise">WAVES — Official press kit · Fuhad Adebambo</div>

          {/* Animated wave — travels the baseline start to end on a zigzag path */}
          <div className="wave-track rise w-full h-[220px] sm:h-[300px] -mb-2 sm:-mb-4">
            <div className="wave-mover">
              <div className="wave-zig">
                <img src="/media/wave-pulse.png" alt="WAVES — chrome soundwave" className="wave-img" draggable={false} />
              </div>
            </div>
          </div>

          <h1 className="rise rise-1 relative font-display font-semibold tracking-tight leading-[1.04] text-[38px] sm:text-6xl lg:text-[64px] text-white mb-5">
            I make works of art,
            <br />
            in <span className="text-sky-400">WAVS</span> form.
          </h1>

          <p className="rise rise-1 font-display text-lg sm:text-2xl text-slate-300 mb-2">
            The next big sound.
          </p>
          <p className="rise rise-1 text-[14px] sm:text-[15px] text-slate-500 max-w-md mx-auto mb-9">
            Don't believe me?
          </p>

          {/* THE button */}
          <div className="rise rise-2 flex flex-col items-center gap-4 mb-4">
            <button
              onClick={burstHead}
              disabled={loading || !playable.length}
              className={`group relative inline-flex items-center gap-3 font-display text-base sm:text-lg font-semibold rounded-2xl px-8 sm:px-10 py-4 sm:py-5 transition-all disabled:opacity-50 ${
                burst ? 'scale-[0.97]' : 'hover:scale-[1.02] active:scale-[0.98]'
              } bg-sky-500 text-white shadow-[0_8px_40px_rgba(46,149,255,0.35)] hover:bg-sky-400`}
            >
              <Zap size={19} className={burst ? 'burst-shake' : 'group-hover:rotate-12 transition-transform'} fill="currentColor" />
              {hasBursted ? 'Burst it again' : 'Let me burst your head'}
            </button>

            {/* now playing receipt */}
            {hasBursted && current && (
              <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl pl-2 pr-4 py-2 backdrop-blur-sm">
                <button
                  onClick={toggle}
                  className="relative w-9 h-9 rounded-lg overflow-hidden bg-slate-800 shrink-0"
                  aria-label={playing ? 'Pause' : 'Play'}
                >
                  <img src={current.artwork_url} alt="" className="w-full h-full object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                    {playing ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" className="ml-0.5" />}
                  </span>
                </button>
                <div className="text-left min-w-0">
                  <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-sky-400">Told you.</div>
                  <div className="text-[13px] font-semibold text-white truncate">
                    {current.title} · <span className="text-slate-500 font-mono text-[11px]">{current.bpm} BPM {current.genre}</span>
                  </div>
                </div>
                <Link to={`/records/${current.id}`} className="ml-2 text-[12px] font-semibold text-sky-400 hover:text-sky-300 shrink-0 inline-flex items-center gap-1">
                  Lease it <ArrowUpRight size={12} />
                </Link>
              </div>
            )}
          </div>

          <div className="rise rise-3 text-[12px] text-slate-600 font-mono">
            {playable.length ? `${playable.length} records in the chamber. Any one could be the one.` : ' '}
          </div>
        </div>
      </section>

      {/* ---------- EPK — who is WAVES ---------- */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-20 grid lg:grid-cols-[0.85fr_1.15fr] gap-10 lg:gap-16 items-center">
        <div className="relative rounded-2xl overflow-hidden border border-slate-800 aspect-[4/5] max-w-md mx-auto lg:mx-0 w-full">
          <img src="/media/portrait.jpg" alt="WAVES in the studio" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div className="absolute bottom-0 inset-x-0 p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-sky-400 mb-1">The lab</div>
            <div className="font-display text-lg font-semibold text-white">Where the WAVs get made</div>
          </div>
        </div>

        <div>
          <div className="kicker mb-3">The bio</div>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-white tracking-tight leading-tight mb-6">
            No co-signs. No placements.
            <br />
            <span className="text-slate-500">Just records that argue for themselves.</span>
          </h2>
          <div className="space-y-4 text-[15px] text-slate-400 leading-relaxed max-w-xl">
            <p>
              WAVES is the producer identity of <span className="text-white font-medium">Fuhad Adebambo</span> — a
              Lagos-bred beatmaker building a catalogue before the world catches up. Every record is treated like a
              pressing: composed, arranged and mixed to be someone's favourite song, not background noise.
            </p>
            <p>
              The range runs from log-drum Amapiano to 3AM R&B, drill-adjacent Trap to palmwine Afrobeats.
              You're early. That's the whole point.
            </p>
          </div>

          {/* fact sheet */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 max-w-xl">
            {[
              [<MapPin size={15} key="i" />, 'Based in', 'Lagos, NG'],
              [<Disc3 size={15} key="i" />, 'Catalogue', `${all.length || '60'}+ records`],
              [<AudioLines size={15} key="i" />, 'Genres', '4 lanes'],
              [<BadgeCheck size={15} key="i" />, 'Status', 'Available now'],
            ].map(([icon, label, value]) => (
              <div key={label} className="rounded-xl border border-slate-800 bg-slate-900/50 p-3.5">
                <div className="text-sky-400 mb-2">{icon}</div>
                <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-slate-500">{label}</div>
                <div className="text-[13px] font-semibold text-white mt-0.5">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- THE SOUND ---------- */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-20">
        <div className="kicker mb-2">The sound</div>
        <h2 className="font-display text-2xl sm:text-3xl font-semibold text-white mb-6">Four lanes, one signature</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {GENRE_TILES.map((g) => (
            <Link
              key={g.name}
              to={`/records?genre=${g.name}`}
              className="group relative rounded-2xl overflow-hidden border border-slate-800 hover:border-slate-600 transition-colors aspect-[4/3]"
            >
              <img src={g.img} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-75 group-hover:scale-[1.03] transition-all duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 p-5">
                <div className="font-display text-xl font-semibold text-white flex items-center gap-2">
                  {g.name}
                  <ArrowUpRight size={15} className="text-slate-400 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
                <div className="text-[12.5px] text-slate-400 mt-1">{g.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- PROOF OF WORK ---------- */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-20">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="kicker mb-2">Proof of work</div>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-white">Pulled from the vault</h2>
          </div>
          <Link to="/records" className="btn-ghost !py-2 !px-4 hidden sm:inline-flex">
            Full catalog <ArrowRight size={13} />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-slate-900 rounded-xl" />
                <div className="h-3.5 bg-slate-900 rounded mt-3 w-2/3" />
                <div className="h-2.5 bg-slate-900/70 rounded mt-2 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
            {gridBeats.map((b) => (
              <BeatCard key={b.id} beat={b} queue={gridBeats} />
            ))}
          </div>
        )}
      </section>

      {/* ---------- STORE CTA ---------- */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-20">
        <div className="relative rounded-2xl border border-sky-500/30 bg-gradient-to-b from-sky-950/40 to-slate-900/60 px-6 sm:px-10 py-10 sm:py-12 text-center overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 55% 65% at 50% 0%, rgba(46,149,255,0.14), transparent 70%)' }}
          />
          <div className="relative">
            <div className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-sky-400 border border-sky-500/30 bg-sky-500/10 rounded-full px-4 py-1.5 mb-5">
              <Store size={12} /> The beat store is open
            </div>
            <h2 className="font-display text-2xl sm:text-4xl font-semibold text-white mb-3 tracking-tight">
              Heard enough? Go get your record.
            </h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-7 leading-relaxed">
              {all.length || '60'}+ originals sorted by genre, mood and BPM. Every beat previews free —
              lease the ones that make you rewind.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link to="/records" className="btn-white !text-[15px] !px-8 !py-3.5">
                Enter the beat store <ArrowRight size={15} />
              </Link>
              <button onClick={burstHead} className="btn-ghost !px-6 !py-3.5">
                <Shuffle size={14} /> Play another random one
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- WORK WITH ME ---------- */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-20">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-10 lg:gap-14 items-start rounded-2xl border border-slate-800 bg-slate-900/40 px-6 sm:px-12 py-12 sm:py-14 overflow-hidden relative">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 45% 70% at 0% 50%, rgba(46,149,255,0.07), transparent 65%)' }}
          />
          <div className="relative lg:sticky lg:top-24">
            <h2 className="font-display text-4xl sm:text-5xl font-semibold text-white tracking-tight leading-[1.06] mb-5">
              Work with me
            </h2>
            <p className="font-display text-xl sm:text-2xl text-slate-300 leading-snug mb-4">
              Got a record in your head?
              <br />
              <span className="text-sky-400">Let&rsquo;s build it.</span>
            </p>
            <p className="text-sm sm:text-[15px] text-slate-400 max-w-sm leading-relaxed mb-8">
              Custom beats, full productions, exclusives. Send the brief — artist name, references,
              budget — and I&rsquo;ll send back the sound you couldn&rsquo;t describe.
            </p>
            <div className="space-y-3 max-w-sm hidden lg:block">
              {[
                ['01', 'Send the brief', 'Two minutes, tops.'],
                ['02', 'We talk', 'Direction, timeline, real quote.'],
                ['03', 'You get the record', 'Untagged WAVs + stems.'],
              ].map(([n, title, desc]) => (
                <div key={n} className="flex items-start gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                  <span className="font-mono text-[11px] text-sky-400 pt-0.5">{n}</span>
                  <div>
                    <div className="text-[14px] font-semibold text-white">{title}</div>
                    <div className="text-[13px] text-slate-500 mt-0.5">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative rounded-xl border border-slate-800 bg-slate-950/60 p-5 sm:p-7">
            <InquiryForm compact />
          </div>
        </div>
      </section>

    </div>
  );
}

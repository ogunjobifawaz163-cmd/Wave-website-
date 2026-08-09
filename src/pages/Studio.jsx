import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const SHOTS = [
  { src: '/media/studio1.jpg', cap: 'STUDIO/001 — THE DESK', sub: 'Where every WAVES record is mixed down' },
  { src: '/media/studio2.jpg', cap: 'STUDIO/002 — KEYS & TEXTURE', sub: 'Analog warmth, digital precision' },
  { src: '/media/studio3.jpg', cap: 'STUDIO/003 — THE CRATES', sub: 'Reference material within arm’s reach' },
];

export default function Studio() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-8">
      <div className="pt-10 pb-12">
        <div className="badge-ocean mb-3">BEHIND THE SCENES</div>
        <h1 className="font-display text-5xl sm:text-7xl font-bold text-white">The studio</h1>
        <p className="text-slate-300 text-base leading-relaxed max-w-xl mt-4">
          A dark room, a loud desk, and crates of reference records. This is where Afrobeats, R&B and Amapiano
          get pulled apart and pressed back together as one sound.
        </p>
      </div>

      {/* studio banner */}
      <section className="relative rounded-3xl border border-slate-800 overflow-hidden h-[46vh] min-h-[320px] mb-8 shadow-2xl">
        <img src="/media/studio1.jpg" alt="Inside the WAVES studio" className="absolute inset-0 w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/20" />
        <div className="absolute bottom-0 p-8">
          <div className="badge-ocean mb-2">THE LAB</div>
          <div className="font-display text-2xl sm:text-4xl font-bold text-white">Pressing process — always rolling</div>
        </div>
      </section>

      {/* gallery */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {SHOTS.map((s) => (
          <figure key={s.cap} className="group rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            <div className="h-72 overflow-hidden">
              <img
                src={s.src}
                alt={s.cap}
                loading="lazy"
                className="w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-[1.04] transition-all duration-700"
              />
            </div>
            <figcaption className="p-5 border-t border-slate-800">
              <div className="font-mono text-xs font-bold text-sky-400 uppercase">{s.cap}</div>
              <div className="text-xs text-slate-400 mt-1">{s.sub}</div>
            </figcaption>
          </figure>
        ))}
      </div>

      {/* sessions strip */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/60 mt-20 mb-24 grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800">
        <div className="p-8 sm:p-12">
          <div className="badge-ocean mb-4">STUDIO SESSIONS</div>
          <div className="font-display text-3xl font-bold text-white mb-4">Book the room, get the sound.</div>
          <p className="text-sm text-slate-300 leading-relaxed max-w-md">
            WAVES runs directed sessions each month — writing camps, single builds and EP production.
          </p>
        </div>
        <div className="p-8 sm:p-12 flex flex-col justify-center items-start gap-4">
          <div className="font-mono text-xs text-slate-400">
            Custom production · beat commissions · packs
          </div>
          <Link to="/work-with-waves" className="btn-ocean">
            Start a project <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </div>
  );
}

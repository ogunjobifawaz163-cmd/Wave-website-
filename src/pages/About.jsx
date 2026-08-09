import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';

const IDENTITY = [
  {
    n: '01',
    g: 'Afrobeats',
    d: 'Percussion-first records built for movement. Log-drum adjacent grooves, pidgin-ready pockets and melodies that feel like Lagos at 1AM.',
  },
  {
    n: '02',
    g: 'R&B',
    d: 'Late-session textures. Warm low-end, patient chords and space for a vocalist to confess something real over.',
  },
  {
    n: '03',
    g: 'Amapiano',
    d: 'Deep, rolling, soulful. Shakers that never stop, basslines that speak softly and chords that glow rather than shout.',
  },
];

export default function About() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-8">
      {/* hero */}
      <section className="pt-12 pb-16 grid lg:grid-cols-[1.2fr_0.8fr] gap-12 items-end">
        <div>
          <div className="badge-ocean mb-4">ABOUT THE PRODUCER</div>
          <h1 className="font-display text-5xl sm:text-7xl lg:text-8xl font-bold leading-[0.9] text-white">
            Sound, treated like <span className="italic text-sky-400">fine art.</span>
          </h1>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-xl mt-8">
            WAVES is the producer identity of <span className="text-white font-semibold">Fuhad Adebambo</span> — an Afrobeats,
            R&B and Amapiano producer with a crate-digger's ear and an architect's discipline. Versatile across
            genres, every record carries the same signature: percussion that breathes, low-end with posture, and space where the emotion lives.
          </p>
        </div>
        <div className="relative rounded-3xl border border-slate-800 h-[380px] lg:h-[460px] overflow-hidden shadow-2xl">
          <img src="/media/portrait.jpg" alt="Fuhad Adebambo — WAVES" className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent p-6">
            <div className="font-mono text-xs font-bold tracking-widest text-sky-400 uppercase">FUHAD ADEBAMBO — STUDIO A</div>
          </div>
        </div>
      </section>

      {/* identity */}
      <section className="border-t border-slate-800 pt-16 pb-8">
        <div className="badge-ocean mb-3">MUSICAL IDENTITY</div>
        <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mb-12">Three homes, one signature</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {IDENTITY.map((i) => (
            <div key={i.n} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-7 hover:border-sky-500/50 transition-colors">
              <div className="font-mono text-xs font-bold tracking-widest text-sky-400 mb-4">{i.n}</div>
              <div className="font-display text-2xl font-bold text-white mb-3">{i.g}</div>
              <p className="text-sm text-slate-400 leading-relaxed">{i.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* philosophy */}
      <section className="py-20 grid lg:grid-cols-2 gap-10">
        <div>
          <div className="badge-ocean mb-3">CREATIVE PHILOSOPHY</div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mb-8">The crate is the curriculum</h2>
          <div className="space-y-5 text-base text-slate-300 leading-relaxed max-w-lg">
            <p>
              Every WAVES record starts like a vinyl side: one idea worth committing to, pressed with intent.
              No beat leaves the hard drive until it can hold a room on its own — no topline, no features, no
              apology.
            </p>
            <p>
              Afrobeats taught the rhythm. R&B taught the restraint. Amapiano taught the patience. Everything
              else — drill, soul, highlife, house — is fair game when the record calls for it.
            </p>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-800 p-8 sm:p-10 flex flex-col justify-between bg-gradient-to-br from-slate-900 to-slate-950">
          <div className="font-display text-3xl sm:text-4xl leading-snug italic text-slate-100">
            “A beat is not finished when nothing more can be added — it's finished when the vocal already knows
            where to sit.”
          </div>
          <div className="font-mono text-xs font-bold tracking-widest uppercase text-sky-400 mt-8">— WAVES, session notes</div>
        </div>
      </section>

      {/* credits */}
      <section className="rounded-3xl border border-slate-800 p-8 sm:p-12 mb-24 flex flex-col md:flex-row md:items-center gap-8 justify-between bg-slate-900/60">
        <div>
          <div className="badge-ocean mb-2">PLACEMENTS & CREDITS</div>
          <div className="font-display text-2xl sm:text-3xl font-bold text-white">Full production credits available on request.</div>
          <p className="text-sm text-slate-400 mt-2 max-w-lg">
            For placement sheets, discography and co-production history, contact management directly.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 shrink-0">
          <Link to="/work-with-waves" className="btn-ocean">Work with WAVES <ArrowRight size={14} /></Link>
          <Link to="/records" className="btn-ghost">Hear the records</Link>
        </div>
      </section>
    </div>
  );
}

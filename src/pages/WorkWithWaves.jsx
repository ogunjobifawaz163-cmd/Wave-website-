import { Link } from 'react-router-dom';
import { ArrowRight, Music2 } from 'lucide-react';
import InquiryForm from '../components/InquiryForm';

export default function WorkWithWaves() {
  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
      <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-10 lg:gap-16 pt-12 sm:pt-16 pb-24 items-start">
        {/* Left — pitch */}
        <div className="lg:sticky lg:top-24">
          <div className="kicker mb-4">[ Work with me ]</div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold text-white tracking-tight leading-[1.05] mb-6">
            Got a record
            <br />
            in your head?
            <br />
            <span className="text-sky-400">Let’s build it.</span>
          </h1>
          <p className="text-[15px] text-slate-400 leading-relaxed max-w-md mb-8">
            Custom beats, full productions, exclusives — tell me what you’re hearing and I’ll send it back
            in WAVS form. Every inquiry lands directly on my desk. Replies within 48 hours.
          </p>

          <div className="space-y-3 max-w-md">
            {[
              ['01', 'Send the brief', 'Artist name, references, budget — two minutes, tops.'],
              ['02', 'We talk', 'I reply with direction, timeline and a real quote.'],
              ['03', 'You get the record', 'Untagged WAVs, stems, and a sound nobody else has.'],
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

          <Link to="/records" className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.15em] text-slate-500 hover:text-white transition-colors mt-8">
            <Music2 size={13} /> Or browse ready-made beats <ArrowRight size={12} />
          </Link>
        </div>

        {/* Right — form */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-9">
          <InquiryForm />
        </div>
      </div>
    </div>
  );
}

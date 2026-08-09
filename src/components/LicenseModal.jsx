import { useState } from 'react';
import { X, Check, Download, Mail, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { money, fmtDate } from '../lib/format';
import { generateInvoicePDF } from '../lib/invoice';

const TIERS = [
  {
    key: 'Basic Lease',
    mult: 1,
    tag: 'MP3 + WAV',
    points: ['Tagged MP3 + Untagged WAV files', 'Up to 50,000 streams', '1 music video', 'Non-exclusive', 'Credit “prod. WAVES”'],
  },
  {
    key: 'Premium Lease',
    mult: 2,
    tag: 'WAV + STEMS',
    points: ['Untagged WAV + trackout stems', 'Up to 250,000 streams', '2 music videos', 'Non-exclusive', 'Credit “prod. WAVES”'],
  },
  {
    key: 'Exclusive',
    mult: 5,
    tag: 'FULL OWNERSHIP',
    points: ['Full ownership transfer', 'All files incl. stems + trackouts', 'Unlimited streams + videos', 'Beat removed from store', 'Contract drafted by management'],
  },
];

export default function LicenseModal({ beat, onClose }) {
  const [tier, setTier] = useState(TIERS[0]);
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [project, setProject] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [invoice, setInvoice] = useState(null);

  const price = Math.round(Number(beat.price) * tier.mult);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required so management can reach you.');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError('That email address does not look right.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/leases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beat_id: beat.id,
          beat_title: beat.title,
          license_type: tier.key,
          price,
          name: name.trim(),
          email: email.trim(),
          project: project.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create the request');
      setInvoice({
        invoiceNumber: data.invoice_number,
        date: fmtDate(data.created_at || new Date().toISOString()),
        clientName: name.trim(),
        clientEmail: email.trim(),
        beatTitle: beat.title,
        license: tier.key,
        price,
      });
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-6 text-white">
      <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <div>
            <div className="badge-ocean">LICENSING AGREEMENT</div>
            <div className="font-display text-xl font-bold mt-1 text-white">{beat.title}</div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {step === 1 && (
            <>
              <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                Select a licence tier for <span className="text-white font-semibold">“{beat.title}”</span> ({beat.genre} · {beat.bpm} BPM).
                Generating an invoice locks this rate; management completes payment and stem delivery directly with you.
              </p>
              <div className="space-y-3">
                {TIERS.map((t) => {
                  const p = Math.round(Number(beat.price) * t.mult);
                  const active = tier.key === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setTier(t)}
                      className={`w-full text-left border rounded-2xl p-5 transition-all ${
                        active ? 'border-sky-500 bg-sky-500/10 shadow-2xl' : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <span className={`font-mono text-xs font-bold uppercase ${active ? 'text-sky-400' : 'text-white'}`}>
                              {t.key}
                            </span>
                            <span className="badge-ocean">{t.tag}</span>
                          </div>
                          <ul className="mt-3 space-y-1.5">
                            {t.points.map((pt) => (
                              <li key={pt} className="text-xs text-slate-300 flex items-center gap-2">
                                <Check size={12} className="text-sky-400 shrink-0" /> {pt}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="font-display text-2xl font-bold text-sky-400 shrink-0">{money(p)}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setStep(2)} className="btn-ocean w-full mt-6">
                Continue — {money(price)}
              </button>
            </>
          )}

          {step === 2 && (
            <form onSubmit={submit}>
              <button type="button" onClick={() => setStep(1)} className="font-mono text-xs font-bold text-slate-400 hover:text-white inline-flex items-center gap-1.5 mb-5">
                <ArrowLeft size={14} /> Back to licence tiers
              </button>
              <div className="border border-slate-800 rounded-2xl p-4 mb-5 flex items-center justify-between bg-slate-950/60">
                <div>
                  <div className="text-sm font-bold text-white">{beat.title}</div>
                  <div className="font-mono text-xs text-sky-400 uppercase mt-0.5">{tier.key}</div>
                </div>
                <div className="font-display text-xl font-bold text-sky-400">{money(price)}</div>
              </div>
              <div className="space-y-3">
                <input className="field" placeholder="Full name *" value={name} onChange={(e) => setName(e.target.value)} />
                <input className="field" type="email" placeholder="Email *" value={email} onChange={(e) => setEmail(e.target.value)} />
                <input className="field" placeholder="Project / artist name (optional)" value={project} onChange={(e) => setProject(e.target.value)} />
              </div>
              {error && <p className="text-rose-400 text-xs mt-3 font-mono">{error}</p>}
              <button type="submit" disabled={busy} className="btn-ocean w-full mt-6 disabled:opacity-60">
                {busy ? <Loader2 size={15} className="animate-spin" /> : null}
                Generate official invoice — {money(price)}
              </button>
              <p className="font-mono text-[10px] text-slate-400 mt-3 leading-relaxed text-center">
                Management will confirm your order and send master files upon payment confirmation.
              </p>
            </form>
          )}

          {step === 3 && invoice && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center mx-auto mb-5 border border-sky-500/40">
                <ShieldCheck size={28} />
              </div>
              <h3 className="font-display text-3xl font-bold mb-2 text-white">Invoice generated!</h3>
              <p className="text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
                Invoice <span className="text-sky-400 font-mono text-xs font-bold">{invoice.invoiceNumber}</span> for{' '}
                <span className="text-white">“{beat.title}”</span> ({invoice.license}) is registered. Download your invoice PDF below.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
                <button onClick={() => generateInvoicePDF(invoice)} className="btn-ocean">
                  <Download size={14} /> Download invoice PDF
                </button>
                <a
                  className="btn-ghost"
                  href={`mailto:management@waves.com.ng?subject=${encodeURIComponent(`Invoice ${invoice.invoiceNumber} — ${beat.title}`)}&body=${encodeURIComponent(`Hi WAVES management,\n\nI would like to finalise invoice ${invoice.invoiceNumber} for “${beat.title}” (${invoice.license} — ${money(price)}).\n\nName: ${invoice.clientName}\nEmail: ${invoice.clientEmail}\n\nThank you.`)}`}
                >
                  <Mail size={14} /> Contact management
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

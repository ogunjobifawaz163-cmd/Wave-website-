import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Loader2, AtSign } from 'lucide-react';

const LOOKING_FOR = [
  'A custom beat',
  'Full production — Single',
  'Full production — EP / Album',
  'Exclusive beat purchase',
  'Mixing / finishing a record',
  'Something else',
];

const BUDGETS = ['Under $500', '$500 – $1,000', '$1,000 – $2,500', '$2,500 – $5,000', '$5,000+', 'Let’s talk'];

export default function InquiryForm({ compact = false }) {
  const [form, setForm] = useState({
    artist_name: '',
    email: '',
    instagram: '',
    project: LOOKING_FOR[0],
    reference_artists: '',
    budget: BUDGETS[1],
    description: '',
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.artist_name.trim()) {
      setError('Artist name is required.');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
      setError('That email address does not look right.');
      return;
    }
    if (!form.description.trim()) {
      setError('Tell me about the record — the message field is required.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.artist_name.trim(),
          artist_name: form.artist_name.trim(),
          email: form.email.trim(),
          instagram: form.instagram.trim(),
          project: form.project,
          reference_artists: form.reference_artists.trim(),
          budget: form.budget,
          description: form.description.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className={`text-center ${compact ? 'py-8' : 'py-10'}`}>
        <div className="w-14 h-14 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/40 flex items-center justify-center mx-auto mb-6">
          <Check size={24} />
        </div>
        <h3 className="font-display text-2xl sm:text-3xl font-semibold text-white mb-3">Inquiry received.</h3>
        <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
          The record in your head is officially in motion. You’ll hear back at{' '}
          <span className="text-white font-medium">{form.email}</span> within 48 hours.
        </p>
        <div className="flex items-center justify-center gap-3 mt-8">
          <Link to="/records" className="btn-ocean">Browse beats meanwhile</Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      {!compact && (
        <>
          <div className="font-display text-lg font-semibold text-white mb-1">The inquiry</div>
          <p className="text-[13px] text-slate-500 mb-6">Fields marked * are required.</p>
        </>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500 block mb-1.5">Artist name *</label>
          <input className="field" placeholder="e.g. DAEZE" value={form.artist_name} onChange={set('artist_name')} />
        </div>
        <div>
          <label className="font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500 block mb-1.5">Email *</label>
          <input className="field" type="email" placeholder="you@email.com" value={form.email} onChange={set('email')} />
        </div>

        <div className="sm:col-span-2">
          <label className="font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500 block mb-1.5">Instagram</label>
          <div className="relative">
            <AtSign size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className="field !pl-9" placeholder="yourhandle" value={form.instagram} onChange={set('instagram')} />
          </div>
        </div>

        <div>
          <label className="font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500 block mb-1.5">What are you looking for? *</label>
          <select className="field" value={form.project} onChange={set('project')}>
            {LOOKING_FOR.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500 block mb-1.5">Budget</label>
          <select className="field" value={form.budget} onChange={set('budget')}>
            {BUDGETS.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500 block mb-1.5">Reference songs</label>
          <input
            className="field"
            placeholder="e.g. Tems — Free Mind, Asake — Lonely At The Top"
            value={form.reference_artists}
            onChange={set('reference_artists')}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500 block mb-1.5">Message *</label>
          <textarea
            className={`field resize-y ${compact ? 'min-h-[100px]' : 'min-h-[130px]'}`}
            placeholder="Describe the record in your head — mood, tempo, story, links…"
            value={form.description}
            onChange={set('description')}
          />
        </div>
      </div>

      {error && <p className="text-amber-400 text-xs mt-4 font-mono">{error}</p>}

      <button type="submit" disabled={busy} className="btn-ocean w-full mt-6 !py-3.5 disabled:opacity-60">
        {busy ? <Loader2 size={15} className="animate-spin" /> : null}
        {busy ? 'Sending…' : 'Send it — let’s build'}
      </button>
      <p className="font-mono text-[10px] text-slate-600 text-center mt-3">
        Goes straight to management. No spam, no mailing lists.
      </p>
    </form>
  );
}

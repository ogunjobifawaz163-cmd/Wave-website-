import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Lock, Mail, Eye, ArrowLeft, Play, Pause, Download, Loader2, Check, AlertTriangle } from 'lucide-react';
import { usePlayer, trackEvent } from '../lib/player';

function safeFileName(title, url) {
  const ext = (url.split('?')[0].split('.').pop() || 'mp3').toLowerCase();
  const cleanExt = /^[a-z0-9]{2,5}$/.test(ext) ? ext : 'mp3';
  return `${title.replace(/[^\w\s&'-]/g, '').trim()} (prod. WAVES).${cleanExt}`;
}

function PackBeatRow({ beat, queue, index, packName }) {
  const { current, playing, playBeat, toggle } = usePlayer();
  const isCurrent = current?.id === beat.id;
  const [dl, setDl] = useState('idle'); // idle | busy | done | error

  const download = async () => {
    if (!beat.preview_url || dl === 'busy') return;
    setDl('busy');
    try {
      const res = await fetch(beat.preview_url);
      if (!res.ok) throw new Error('download failed');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = safeFileName(beat.title, beat.preview_url);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      trackEvent('pack_download', beat.id, `Pack download — ${beat.title} (${packName})`);
      setDl('done');
      setTimeout(() => setDl('idle'), 2500);
    } catch {
      // fallback: open in a new tab if CORS blocks blob download
      window.open(beat.preview_url, '_blank', 'noopener');
      setDl('idle');
    }
  };

  return (
    <div
      className={`group grid grid-cols-[auto_auto_1fr_auto] sm:grid-cols-[28px_44px_1fr_auto_auto] items-center gap-3 sm:gap-4 py-2.5 px-3 transition-colors hover:bg-white/[0.025] ${
        isCurrent ? 'bg-white/[0.03]' : ''
      }`}
    >
      <div className="font-mono text-xs text-slate-600 w-7 text-right hidden sm:block tabular-nums">
        {String((index ?? 0) + 1).padStart(2, '0')}
      </div>

      <button
        onClick={() => (isCurrent ? toggle() : playBeat(beat, queue || [beat]))}
        className="relative w-11 h-11 shrink-0 rounded-lg overflow-hidden bg-slate-900"
        aria-label="Play"
      >
        <img src={beat.artwork_url} alt="" className="w-full h-full object-cover" loading="lazy" />
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity ${
            isCurrent ? 'opacity-100 bg-black/60 text-sky-400' : 'opacity-0 group-hover:opacity-100 bg-black/60 text-white'
          }`}
        >
          {isCurrent && playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" className="ml-0.5" />}
        </div>
      </button>

      <div className="min-w-0">
        <div className={`text-[13.5px] font-semibold truncate transition-colors ${isCurrent ? 'text-sky-400' : 'text-white'}`}>
          {beat.title}
        </div>
        <div className="font-mono text-[11px] text-slate-500 mt-0.5 truncate">
          {beat.bpm} BPM · {beat.genre}
          {beat.collaborators ? ` · w/ ${beat.collaborators}` : ''}
        </div>
      </div>

      <div className="hidden md:block font-mono text-[10px] uppercase tracking-wide text-slate-600">
        Reference only
      </div>

      <button
        onClick={download}
        disabled={dl === 'busy'}
        className={`justify-self-end inline-flex items-center gap-1.5 text-[12.5px] font-semibold rounded-lg px-3 py-1.5 transition-colors ${
          dl === 'done'
            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40'
            : 'bg-sky-500 text-white hover:bg-sky-400'
        }`}
        title="Download the tagged reference file"
      >
        {dl === 'busy' ? <Loader2 size={13} className="animate-spin" /> : dl === 'done' ? <Check size={13} /> : <Download size={13} />}
        <span className="hidden sm:inline">{dl === 'done' ? 'Saved' : 'Download'}</span>
      </button>
    </div>
  );
}

export default function PackPage() {
  const { slug } = useParams();
  const [pack, setPack] = useState(null);
  const [beats, setBeats] = useState([]);
  const [state, setState] = useState('loading');

  useEffect(() => {
    setState('loading');
    fetch(`/api/packs?slug=${encodeURIComponent(slug)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error('not found');
        return r.json();
      })
      .then((d) => {
        setPack(d.pack);
        setBeats(d.beats || []);
        setState('ready');
      })
      .catch(() => setState('missing'));
  }, [slug]);

  if (state === 'loading') {
    return (
      <div className="max-w-[1000px] mx-auto px-4 sm:px-8 pt-16">
        <div className="h-8 bg-slate-800 animate-pulse w-64 mb-4 rounded-lg" />
        <div className="h-12 bg-slate-800 animate-pulse w-96 mb-10 rounded-lg" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-slate-800 animate-pulse mb-2 rounded-xl" />
        ))}
      </div>
    );
  }

  if (state === 'missing') {
    return (
      <div className="max-w-[800px] mx-auto px-4 sm:px-8 pt-24 text-center">
        <Lock size={32} className="mx-auto text-sky-400 mb-6" />
        <h1 className="font-display text-4xl font-bold mb-3 text-white">This private pack link is invalid.</h1>
        <p className="text-slate-400 text-sm mb-8">It may have been rotated or removed by management.</p>
        <Link to="/" className="btn-ocean inline-flex">Back to home</Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto px-4 sm:px-8">
      <div className="pt-8 pb-8">
        <Link to="/" className="font-mono text-xs font-semibold text-slate-400 hover:text-sky-400 inline-flex items-center gap-2">
          <ArrowLeft size={14} /> WAVES STORE
        </Link>
      </div>

      <div className="grid md:grid-cols-[240px_1fr] gap-8 mb-8">
        <div className="grid grid-cols-2 rounded-2xl overflow-hidden border border-slate-800 aspect-square bg-slate-900 shadow-2xl">
          {beats.slice(0, 4).map((b) => (
            <img key={b.id} src={b.artwork_url} alt="" className="w-full h-full object-cover" />
          ))}
          {beats.length === 0 && <div className="col-span-2" />}
        </div>
        <div className="flex flex-col justify-end">
          <div className="badge-ocean mb-3 inline-flex items-center gap-1.5">
            <Lock size={11} /> PRIVATE PACK · INVITE ONLY
          </div>
          <h1 className="font-display text-4xl sm:text-6xl font-bold text-white mb-4">{pack.name}</h1>
          <div className="font-mono text-xs text-slate-400 flex items-center gap-4">
            <span>{beats.length} records</span>
            <span className="inline-flex items-center gap-1.5"><Eye size={12} /> {pack.views || 0} opens</span>
            <span className="inline-flex items-center gap-1.5"><Download size={12} /> Free reference downloads</span>
          </div>
        </div>
      </div>

      {/* DSP clearance warning */}
      <div className="flex items-start gap-3.5 rounded-2xl border border-amber-500/40 bg-amber-500/[0.07] p-4 sm:p-5 mb-8">
        <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
        <div>
          <div className="text-[13.5px] font-semibold text-amber-300">
            Reference use only — do not release without clearance.
          </div>
          <p className="text-[12.5px] text-slate-400 leading-relaxed mt-1 max-w-2xl">
            These downloads are for writing, demos and internal playback. Do <span className="text-slate-200 font-medium">not</span> upload
            records made with these beats to Spotify, Apple Music, YouTube, or any DSP / streaming platform until the beat is cleared
            and licensed with WAVES management. Uncleared releases will be taken down.
          </p>
        </div>
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-2 divide-y divide-slate-800/60">
        {beats.map((b, i) => (
          <PackBeatRow key={b.id} beat={b} queue={beats} index={i} packName={pack.name} />
        ))}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 mt-10 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-6 justify-between">
        <div>
          <div className="font-display text-xl font-bold text-white mb-1">Ready to clear a record?</div>
          <p className="text-xs text-slate-300 max-w-md">
            Reply with the record name(s) and your release plan — management handles clearance, licensing and untagged files directly.
          </p>
        </div>
        <a
          href={`mailto:management@waves.com.ng?subject=${encodeURIComponent(`${pack.name} — clearance request`)}`}
          className="btn-ocean shrink-0"
        >
          <Mail size={14} /> Request clearance
        </a>
      </div>
      <div className="h-20" />
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import {
  Loader2, Check, AlertTriangle, Copy, Cloud, Key, FolderPlus, Globe, ShieldCheck,
  ExternalLink, Lock, Trash2, Eye, EyeOff, Save,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const STEPS = [
  { key: 'verify_token', label: 'Verifying Cloudflare token', icon: Key },
  { key: 'create_bucket', label: 'Creating R2 bucket', icon: FolderPlus },
  { key: 'set_cors', label: 'Setting CORS policy', icon: ShieldCheck },
  { key: 'create_r2_token', label: 'Generating R2 access keys', icon: Cloud },
  { key: 'enable_public', label: 'Enabling public access', icon: Globe },
  { key: 'save_config', label: 'Saving credentials to database', icon: Save },
];

export default function R2SetupWizard({ onClose }) {
  const { session } = useAuth();
  const [cfApiToken, setCfApiToken] = useState('');
  const [accountId, setAccountId] = useState('');
  const [bucketName, setBucketName] = useState('waves');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [tokenDiscarded, setTokenDiscarded] = useState(false);
  const [savedToDb, setSavedToDb] = useState(false);
  const modalRef = useRef(null);

  const token = session?.access_token;

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Handle Escape key
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !running) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [running, onClose]);

  const handleSetup = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setRunning(true);

    try {
      // Step 1: Run the R2 setup on Cloudflare
      const res = await fetch('/api/setup-r2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ cfApiToken, accountId, bucketName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Setup failed');

      // --- SECURITY: Immediately discard the master Cloudflare token from memory ---
      setCfApiToken('');
      setTokenDiscarded(true);
      setShowToken(false);

      // Step 2: Save the R2 credentials directly to the database
      let saveResult = null;
      try {
        const saveRes = await fetch('/api/config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ secrets: data.secrets }),
        });
        saveResult = await saveRes.json();
        if (saveRes.ok) {
          setSavedToDb(true);
          saveResult = { saved: true, keys: saveResult.saved };
        } else {
          saveResult = { saved: false, error: saveResult.error };
        }
      } catch (err) {
        saveResult = { saved: false, error: err.message };
      }

      // Add the save step to the steps list
      const allSteps = [
        ...data.steps,
        {
          step: 'save_config',
          status: saveResult.saved ? 'done' : 'warning',
          message: saveResult.saved
            ? `R2 credentials saved to database — uploads are now active.`
            : `Could not auto-save: ${saveResult.error}. Copy the keys manually into the Secrets tab.`,
        },
      ];

      setResult({ ...data, steps: allSteps });
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  const copy = (key, value) => {
    navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const copyAll = () => {
    if (!result) return;
    const text = Object.entries(result.secrets)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied('all');
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget && !running) onClose(); }}
    >
      <div
        ref={modalRef}
        className="relative bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full my-4 sm:my-8 shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 sm:p-6 border-b border-slate-800 bg-slate-900 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shrink-0">
              <Cloud size={20} className="text-orange-400" />
            </div>
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-white">R2 Setup Wizard</h2>
              <p className="text-[11px] sm:text-xs text-slate-400">Automated Cloudflare R2 connection</p>
            </div>
          </div>
          <button
            onClick={() => !running && onClose()}
            disabled={running}
            className="text-slate-500 hover:text-white disabled:opacity-30 transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="p-5 sm:p-6 max-h-[calc(100vh-180px)] overflow-y-auto">
          {!result && (
            <>
              {/* Security notice */}
              <div className="rounded-xl bg-slate-950 border border-slate-700 p-4 mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <Lock size={14} className="text-sky-400" />
                  <span className="text-[12px] font-semibold text-sky-300">How this works</span>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 w-5 h-5 rounded-full bg-orange-500/15 border border-orange-500/40 flex items-center justify-center shrink-0">
                      <span className="text-[9px] font-bold text-orange-400">1</span>
                    </div>
                    <div className="text-[12px] text-slate-400 leading-relaxed">
                      <span className="text-orange-300 font-medium">Master Cloudflare token</span> — used once to create the bucket and generate R2 keys.
                      <span className="text-slate-200"> Never stored.</span> Erased from memory the moment setup completes.
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center shrink-0">
                      <span className="text-[9px] font-bold text-emerald-400">2</span>
                    </div>
                    <div className="text-[12px] text-slate-400 leading-relaxed">
                      <span className="text-emerald-300 font-medium">R2 credentials</span> — scoped to just this bucket. Saved to the database automatically.
                      <span className="text-slate-200"> Uploads go live immediately.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="rounded-xl bg-sky-500/5 border border-sky-500/20 p-4 mb-5">
                <div className="text-[13px] font-semibold text-sky-300 mb-2">Create your Cloudflare API token</div>
                <p className="text-[12px] text-slate-400 leading-relaxed mb-3">
                  Go to Cloudflare → My Profile → API Tokens → Create Custom Token. Add these two permissions:
                </p>
                <div className="space-y-1.5 text-[12px] text-slate-300">
                  <div className="flex items-center gap-2"><Check size={13} className="text-emerald-400" /> Account → <span className="font-mono text-slate-200">Workers R2 Storage</span> → Edit</div>
                  <div className="flex items-center gap-2"><Check size={13} className="text-emerald-400" /> User → <span className="font-mono text-slate-200">API Tokens</span> → Edit</div>
                </div>
                <a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-1.5 text-[12px] text-sky-400 hover:text-sky-300 mt-3 font-medium">
                  Open Cloudflare API Tokens <ExternalLink size={12} />
                </a>
              </div>

              <form onSubmit={handleSetup} className="space-y-4">
                {/* Master Cloudflare token */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[12px] font-semibold text-orange-300 flex items-center gap-1.5">
                      <Key size={12} /> Cloudflare API Token
                      <span className="text-[9px] font-mono uppercase tracking-wider bg-orange-500/15 text-orange-400 border border-orange-500/30 rounded px-1.5 py-0.5">Setup only · Not stored</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1"
                    >
                      {showToken ? <><EyeOff size={11} /> Hide</> : <><Eye size={11} /> Show</>}
                    </button>
                  </div>
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={cfApiToken}
                    onChange={(e) => setCfApiToken(e.target.value)}
                    placeholder="Paste your Cloudflare API token"
                    required
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-[14px] text-white placeholder-slate-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-colors font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Used once to create the bucket + R2 keys, then erased.</p>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-slate-300 mb-1.5">Cloudflare Account ID</label>
                  <input
                    type="text"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    placeholder="e.g. a1b2c3d4e5f6..."
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-[14px] text-white placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-colors font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Found in the Cloudflare dashboard sidebar (right side)</p>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-slate-300 mb-1.5">Bucket Name</label>
                  <input
                    type="text"
                    value={bucketName}
                    onChange={(e) => setBucketName(e.target.value.replace(/[^a-z0-9-]/gi, '-').toLowerCase())}
                    placeholder="waves"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-[14px] text-white placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-colors font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Lowercase letters, numbers, and hyphens only</p>
                </div>

                {error && (
                  <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 flex items-start gap-2">
                    <AlertTriangle size={15} className="text-rose-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-[12px] font-semibold text-rose-300">Setup failed</div>
                      <div className="text-[12px] text-slate-400 mt-0.5">{error}</div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={running || !cfApiToken || !accountId}
                  className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-[14px] rounded-lg py-3.5 transition-colors flex items-center justify-center gap-2"
                >
                  {running ? (
                    <><Loader2 size={16} className="animate-spin" /> Setting up R2…</>
                  ) : (
                    <><Cloud size={16} /> Automate R2 Setup</>
                  )}
                </button>
              </form>

              {running && (
                <div className="mt-6 space-y-2">
                  {STEPS.map((s) => (
                    <div key={s.key} className="flex items-center gap-3 text-[13px]">
                      <Loader2 size={14} className="animate-spin text-sky-400" />
                      <span className="text-slate-400">{s.label}…</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Success result */}
          {result && (
            <div>
              {/* Token discarded + saved confirmation */}
              {tokenDiscarded && savedToDb && (
                <div className="flex items-center gap-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-3.5 mb-5">
                  <Check size={15} className="text-emerald-400 shrink-0" />
                  <div className="text-[12px] text-slate-300 leading-relaxed">
                    <span className="font-semibold text-emerald-300">Setup complete.</span>{' '}
                    Master token discarded. R2 credentials saved to database. Uploads are now live.
                  </div>
                </div>
              )}
              {tokenDiscarded && !savedToDb && (
                <div className="flex items-center gap-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 p-3.5 mb-5">
                  <AlertTriangle size={15} className="text-amber-400 shrink-0" />
                  <div className="text-[12px] text-slate-300 leading-relaxed">
                    Master token discarded. Credentials couldn't be auto-saved — copy them manually into the Secrets tab below.
                  </div>
                </div>
              )}

              {/* Steps summary */}
              <div className="space-y-2 mb-5">
                {result.steps.map((s, i) => {
                  const isWarning = s.status === 'warning';
                  return (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${
                      isWarning ? 'bg-amber-500/5 border border-amber-500/20' : 'bg-emerald-500/5 border border-emerald-500/20'
                    }`}>
                      <div className={`mt-0.5 shrink-0 ${isWarning ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {isWarning ? <AlertTriangle size={15} /> : <Check size={15} />}
                      </div>
                      <div>
                        <div className={`text-[12px] font-semibold ${isWarning ? 'text-amber-300' : 'text-emerald-300'}`}>
                          {STEPS[i]?.label || s.step}
                        </div>
                        <div className="text-[12px] text-slate-400 mt-0.5">{s.message}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {result.corsNote && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 mb-5">
                  <div className="text-[12px] font-semibold text-amber-300 mb-1">⚠️ Manual CORS step needed</div>
                  <div className="text-[12px] text-slate-400">{result.corsNote}</div>
                </div>
              )}

              {/* R2 Credentials — for reference / manual fallback */}
              <div className={`rounded-xl bg-slate-950 border p-5 mb-3 ${savedToDb ? 'border-slate-700' : 'border-emerald-500/30'}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className={savedToDb ? 'text-slate-500' : 'text-emerald-400'} />
                    <h3 className="font-display text-[15px] font-bold text-white">R2 Credentials</h3>
                  </div>
                  {savedToDb ? (
                    <span className="text-[9px] font-mono uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded px-1.5 py-0.5">
                      Saved to DB ✓
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded px-1.5 py-0.5">
                      Scoped to bucket
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-slate-400 mb-4 leading-relaxed">
                  {savedToDb
                    ? 'These are saved in the database — shown here for your records. No manual action needed.'
                    : 'Copy these 5 values into the Secrets tab, then redeploy.'
                  }
                </p>
                <div className="space-y-3">
                  {Object.entries(result.secrets).map(([key, value]) => (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-mono font-semibold text-sky-400">{key}</label>
                        <button
                          onClick={() => copy(key, String(value))}
                          className="text-[11px] text-slate-400 hover:text-sky-400 flex items-center gap-1 transition-colors"
                        >
                          {copied === key ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                        </button>
                      </div>
                      <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-[12px] font-mono text-slate-300 break-all select-all">
                        {String(value)}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={copyAll}
                  className="w-full mt-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[13px] rounded-lg py-2.5 transition-colors flex items-center justify-center gap-2 border border-slate-700"
                >
                  {copied === 'all' ? <><Check size={14} /> All copied!</> : <><Copy size={14} /> Copy all 5 at once</>}
                </button>
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => { setResult(null); setError(''); setTokenDiscarded(false); setSavedToDb(false); }}
                  className="flex-1 btn-ghost !py-3"
                >
                  Run again
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 bg-sky-500 hover:bg-sky-400 text-white font-semibold text-[14px] rounded-lg py-3 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

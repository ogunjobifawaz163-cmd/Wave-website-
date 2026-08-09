import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Loader2, ShieldCheck } from 'lucide-react';
import supabase from '../lib/supabase';
import { signInWithGoogle } from '../lib/googleAuth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (!supabase) throw new Error('Auth is not configured.');
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) throw err;
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Sign in failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 pt-10">
      <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={24} />
          </div>
          <div className="font-display text-2xl font-bold text-white">Management Console</div>
          <div className="badge-ocean mt-2 inline-flex items-center gap-1.5">
            <Lock size={10} /> WAVES HQ INTERNAL
          </div>
        </div>

        <div>
          <form onSubmit={submit} className="space-y-3">
            <input className="field" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="field" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            {error && <p className="text-rose-400 text-xs font-mono">{error}</p>}
            <button type="submit" disabled={busy} className="btn-ocean w-full disabled:opacity-60">
              {busy ? <Loader2 size={14} className="animate-spin" /> : null}
              Sign in to HQ
            </button>
          </form>

          <div className="flex items-center gap-4 my-5">
            <div className="h-px bg-slate-800 flex-1" />
            <span className="font-mono text-xs uppercase text-slate-500">or</span>
            <div className="h-px bg-slate-800 flex-1" />
          </div>

          <button onClick={() => signInWithGoogle('WAVES Management')} className="btn-ghost w-full">
            Sign in with Google
          </button>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="font-mono text-xs font-bold text-sky-400 uppercase mb-1">Demo Access</div>
            <div className="font-mono text-xs text-slate-300 leading-relaxed">
              Email: mgmt@waves.com
              <br />
              Pass: wavesmgmt1
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

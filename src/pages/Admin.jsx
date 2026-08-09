import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import {
  LayoutDashboard, Disc3, Upload, Package, FileSignature, Inbox, LogOut, Pencil, Trash2, Plus, Copy, Check,
  FileDown, Loader2, X, Lock, Heart, Play, ShieldCheck, FolderGit2, FolderOpen, FolderPlus, Tag, Eye, Globe,
  ArrowLeft, ChevronRight, Music, Smartphone, Image as ImageIcon, Music2, FileAudio, FileArchive,
  Search, ExternalLink, ChevronDown, ArrowUp, ArrowDown, Link2, Download, FolderArchive, Cloud, Zap
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { money, timeAgo, fmtDate, catalogNo } from '../lib/format';
import { generateInvoicePDF } from '../lib/invoice';
import { uploadToR2, masterRefR2, validateAudioFileFrontend, getStorageStatus } from '../lib/r2';
import R2SetupWizard from '../components/R2SetupWizard';

const COMMON_GENRES = ['Afrobeats', 'Trap', 'Amapiano', 'R&B', 'Drill', 'Dancehall', 'Soul', 'Highlife', 'Other'];
const IMAGE_ACCEPT_STRING = '.jpg,.jpeg,.png,.webp,.gif,.avif,image/*';
// NOTE: deliberately NO `accept` filter on audio inputs.
// iOS's Files picker greys out legitimate audio files (DAW exports, AirDropped
// tracks, files without clean extensions) when any accept filter is present.
// Instead we allow every file to be picked and validate in code —
// validateAudioFileFrontend() + the server reject anything that isn't audio.
const AUDIO_ACCEPT_STRING = undefined;
const EMOTIONS_OPTIONS = [
  'Dark', 'Energetic', 'Soulful', 'Hard', 'Chill', 'Romantic', 'Melancholic', 'Deep', 'Euphoric', 'Rhythmic', 'Uplifting', 'Raw', 'Experimental'
];

const TABS = [
  { key: 'folders', label: 'Beat Folders', icon: FolderGit2 },
  { key: 'beats', label: 'Beats Store', icon: Disc3 },
  { key: 'upload', label: 'Upload Record', icon: Upload },
  { key: 'packs', label: 'Private Packs', icon: Package },
  { key: 'leases', label: 'Lease Orders', icon: FileSignature },
  { key: 'requests', label: 'Briefs', icon: Inbox },
  { key: 'overview', label: 'Analytics', icon: LayoutDashboard },
];

function isImageFile(file) {
  if (!file) return false;
  if (file.type && file.type.startsWith('image/')) return true;
  return /\.(jpg|jpeg|png|webp|gif|avif|heic|heif)$/i.test(file.name);
}

export default function Admin() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-sky-400" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Dashboard />;
}

function Dashboard() {
  const { user, getToken, signOut } = useAuth();
  const [tab, setTab] = useState('folders');
  const [beats, setBeats] = useState([]);
  const [folders, setFolders] = useState([]);
  const [packs, setPacks] = useState([]);
  const [leases, setLeases] = useState([]);
  const [requests, setRequests] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showR2Wizard, setShowR2Wizard] = useState(false);

  const authed = useCallback(
    async (path, options = {}) => {
      const token = await getToken();
      const res = await fetch(path, {
        ...options,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Request failed');
      return data;
    },
    [getToken]
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [b, f, p, l, r, e] = await Promise.all([
        authed('/api/beats?admin=1&limit=500'),
        authed('/api/folders?admin=1'),
        authed('/api/packs'),
        authed('/api/leases'),
        authed('/api/requests'),
        authed('/api/track'),
      ]);
      setBeats(Array.isArray(b) ? b : []);
      setFolders(Array.isArray(f) ? f : []);
      setPacks(Array.isArray(p) ? p : []);
      setLeases(Array.isArray(l) ? l : []);
      setRequests(Array.isArray(r) ? r : []);
      setEvents(Array.isArray(e) ? e : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authed]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const stats = useMemo(() => {
    const pub = beats.filter((b) => b.availability !== 'private');
    const priv = beats.filter((b) => b.availability === 'private');
    const avail = beats.filter((b) => b.availability === 'available');
    const totalPlays = beats.reduce((s, b) => s + (b.play_count || 0), 0);
    const totalFavs = beats.reduce((s, b) => s + (b.favorite_count || 0), 0);
    const packViews = packs.reduce((s, p) => s + (p.views || 0), 0);
    const inquiries = events.filter((e) => e.type === 'inquiry').length;
    const uniq = new Set(events.filter((e) => e.type === 'play').map((e) => e.visitor)).size;
    return { total: beats.length, pub: pub.length, priv: priv.length, avail: avail.length, totalPlays, totalFavs, packViews, inquiries, uniq };
  }, [beats, packs, events]);

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-8 pt-6 pb-24">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8">
        <div>
          <div className="badge-ocean mb-2 inline-flex items-center gap-1.5">
            <ShieldCheck size={12} /> BEAT FOLDERS HQ
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-white leading-none">WAVES Console</h1>
          <div className="font-mono text-xs text-slate-400 mt-2">{user.email}</div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <a
            href="/downloads/waves-beats-project.zip"
            download
            className="btn-ghost !py-2.5 !px-4 !border-sky-500/50 !text-sky-400 hover:!bg-sky-500/10"
            title="Download full project source code"
          >
            <Download size={13} /> Source Code
          </a>
          <Link to="/" className="btn-ghost !py-2.5 !px-4">View Site</Link>
          <button onClick={signOut} className="btn-ghost !py-2.5 !px-4 !border-rose-500/50 !text-rose-400 hover:!text-white">
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto border-b border-slate-800 mb-8 pb-px">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`font-sans text-xs font-semibold px-4 py-3 rounded-full inline-flex items-center gap-2 whitespace-nowrap transition-colors ${
                tab === t.key ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/50 bg-rose-500/10 text-rose-300 font-mono text-xs p-4 mb-6">{error}</div>
      )}

      {loading ? (
        <div className="py-24 flex justify-center">
          <Loader2 size={28} className="animate-spin text-sky-400" />
        </div>
      ) : (
        <>
          {tab === 'folders' && <FoldersTab folders={folders} beats={beats} authed={authed} reload={loadAll} />}
          {tab === 'beats' && <BeatsTab beats={beats} folders={folders} authed={authed} reload={loadAll} />}
          {tab === 'upload' && <UploadTab folders={folders} authed={authed} reload={loadAll} onOpenR2Wizard={() => setShowR2Wizard(true)} />}
          {tab === 'packs' && <PacksTab beats={beats} packs={packs} authed={authed} reload={loadAll} />}
          {tab === 'leases' && <LeasesTab leases={leases} authed={authed} reload={loadAll} />}
          {tab === 'requests' && <RequestsTab requests={requests} authed={authed} reload={loadAll} />}
          {tab === 'overview' && <Overview stats={stats} beats={beats} events={events} leases={leases} requests={requests} />}
        </>
      )}

      {showR2Wizard && <R2SetupWizard onClose={() => setShowR2Wizard(false)} />}
    </div>
  );
}

/* ------------------------------ INTERACTIVE BEAT FOLDERS TAB ------------------------------ */
function FoldersTab({ folders, beats, authed, reload }) {
  const [activeFolderId, setActiveFolderId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAddExistingModal, setShowAddExistingModal] = useState(false);

  const [folderName, setFolderName] = useState('');
  const [folderGenre, setFolderGenre] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const activeFolder = useMemo(
    () => folders.find((f) => Number(f.id) === Number(activeFolderId)),
    [folders, activeFolderId]
  );

  const beatsInActiveFolder = useMemo(
    () => beats.filter((b) => Number(b.folder_id) === Number(activeFolderId)),
    [beats, activeFolderId]
  );

  const unassignedBeats = useMemo(
    () => beats.filter((b) => !b.folder_id || Number(b.folder_id) !== Number(activeFolderId)),
    [beats, activeFolderId]
  );

  const createFolder = async (e) => {
    e.preventDefault();
    setError('');
    if (!folderName.trim()) return setError('Folder name is required.');
    setBusy(true);
    try {
      await authed('/api/folders', {
        method: 'POST',
        body: JSON.stringify({
          name: folderName.trim(),
          genre: folderGenre.trim() || 'Afrobeats',
        }),
      });
      setFolderName('');
      setFolderGenre('');
      setShowCreate(false);
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const deleteFolder = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Delete this folder? Beats inside will become unassigned.')) return;
    try {
      await authed('/api/folders', { method: 'DELETE', body: JSON.stringify({ id }) });
      if (activeFolderId === id) setActiveFolderId(null);
      await reload();
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleBeatVisibility = async (beat) => {
    const isPrivate = beat.availability === 'private';
    const nextAvailability = isPrivate ? 'available' : 'private';
    try {
      await authed('/api/beats', {
        method: 'PUT',
        body: JSON.stringify({ id: beat.id, availability: nextAvailability }),
      });
      await reload();
    } catch (err) {
      alert(err.message);
    }
  };

  const moveBeatToFolder = async (beatId, targetFolderId) => {
    try {
      const targetBeat = beats.find((b) => Number(b.id) === Number(beatId));
      const genreToUse = activeFolder?.genre || targetBeat?.genre || 'Afrobeats';
      await authed('/api/beats', {
        method: 'PUT',
        body: JSON.stringify({ id: beatId, folder_id: targetFolderId, genre: genreToUse }),
      });
      await reload();
    } catch (err) {
      alert(err.message);
    }
  };

  const removeBeatFromFolder = async (beatId) => {
    try {
      await authed('/api/beats', {
        method: 'PUT',
        body: JSON.stringify({ id: beatId, folder_id: null }),
      });
      await reload();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-[#16181f] border border-slate-800 rounded-3xl p-6">
        <div>
          <div className="badge-ocean mb-2">CRATE & FOLDER MANAGEMENT</div>
          <h2 className="font-display text-2xl font-bold text-white">Clickable Beat Folders</h2>
          <p className="text-slate-300 text-xs mt-1 max-w-xl">
            Click any folder to inspect its beats. Upload audio files (.mp3, .wav, .m4a) directly into folders and toggle public vs private vault visibility.
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-ocean">
          <FolderPlus size={15} /> Create New Folder
        </button>
      </div>

      {/* Modal: Create New Folder */}
      {showCreate && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 text-white">
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="font-display text-xl font-bold">New Beat Folder</div>
              <button onClick={() => setShowCreate(false)} className="p-2 text-slate-400 hover:text-white"><X size={18} /></button>
            </div>

            <form onSubmit={createFolder} className="space-y-4">
              <div>
                <label className="font-mono text-xs font-bold text-slate-400 uppercase mb-1 block">Folder Name *</label>
                <input
                  className="field"
                  placeholder="e.g. Afrobeats Gold, Dark Drill Vault, Melodic Amapiano"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                />
              </div>

              <div>
                <label className="font-mono text-xs font-bold text-slate-400 uppercase mb-1 block">Custom Typed Genre *</label>
                <input
                  className="field"
                  placeholder="Type any genre name: Afrobeats, Trap, Amapiano, R&B, Drill, Lofi…"
                  value={folderGenre}
                  onChange={(e) => setFolderGenre(e.target.value)}
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-500 self-center">Quick type:</span>
                  {COMMON_GENRES.map((g) => (
                    <button
                      type="button"
                      key={g}
                      onClick={() => setFolderGenre(g)}
                      className="text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-sky-300 px-2 py-0.5 rounded border border-slate-700"
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-rose-400 text-xs font-mono">{error}</p>}

              <button type="submit" disabled={busy} className="btn-ocean w-full">
                {busy ? <Loader2 size={14} className="animate-spin" /> : null} Create Folder
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ACTIVE CLICKED FOLDER VIEW */}
      {activeFolder ? (
        <div className="rounded-3xl border border-sky-500/40 bg-slate-900/90 p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <button
              onClick={() => setActiveFolderId(null)}
              className="font-mono text-xs font-bold text-sky-400 hover:text-sky-300 inline-flex items-center gap-1.5"
            >
              <ArrowLeft size={14} /> Back to all folders
            </button>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowUploadModal(true)}
                className="btn-ocean !py-2 !px-4 !text-xs"
              >
                <Smartphone size={14} /> Upload Audio Beat into Folder
              </button>
              <button
                onClick={() => setShowAddExistingModal(!showAddExistingModal)}
                className="btn-ghost !py-2 !px-3 !text-xs"
              >
                <Plus size={14} /> Assign Existing Beat
              </button>
              <button
                onClick={(e) => deleteFolder(activeFolder.id, e)}
                className="btn-ghost !py-2 !px-3 !text-xs !border-rose-500/40 !text-rose-400"
              >
                <Trash2 size={13} /> Delete Folder
              </button>
            </div>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <span className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-bold">
                <FolderOpen size={24} />
              </span>
              <div>
                <h2 className="font-display text-3xl font-bold text-white">{activeFolder.name}</h2>
                <div className="font-mono text-xs text-sky-400 mt-0.5">
                  Genre: <span className="text-white font-bold">{activeFolder.genre}</span> · {beatsInActiveFolder.length} beats inside
                </div>
              </div>
            </div>
          </div>

          {showAddExistingModal && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3">
              <div className="font-mono text-xs font-bold text-sky-400 uppercase">Select Unassigned Beat to Move Into {activeFolder.name}</div>
              <div className="flex items-center gap-3">
                <select
                  className="field flex-1"
                  onChange={(e) => {
                    if (e.target.value) {
                      moveBeatToFolder(e.target.value, activeFolder.id);
                      e.target.value = '';
                    }
                  }}
                >
                  <option value="">-- Choose beat to move into folder --</option>
                  {unassignedBeats.map((ub) => (
                    <option key={ub.id} value={ub.id}>
                      {ub.title} ({ub.genre} · {ub.bpm} BPM)
                    </option>
                  ))}
                </select>
                <button onClick={() => setShowAddExistingModal(false)} className="btn-ghost !py-2">Close</button>
              </div>
            </div>
          )}

          {/* BEATS INSIDE THIS FOLDER */}
          <div className="space-y-3">
            <div className="font-mono text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
              <span>Beats inside {activeFolder.name} ({beatsInActiveFolder.length})</span>
              <span className="text-slate-500">Toggle "Public" vs "Private Vault" per beat below</span>
            </div>

            {beatsInActiveFolder.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-slate-400 text-sm">
                No beats in this folder yet. Click <span className="text-sky-400 font-semibold">"Upload Audio Beat into Folder"</span> above to add your audio files (.mp3, .wav) into this folder!
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 divide-y divide-slate-800/80 overflow-hidden">
                {beatsInActiveFolder.map((b) => {
                  const isPublicBeat = b.availability !== 'private';
                  return (
                    <div key={b.id} className="p-4 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-900/60 transition-colors">
                      <div className="flex items-center gap-3.5 min-w-[220px]">
                        <img src={b.artwork_url} alt="" className="w-12 h-12 object-cover rounded-xl border border-slate-800" />
                        <div>
                          <div className="text-sm font-bold text-white">{b.title}</div>
                          <div className="font-mono text-xs text-slate-400">{catalogNo(b.id)} · {b.bpm} BPM · {money(b.price)}</div>

                          {Array.isArray(b.emotions) && b.emotions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {b.emotions.map((em) => (
                                <span key={em} className="font-mono text-[9px] text-sky-300 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                                  {em}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleBeatVisibility(b)}
                          className={`px-3 py-1.5 rounded-full border text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                            isPublicBeat
                              ? 'bg-sky-500/15 text-sky-400 border-sky-500/40 hover:bg-sky-500/25'
                              : 'bg-amber-500/15 text-amber-400 border-amber-500/40 hover:bg-amber-500/25'
                          }`}
                        >
                          {isPublicBeat ? <Globe size={13} /> : <Lock size={13} />}
                          {isPublicBeat ? 'Public in Store' : 'Private Vault (Pre-Release)'}
                        </button>

                        <button
                          onClick={() => removeBeatFromFolder(b.id)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                          title="Remove from folder"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {showUploadModal && (
            <UploadBeatToFolderModal
              folder={activeFolder}
              authed={authed}
              onClose={() => setShowUploadModal(false)}
              onUploaded={async () => {
                setShowUploadModal(false);
                await reload();
              }}
            />
          )}
        </div>
      ) : (
        /* ALL FOLDERS CARDS GRID */
        <div>
          <div className="font-mono text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
            Click any folder to inspect beats, upload audio files & toggle public vs private vault visibility ({folders.length} Folders)
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {folders.map((f) => {
              const beatsInFolder = beats.filter((b) => Number(b.folder_id) === Number(f.id));
              const publicBeatsCount = beatsInFolder.filter((b) => b.availability !== 'private').length;
              const privateBeatsCount = beatsInFolder.length - publicBeatsCount;

              return (
                <div
                  key={f.id}
                  onClick={() => setActiveFolderId(f.id)}
                  className="rounded-3xl border border-slate-800 hover:border-sky-500/50 bg-slate-900/80 hover:bg-slate-900 p-6 transition-all duration-300 cursor-pointer group shadow-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/30 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                          <FolderOpen size={22} />
                        </div>
                        <div>
                          <h3 className="font-display text-xl font-bold text-white group-hover:text-sky-400 transition-colors">
                            {f.name}
                          </h3>
                          <div className="font-mono text-xs text-slate-400 mt-0.5">
                            Genre: <span className="text-white font-semibold">{f.genre}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => deleteFolder(f.id, e)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                        title="Delete folder"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 mb-4 font-mono text-xs">
                      <span className="badge-ocean">{beatsInFolder.length} Beats Inside</span>
                      {publicBeatsCount > 0 && (
                        <span className="text-sky-400 font-semibold">{publicBeatsCount} Public</span>
                      )}
                      {privateBeatsCount > 0 && (
                        <span className="text-amber-400 font-semibold">{privateBeatsCount} Private Vault</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="mt-4 text-xs font-mono font-bold text-sky-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      Open Folder & Manage Beats <ChevronRight size={14} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ UPLOAD BEAT TO SPECIFIC FOLDER MODAL ------------------------------ */
function UploadBeatToFolderModal({ folder, authed, onClose, onUploaded }) {
  const [title, setTitle] = useState('');
  const [bpm, setBpm] = useState(108);
  const [price, setPrice] = useState(149);
  const [availability, setAvailability] = useState('available');
  const [emotions, setEmotions] = useState(['Energetic']);

  const [artworkFile, setArtworkFile] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [wavFile, setWavFile] = useState(null);
  const [stemsFile, setStemsFile] = useState(null);

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const toggleEmo = (emo) => {
    setEmotions((prev) =>
      prev.includes(emo) ? prev.filter((x) => x !== emo) : [...prev, emo]
    );
  };

  const handleAudioChange = (file, setter) => {
    if (!file) {
      setter(null);
      return;
    }
    const validationErr = validateAudioFileFrontend(file);
    if (validationErr) {
      setError(validationErr);
      setter(null);
      return;
    }
    setError('');
    setter(file);
  };

  const uploadBeat = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) return setError('Beat title is required.');
    if (!previewFile) return setError('A preview audio file is required.');

    if (artworkFile && !isImageFile(artworkFile)) {
      return setError('Invalid artwork file. Please select an image (.jpg, .png, .webp).');
    }
    const previewErr = validateAudioFileFrontend(previewFile);
    if (previewErr) return setError(previewErr);

    if (wavFile) {
      const wavErr = validateAudioFileFrontend(wavFile);
      if (wavErr) return setError(wavErr);
    }

    setBusy(true);
    try {
      let artworkUrl = null;
      if (artworkFile) {
        setStatus('Uploading artwork photo…');
        const art = await uploadToR2(authed, artworkFile, { bucket: 'artwork' });
        artworkUrl = art.publicUrl;
      }

      setStatus('Uploading preview audio…');
      const prevU = await uploadToR2(authed, previewFile, { bucket: 'previews', isAudio: true });

      let wavPath = null;
      let stemsPath = null;

      if (wavFile) {
        setStatus('Uploading WAV master to the private vault…');
        const w = await uploadToR2(authed, wavFile, { bucket: 'masters', isAudio: true });
        wavPath = masterRefR2(w.objectKey);
      }

      if (stemsFile) {
        setStatus('Uploading stems archive to the private vault…');
        const s = await uploadToR2(authed, stemsFile, { bucket: 'masters' });
        stemsPath = masterRefR2(s.objectKey);
      }

      setStatus(`Saving beat into ${folder.name}…`);
      await authed('/api/beats', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          genre: folder.genre || 'Afrobeats',
          bpm: Number(bpm),
          price: Number(price),
          availability,
          artwork_url: artworkUrl,
          preview_url: prevU.publicUrl,
          wav_path: wavPath,
          stems_path: stemsPath,
          folder_id: folder.id,
          emotions,
        }),
      });

      await onUploaded();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      setStatus('');
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 text-white">
      <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div>
            <div className="badge-ocean">UPLOAD AUDIO BEAT</div>
            <div className="font-display text-xl font-bold text-white mt-1">Upload Beat into {folder.name}</div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white"><X size={18} /></button>
        </div>

        <form onSubmit={uploadBeat} className="space-y-4">
          <div>
            <label className="font-mono text-xs font-bold text-slate-400 uppercase mb-1 block">Beat Title *</label>
            <input className="field" placeholder="e.g. Midnight Waves, Suya & Silk" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-xs font-bold text-slate-400 uppercase mb-1 block">BPM</label>
              <input className="field" type="number" value={bpm} onChange={(e) => setBpm(e.target.value)} />
            </div>
            <div>
              <label className="font-mono text-xs font-bold text-slate-400 uppercase mb-1 block">Price (USD)</label>
              <input className="field" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
          </div>

          {/* Public vs Private Vault Switch */}
          <div className="rounded-2xl border border-slate-800 p-4 bg-slate-950 flex items-center justify-between">
            <div>
              <div className="font-display text-sm font-bold text-white flex items-center gap-2">
                {availability === 'available' ? <Globe size={15} className="text-sky-400" /> : <Lock size={15} className="text-amber-400" />}
                {availability === 'available' ? 'Visible to Public Store' : 'Private Vault (Internal Pre-Release)'}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {availability === 'available' ? 'Beat appears on public beat catalog' : 'Beat stays in this folder as internal draft until toggled public'}
              </div>
            </div>
            <input
              type="checkbox"
              checked={availability === 'available'}
              onChange={(e) => setAvailability(e.target.checked ? 'available' : 'private')}
              className="accent-sky-500 w-5 h-5 cursor-pointer"
            />
          </div>

          {/* Beat Emotion Tags Selection */}
          <div>
            <label className="font-mono text-xs font-bold text-slate-400 uppercase mb-2 block">Beat Emotion / Mood Tags</label>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto border border-slate-800 p-2.5 rounded-xl bg-slate-950">
              {EMOTIONS_OPTIONS.map((emo) => {
                const sel = emotions.includes(emo);
                return (
                  <button
                    key={emo}
                    type="button"
                    onClick={() => toggleEmo(emo)}
                    className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                      sel ? 'bg-sky-500 text-white border-sky-400 font-bold' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {emo}
                  </button>
                );
              })}
            </div>
          </div>

          {/* File inputs - audio inputs specify accept="audio/*" as requested */}
          <div className="space-y-3 pt-2">
            <div className="font-mono text-xs font-bold text-sky-400 uppercase">Select Files</div>
            <div className="text-[11px] text-slate-500 -mt-1.5">All files are selectable in the picker — anything that isn't audio is rejected automatically after you choose it.</div>

            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block border border-dashed border-slate-800 hover:border-sky-500/50 rounded-2xl p-3.5 bg-slate-950 cursor-pointer">
                <div className="font-mono text-[10px] font-bold text-sky-400 uppercase flex items-center gap-1.5 mb-1">
                  <ImageIcon size={13} /> Artwork Photo (optional)
                </div>
                <div className="text-xs text-slate-300 truncate">{artworkFile ? artworkFile.name : 'Skip to use the WAVES default artwork'}</div>
                <input
                  type="file"
                  accept={IMAGE_ACCEPT_STRING}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file && !isImageFile(file)) {
                      setError('Please select an image file (.jpg, .png, .webp) for artwork photo.');
                      setArtworkFile(null);
                      return;
                    }
                    setError('');
                    setArtworkFile(file);
                  }}
                />
              </label>

              {/* Beat Preview Audio Input using accept="audio/*" */}
              <label className="block border border-dashed border-slate-800 hover:border-sky-500/50 rounded-2xl p-3.5 bg-slate-950 cursor-pointer">
                <div className="font-mono text-[10px] font-bold text-sky-400 uppercase flex items-center gap-1.5 mb-1">
                  <FileAudio size={13} /> Preview Audio * (Audio Only)
                </div>
                <div className="text-xs text-slate-300 truncate">{previewFile ? previewFile.name : 'Tap to select audio file (.mp3, .wav, .m4a)'}</div>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => handleAudioChange(e.target.files?.[0], setPreviewFile)}
                />
              </label>

              {/* Full WAV Master Input using accept="audio/*" */}
              <label className="block border border-dashed border-slate-800 hover:border-sky-500/50 rounded-2xl p-3.5 bg-slate-950 cursor-pointer">
                <div className="font-mono text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-1">
                  <FileAudio size={13} /> Full WAV Master (Audio Only)
                </div>
                <div className="text-xs text-slate-300 truncate">{wavFile ? wavFile.name : 'Tap to select WAV/audio master'}</div>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => handleAudioChange(e.target.files?.[0], setWavFile)}
                />
              </label>

              <label className="block border border-dashed border-slate-800 hover:border-sky-500/50 rounded-2xl p-3.5 bg-slate-950 cursor-pointer">
                <div className="font-mono text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-1">
                  <FileArchive size={13} /> Stems Archive ZIP (Optional)
                </div>
                <div className="text-xs text-slate-300 truncate">{stemsFile ? stemsFile.name : 'Tap to select ZIP stems archive'}</div>
                <input
                  type="file"
                  accept=".zip,application/zip,application/x-zip-compressed"
                  className="hidden"
                  onChange={(e) => setStemsFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
          </div>

          {status && <p className="font-mono text-xs text-sky-400">{status}</p>}
          {error && <p className="font-mono text-xs text-rose-400">{error}</p>}

          <button type="submit" disabled={busy} className="btn-ocean w-full mt-4">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Smartphone size={15} />} Upload Audio Beat into {folder.name}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------ BEATS TAB ------------------------------ */
function BeatsTab({ beats, folders, authed, reload }) {
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [busy, setBusy] = useState(false);

  const list = beats.filter((b) => !q || b.title.toLowerCase().includes(q.toLowerCase()));

  const toggleBeatVisibility = async (beat) => {
    const isPrivate = beat.availability === 'private';
    const nextAvailability = isPrivate ? 'available' : 'private';
    try {
      await authed('/api/beats', {
        method: 'PUT',
        body: JSON.stringify({ id: beat.id, availability: nextAvailability }),
      });
      await reload();
    } catch (err) {
      alert(err.message);
    }
  };

  const del = async (id) => {
    setBusy(true);
    try {
      await authed('/api/beats', { method: 'DELETE', body: JSON.stringify({ id }) });
      await reload();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
      setConfirmId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <input className="field max-w-xs" placeholder="Filter beats…" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="font-mono text-xs text-slate-400">{list.length} records</span>
      </div>

      <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/40">
        <table className="w-full text-left min-w-[820px]">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80">
              {['Record', 'Genre', 'Folder', 'Emotion Tags', 'BPM', 'Price', 'Public Store Toggle', ''].map((h) => (
                <th key={h} className="font-mono text-xs font-bold text-slate-400 uppercase px-4 py-3.5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {list.map((b) => {
              const folderObj = folders.find((f) => Number(f.id) === Number(b.folder_id));
              const isPublicBeat = b.availability !== 'private';

              return (
                <tr key={b.id} className="hover:bg-slate-900/80 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={b.artwork_url} alt="" className="w-10 h-10 object-cover rounded-lg border border-slate-800" />
                      <div>
                        <div className="text-sm font-semibold text-white">{b.title}</div>
                        <div className="font-mono text-[10px] text-slate-500">{catalogNo(b.id)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-sky-400 font-semibold">{b.genre}</td>
                  <td className="px-4 py-3 text-xs text-slate-300">{folderObj ? folderObj.name : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(b.emotions) && b.emotions.map((e) => (
                        <span key={e} className="font-mono text-[9px] text-sky-300 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                          {e}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">{b.bpm}</td>
                  <td className="px-4 py-3 font-mono text-xs font-bold text-white">{money(b.price)}</td>

                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleBeatVisibility(b)}
                      className={`px-3 py-1 rounded-full border text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                        isPublicBeat
                          ? 'bg-sky-500/15 text-sky-400 border-sky-500/40 hover:bg-sky-500/25'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/40 hover:bg-amber-500/25'
                      }`}
                    >
                      {isPublicBeat ? <Globe size={13} /> : <Lock size={13} />}
                      {isPublicBeat ? 'Public' : 'Private Vault'}
                    </button>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setEditing({ ...b })} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800" aria-label="Edit">
                        <Pencil size={15} />
                      </button>
                      {confirmId === b.id ? (
                        <button onClick={() => del(b.id)} disabled={busy} className="font-mono text-xs font-bold text-rose-400 border border-rose-500/50 px-2.5 py-1 rounded-lg bg-rose-500/10">
                          Confirm?
                        </button>
                      ) : (
                        <button onClick={() => setConfirmId(b.id)} className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800" aria-label="Delete">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditBeatModal
          beat={editing}
          folders={folders}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await reload();
          }}
          authed={authed}
        />
      )}
    </div>
  );
}

function VaultFileRow({ label, icon: Icon, refKey, directUrl, authed, onReplace, replaceAccept, isAudio }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const pickRef = useRef(null);

  const download = async () => {
    if (directUrl) {
      window.open(directUrl, '_blank', 'noopener');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      const data = await authed(`/api/masters?path=${encodeURIComponent(refKey)}`);
      window.open(data.url, '_blank', 'noopener');
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/70 px-3.5 py-2.5">
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon size={15} className={refKey ? 'text-sky-400' : 'text-slate-600'} />
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-white">{label}</div>
          <div className="font-mono text-[10px] text-slate-500 truncate max-w-[210px]">
            {refKey ? refKey.replace(/^(r2|sb):/, '') : 'Not uploaded'}
          </div>
          {err && <div className="font-mono text-[10px] text-rose-400 mt-0.5">{err}</div>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {refKey && (
          <button type="button" onClick={download} disabled={busy} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors" title="Download (1h signed link)">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
          </button>
        )}
        <button type="button" onClick={() => pickRef.current?.click()} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors" title={refKey ? 'Replace file' : 'Upload file'}>
          <Upload size={14} />
        </button>
        <input
          ref={pickRef}
          type="file"
          accept={replaceAccept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onReplace(file, isAudio);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}

function EditBeatModal({ beat, folders, onClose, onSaved, authed }) {
  const [f, setF] = useState({
    title: beat.title || '',
    genre: beat.genre || 'Afrobeats',
    bpm: beat.bpm || 100,
    price: beat.price || 99,
    availability: beat.availability || 'available',
    collaborators: beat.collaborators || '',
    featured: !!beat.featured,
    folder_id: beat.folder_id || '',
    emotions: Array.isArray(beat.emotions) ? beat.emotions : [],
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [artBusy, setArtBusy] = useState(false);
  const [vaultBusy, setVaultBusy] = useState('');
  const fileRef = useRef(null);

  const replaceVaultFile = (field) => async (file, isAudio) => {
    setError('');
    if (isAudio) {
      const vErr = validateAudioFileFrontend(file);
      if (vErr) return setError(vErr);
    }
    setVaultBusy(field);
    try {
      const up = await uploadToR2(authed, file, { bucket: field === 'preview_url' ? 'previews' : 'masters', isAudio });
      const value = field === 'preview_url' ? up.publicUrl : masterRefR2(up.objectKey);
      await authed('/api/beats', {
        method: 'PUT',
        body: JSON.stringify({ id: beat.id, [field]: value }),
      });
      await onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setVaultBusy('');
    }
  };

  const toggleEmo = (emo) => {
    setF((prev) => ({
      ...prev,
      emotions: prev.emotions.includes(emo)
        ? prev.emotions.filter((x) => x !== emo)
        : [...prev.emotions, emo],
    }));
  };

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await authed('/api/beats', {
        method: 'PUT',
        body: JSON.stringify({
          id: beat.id,
          ...f,
          bpm: Number(f.bpm),
          price: Number(f.price),
        }),
      });
      await onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const replaceArtwork = async (file) => {
    if (!file) return;
    if (!isImageFile(file)) {
      return setError('Please select an image file (.jpg, .png, .webp) for artwork.');
    }
    setArtBusy(true);
    setError('');
    try {
      const up = await uploadToR2(authed, file, { bucket: 'artwork' });
      await authed('/api/beats', {
        method: 'PUT',
        body: JSON.stringify({ id: beat.id, artwork_url: up.publicUrl }),
      });
      await onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setArtBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-6 text-white">
      <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="font-display text-xl font-bold">Edit — {beat.title}</div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-full"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <img src={beat.artwork_url} alt="" className="w-20 h-20 object-cover rounded-xl border border-slate-800" />
            <div>
              <button onClick={() => fileRef.current?.click()} disabled={artBusy} className="btn-ghost !py-2 !px-3.5">
                {artBusy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Replace artwork
              </button>
              <input ref={fileRef} type="file" accept={IMAGE_ACCEPT_STRING} className="hidden" onChange={(e) => replaceArtwork(e.target.files?.[0])} />
            </div>
          </div>

          <input className="field" placeholder="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-xs font-bold text-slate-400 uppercase mb-1 block">Folder Crate</label>
              <select className="field" value={f.folder_id} onChange={(e) => setF({ ...f, folder_id: e.target.value })}>
                <option value="">No Folder Assigned</option>
                {folders.map((fold) => (
                  <option key={fold.id} value={fold.id}>
                    {fold.name} ({fold.genre})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-mono text-xs font-bold text-slate-400 uppercase mb-1 block">Genre (Custom Typed)</label>
              <input className="field" placeholder="Genre" value={f.genre} onChange={(e) => setF({ ...f, genre: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="font-mono text-xs font-bold text-slate-400 uppercase mb-2 block">Beat Emotion Tags</label>
            <div className="flex flex-wrap gap-1.5 border border-slate-800 p-2.5 rounded-xl bg-slate-950">
              {EMOTIONS_OPTIONS.map((emo) => {
                const sel = f.emotions.includes(emo);
                return (
                  <button
                    key={emo}
                    type="button"
                    onClick={() => toggleEmo(emo)}
                    className={`text-xs font-medium px-2 py-0.5 rounded-full border transition-colors ${
                      sel ? 'bg-sky-500 text-white border-sky-400 font-bold' : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    {emo}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input className="field" type="number" placeholder="BPM" value={f.bpm} onChange={(e) => setF({ ...f, bpm: e.target.value })} />
            <input className="field" type="number" placeholder="Price (USD)" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
          </div>

          {/* Vault files — audio assets */}
          <div>
            <label className="font-mono text-xs font-bold text-slate-400 uppercase mb-2 block">
              Audio files {vaultBusy && <Loader2 size={11} className="animate-spin inline ml-2 text-sky-400" />}
            </label>
            <div className="space-y-2">
              <VaultFileRow
                label="Preview (public stream)"
                icon={Music2}
                refKey={beat.preview_url ? beat.preview_url.split('/').slice(-1)[0] : null}
                directUrl={beat.preview_url || null}
                authed={authed}
                onReplace={replaceVaultFile('preview_url')}
                replaceAccept={AUDIO_ACCEPT_STRING}
                isAudio
              />
              <VaultFileRow
                label="WAV master (private vault)"
                icon={FileAudio}
                refKey={beat.wav_path || null}
                authed={authed}
                onReplace={replaceVaultFile('wav_path')}
                replaceAccept={AUDIO_ACCEPT_STRING}
                isAudio
              />
              <VaultFileRow
                label="Stems archive (private vault)"
                icon={FileArchive}
                refKey={beat.stems_path || null}
                authed={authed}
                onReplace={replaceVaultFile('stems_path')}
                replaceAccept=".zip"
                isAudio={false}
              />
            </div>
          </div>

          {error && <p className="text-rose-400 text-xs font-mono">{error}</p>}

          <button onClick={save} disabled={busy} className="btn-ocean w-full">
            {busy ? <Loader2 size={14} className="animate-spin" /> : null} Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ UPLOAD TAB ------------------------------ */
function StorageStatusBanner({ storage, onOpenR2Wizard, authed }) {
  const [diag, setDiag] = useState(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [corsFixing, setCorsFixing] = useState(false);
  const [corsFixed, setCorsFixed] = useState(false);
  if (!storage) return null;

  const runDiag = async () => {
    setDiagLoading(true);
    setDiag(null);
    try {
      const result = await authed('/api/r2-diagnose');
      setDiag(result);
    } catch (err) {
      setDiag({ error: err.message });
    } finally {
      setDiagLoading(false);
    }
  };

  const fixCors = async () => {
    setCorsFixing(true);
    try {
      const result = await authed('/api/r2-fix-cors', { method: 'POST' });
      if (result.success) {
        setCorsFixed(true);
        // Re-run diagnostics after fixing
        setTimeout(runDiag, 1000);
      } else {
        setDiag({ error: result.error || 'CORS fix failed. Try the Fix CORS button or set it manually in Cloudflare.' });
      }
    } catch (err) {
      setDiag({ error: err.message });
    } finally {
      setCorsFixing(false);
    }
  };

  const banner = storage.ready ? (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 mb-6 max-w-2xl">
      <div className="flex items-start gap-3">
        <ShieldCheck size={16} className="text-emerald-400 mt-0.5 shrink-0" />
        <div className="flex-1">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-[13px] font-semibold text-emerald-300">
              {corsFixed ? 'CORS fixed — try uploading now!' : 'Cloudflare R2 connected — storage live'}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fixCors}
                disabled={corsFixing}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-orange-300 hover:text-orange-200 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded-lg px-2.5 py-1 transition-colors disabled:opacity-50"
              >
                {corsFixing ? <Loader2 size={11} className="animate-spin" /> : <ShieldCheck size={11} />} Fix CORS
              </button>
              <button
                onClick={runDiag}
                disabled={diagLoading}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-sky-400 transition-colors disabled:opacity-50"
              >
                {diagLoading ? <Loader2 size={11} className="animate-spin" /> : <ShieldCheck size={11} />} Diagnose
              </button>
            </div>
          </div>
          <div className="text-[12px] text-slate-400 mt-0.5">
            {corsFixed
              ? 'CORS policy has been set on your R2 bucket. Try uploading a beat now.'
              : 'Files upload directly from your browser to R2. If uploads fail, click Fix CORS.'
            }
          </div>
        </div>
      </div>
      {diag && <DiagnosticResults diag={diag} authed={authed} />}
    </div>
  ) : (
    <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 mb-6 max-w-2xl">
      <Lock size={16} className="text-amber-400 mt-0.5 shrink-0" />
      <div className="flex-1">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-[13px] font-semibold text-amber-300">Waiting for Cloudflare R2 keys — uploads paused</div>
          <button
            onClick={onOpenR2Wizard}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white bg-orange-500 hover:bg-orange-400 rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap"
          >
            <Zap size={12} /> Auto-Setup R2
          </button>
        </div>
        <div className="text-[12px] text-slate-400 mt-1 leading-relaxed">
          Supabase runs the database &amp; auth; all files (audio + artwork) live on R2. Use the auto-setup wizard above, or add these in the{' '}
          <span className="text-slate-200 font-medium">Secrets tab</span> manually:
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_DOMAIN'].map((k) => (
            <span key={k} className="font-mono text-[10px] text-amber-200/90 bg-amber-500/10 border border-amber-500/25 rounded-md px-2 py-1">
              {k}
            </span>
          ))}
        </div>
        <div className="text-[11px] text-slate-500 mt-2.5 leading-relaxed">
          The wizard creates the bucket, sets CORS, generates access keys, and enables public access — all automatically.
          You just paste your Cloudflare API token.
        </div>
      </div>
    </div>
  );

  return banner;
}

function DiagnosticResults({ diag, authed }) {
  const [corsModal, setCorsModal] = useState(false);
  if (!diag) return null;
  if (diag.error) {
    return (
      <div className="mt-3 rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 text-[12px] text-rose-300">
        {diag.error}
      </div>
    );
  }
  return (
    <div className="mt-3 space-y-1.5">
      {diag.checks?.map((c, i) => (
        <div key={i} className={`flex items-start gap-2 p-2 rounded-lg text-[12px] ${
          c.status === 'pass' ? 'bg-emerald-500/5' : c.status === 'fail' ? 'bg-rose-500/5' : 'bg-slate-500/5'
        }`}>
          {c.status === 'pass' ? <Check size={12} className="text-emerald-400 mt-0.5 shrink-0" /> :
           c.status === 'fail' ? <AlertTriangle size={12} className="text-rose-400 mt-0.5 shrink-0" /> :
           <Loader2 size={12} className="text-slate-400 mt-0.5 shrink-0" />}
          <div>
            <span className={`font-semibold ${c.status === 'pass' ? 'text-emerald-300' : c.status === 'fail' ? 'text-rose-300' : 'text-slate-400'}`}>
              {c.name}:
            </span>{' '}
            <span className="text-slate-400">{c.message}</span>
          </div>
        </div>
      ))}
      {diag.corsInstructions && (
        <div className="mt-2 rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
          <div className="text-[12px] font-semibold text-amber-300 mb-1">⚠️ CORS not set — uploads will fail</div>
          <div className="text-[11px] text-slate-400 mb-2">
            The browser uploads directly to R2, so R2 needs a CORS policy allowing PUT requests.
            Fix it automatically with your Cloudflare API token:
          </div>
          <button
            onClick={() => setCorsModal(true)}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white bg-orange-500 hover:bg-orange-400 rounded-lg px-3 py-1.5 transition-colors"
          >
            <ShieldCheck size={12} /> Fix CORS automatically
          </button>
          <details className="mt-2">
            <summary className="text-[11px] text-slate-500 cursor-pointer hover:text-slate-400">Or set it manually</summary>
            <pre className="text-[10px] font-mono text-slate-300 bg-slate-950 rounded-lg p-2 overflow-x-auto mt-1">{diag.corsInstructions}</pre>
          </details>
        </div>
      )}
      {corsModal && <CorsFixModal authed={authed} onClose={() => setCorsModal(false)} />}
    </div>
  );
}

function CorsFixModal({ authed, onClose }) {
  const [cfApiToken, setCfApiToken] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [showToken, setShowToken] = useState(false);

  const handleFix = async (e) => {
    e.preventDefault();
    setError('');
    setRunning(true);
    try {
      const data = await authed('/api/r2-cors', {
        method: 'POST',
        body: JSON.stringify({ cfApiToken }),
      });
      setCfApiToken('');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget && !running) onClose(); }}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-orange-400" />
            <h3 className="font-display text-base font-bold text-white">Fix R2 CORS</h3>
          </div>
          <button onClick={() => !running && onClose()} className="text-slate-500 hover:text-white text-xl">&times;</button>
        </div>
        <div className="p-5">
          {!result ? (
            <>
              <p className="text-[12px] text-slate-400 mb-4 leading-relaxed">
                Paste your Cloudflare API token. It's used once to set the CORS policy on your R2 bucket, then discarded.
                Your token needs: <span className="text-slate-200">Account → Workers R2 Storage → Edit</span>.
              </p>
              <form onSubmit={handleFix} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[12px] font-semibold text-orange-300">Cloudflare API Token</label>
                    <button type="button" onClick={() => setShowToken(!showToken)} className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1">
                      {showToken ? <><EyeOff size={11} /> Hide</> : <><Eye size={11} /> Show</>}
                    </button>
                  </div>
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={cfApiToken}
                    onChange={(e) => setCfApiToken(e.target.value)}
                    placeholder="Paste Cloudflare API token"
                    required
                    autoComplete="off"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-[14px] text-white placeholder-slate-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none font-mono"
                  />
                </div>
                {error && (
                  <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 text-[12px] text-rose-300">{error}</div>
                )}
                <button
                  type="submit"
                  disabled={running || !cfApiToken}
                  className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-semibold text-[14px] rounded-lg py-3 transition-colors flex items-center justify-center gap-2"
                >
                  {running ? <><Loader2 size={16} className="animate-spin" /> Setting CORS…</> : <><ShieldCheck size={16} /> Fix CORS</>}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3">
                <Check size={24} className="text-emerald-400" />
              </div>
              <div className="text-[14px] font-semibold text-emerald-300 mb-1">CORS policy set!</div>
              <div className="text-[12px] text-slate-400 mb-4">{result.message}</div>
              <button onClick={onClose} className="bg-sky-500 hover:bg-sky-400 text-white font-semibold text-[13px] rounded-lg px-6 py-2.5 transition-colors">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UploadTab({ folders, authed, reload, onOpenR2Wizard }) {
  const [f, setF] = useState({
    title: '', genre: 'Afrobeats', bpm: 104, price: 149, availability: 'available', collaborators: '', featured: false, folder_id: '', emotions: ['Energetic'],
  });
  const [artwork, setArtwork] = useState(null);
  const [preview, setPreview] = useState(null);
  const [wav, setWav] = useState(null);
  const [stems, setStems] = useState(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [storage, setStorage] = useState(null);

  useEffect(() => {
    getStorageStatus().then(setStorage);
  }, []);

  const storageReady = !storage || storage.ready; // optimistic until status loads

  const toggleEmo = (emo) => {
    setF((prev) => ({
      ...prev,
      emotions: prev.emotions.includes(emo) ? prev.emotions.filter((x) => x !== emo) : [...prev.emotions, emo],
    }));
  };

  const handleAudioSelect = (file, setter) => {
    if (!file) {
      setter(null);
      return;
    }
    const errStr = validateAudioFileFrontend(file);
    if (errStr) {
      setError(errStr);
      setter(null);
      return;
    }
    setError('');
    setter(file);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!f.title.trim()) return setError('A beat title is required.');
    if (!preview) return setError('A preview audio file is required.');

    if (artwork && !isImageFile(artwork)) {
      return setError('Invalid artwork file. Please select an image (.jpg, .png, .webp).');
    }
    const previewErr = validateAudioFileFrontend(preview);
    if (previewErr) return setError(previewErr);

    if (wav) {
      const wavErr = validateAudioFileFrontend(wav);
      if (wavErr) return setError(wavErr);
    }

    setBusy(true);
    try {
      let artworkUrl = null;
      if (artwork) {
        setStatus('Uploading artwork…');
        const art = await uploadToR2(authed, artwork, { bucket: 'artwork' });
        artworkUrl = art.publicUrl;
      }
      setStatus('Uploading preview audio…');
      const prevU = await uploadToR2(authed, preview, { bucket: 'previews', isAudio: true });
      let wavPath = null;
      let stemsPath = null;
      if (wav) {
        setStatus('Uploading WAV master to the private vault…');
        const w = await uploadToR2(authed, wav, { bucket: 'masters', isAudio: true });
        wavPath = masterRefR2(w.objectKey);
      }
      if (stems) {
        setStatus('Uploading stems archive to the private vault…');
        const s = await uploadToR2(authed, stems, { bucket: 'masters' });
        stemsPath = masterRefR2(s.objectKey);
      }
      setStatus('Registering record in catalogue…');
      await authed('/api/beats', {
        method: 'POST',
        body: JSON.stringify({
          ...f,
          bpm: Number(f.bpm),
          price: Number(f.price),
          artwork_url: artworkUrl,
          preview_url: prevU.publicUrl,
          wav_path: wavPath,
          stems_path: stemsPath,
        }),
      });
      setStatus('');
      setF({ title: '', genre: 'Afrobeats', bpm: 104, price: 149, availability: 'available', collaborators: '', featured: false, folder_id: '', emotions: ['Energetic'] });
      setArtwork(null); setPreview(null); setWav(null); setStems(null);
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      setStatus('');
    }
  };

  const FilePick = ({ label, file, setFile, accept, hint, onChangeCustom }) => (
    <label className="block border border-dashed border-slate-800 hover:border-sky-500/50 rounded-2xl p-4 bg-slate-950/60 cursor-pointer transition-colors">
      <div className="font-mono text-xs font-bold text-sky-400 uppercase mb-1">{label}</div>
      <div className="text-xs text-slate-300 truncate">{file ? file.name : hint}</div>
      <input type="file" accept={accept} className="hidden" onChange={onChangeCustom || ((e) => setFile(e.target.files?.[0] || null))} />
    </label>
  );

  return (
    <div className="max-w-2xl">
    <StorageStatusBanner storage={storage} onOpenR2Wizard={onOpenR2Wizard} authed={authed} />
    <form onSubmit={submit}>
      <div className="grid sm:grid-cols-2 gap-3">
        <input className="field sm:col-span-2" placeholder="Beat title *" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />

        <div>
          <label className="font-mono text-xs font-bold text-slate-400 uppercase mb-1 block">Folder Crate</label>
          <select className="field" value={f.folder_id} onChange={(e) => setF({ ...f, folder_id: e.target.value })}>
            <option value="">No Folder Assigned</option>
            {folders.map((fold) => (
              <option key={fold.id} value={fold.id}>
                {fold.name} ({fold.genre})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-mono text-xs font-bold text-slate-400 uppercase mb-1 block">Genre (Custom Typed)</label>
          <input className="field" placeholder="e.g. Afrobeats, Trap, Amapiano, R&B, Drill" value={f.genre} onChange={(e) => setF({ ...f, genre: e.target.value })} />
        </div>

        <div className="sm:col-span-2">
          <label className="font-mono text-xs font-bold text-slate-400 uppercase mb-2 block">Beat Emotion Tags</label>
          <div className="flex flex-wrap gap-1.5 border border-slate-800 p-2.5 rounded-xl bg-slate-950">
            {EMOTIONS_OPTIONS.map((emo) => {
              const sel = f.emotions.includes(emo);
              return (
                <button
                  key={emo}
                  type="button"
                  onClick={() => toggleEmo(emo)}
                  className={`text-xs font-medium px-2 py-0.5 rounded-full border transition-colors ${
                    sel ? 'bg-sky-500 text-white border-sky-400 font-bold' : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  {emo}
                </button>
              );
            })}
          </div>
        </div>

        <input className="field" type="number" placeholder="BPM" value={f.bpm} onChange={(e) => setF({ ...f, bpm: e.target.value })} />
        <input className="field" type="number" placeholder="Base lease price (USD)" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mt-5">
        <FilePick
          label="Artwork Photo (optional)"
          file={artwork}
          setFile={(file) => {
            if (file && !isImageFile(file)) {
              setError('Please select an image file (.jpg, .png, .webp) for artwork photo.');
              setArtwork(null);
              return;
            }
            setError('');
            setArtwork(file);
          }}
          accept={IMAGE_ACCEPT_STRING}
          hint="Skip to use the WAVES default artwork"
        />
        <FilePick
          label="Preview Audio * (Audio Only)"
          file={preview}
          onChangeCustom={(e) => handleAudioSelect(e.target.files?.[0], setPreview)}
          accept={AUDIO_ACCEPT_STRING}
          hint="Choose audio preview file (.mp3, .wav, .m4a)"
        />
        <FilePick
          label="Full WAV Master (Audio Only)"
          file={wav}
          onChangeCustom={(e) => handleAudioSelect(e.target.files?.[0], setWav)}
          accept={AUDIO_ACCEPT_STRING}
          hint="Choose WAV/audio master file"
        />
        <FilePick label="Stems Archive ZIP (Optional)" file={stems} setFile={setStems} accept=".zip,application/zip,application/x-zip-compressed" hint="Choose ZIP stems archive" />
      </div>

      {status && <p className="font-mono text-xs text-sky-400 mt-4">{status}</p>}
      {error && <p className="font-mono text-xs text-rose-400 mt-4">{error}</p>}

      <button type="submit" disabled={busy || !storageReady} className="btn-ocean mt-6 disabled:opacity-60" title={!storageReady ? 'Add Cloudflare R2 keys in the Secrets tab to enable uploads' : undefined}>
        {busy ? <Loader2 size={14} className="animate-spin" /> : !storageReady ? <Lock size={14} /> : <Plus size={14} />}
        {!storageReady ? 'Uploads paused — waiting for R2 keys' : 'Publish record to catalogue'}
      </button>
    </form>
    </div>
  );
}

/* ------------------------------ PACKS TAB ------------------------------ */
function PacksTab({ beats, packs, authed, reload }) {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState([]); // ordered beat ids
  const [query, setQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState('All');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [justCreated, setJustCreated] = useState(null); // slug of freshly created pack

  const beatById = useMemo(() => {
    const m = new Map();
    beats.forEach((b) => m.set(b.id, b));
    return m;
  }, [beats]);

  const genres = useMemo(() => ['All', ...new Set(beats.map((b) => b.genre).filter(Boolean))], [beats]);

  const filteredBeats = useMemo(() => {
    const q = query.trim().toLowerCase();
    return beats.filter((b) => {
      if (genreFilter !== 'All' && b.genre !== genreFilter) return false;
      if (q && !b.title.toLowerCase().includes(q) && !(b.genre || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [beats, query, genreFilter]);

  const toggleSel = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const moveSel = (idx, dir) =>
    setSelected((s) => {
      const next = [...s];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return s;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });

  const packLink = (slug) => `${window.location.origin}${window.location.pathname}#/packs/${slug}`;

  const create = async () => {
    setError('');
    if (!name.trim()) return setError('Give the pack a name (e.g. WAVES — PRIVATE PACK 002).');
    if (selected.length < 1) return setError('Add at least one beat to the pack.');
    setBusy(true);
    try {
      const created = await authed('/api/packs', { method: 'POST', body: JSON.stringify({ name: name.trim(), beat_ids: selected }) });
      setName('');
      setSelected([]);
      setJustCreated(created?.slug || null);
      await reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-8 items-start">
      {/* ---------------- BUILDER ---------------- */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        <div className="px-5 pt-5 pb-4 border-b border-slate-800/70">
          <div className="font-display text-[16px] font-bold text-white flex items-center gap-2">
            <Package size={16} className="text-sky-400" /> Build a private pack
          </div>
          <div className="text-[12px] text-slate-500 mt-1">
            Pick records, set the order, generate an unlisted share link. Private vault beats are only visible through pack links.
          </div>
        </div>

        <div className="p-5 space-y-4">
          <input
            className="field"
            placeholder="Pack name — e.g. WAVES — PRIVATE PACK 002"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {/* Selected tray */}
          <div className={`rounded-xl border p-3 transition-colors ${selected.length ? 'border-sky-500/40 bg-sky-500/5' : 'border-dashed border-slate-800 bg-slate-950/50'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500">
                Tracklist — {selected.length} record{selected.length === 1 ? '' : 's'}
              </span>
              {selected.length > 0 && (
                <button onClick={() => setSelected([])} className="font-mono text-[10px] uppercase tracking-wide text-slate-500 hover:text-rose-400 transition-colors">
                  Clear all
                </button>
              )}
            </div>

            {selected.length === 0 ? (
              <div className="text-[12.5px] text-slate-600 py-3 text-center">
                Nothing selected yet — tap beats below to add them. The link plays them in this order.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                {selected.map((id, i) => {
                  const b = beatById.get(id);
                  if (!b) return null;
                  return (
                    <div key={id} className="flex items-center gap-2.5 bg-slate-950/80 border border-slate-800 rounded-lg pl-2 pr-1 py-1.5">
                      <span className="font-mono text-[10px] text-slate-600 w-4 text-center tabular-nums">{i + 1}</span>
                      <img src={b.artwork_url} alt="" className="w-8 h-8 rounded-md object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] font-semibold text-white truncate">{b.title}</div>
                        <div className="font-mono text-[9.5px] text-slate-500">{b.genre} · {b.bpm} BPM</div>
                      </div>
                      {b.availability === 'private' && <Lock size={11} className="text-amber-400 shrink-0" />}
                      <div className="flex items-center shrink-0">
                        <button onClick={() => moveSel(i, -1)} disabled={i === 0} className="p-1.5 text-slate-500 hover:text-white disabled:opacity-25 transition-colors" aria-label="Move up">
                          <ArrowUp size={12} />
                        </button>
                        <button onClick={() => moveSel(i, 1)} disabled={i === selected.length - 1} className="p-1.5 text-slate-500 hover:text-white disabled:opacity-25 transition-colors" aria-label="Move down">
                          <ArrowDown size={12} />
                        </button>
                        <button onClick={() => toggleSel(id)} className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors" aria-label="Remove">
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Beat browser */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  className="field !pl-8 !py-2 !text-[12.5px]"
                  placeholder="Search beats…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <select className="field !w-auto !py-2 !text-[12.5px]" value={genreFilter} onChange={(e) => setGenreFilter(e.target.value)}>
                {genres.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </div>

            <div className="max-h-[300px] overflow-y-auto border border-slate-800 rounded-xl bg-slate-950/50 divide-y divide-slate-800/50">
              {filteredBeats.map((b) => {
                const sel = selected.includes(b.id);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => toggleSel(b.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${sel ? 'bg-sky-500/10' : 'hover:bg-white/[0.03]'}`}
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${sel ? 'bg-sky-500 border-sky-400' : 'border-slate-700'}`}>
                      {sel && <Check size={11} className="text-white" />}
                    </span>
                    <img src={b.artwork_url} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" loading="lazy" />
                    <div className="min-w-0 flex-1">
                      <div className={`text-[13px] font-semibold truncate ${sel ? 'text-sky-300' : 'text-white'}`}>{b.title}</div>
                      <div className="font-mono text-[10px] text-slate-500">{b.genre} · {b.bpm} BPM · {money(b.price)}</div>
                    </div>
                    {b.availability === 'private' && (
                      <span className="font-mono text-[9px] uppercase tracking-wide text-amber-400 bg-amber-500/10 border border-amber-500/25 rounded px-1.5 py-0.5 shrink-0 inline-flex items-center gap-1">
                        <Lock size={9} /> Vault
                      </span>
                    )}
                    {b.availability === 'sold' && (
                      <span className="font-mono text-[9px] uppercase tracking-wide text-slate-500 bg-slate-800/60 rounded px-1.5 py-0.5 shrink-0">Sold</span>
                    )}
                  </button>
                );
              })}
              {filteredBeats.length === 0 && (
                <div className="p-6 text-center text-[12.5px] text-slate-600">No beats match “{query}”.</div>
              )}
            </div>
          </div>

          {error && <p className="font-mono text-xs text-rose-400">{error}</p>}

          <button onClick={create} disabled={busy || !name.trim() || selected.length === 0} className="btn-ocean w-full !py-3 disabled:opacity-50">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
            {selected.length > 0
              ? `Generate share link — ${selected.length} record${selected.length === 1 ? '' : 's'}`
              : 'Generate share link'}
          </button>
        </div>
      </div>

      {/* ---------------- ACTIVE PACKS ---------------- */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-display text-[16px] font-bold text-white">Active packs</div>
            <div className="text-[12px] text-slate-500 mt-0.5">{packs.length} unlisted link{packs.length === 1 ? '' : 's'} in circulation</div>
          </div>
        </div>

        <div className="space-y-3">
          {packs.map((p) => (
            <PackCard
              key={p.id}
              pack={p}
              beatById={beatById}
              packLink={packLink}
              highlight={justCreated === p.slug}
              onDelete={async () => {
                await authed('/api/packs', { method: 'DELETE', body: JSON.stringify({ id: p.id }) });
                await reload();
              }}
            />
          ))}
          {packs.length === 0 && (
            <div className="border border-dashed border-slate-800 rounded-2xl p-10 text-center">
              <Package size={22} className="text-slate-700 mx-auto mb-3" />
              <div className="text-[13.5px] text-slate-500">No private packs yet.</div>
              <div className="text-[12px] text-slate-600 mt-1">Build one on the left — perfect for sending unreleased heat to one artist.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PackCard({ pack, beatById, packLink, highlight, onDelete }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const ids = Array.isArray(pack.beat_ids) ? pack.beat_ids : [];
  const packBeats = ids.map((id) => beatById.get(id)).filter(Boolean);
  const covers = packBeats.slice(0, 4);
  const link = packLink(pack.slug);

  const copy = () => {
    navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className={`rounded-2xl border overflow-hidden transition-colors ${highlight ? 'border-sky-500/60 bg-sky-500/5' : 'border-slate-800 bg-slate-900/50'}`}>
      <div className="p-4 flex items-center gap-4">
        {/* artwork collage */}
        <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 grid grid-cols-2 grid-rows-2">
          {covers.length > 0 ? (
            covers.map((b, i) => (
              <img key={i} src={b.artwork_url} alt="" className={`w-full h-full object-cover ${covers.length === 1 ? 'col-span-2 row-span-2' : covers.length === 2 ? 'row-span-2' : covers.length === 3 && i === 0 ? 'row-span-2' : ''}`} />
            ))
          ) : (
            <div className="col-span-2 row-span-2 flex items-center justify-center text-slate-700">
              <Package size={20} />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="font-display text-[15px] font-bold text-white truncate">{pack.name}</div>
          <div className="flex items-center gap-3 mt-1.5 font-mono text-[10.5px] text-slate-500">
            <span className="inline-flex items-center gap-1"><Disc3 size={11} /> {ids.length} records</span>
            <span className="inline-flex items-center gap-1"><Eye size={11} /> {pack.views || 0} views</span>
            <span className="hidden sm:inline">{fmtDate(pack.created_at)}</span>
          </div>
          {highlight && (
            <div className="font-mono text-[10px] text-sky-400 mt-1.5 inline-flex items-center gap-1">
              <Check size={11} /> Just created — copy the link below
            </div>
          )}
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          aria-label={open ? 'Collapse' : 'Show tracklist'}
        >
          <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* link row */}
      <div className="px-4 pb-4 flex items-center gap-2">
        <button onClick={copy} className={`flex-1 min-w-0 flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${copied ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-800 bg-slate-950 hover:border-slate-700'}`} title="Click to copy">
          {copied ? <Check size={12} className="text-emerald-400 shrink-0" /> : <Link2 size={12} className="text-sky-400 shrink-0" />}
          <span className={`font-mono text-[11px] truncate ${copied ? 'text-emerald-300' : 'text-slate-400'}`}>
            {copied ? 'Link copied — send it to your artist' : link.replace(/^https?:\/\//, '')}
          </span>
        </button>
        <a href={link} target="_blank" rel="noreferrer" className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors shrink-0" title="Open pack page" aria-label="Open pack">
          <ExternalLink size={14} />
        </a>
        {confirming ? (
          <button
            onClick={async () => {
              setDeleting(true);
              try { await onDelete(); } finally { setDeleting(false); setConfirming(false); }
            }}
            disabled={deleting}
            className="font-mono text-[11px] font-bold text-rose-400 border border-rose-500/50 px-3 py-2 rounded-lg bg-rose-500/10 shrink-0"
          >
            {deleting ? <Loader2 size={12} className="animate-spin" /> : 'Confirm?'}
          </button>
        ) : (
          <button onClick={() => { setConfirming(true); setTimeout(() => setConfirming(false), 3500); }} className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 border border-slate-800 transition-colors shrink-0" aria-label="Delete pack" title="Delete pack — the link stops working">
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* expandable tracklist */}
      {open && (
        <div className="border-t border-slate-800/70 bg-slate-950/40 px-4 py-3">
          {packBeats.length === 0 ? (
            <div className="text-[12px] text-slate-600 py-2">The beats in this pack were deleted from the catalogue.</div>
          ) : (
            <div className="space-y-1">
              {packBeats.map((b, i) => (
                <div key={b.id} className="flex items-center gap-2.5 py-1.5">
                  <span className="font-mono text-[10px] text-slate-600 w-4 text-center tabular-nums">{i + 1}</span>
                  <img src={b.artwork_url} alt="" className="w-7 h-7 rounded-md object-cover" loading="lazy" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[12.5px] font-medium text-slate-200 truncate block">{b.title}</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500 shrink-0">{b.genre} · {b.bpm} BPM</span>
                  {b.availability === 'private' && <Lock size={10} className="text-amber-400 shrink-0" />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ LEASES TAB ------------------------------ */
function LeasesTab({ leases, authed, reload }) {
  const setStatus = async (id, status) => {
    await authed('/api/leases', { method: 'PUT', body: JSON.stringify({ id, status }) });
    await reload();
  };

  const reInvoice = (l) =>
    generateInvoicePDF({
      invoiceNumber: l.invoice_number,
      date: fmtDate(l.created_at),
      clientName: l.name,
      clientEmail: l.email,
      beatTitle: l.beat_title,
      license: l.license_type,
      price: l.price,
    });

  return (
    <div className="rounded-2xl border border-slate-800 overflow-x-auto bg-slate-900/40">
      <table className="w-full text-left min-w-[860px]">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-900/80">
            {['Invoice', 'Beat', 'Licence', 'Price', 'Client', 'Status', ''].map((h) => (
              <th key={h} className="font-mono text-xs font-bold text-slate-400 uppercase px-4 py-3.5">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {leases.map((l) => (
            <tr key={l.id} className="hover:bg-slate-900/80">
              <td className="px-4 py-3 font-mono text-xs text-sky-400 font-bold">{l.invoice_number}</td>
              <td className="px-4 py-3 text-sm font-semibold text-white">{l.beat_title}</td>
              <td className="px-4 py-3 font-mono text-xs text-slate-300">{l.license_type}</td>
              <td className="px-4 py-3 font-mono text-xs font-bold text-white">{money(l.price)}</td>
              <td className="px-4 py-3">
                <div className="text-xs font-semibold text-white">{l.name}</div>
                <div className="font-mono text-[10px] text-slate-400">{l.email}</div>
              </td>
              <td className="px-4 py-3">
                <select
                  value={l.status}
                  onChange={(e) => setStatus(l.id, e.target.value)}
                  className="field !w-auto !py-1.5 !px-2 !text-xs"
                >
                  <option value="pending">Pending</option>
                  <option value="contacted">Contacted</option>
                  <option value="paid">Paid</option>
                  <option value="closed">Closed</option>
                </select>
              </td>
              <td className="px-4 py-3">
                <button onClick={() => reInvoice(l)} className="btn-ghost !py-1.5 !px-3" title="Download invoice PDF">
                  <FileDown size={14} /> PDF
                </button>
              </td>
            </tr>
          ))}
          {leases.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-slate-500 text-sm">No lease orders yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------ REQUESTS TAB ------------------------------ */
function RequestsTab({ requests, authed, reload }) {
  const setStatus = async (id, status) => {
    await authed('/api/requests', { method: 'PUT', body: JSON.stringify({ id, status }) });
    await reload();
  };

  return (
    <div className="space-y-4">
      {requests.map((r) => (
        <div key={r.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="font-display text-xl font-bold text-white">
                {r.artist_name || r.name}
                {r.artist_name && <span className="font-mono text-xs text-slate-400 ml-3 font-normal">Contact: {r.name}</span>}
              </div>
              <div className="font-mono text-xs text-sky-400 mt-1">
                {r.email} · {r.project} · {r.genre} · {r.budget} {r.deadline ? `· Due ${fmtDate(r.deadline)}` : ''}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-slate-500">{timeAgo(r.created_at)}</span>
              <select value={r.status} onChange={(e) => setStatus(r.id, e.target.value)} className="field !w-auto !py-1.5 !px-2 !text-xs">
                <option value="new">New</option>
                <option value="in-progress">In Progress</option>
                <option value="contacted">Contacted</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
          {r.reference_artists && (
            <div className="font-mono text-xs text-slate-300 mt-3">REFS — {r.reference_artists}</div>
          )}
          <p className="text-sm text-slate-300 leading-relaxed mt-3 max-w-3xl whitespace-pre-line">{r.description}</p>
        </div>
      ))}
      {requests.length === 0 && <div className="rounded-2xl border border-slate-800 p-10 text-center text-slate-500 text-sm">No custom briefs yet.</div>}
    </div>
  );
}

/* ------------------------------ ANALYTICS / OVERVIEW TAB ------------------------------ */
function Overview({ stats, beats, events, leases, requests }) {
  const topBeats = useMemo(
    () => [...beats].sort((a, b) => (b.play_count || 0) - (a.play_count || 0)).slice(0, 8),
    [beats]
  );

  const pendingLeases = leases.filter((l) => l.status === 'pending').length;
  const newBriefs = requests.filter((r) => r.status === 'new').length;
  const leaseValue = leases.reduce((s, l) => s + (Number(l.price) || 0), 0);

  const EVENT_STYLE = {
    play: { icon: Play, cls: 'text-sky-400 bg-sky-500/10 border-sky-500/25' },
    favorite: { icon: Heart, cls: 'text-rose-400 bg-rose-500/10 border-rose-500/25' },
    lease: { icon: FileSignature, cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25' },
    production_request: { icon: Inbox, cls: 'text-amber-400 bg-amber-500/10 border-amber-500/25' },
    pack_view: { icon: Package, cls: 'text-violet-400 bg-violet-500/10 border-violet-500/25' },
    pack_download: { icon: FileDown, cls: 'text-violet-400 bg-violet-500/10 border-violet-500/25' },
    inquiry: { icon: Inbox, cls: 'text-amber-400 bg-amber-500/10 border-amber-500/25' },
  };

  const CARDS = [
    { label: 'Total records', value: stats.total, sub: `${stats.pub} public · ${stats.priv} in vault` },
    { label: 'Total plays', value: stats.totalPlays.toLocaleString(), sub: `${stats.uniq} unique listeners` },
    { label: 'Favorites', value: stats.totalFavs.toLocaleString(), sub: 'across the catalogue' },
    { label: 'Pack views', value: stats.packViews.toLocaleString(), sub: 'private pack opens' },
    { label: 'Lease orders', value: leases.length, sub: `${pendingLeases} pending · ${money(leaseValue)} total`, alert: pendingLeases > 0 },
    { label: 'Custom briefs', value: requests.length, sub: `${newBriefs} new`, alert: newBriefs > 0 },
  ];

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {CARDS.map((c) => (
          <div key={c.label} className={`rounded-2xl border p-5 ${c.alert ? 'border-sky-500/40 bg-sky-500/5' : 'border-slate-800 bg-slate-900/50'}`}>
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500 mb-2">{c.label}</div>
            <div className="font-display text-2xl sm:text-3xl font-bold text-white tabular-nums">{c.value}</div>
            <div className="text-[12px] text-slate-400 mt-1">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top performing beats */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-slate-800/70">
            <div className="font-display text-[15px] font-bold text-white">Top performing records</div>
            <div className="text-[12px] text-slate-500 mt-0.5">Ranked by preview plays</div>
          </div>
          <div className="p-2">
            {topBeats.map((b, i) => (
              <div key={b.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition-colors">
                <span className="font-mono text-xs text-slate-600 w-5 text-center tabular-nums">{i + 1}</span>
                <img src={b.artwork_url} alt="" className="w-9 h-9 rounded-lg object-cover border border-slate-800" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-white truncate">{b.title}</div>
                  <div className="font-mono text-[10px] text-slate-500">{b.genre} · {b.bpm} BPM · {catalogNo(b.id)}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono text-[12px] font-bold text-sky-400 tabular-nums">{(b.play_count || 0).toLocaleString()}</div>
                  <div className="font-mono text-[9px] uppercase tracking-wider text-slate-600">plays</div>
                </div>
              </div>
            ))}
            {topBeats.length === 0 && <div className="p-8 text-center text-sm text-slate-500">No records yet.</div>}
          </div>
        </div>

        {/* Activity feed */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-slate-800/70">
            <div className="font-display text-[15px] font-bold text-white">Live activity</div>
            <div className="text-[12px] text-slate-500 mt-0.5">Plays, favorites, leases and briefs as they land</div>
          </div>
          <div className="p-2 max-h-[430px] overflow-y-auto">
            {events.slice(0, 40).map((e) => {
              const style = EVENT_STYLE[e.type] || { icon: Eye, cls: 'text-slate-400 bg-slate-800/50 border-slate-700/40' };
              const Icon = style.icon;
              return (
                <div key={e.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.02] transition-colors">
                  <span className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${style.cls}`}>
                    <Icon size={13} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-slate-200 truncate">{e.label || e.type}</div>
                  </div>
                  <span className="font-mono text-[10px] text-slate-600 shrink-0">{timeAgo(e.created_at)}</span>
                </div>
              );
            })}
            {events.length === 0 && <div className="p-8 text-center text-sm text-slate-500">No activity yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

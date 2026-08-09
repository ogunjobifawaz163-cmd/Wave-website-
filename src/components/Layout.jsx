import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Menu, X, Shuffle, Search, Instagram, Twitter, Mail, Settings2 } from 'lucide-react';
import Player from './Player';
import SearchOverlay from './SearchOverlay';
import SurpriseOverlay from './SurpriseOverlay';
import { usePlayer } from '../lib/player';

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/records', label: 'Beats' },
  { to: '/favorites', label: 'Favorites' },
  { to: '/work', label: 'Work with me' },
];

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [surpriseOpen, setSurpriseOpen] = useState(false);
  const { current } = usePlayer();

  const linkCls = ({ isActive }) =>
    `text-sm font-medium transition-colors py-1.5 ${
      isActive ? 'text-white' : 'text-slate-400 hover:text-white'
    }`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <div className="grain" />

      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-40 h-16 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/70">
        <div className="h-full max-w-[1280px] mx-auto px-4 sm:px-6 flex items-center gap-8">
          <Link to="/" className="flex items-baseline gap-2 shrink-0">
            <span className="font-display text-xl font-semibold tracking-tight text-white leading-none">WAVES</span>
            <span className="font-mono text-[9px] text-slate-500 tracking-[0.2em] uppercase hidden sm:inline">Fuhad Adebambo</span>
          </Link>

          <nav className="hidden md:flex items-center gap-7">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.to === '/'} className={linkCls}>
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 ml-auto">
            {/* Search — input-styled trigger */}
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex items-center gap-2.5 w-52 lg:w-64 px-3.5 py-2 rounded-[10px] bg-slate-900 border border-slate-800 text-slate-500 text-[13px] hover:border-slate-700 transition-colors text-left"
            >
              <Search size={14} />
              <span className="flex-1">Search beats…</span>
              <kbd className="font-mono text-[10px] text-slate-600 border border-slate-800 rounded px-1.5 py-0.5">/</kbd>
            </button>
            <button
              onClick={() => setSearchOpen(true)}
              className="sm:hidden p-2 rounded-lg text-slate-400 hover:text-white border border-slate-800"
              aria-label="Search"
            >
              <Search size={17} />
            </button>

            <button
              onClick={() => setSurpriseOpen(true)}
              className="hidden lg:inline-flex btn-ghost !py-2 !px-3.5"
              title="Play something random"
            >
              <Shuffle size={13} /> Shuffle
            </button>

            <Link
              to="/admin"
              className="hidden md:inline-flex items-center gap-2 text-[13px] font-medium text-slate-400 hover:text-white transition-colors px-3 py-2"
            >
              <Settings2 size={14} /> Manage
            </Link>

            <Link to="/records" className="hidden sm:inline-flex btn-ocean !py-2 !px-4">
              Browse beats
            </Link>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-300 border border-slate-800"
              aria-label="Menu"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-[65] bg-slate-950/98 backdrop-blur-2xl flex flex-col p-6">
          <div className="flex items-center justify-between pb-6 border-b border-slate-800">
            <Link to="/" onClick={() => setMenuOpen(false)} className="font-display text-xl font-semibold text-white">
              WAVES
            </Link>
            <button
              onClick={() => setMenuOpen(false)}
              className="p-2 rounded-lg text-slate-300 border border-slate-800"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="flex flex-col my-auto">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                onClick={() => setMenuOpen(false)}
                className="font-display text-3xl font-medium py-4 border-b border-slate-800/60 text-white hover:text-sky-400 transition-colors"
              >
                {n.label}
              </NavLink>
            ))}
            <button
              onClick={() => {
                setMenuOpen(false);
                setSearchOpen(true);
              }}
              className="font-display text-3xl font-medium py-4 border-b border-slate-800/60 text-left text-white hover:text-sky-400 transition-colors"
            >
              Search
            </button>
          </nav>

          <div className="flex flex-col gap-2.5 pt-6 border-t border-slate-800">
            <button
              onClick={() => {
                setMenuOpen(false);
                setSurpriseOpen(true);
              }}
              className="btn-ghost w-full"
            >
              <Shuffle size={14} /> Shuffle play
            </button>
            <Link to="/admin" onClick={() => setMenuOpen(false)} className="btn-white w-full">
              <Settings2 size={14} /> Management
            </Link>
          </div>
        </div>
      )}

      <main className={`pt-16 ${current ? 'pb-28' : 'pb-10'}`}>
        <Outlet context={{ openSurprise: () => setSurpriseOpen(true), openSearch: () => setSearchOpen(true) }} />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/70 mt-24">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-14 grid gap-10 md:grid-cols-3">
          <div>
            <div className="font-display text-lg font-semibold text-white mb-3">WAVES</div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              The producer catalogue of Fuhad Adebambo. Afrobeats, Trap, Amapiano and R&B — preview instantly, lease in minutes.
            </p>
          </div>

          <div className="flex gap-16">
            <div>
              <div className="kicker mb-4">Site</div>
              <div className="flex flex-col gap-2.5 text-sm text-slate-400">
                <Link to="/" className="hover:text-white transition-colors">Home</Link>
                <Link to="/records" className="hover:text-white transition-colors">Beat catalog</Link>
                <Link to="/favorites" className="hover:text-white transition-colors">Favorites</Link>
                <Link to="/work" className="hover:text-white transition-colors">Work with me</Link>
              </div>
            </div>
            <div>
              <div className="kicker mb-4">Business</div>
              <div className="flex flex-col gap-2.5 text-sm text-slate-400">
                <Link to="/admin" className="hover:text-white transition-colors">Management</Link>
                <a href="mailto:management@waves.com.ng" className="hover:text-white transition-colors">Inquiries</a>
              </div>
            </div>
          </div>

          <div className="md:text-right">
            <div className="kicker mb-4">Connect</div>
            <div className="flex md:justify-end gap-2 mb-5">
              <a href="https://instagram.com" target="_blank" rel="noreferrer" className="p-2.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:border-slate-600 transition-colors" aria-label="Instagram">
                <Instagram size={15} />
              </a>
              <a href="https://x.com" target="_blank" rel="noreferrer" className="p-2.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:border-slate-600 transition-colors" aria-label="X">
                <Twitter size={15} />
              </a>
              <a href="mailto:management@waves.com.ng" className="p-2.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:border-slate-600 transition-colors" aria-label="Email">
                <Mail size={15} />
              </a>
            </div>
            <div className="font-mono text-xs text-slate-600">
              © {new Date().getFullYear()} WAVES — Fuhad Adebambo
            </div>
          </div>
        </div>
      </footer>

      <Player />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <SurpriseOverlay open={surpriseOpen} onClose={() => setSurpriseOpen(false)} />
    </div>
  );
}

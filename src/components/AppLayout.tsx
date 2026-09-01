import React, { FormEvent, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bookmark,
  History as HistoryIcon,
  Home,
  LogIn,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Plus,
  Search,
  ShieldCheck,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { avatarFor } from '../lib/format';
import AddVideoModal from './AddVideoModal';

type Theme = 'dark' | 'light' | 'system';

function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('feed-theme') as Theme) || 'system');
  useEffect(() => {
    const apply = () => {
      const dark =
        theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      localStorage.setItem('feed-theme', theme);
    };
    apply();
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => theme === 'system' && apply();
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, [theme]);
  const cycle = () => setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark');
  return { theme, cycle };
}

function NavItem({ to, icon, label, onNavigate }: { to: string; icon: React.ReactNode; label: string; onNavigate?: () => void }) {
  return (
    <NavLink to={to} end={to === '/'} onClick={onNavigate} className={({ isActive }) => `side-link${isActive ? ' active' : ''}`}>
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

export default function AppLayout() {
  const { session, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, cycle } = useTheme();
  const [query, setQuery] = useState('');
  const [drawer, setDrawer] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    setQuery(new URLSearchParams(location.search).get('q') || '');
  }, [location.search]);

  useEffect(() => {
    setDrawer(false);
  }, [location.pathname]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const term = query.trim();
    navigate(term ? `/?q=${encodeURIComponent(term)}` : '/');
  };

  const links = (
    <>
      <NavItem to="/" icon={<Home size={19} />} label="Home" />
      <NavItem to="/following" icon={<Users size={19} />} label="Following" />
      <NavItem to="/history" icon={<HistoryIcon size={19} />} label="History" />
      <NavItem to="/saved" icon={<Bookmark size={19} />} label="Saved" />
      {profile?.is_admin && <NavItem to="/admin" icon={<ShieldCheck size={19} />} label="Admin" />}
    </>
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <button className="icon-btn lg:hidden" onClick={() => setDrawer((v) => !v)} aria-label="Menu">
            {drawer ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link to="/" className="brand">
            <span className="brand-name">feed</span>
          </Link>
          <form className="search-form" onSubmit={submit} role="search">
            <label className="search-box">
              <Search size={17} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search videos"
                aria-label="Search videos"
              />
              {query && (
                <button type="button" className="search-clear" onClick={() => setQuery('')} aria-label="Clear">
                  <X size={15} />
                </button>
              )}
            </label>
          </form>
          <div className="topbar-actions">
            <button className="icon-btn" onClick={cycle} aria-label={`Theme: ${theme}`} title={`Theme: ${theme}`}>
              {theme === 'dark' ? <Moon size={18} /> : theme === 'light' ? <Sun size={18} /> : <Monitor size={18} />}
            </button>
            {profile?.is_admin && (
              <button className="ghost-btn hidden sm:inline-flex" onClick={() => setAddOpen(true)}>
                <Plus size={17} />
                <span>Add video</span>
              </button>
            )}
            {session ? (
              <Link to="/profile" className="avatar-link" aria-label="Your profile">
                <img className="avatar" src={avatarFor(profile)} alt="" />
              </Link>
            ) : (
              <Link to="/login" className="primary-btn">
                <LogIn size={16} />
                <span className="hidden sm:inline">Sign in</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <aside className="sidebar">
        <nav>{links}</nav>
        {session && (
          <button className="side-link mt-auto" onClick={() => signOut()}>
            <LogOut size={19} />
            <span>Sign out</span>
          </button>
        )}
      </aside>

      {drawer && (
        <div className="drawer-backdrop lg:hidden" onClick={() => setDrawer(false)}>
          <nav className="drawer" onClick={(event) => event.stopPropagation()}>
            {links}
            {profile?.is_admin && (
              <button className="side-link" onClick={() => { setDrawer(false); setAddOpen(true); }}>
                <Plus size={19} />
                <span>Add video</span>
              </button>
            )}
            {session ? (
              <button className="side-link" onClick={() => signOut()}>
                <LogOut size={19} />
                <span>Sign out</span>
              </button>
            ) : (
              <NavItem to="/login" icon={<LogIn size={19} />} label="Sign in" />
            )}
          </nav>
        </div>
      )}

      <main className="content">
        <Outlet />
      </main>

      <AddVideoModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={() => navigate('/')} />
    </div>
  );
}

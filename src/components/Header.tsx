import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/places', label: 'Places' },
  { to: '/trips', label: 'Trips' },
  { to: '/cotravel', label: 'CoTravel' },
  { to: '/events', label: 'Events' },
  { to: '/users', label: 'Users' }
];

const navClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium font-label transition-colors underline-offset-4 ${isActive ? 'text-brand-700' : 'text-ink-muted hover:text-ink-strong'}`;

export const Header = () => {
  const { authenticated, initializing, login, logout, username } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-brand-200/45 bg-white/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold text-ink-strong tracking-tight">
          <img src="/coolcorners-mark.svg" alt="" width={24} height={24} className="block" />
          <span>CoolCorners</span>
        </Link>
        <nav className="flex items-center gap-6">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={navClass} end={item.to === '/'}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {authenticated ? (
            <>
              <span className="text-sm font-label text-ink-muted">Hi, {username ?? 'user'}</span>
              <button
                onClick={() => logout()}
                className="rounded-full bg-brand-700 text-white px-3 py-1.5 text-sm font-semibold shadow-sm transition hover:bg-brand-600"
              >
                Logout
              </button>
            </>
          ) : (
            <button
              disabled={initializing}
              onClick={() => login()}
              className="rounded-full bg-white text-brand-700 border border-brand-200 px-3 py-1.5 text-sm font-semibold shadow-sm transition hover:border-brand-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {initializing ? 'Loading...' : 'Login'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

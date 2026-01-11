import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../auth/KeycloakProvider';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/places', label: 'Places' },
  { to: '/trips', label: 'Trips' },
  { to: '/cotravel', label: 'CoTravel' },
  { to: '/events', label: 'Events' },
  { to: '/users', label: 'Users' }
];

const navClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium transition-colors ${isActive ? 'text-brand-700' : 'text-slate-600 hover:text-slate-900'}`;

export const Header = () => {
  const { authenticated, initializing, login, logout, username } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-lg font-semibold text-slate-900 tracking-tight">
          CoolCorners
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
              <span className="text-sm text-slate-600">Hi, {username ?? 'user'}</span>
              <button
                onClick={() => logout()}
                className="rounded-full bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                Logout
              </button>
            </>
          ) : (
            <button
              disabled={initializing}
              onClick={() => login()}
              className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {initializing ? 'Loading...' : 'Login'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

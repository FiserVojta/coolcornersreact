import { Link } from 'react-router-dom';
import type { User } from '../types/user';

const getDisplayName = (user: User) =>
  user.displayName || user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'User';

const getInitials = (user: User) => {
  const name = getDisplayName(user);
  const parts = name.split(' ');
  if (parts.length >= 2) return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

export const UserCard = ({ user }: { user: User }) => {
  return (
    <Link
      to={`/users/${encodeURIComponent(user.email)}`}
      className="group flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-card transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
          {getInitials(user)}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-slate-900">{getDisplayName(user)}</span>
          <span className="text-xs text-slate-500">{user.email}</span>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>Followers: {user.followers?.length ?? 0}</span>
        <span>Following: {user.following?.length ?? 0}</span>
        <span>Joined: {formatDate(user.createdAt)}</span>
      </div>
    </Link>
  );
};

const formatDate = (value: string | number) => {
  const date = typeof value === 'number' ? new Date(value > 1e10 ? value : value * 1000) : new Date(value);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

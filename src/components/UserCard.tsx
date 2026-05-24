import { Link } from 'react-router-dom';
import type { User } from '../types/user';
import { Avatar } from './Avatar';

const getDisplayName = (user: User) =>
  user.displayName || user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'User';

export const UserCard = ({ user }: { user: User }) => {
  return (
    <Link
      to={`/users/${user.id}`}
      className="group flex flex-col gap-3 rounded-2xl bg-white border border-brand-50 p-4 shadow-card transition hover:-translate-y-1 hover:shadow-card-hover"
    >
      <div className="flex items-center gap-3">
        <Avatar user={user} size="md" />
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-ink-strong">{getDisplayName(user)}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-brand-50 px-2 py-1.5">
          <p className="text-sm font-semibold text-ink-strong">{user.tripsCompleted ?? 0}</p>
          <p className="text-[10px] uppercase tracking-wide text-ink-muted">Trips Completed</p>
        </div>
        <div className="rounded-lg bg-brand-50 px-2 py-1.5">
          <p className="text-sm font-semibold text-ink-strong">{user.cotravelsOrganized ?? 0}</p>
          <p className="text-[10px] uppercase tracking-wide text-ink-muted">Cotravels Created</p>
        </div>
        <div className="rounded-lg bg-brand-50 px-2 py-1.5">
          <p className="text-sm font-semibold text-ink-strong">{user.cotravelsAttended ?? 0}</p>
          <p className="text-[10px] uppercase tracking-wide text-ink-muted">Cotravels Participated</p>
        </div>
      </div>
      <div className="flex items-center justify-end text-xs text-ink-muted">
        <span>Joined: {formatDate(user.createdAt)}</span>
      </div>
    </Link>
  );
};

const formatDate = (value?: string | number | null) => {
  if (value == null || value === '') return '—';
  const date = typeof value === 'number' ? new Date(value > 1e10 ? value : value * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

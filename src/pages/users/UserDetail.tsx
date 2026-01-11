import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchUser, fetchUserPlaces, fetchUserTrips, fetchUserWanders, followUsers, unfollowUsers } from '../../api/users';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { useAuth } from '../../auth/KeycloakProvider';
import type { User } from '../../types/user';
import type { Cotravel } from '../../types/cotravel';
import { TagList } from '../../components/TagList';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const UserDetail = () => {
  const { id } = useParams();
  const email = id ? decodeURIComponent(id) : '';
  const { authenticated, username } = useAuth();
  const queryClient = useQueryClient();

  const userQuery = useQuery({
    queryKey: ['user', email],
    queryFn: () => fetchUser(email),
    enabled: !!email
  });

  const wanderQuery = useQuery({
    queryKey: ['user-wanders', email],
    queryFn: () => fetchUserWanders(email) as Promise<Cotravel[]>,
    enabled: !!email
  });

  const placesQuery = useQuery({
    queryKey: ['user-places', email],
    queryFn: () => fetchUserPlaces(email),
    enabled: !!email
  });

  const tripsQuery = useQuery({
    queryKey: ['user-trips', email],
    queryFn: () => fetchUserTrips(email),
    enabled: !!email
  });

  const followMut = useMutation({
    mutationFn: (userId: number) => followUsers({ userIds: [userId] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', email] });
    }
  });

  const unfollowMut = useMutation({
    mutationFn: (userId: number) => unfollowUsers({ userIds: [userId] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', email] });
    }
  });

  if (!email) return <ErrorState message="Invalid user" />;
  if (userQuery.isLoading) return <LoadingState label="Loading user..." />;
  if (userQuery.error || !userQuery.data) return <ErrorState message="Unable to load this user right now." />;

  const user = userQuery.data;
  const wanders = wanderQuery.data ?? [];
  const places = placesQuery.data ?? [];
  const trips = tripsQuery.data ?? [];
  const isCurrent = authenticated && (user.email === username || user.username === username || user.name === username);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-700">
            {getInitials(user)}
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-slate-900">{getDisplayName(user)}</h1>
            <p className="text-sm text-slate-600">{user.email}</p>
            <p className="text-xs text-slate-500">Joined {formatDate(user.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isCurrent && (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">This is you</span>
          )}
          {!isCurrent && authenticated && (
            <>
              <button
                onClick={() => followMut.mutate(user.id)}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-70"
                disabled={followMut.isPending}
              >
                {followMut.isPending ? 'Following...' : 'Follow'}
              </button>
              <button
                onClick={() => unfollowMut.mutate(user.id)}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-400 disabled:opacity-70"
                disabled={unfollowMut.isPending}
              >
                {unfollowMut.isPending ? 'Unfollowing...' : 'Unfollow'}
              </button>
            </>
          )}
        </div>
      </header>

      <section className="mt-8 grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-5 shadow-card">
            <h2 className="text-lg font-semibold text-slate-900">Profile</h2>
            <dl className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
              <Detail label="Username" value={user.username} />
              <Detail label="Name" value={[user.firstName, user.lastName].filter(Boolean).join(' ') || user.name} />
              <Detail label="Display name" value={user.displayName} />
              <Detail label="Followers" value={String(user.followers?.length ?? 0)} />
              <Detail label="Following" value={String(user.following?.length ?? 0)} />
              <Detail label="Joined" value={formatDate(user.createdAt)} />
            </dl>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-card">
            <h3 className="text-lg font-semibold text-slate-900">Tags</h3>
            <p className="mt-2 text-sm text-slate-600">Interests pulled from associated trips/places.</p>
            <TagList tags={[]} />
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-card">
            <h3 className="text-lg font-semibold text-slate-900">Places</h3>
            {placesQuery.isLoading ? (
              <p className="text-sm text-slate-600">Loading...</p>
            ) : places.length ? (
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {places.map((p: any) => (
                  <li key={p.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                    {p.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-600">No places yet.</p>
            )}
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-card">
            <h3 className="text-lg font-semibold text-slate-900">Trips</h3>
            {tripsQuery.isLoading ? (
              <p className="text-sm text-slate-600">Loading...</p>
            ) : trips.length ? (
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {trips.map((t: any) => (
                  <li key={t.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                    <Link
                      to={`/trips/${t.id}`}
                      className="font-semibold text-slate-900 transition hover:text-brand-600"
                    >
                      {t.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-600">No trips yet.</p>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl bg-white p-5 shadow-card">
            <h3 className="text-lg font-semibold text-slate-900">CoTravels</h3>
            {wanderQuery.isLoading ? (
              <p className="text-sm text-slate-600">Loading...</p>
            ) : wanders.length ? (
              <ul className="mt-3 space-y-2">
                {wanders.map((wander) => (
                  <li key={wander.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                    <p className="text-sm font-semibold text-slate-900">{wander.description}</p>
                    <p className="text-xs text-slate-600">{wander.startTime}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-600">No co-travel plans yet.</p>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
};

const getDisplayName = (user: User) =>
  user.displayName || user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'User';

const getInitials = (user: User) => {
  const name = getDisplayName(user);
  const parts = name.split(' ');
  if (parts.length >= 2) return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const formatDate = (value: string | number) => {
  const date = typeof value === 'number' ? new Date(value > 1e10 ? value : value * 1000) : new Date(value);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const Detail = ({ label, value }: { label: string; value?: string }) => (
  <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-1 text-slate-800">{value ?? '—'}</p>
  </div>
);

import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchUser, fetchUserPlaces, fetchUserTrips, followUsers, unfollowUsers, addUserRating } from '../../api/users';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { useAuth } from '../../auth/AuthContext';
import type { UserDetail as UserDetailModel } from '../../types/user';
import type { Place } from '../../types/place';
import type { Trip } from '../../types/trip';
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

  const ratingMut = useMutation({
    mutationFn: (rating: number) =>
      addUserRating(userQuery.data?.id ?? 0, { rating, createdBy: username ?? 'web-client' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', email] });
    }
  });

  if (!email) return <ErrorState message="Invalid user" />;
  if (userQuery.isLoading) return <LoadingState label="Loading user..." />;
  if (userQuery.error || !userQuery.data) return <ErrorState message="Unable to load this user right now." />;

  const user = userQuery.data;
  const attendedWanders = user.wandersAttended ?? [];
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
            <h1 className="text-2xl font-semibold font-display text-ink-strong">{getDisplayName(user)}</h1>
            <p className="text-sm text-ink-subtle">{user.email}</p>
            <p className="text-xs text-ink-subtle">Joined {formatDate(user.createdAt)}</p>
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
                className="rounded-full bg-slate-900 text-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-slate-800 disabled:opacity-70"
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
            <h2 className="text-lg font-semibold font-display text-ink-strong">Profile</h2>
            <dl className="mt-3 grid gap-2 text-sm text-ink-strong sm:grid-cols-2">
              <Detail label="Username" value={user.username} />
              <Detail label="Name" value={[user.firstName, user.lastName].filter(Boolean).join(' ') || user.name} />
              <Detail label="Display name" value={user.displayName} />
              <Detail label="Followers" value={String(user.followers?.length ?? 0)} />
              <Detail label="Following" value={String(user.following?.length ?? 0)} />
              <Detail label="Joined" value={formatDate(user.createdAt)} />
              <Detail label="Rating" value={user.rating != null ? user.rating.toFixed(1) : '—'} />
            </dl>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-card">
            <h3 className="text-lg font-semibold font-display text-ink-strong">Tags</h3>
            <p className="mt-2 text-sm font-label text-ink-muted">Interests pulled from associated trips/places.</p>
            <TagList tags={[]} />
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-card">
            <h3 className="text-lg font-semibold font-display text-ink-strong">Places</h3>
            {placesQuery.isLoading ? (
              <p className="text-sm text-ink-muted">Loading...</p>
            ) : places.length ? (
              <ul className="mt-3 space-y-2 text-sm text-ink-strong">
                {places.map((p: Place) => (
                  <li key={p.id} className="rounded-xl bg-brand-50 border border-brand-50 px-3 py-2">
                    {p.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-muted">No places yet.</p>
            )}
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-card">
            <h3 className="text-lg font-semibold font-display text-ink-strong">Trips</h3>
            {tripsQuery.isLoading ? (
              <p className="text-sm text-ink-muted">Loading...</p>
            ) : trips.length ? (
              <ul className="mt-3 space-y-2 text-sm text-ink-strong">
                {trips.map((t: Trip) => (
                  <li key={t.id} className="rounded-xl bg-brand-50 border border-brand-50 px-3 py-2">
                    <Link
                      to={`/trips/${t.id}`}
                      className="font-semibold font-label text-ink-strong transition hover:text-brand-700"
                    >
                      {t.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-muted">No trips yet.</p>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          {!isCurrent && authenticated && (
            <div className="rounded-2xl bg-white p-5 shadow-card">
              <h3 className="text-lg font-semibold font-display text-ink-strong">Rate this user</h3>
              <div className="mt-2 flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => ratingMut.mutate(star)}
                    disabled={ratingMut.isPending}
                    className={`h-9 w-9 rounded-full border text-sm font-semibold disabled:opacity-60 ${
                      user.rating && user.rating >= star
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white text-ink-strong border-brand-100'
                    }`}
                  >
                    {star}
                  </button>
                ))}
              </div>
              {ratingMut.isPending && <p className="mt-2 text-xs text-ink-muted">Submitting...</p>}
            </div>
          )}
          <div className="rounded-2xl bg-white p-5 shadow-card">
            <h3 className="text-lg font-semibold font-display text-ink-strong">Signed-up CoTravels</h3>
            {attendedWanders.length ? (
              <ul className="mt-3 space-y-2">
                {attendedWanders.map((wander) => (
                  <li key={wander.id} className="rounded-xl bg-brand-50 border border-brand-50 px-3 py-2">
                    <p className="text-sm font-semibold font-label text-ink-strong">{wander.description}</p>
                    <p className="text-xs font-label text-ink-muted">{wander.startTime}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-muted">No signed-up co-travel plans yet.</p>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
};

const getDisplayName = (user: UserDetailModel) =>
  user.displayName || user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'User';

const getInitials = (user: UserDetailModel) => {
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
  <div className="rounded-xl bg-brand-50 border border-brand-50 px-3 py-2">
    <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle font-label">{label}</p>
    <p className="mt-1 text-ink-strong font-label">{value ?? '—'}</p>
  </div>
);

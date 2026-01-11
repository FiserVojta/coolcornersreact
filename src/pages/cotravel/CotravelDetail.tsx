import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteCotravel, fetchCotravel, joinCotravel, leaveCotravel } from '../../api/cotravel';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { TagList } from '../../components/TagList';
import { useAuth } from '../../auth/KeycloakProvider';
import { env } from '../../config/env';
import { GoogleMap, Marker, Polyline, useJsApiLoader } from '@react-google-maps/api';
import type { Cotravel } from '../../types/cotravel';
import type { GeometryPoint } from '../../types/trip';
import type { User } from '../../types/user';

export const CotravelDetail = () => {
  const { id } = useParams();
  const cotravelId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { authenticated, login, canEdit, username, name, email } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['cotravel', cotravelId],
    queryFn: () => fetchCotravel(cotravelId),
    enabled: Number.isFinite(cotravelId)
  });

  const joinMutation = useMutation({
    mutationFn: () => joinCotravel(cotravelId),
    onSuccess: (updated) => {
      queryClient.setQueryData(['cotravel', cotravelId], updated);
      queryClient.invalidateQueries({ queryKey: ['cotravel'] });
    }
  });

  const leaveMutation = useMutation({
    mutationFn: () => leaveCotravel(cotravelId),
    onSuccess: (updated) => {
      queryClient.setQueryData(['cotravel', cotravelId], updated);
      queryClient.invalidateQueries({ queryKey: ['cotravel'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCotravel(cotravelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cotravel'] });
      navigate('/cotravel');
    }
  });

  if (!Number.isFinite(cotravelId)) return <ErrorState message="Invalid co-travel id" />;
  if (isLoading) return <LoadingState label="Loading co-travel plan..." />;
  if (error || !data) return <ErrorState message="Unable to load this co-travel plan right now." />;

  const filled = data.wanderers?.length ?? 0;
  const capacity = data.capacity ?? 0;
  const canUserEdit = canEdit(data.createdBy?.email || data.createdBy?.username || data.createdBy?.name);
  const userJoined = hasJoined(data.wanderers, [username, name, email]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
            {data.category?.title ?? 'CoTravel'}
          </p>
          <h1 className="text-3xl font-bold text-slate-900">{deriveTitle(data.description)}</h1>
          <p className="text-slate-600">{formatDateFull(data.startTime)}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {filled}/{capacity} joined
          </span>
          {canUserEdit && (
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                You can edit
              </span>
              <button
                onClick={() => navigate(`/cotravel/${cotravelId}/edit`)}
                className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-900 shadow-sm transition hover:border-slate-400"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  if (confirm('Delete this plan?')) deleteMutation.mutate();
                }}
                className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          )}
          {authenticated ? (
            userJoined ? (
              <button
                onClick={() => leaveMutation.mutate()}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-400"
                disabled={leaveMutation.isPending}
              >
                {leaveMutation.isPending ? 'Leaving...' : 'Leave'}
              </button>
            ) : (
              <button
                onClick={() => joinMutation.mutate()}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                disabled={joinMutation.isPending}
              >
                {joinMutation.isPending ? 'Joining...' : 'Join'}
              </button>
            )
          ) : (
            <button
              onClick={() => login()}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Login to join
            </button>
          )}
        </div>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <section className="rounded-2xl bg-white p-6 shadow-card">
            <h2 className="text-xl font-semibold text-slate-900">Overview</h2>
            <p className="mt-2 text-slate-700 leading-relaxed">{summarize(data.description)}</p>
            <div className="mt-4">
              <TagList tags={data.tags} />
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-card">
            <h3 className="text-lg font-semibold text-slate-900">Itinerary</h3>
            {data.wanderParts?.length ? (
              <ol className="mt-3 space-y-3">
                {data.wanderParts.map((part, idx) => (
                  <li key={part.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                          {idx + 1}
                        </span>
                        <p className="text-sm font-semibold text-slate-900">Segment {idx + 1}</p>
                      </div>
                      <p className="text-xs text-slate-600">Order {part.order}</p>
                    </div>
                    <div className="mt-2 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                      {part.places?.map((place) => (
                        <div key={`p-${place.id}`} className="rounded-lg bg-white px-3 py-2 shadow-inner">
                          <p className="font-semibold text-slate-900">{place.name}</p>
                          <p className="text-xs text-slate-600">{place.city?.name}</p>
                        </div>
                      ))}
                      {part.trips?.map((trip) => (
                        <div key={`t-${trip.id}`} className="rounded-lg bg-white px-3 py-2 shadow-inner">
                          <p className="font-semibold text-slate-900">{trip.name}</p>
                          <p className="text-xs text-slate-600">Trip</p>
                        </div>
                      ))}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-sm text-slate-600">No segments added yet.</p>
            )}
            {data.googlePlaces?.length ? (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-slate-900">Google places</h4>
                <ol className="mt-2 space-y-2">
                  {data.googlePlaces.map((place, idx) => (
                    <li
                      key={place.id}
                      className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                    >
                      <div className="mt-1 h-6 w-6 flex-none rounded-full bg-brand-100 text-center text-xs font-semibold text-brand-700">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{place.name}</p>
                        <p className="text-xs text-slate-600">Place ID: {place.id}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </section>
        </div>

        <aside className="space-y-6">
          <CotravelMap parts={data.wanderParts} googlePlaces={data.googlePlaces} />
          <section className="rounded-2xl bg-white p-5 shadow-card">
            <h3 className="text-lg font-semibold text-slate-900">Travelers</h3>
            {data.wanderers?.length ? (
              <ul className="mt-3 space-y-3">
                {data.wanderers.map((user) => (
                  <li key={user.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                      {getInitials(user)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{getDisplayName(user)}</p>
                      <p className="text-xs text-slate-600">{user.email}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-600">No one has joined yet.</p>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
};

const formatDateFull = (value: string | number) => {
  const date = typeof value === 'number' ? new Date(value > 1e10 ? value : value * 1000) : new Date(value);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const summarize = (value?: string) =>
  value ??
  'Join this community-led co-travel adventure. Coordinate routes, share costs, and meet fellow travelers along the way.';

const deriveTitle = (value?: string) => {
  if (!value) return 'Community adventure';
  const lower = value.toLowerCase();
  if (lower.includes('iceland') || lower.includes('northern')) return 'Northern Lights Escape';
  if (lower.includes('asia') || lower.includes('thailand')) return 'Southeast Asia Backpack';
  if (lower.includes('alps') || lower.includes('swiss')) return 'Alpine Trails';
  if (lower.includes('safari') || lower.includes('tanzania')) return 'Savanna Safari';
  if (lower.includes('greece')) return 'Greek Island Hopping';
  return value;
};

const CotravelMap = ({
  parts,
  googlePlaces
}: {
  parts?: Cotravel['wanderParts'];
  googlePlaces?: Cotravel['googlePlaces'];
}) => {
  const hasKey = !!env.googleMapsApiKey;
  const coords = useMemo(() => extractCoords(parts), [parts]);
  const googleCoords = useMemo(() => extractGoogleCoords(googlePlaces), [googlePlaces]);
  const allCoords = useMemo(() => [...coords, ...googleCoords], [coords, googleCoords]);

  const { isLoaded } = useJsApiLoader({
    id: 'coolcorners-map',
    googleMapsApiKey: env.googleMapsApiKey ?? '',
    libraries: mapLibraries
  });

  if (!allCoords.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <h3 className="text-lg font-semibold text-slate-900">Route</h3>
        <p className="mt-2 text-sm text-slate-600">No coordinates available.</p>
      </div>
    );
  }

  if (!hasKey) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <h3 className="text-lg font-semibold text-slate-900">Route</h3>
        <p className="mt-2 text-sm text-slate-600">
          Provide <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">VITE_GOOGLE_MAPS_API_KEY</code> to render
          the map.
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <h3 className="text-lg font-semibold text-slate-900">Route</h3>
        <p className="mt-2 text-sm text-slate-600">Loading map...</p>
      </div>
    );
  }

  const center = allCoords[0];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <GoogleMap
        center={center}
        zoom={5}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          styles: [
            {
              elementType: 'geometry',
              stylers: [{ color: '#f5f5f5' }]
            }
          ]
        }}
        mapContainerStyle={{ width: '100%', height: '280px', borderRadius: '16px' }}
      >
        {coords.map((pos, idx) => (
          <Marker key={`${pos.lat}-${pos.lng}-${idx}`} position={pos} label={`${idx + 1}`} />
        ))}
        {googleCoords.map((pos, idx) => (
          <Marker key={`g-${pos.lat}-${pos.lng}-${idx}`} position={pos} label={`G${idx + 1}`} />
        ))}
        {coords.length > 1 && <Polyline path={coords} options={{ strokeColor: '#2d75f5', strokeWeight: 4 }} />}
      </GoogleMap>
    </div>
  );
};

const extractCoords = (parts?: Cotravel['wanderParts']) =>
  (parts ?? [])
    .flatMap((part) => part.places ?? [])
    .map((place) => {
      if (!place.feature?.geometry?.coordinates) return null;
      const [lng, lat] = place.feature.geometry.coordinates;
      return { lat, lng };
    })
    .filter(Boolean) as { lat: number; lng: number }[];

const extractGoogleCoords = (places?: Cotravel['googlePlaces']) =>
  (places ?? [])
    .map((place) => getCoordsFromGeometry(place.geometry))
    .filter(Boolean) as { lat: number; lng: number }[];

const mapLibraries: ('places')[] = ['places'];

const getDisplayName = (user: User) =>
  user.displayName || user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Traveler';

const getInitials = (user: User) => {
  const name = getDisplayName(user);
  const parts = name.split(' ');
  if (parts.length >= 2) return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const hasJoined = (users: User[] | undefined, identifiers: Array<string | undefined>) => {
  const ids = identifiers.filter(Boolean) as string[];
  if (!ids.length || !users?.length) return false;
  return users.some((u) => ids.some((id) => u.email === id || u.username === id || u.name === id));
};

const getCoordsFromGeometry = (geometry?: GeometryPoint | null) => {
  if (!geometry || geometry.type !== 'Point' || !geometry.coordinates) return null;
  const [lng, lat] = geometry.coordinates;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
};

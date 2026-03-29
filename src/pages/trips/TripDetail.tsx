import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addTripComment, addTripRating, deleteTrip, fetchTrip, markTripDone } from '../../api/trips';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { RatingBadge } from '../../components/RatingBadge';
import { TagList } from '../../components/TagList';
import { useAuth } from '../../auth/AuthContext';
import { env } from '../../config/env';
import { CircleMarker, MapContainer, Polyline, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import type { GeometryPoint, TripModel } from '../../types/trip';
import type { PlaceDetail } from '../../types/place';
import type { CommentModel } from '../../types/place';
import { useForm } from 'react-hook-form';
import { MapyTileLayer } from '../../components/MapyTileLayer';
import { Button } from '../../components/ui/Button';
import { SurfaceCard } from '../../components/ui/SurfaceCard';
import { TextArea } from '../../components/ui/FormField';
import type { User } from '../../types/user';

export const TripDetail = () => {
  const { id } = useParams();
  const tripId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => fetchTrip(tripId),
    enabled: Number.isFinite(tripId)
  });
  const { authenticated, initializing, login, canEdit, username, name, email } = useAuth();
  const commentForm = useForm<CommentModel>({ defaultValues: { value: '' } });

  const commentMut = useMutation({
    mutationFn: (payload: CommentModel) => addTripComment(tripId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      commentForm.reset({ name: '', value: '' });
    }
  });

  const ratingMut = useMutation({
    mutationFn: (rating: number) =>
      addTripRating(tripId, { id: tripId, rating, createdBy: 'web-client' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
    }
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteTrip(tripId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      navigate('/trips');
    }
  });

  const markDoneMut = useMutation({
    mutationFn: () => markTripDone(tripId),
    onSuccess: (updatedTrip) => {
      queryClient.setQueryData(['trip', tripId], updatedTrip);
      queryClient.invalidateQueries({ queryKey: ['user-trips'] });
    }
  });

  if (!Number.isFinite(tripId)) return <ErrorState message="Invalid trip id" />;
  if (isLoading) return <LoadingState label="Loading trip..." />;
  if (error || !data) return <ErrorState message="Unable to load this trip right now." />;

  const owner = data.createdBy;
  const canUserEdit = owner ? canEdit(owner) : false;
  const completedByUsers = data.completedByUsers ?? [];
  const userMarkedDone = hasUserMarkedDone(completedByUsers, [username, name, email]);
  const backgroundImageUrl = data.backgroundImage?.url ?? '';
  const heroTitleClass = backgroundImageUrl ? 'text-white' : 'text-slate-900';
  const heroLabelClass = backgroundImageUrl ? 'text-brand-100' : 'text-brand-700';
  const heroMetaClass = backgroundImageUrl ? 'text-slate-100' : 'text-slate-600';

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="relative mb-10 overflow-hidden rounded-3xl border border-slate-200">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={backgroundImageUrl ? { backgroundImage: `url(${backgroundImageUrl})` } : undefined}
        />
        <div
          className={`absolute inset-0 ${
            backgroundImageUrl ? 'bg-slate-900/55' : 'bg-gradient-to-br from-slate-50 to-white'
          }`}
        />
        <div className="relative z-10 flex flex-col gap-4 px-6 py-10 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${heroLabelClass}`}>
              {data.category?.title ?? 'Trip'}
            </p>
            <div className="flex items-center gap-3">
              <h1 className={`text-3xl font-bold ${heroTitleClass}`}>{data.name}</h1>
              <RatingBadge rating={data.rating} />
            </div>
            <p className={heroMetaClass}>{formatDuration(data.duration)}</p>
          </div>
          {canUserEdit && (
            <div className="flex items-center gap-2">
              <Button onClick={() => navigate(`/trips/${tripId}/edit`)} variant="secondary" size="sm">
                Edit
              </Button>
              <Button
                onClick={() => {
                  if (confirm('Delete this trip?')) deleteMut.mutate();
                }}
                variant="danger"
                size="sm"
                disabled={deleteMut.isPending}
              >
                {deleteMut.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <SurfaceCard padding="lg">
            <h2 className="text-xl font-semibold text-slate-900">Overview</h2>
            <p className="mt-2 text-slate-700 leading-relaxed">{data.description}</p>
            <div className="mt-4">
              <TagList tags={data.tags} />
            </div>
          </SurfaceCard>

          <SurfaceCard padding="lg">
            <h3 className="text-lg font-semibold text-slate-900">Photos</h3>
            {data.files?.length || data.images?.length ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {buildTripPhotos(data).map((photo, idx) => (
                  <img
                    key={`${photo.url}-${idx}`}
                    src={photo.url}
                    alt={photo.label}
                    className="h-40 w-full rounded-2xl object-cover shadow-sm"
                    loading="lazy"
                  />
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-600">No photos uploaded yet.</p>
            )}
          </SurfaceCard>

          <SurfaceCard padding="lg">
            <h3 className="text-lg font-semibold text-slate-900">Itinerary</h3>
            {data.places?.length ? (
              <ol className="mt-3 space-y-3">
                {data.places.map((place, idx) => (
                  <li
                    key={place.id}
                    className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <div className="mt-1 h-6 w-6 flex-none rounded-full bg-brand-100 text-center text-xs font-semibold text-brand-700">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{place.name}</p>
                      <p className="text-xs text-slate-600">{place.city?.name}</p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-sm text-slate-600">No places linked yet.</p>
            )}
            {data.googlePlaces?.length ? (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-slate-900">Mapy places</h4>
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
          </SurfaceCard>
        </div>

        <aside className="space-y-6">
          <TripMap trip={data} />
          <SurfaceCard>
            <h3 className="text-lg font-semibold text-slate-900">Completed this trip</h3>
            <p className="mt-2 text-sm text-slate-600">{formatDoneCount(completedByUsers.length)}</p>
            {authenticated ? (
              <Button
                type="button"
                onClick={() => markDoneMut.mutate()}
                disabled={userMarkedDone || markDoneMut.isPending}
                size="sm"
                className="mt-3 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {userMarkedDone ? 'Marked as done' : markDoneMut.isPending ? 'Saving...' : 'Mark as done'}
              </Button>
            ) : (
              <p className="mt-3 text-sm text-slate-600">
                Login to mark this trip as done.
                <Button
                  type="button"
                  disabled={initializing}
                  onClick={() => login()}
                  variant="secondary"
                  size="sm"
                  className="ml-2 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {initializing ? 'Loading...' : 'Login'}
                </Button>
              </p>
            )}
          </SurfaceCard>
          <SurfaceCard>
            <h3 className="text-lg font-semibold text-slate-900">Comments</h3>
            {data.comments?.length ? (
              <ul className="mt-3 space-y-3 text-sm text-slate-700">
                {data.comments.map((comment, idx) => (
                  <li key={idx} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                    <p className="font-semibold text-slate-900">{comment.name ?? 'Visitor'}</p>
                    <p>{comment.value}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-600">No comments yet.</p>
            )}
            {authenticated ? (
              <form
                onSubmit={commentForm.handleSubmit((values) => commentMut.mutate(values))}
                className="mt-3 space-y-2"
              >
                <TextArea
                  {...commentForm.register('value', { required: true })}
                  placeholder="Add a comment"
                />
                <Button
                  type="submit"
                  disabled={commentMut.isPending}
                  size="sm"
                  className="disabled:opacity-70"
                >
                  {commentMut.isPending ? 'Posting...' : 'Post comment'}
                </Button>
              </form>
            ) : (
              <p className="mt-3 text-sm text-slate-600">
                Please login to comment.
                <Button
                  type="button"
                  disabled={initializing}
                  onClick={() => login()}
                  variant="secondary"
                  size="sm"
                  className="ml-2 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {initializing ? 'Loading...' : 'Login'}
                </Button>
              </p>
            )}
          </SurfaceCard>
          <SurfaceCard>
            <h3 className="text-lg font-semibold text-slate-900">Rate this trip</h3>
            <div className="mt-2 flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => ratingMut.mutate(star)}
                  className={`h-9 w-9 rounded-full border text-sm font-semibold ${
                    data.rating && data.rating >= star ? 'bg-brand-600 text-white' : 'bg-white text-slate-800'
                  }`}
                >
                  {star}
                </button>
              ))}
            </div>
            {ratingMut.isPending && <p className="mt-2 text-xs text-slate-600">Submitting...</p>}
          </SurfaceCard>
        </aside>
      </div>
    </main>
  );
};

const formatDuration = (minutes?: number) => {
  if (!minutes) return '—';
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins ? `${hours}h ${mins}m` : `${hours}h`;
  }
  const days = Math.floor(minutes / 1440);
  return `${days} day${days > 1 ? 's' : ''}`;
};

const mapContainerStyle = { width: '100%', height: '280px', borderRadius: '16px', overflow: 'hidden' };

const TripMap = ({ trip }: { trip: TripModel }) => {
  const needsTileKey =
    env.mapyTilesUrl.includes('{apikey}') ||
    env.mapyTilesUrl.includes('{API_KEY}') ||
    env.mapyTilesUrl.includes('${API_KEY}');
  const hasTiles = !!env.mapyApiKey || !needsTileKey;
  const coords = useMemo(() => extractCoords(trip.places), [trip.places]);
  const mapyCoords = useMemo(() => extractMapyCoords(trip.googlePlaces), [trip.googlePlaces]);
  const allCoords = useMemo(() => [...coords, ...mapyCoords], [coords, mapyCoords]);

  if (!allCoords.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <h3 className="text-lg font-semibold text-slate-900">Map</h3>
        <p className="mt-2 text-sm text-slate-600">No coordinates available.</p>
      </div>
    );
  }

  if (!hasTiles) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <h3 className="text-lg font-semibold text-slate-900">Map</h3>
        <p className="mt-2 text-sm text-slate-600">
          Provide <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">VITE_MAPY_API_KEY</code> to render the
          map.
        </p>
      </div>
    );
  }

  const center = allCoords[0];
  const bounds = allCoords.length > 1 ? L.latLngBounds(allCoords) : undefined;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <MapContainer
        center={center}
        zoom={10}
        style={mapContainerStyle}
        bounds={bounds}
        boundsOptions={{ padding: [24, 24] }}
        scrollWheelZoom={false}
      >
        <MapyTileLayer />
        {coords.map((pos, idx) => (
          <CircleMarker
            key={`${pos.lat}-${pos.lng}-${idx}`}
            center={pos}
            radius={7}
            pathOptions={{ color: '#0f172a', weight: 2, fillColor: '#ffffff', fillOpacity: 1 }}
          >
            <Tooltip direction="top" offset={[0, -8]}>{`${idx + 1}`}</Tooltip>
          </CircleMarker>
        ))}
        {mapyCoords.map((pos, idx) => (
          <CircleMarker
            key={`m-${pos.lat}-${pos.lng}-${idx}`}
            center={pos}
            radius={7}
            pathOptions={{ color: '#1d4ed8', weight: 2, fillColor: '#ffffff', fillOpacity: 1 }}
          >
            <Tooltip direction="top" offset={[0, -8]}>{`M${idx + 1}`}</Tooltip>
          </CircleMarker>
        ))}
        {coords.length > 1 && <Polyline positions={coords} pathOptions={{ color: '#2d75f5', weight: 4 }} />}
      </MapContainer>
    </div>
  );
};

const extractCoords = (places?: PlaceDetail[]) =>
  (places ?? [])
    .map((place) => {
      if (!place.feature?.geometry?.coordinates) return null;
      const [lng, lat] = place.feature.geometry.coordinates;
      return { lat, lng };
    })
    .filter(Boolean) as { lat: number; lng: number }[];

const getCoordsFromGeometry = (geometry?: GeometryPoint | null) => {
  if (!geometry || geometry.type !== 'Point' || !geometry.coordinates) return null;
  const [lng, lat] = geometry.coordinates;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
};

const extractMapyCoords = (places?: TripModel['googlePlaces']) =>
  (places ?? [])
    .map((place) => {
      const coords = getCoordsFromGeometry(place.geometry);
      if (!coords) return null;
      return { ...coords, name: place.name };
    })
    .filter(Boolean) as Array<{ lat: number; lng: number; name: string }>;

const buildTripPhotos = (trip: TripModel) => {
  const fromFiles =
    trip.files
      ?.map((file) => {
        const url = file.url ?? file.name;
        if (!url) return null;
        return { url, label: file.name ?? 'Trip photo' };
      })
      .filter(Boolean) ?? [];
  const fromImages =
    trip.images
      ?.map((url) => (url ? { url, label: 'Trip photo' } : null))
      .filter(Boolean) ?? [];
  const seen = new Set<string>();
  return [...fromFiles, ...fromImages].filter((photo) => {
    if (!photo || seen.has(photo.url)) return false;
    seen.add(photo.url);
    return true;
  }) as { url: string; label: string }[];
};

const hasUserMarkedDone = (users: User[] | undefined, identifiers: Array<string | undefined>) => {
  const normalizedIds = identifiers
    .filter((value): value is string => Boolean(value))
    .map((value) => value.trim().toLowerCase());

  return (users ?? []).some((user) =>
    [user.email, user.username, user.name, user.displayName]
      .filter((value): value is string => Boolean(value))
      .some((value) => normalizedIds.includes(value.trim().toLowerCase()))
  );
};

const formatDoneCount = (count: number) => {
  if (count === 0) return 'No one has marked this trip as done yet.';
  if (count === 1) return '1 traveler has marked this trip as done.';
  return `${count} travelers have marked this trip as done.`;
};

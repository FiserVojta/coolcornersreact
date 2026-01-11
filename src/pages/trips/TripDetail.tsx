import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addTripComment, addTripRating, deleteTrip, fetchTrip } from '../../api/trips';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { RatingBadge } from '../../components/RatingBadge';
import { TagList } from '../../components/TagList';
import { useAuth } from '../../auth/KeycloakProvider';
import { env } from '../../config/env';
import { GoogleMap, Marker, Polyline, useJsApiLoader } from '@react-google-maps/api';
import type { GeometryPoint, TripModel } from '../../types/trip';
import type { PlaceDetail } from '../../types/place';
import type { CommentModel } from '../../types/place';
import { useForm } from 'react-hook-form';

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
  const { authenticated, initializing, login, canEdit } = useAuth();
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

  if (!Number.isFinite(tripId)) return <ErrorState message="Invalid trip id" />;
  if (isLoading) return <LoadingState label="Loading trip..." />;
  if (error || !data) return <ErrorState message="Unable to load this trip right now." />;

  const owner = data.createdBy;
  const canUserEdit = owner ? canEdit(owner) : false;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
            {data.category?.title ?? 'Trip'}
          </p>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900">{data.name}</h1>
            <RatingBadge rating={data.rating} />
          </div>
          <p className="text-slate-600">{formatDuration(data.duration)}</p>
        </div>
        {canUserEdit && (
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              You can edit
            </span>
            <button
              onClick={() => navigate(`/trips/${tripId}/edit`)}
              className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-900 shadow-sm transition hover:border-slate-400"
            >
              Edit
            </button>
            <button
              onClick={() => {
                if (confirm('Delete this trip?')) deleteMut.mutate();
              }}
              className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700"
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        )}
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <section className="rounded-2xl bg-white p-6 shadow-card">
            <h2 className="text-xl font-semibold text-slate-900">Overview</h2>
            <p className="mt-2 text-slate-700 leading-relaxed">{data.description}</p>
            <div className="mt-4">
              <TagList tags={data.tags} />
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-card">
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
          <TripMap trip={data} />
          <section className="rounded-2xl bg-white p-5 shadow-card">
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
                <textarea
                  {...commentForm.register('value', { required: true })}
                  placeholder="Add a comment"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
                />
                <button
                  type="submit"
                  disabled={commentMut.isPending}
                  className="rounded-full bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-70"
                >
                  {commentMut.isPending ? 'Posting...' : 'Post comment'}
                </button>
              </form>
            ) : (
              <p className="mt-3 text-sm text-slate-600">
                Please login to comment.
                <button
                  type="button"
                  disabled={initializing}
                  onClick={() => login()}
                  className="ml-2 inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-900 shadow-sm transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {initializing ? 'Loading...' : 'Login'}
                </button>
              </p>
            )}
          </section>
          <section className="rounded-2xl bg-white p-5 shadow-card">
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
          </section>
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
  const hasKey = !!env.googleMapsApiKey;
  const coords = useMemo(() => extractCoords(trip.places), [trip.places]);
  const [googleCoords, setGoogleCoords] = useState<{ id: string; name: string; lat: number; lng: number }[]>([]);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'coolcorners-map',
    googleMapsApiKey: env.googleMapsApiKey ?? '',
    libraries: mapLibraries
  });

  const googleCoordsFromGeometry = useMemo(() => {
    return (trip.googlePlaces ?? [])
      .map((place) => {
        const coords = getCoordsFromGeometry(place.geometry);
        if (!coords) return null;
        return { id: place.id, name: place.name, ...coords };
      })
      .filter(Boolean) as { id: string; name: string; lat: number; lng: number }[];
  }, [trip.googlePlaces]);

  useEffect(() => {
    if (!isLoaded || !trip.googlePlaces?.length || !mapRef.current) return;
    const missing = trip.googlePlaces.filter((place) => !getCoordsFromGeometry(place.geometry));
    if (!missing.length) return;
    const service = new google.maps.places.PlacesService(mapRef.current);
    let cancelled = false;

    const loadPlaces = async () => {
      const results = await Promise.all(
        missing.map(
          (place) =>
            new Promise<{ id: string; name: string; lat: number; lng: number } | null>((resolve) => {
              service.getDetails({ placeId: place.id, fields: ['geometry', 'name'] }, (detail, status) => {
                if (status !== google.maps.places.PlacesServiceStatus.OK || !detail?.geometry?.location) {
                  resolve(null);
                  return;
                }
                resolve({
                  id: place.id,
                  name: detail.name ?? place.name,
                  lat: detail.geometry.location.lat(),
                  lng: detail.geometry.location.lng()
                });
              });
            })
        ) ?? []
      );
      if (cancelled) return;
      setGoogleCoords(results.filter(Boolean) as { id: string; name: string; lat: number; lng: number }[]);
    };

    loadPlaces();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, trip.googlePlaces, googleCoordsFromGeometry]);

  const googleMarkers = useMemo(() => {
    const byId = new Map<string, { id: string; name: string; lat: number; lng: number }>();
    googleCoordsFromGeometry.forEach((place) => byId.set(place.id, place));
    googleCoords.forEach((place) => {
      if (!byId.has(place.id)) byId.set(place.id, place);
    });
    return Array.from(byId.values());
  }, [googleCoordsFromGeometry, googleCoords]);

  const allCoords = useMemo(() => {
    const google = googleMarkers.map((place) => ({ lat: place.lat, lng: place.lng }));
    return [...coords, ...google];
  }, [coords, googleMarkers]);

  if (!allCoords.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <h3 className="text-lg font-semibold text-slate-900">Map</h3>
        <p className="mt-2 text-sm text-slate-600">No coordinates available.</p>
      </div>
    );
  }

  if (!hasKey) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <h3 className="text-lg font-semibold text-slate-900">Map</h3>
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
        <h3 className="text-lg font-semibold text-slate-900">Map</h3>
        <p className="mt-2 text-sm text-slate-600">Loading map...</p>
      </div>
    );
  }

  const center = allCoords[0];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <GoogleMap
        center={center}
        zoom={10}
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
        mapContainerStyle={mapContainerStyle}
        onLoad={(map) => {
          mapRef.current = map;
        }}
      >
        {coords.map((pos, idx) => (
          <Marker key={`${pos.lat}-${pos.lng}-${idx}`} position={pos} label={`${idx + 1}`} />
        ))}
        {googleMarkers.map((place, idx) => (
          <Marker
            key={place.id}
            position={{ lat: place.lat, lng: place.lng }}
            label={`G${idx + 1}`}
            title={place.name}
          />
        ))}
        {coords.length > 1 && <Polyline path={coords} options={{ strokeColor: '#2d75f5', strokeWeight: 4 }} />}
      </GoogleMap>
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

const mapLibraries: ('places')[] = ['places'];

const getCoordsFromGeometry = (geometry?: GeometryPoint | null) => {
  if (!geometry || geometry.type !== 'Point' || !geometry.coordinates) return null;
  const [lng, lat] = geometry.coordinates;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
};

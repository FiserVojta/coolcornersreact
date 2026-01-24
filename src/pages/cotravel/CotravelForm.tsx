import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { createCotravel, fetchCotravel, updateCotravel } from '../../api/cotravel';
import { fetchCategories } from '../../api/categories';
import { fetchTags } from '../../api/tags';
import { fetchTrips } from '../../api/trips';
import { searchMapyPlaces } from '../../api/mapy';
import type { CotravelCreateRequest } from '../../types/cotravel';
import type { GooglePlaceInput } from '../../types/trip';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { env } from '../../config/env';
import { CircleMarker, MapContainer, Tooltip, useMapEvents } from 'react-leaflet';
import { MapyTileLayer } from '../../components/MapyTileLayer';

type FormValues = CotravelCreateRequest;

export const CotravelForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const cotravelId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [googlePlaces, setGooglePlaces] = useState<GooglePlaceInput[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<
    Array<{ id: string; name: string; lat: number; lng: number }>
  >([]);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [selectedTripIds, setSelectedTripIds] = useState<number[]>([]);

  const detailQuery = useQuery({
    queryKey: ['cotravel', cotravelId],
    queryFn: () => fetchCotravel(cotravelId),
    enabled: isEdit && Number.isFinite(cotravelId)
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories', 'COTRAVEL'],
    queryFn: () => fetchCategories('COTRAVEL')
  });

  const tagsQuery = useQuery({
    queryKey: ['tags'],
    queryFn: fetchTags
  });

  const tripsQuery = useQuery({
    queryKey: ['trips'],
    queryFn: () => fetchTrips()
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    defaultValues: {
      description: '',
      capacity: 4,
      startTime: '',
      wanderers: [],
      tags: [],
      category: 1,
      wanderParts: [],
      googlePlaces: []
    }
  });

  useEffect(() => {
    if (detailQuery.data) {
      const googlePlacesFromPlan =
        detailQuery.data.googlePlaces?.map((place) => ({
          placeId: place.id,
          name: place.name,
          geometry: place.geometry ?? null
        })) ?? [];
      reset({
        description: detailQuery.data.description,
        capacity: detailQuery.data.capacity,
        startTime: String(detailQuery.data.startTime),
        wanderers: detailQuery.data.wanderers?.map((u) => u.id) ?? [],
        tags: detailQuery.data.tags?.map((t) => t.id) ?? [],
        category: detailQuery.data.category?.id ?? 1,
        wanderParts:
          detailQuery.data.wanderParts?.map((part) => ({
            places: part.places?.map((p) => p.id) ?? [],
            trips: part.trips?.map((t) => t.id) ?? [],
            order: part.order
          })) ?? []
      });
      setGooglePlaces(googlePlacesFromPlan);
      const tripIds =
        detailQuery.data.wanderParts
          ?.flatMap((part) => part.trips ?? [])
          .map((trip) => trip.id) ?? [];
      setSelectedTripIds(Array.from(new Set(tripIds)));
    }
  }, [detailQuery.data, reset]);

  const createMut = useMutation({
    mutationFn: (payload: FormValues) => createCotravel(payload),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['cotravel'] });
      navigate(`/cotravel/${created.id}`);
    }
  });

  const updateMut = useMutation({
    mutationFn: (payload: FormValues) => updateCotravel(cotravelId, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['cotravel'] });
      queryClient.setQueryData(['cotravel', cotravelId], updated);
      navigate(`/cotravel/${cotravelId}`);
    }
  });

  if (isEdit && detailQuery.isLoading) return <LoadingState label="Loading co-travel..." />;
  if (isEdit && detailQuery.error) return <ErrorState message="Failed to load co-travel for editing." />;

  const onSubmit = (values: FormValues) => {
    const payload: FormValues = {
      ...values,
      wanderers: normalizeNumberList(values.wanderers),
      tags: normalizeNumberList(values.tags),
      category: Number(values.category),
      wanderParts: selectedTripIds.length
        ? [
            {
              places: [],
              trips: selectedTripIds,
              order: 1
            }
          ]
        : [],
      googlePlaces
    };
    if (isEdit) return updateMut.mutate(payload);
    return createMut.mutate(payload);
  };

  const needsTileKey =
    env.mapyTilesUrl.includes('{apikey}') ||
    env.mapyTilesUrl.includes('{API_KEY}') ||
    env.mapyTilesUrl.includes('${API_KEY}');
  const hasTiles = !!env.mapyApiKey || !needsTileKey;
  const canSearch = !!env.mapyApiKey && !!env.mapySearchUrl;

  const mapCenter = useMemo(() => {
    const firstCoords = googlePlaces
      .map((place) => getCoordsFromGeometry(place.geometry))
      .find((coords) => coords);
    if (firstCoords) return firstCoords;
    return { lat: 50.0755, lng: 14.4378 };
  }, [googlePlaces]);

  const removeGooglePlace = (placeId: string) => {
    setGooglePlaces((prev) => prev.filter((place) => place.placeId !== placeId));
  };

  const addSearchResult = (result: { id: string; name: string; lat: number; lng: number }) => {
    const nextPlace: GooglePlaceInput = {
      placeId: result.id,
      name: result.name,
      geometry: { type: 'Point', coordinates: [result.lng, result.lat] }
    };
    setGooglePlaces((prev) => {
      if (prev.some((place) => place.placeId === nextPlace.placeId)) return prev;
      return [...prev, nextPlace];
    });
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchMessage(null);
    setSearching(true);
    try {
      const results = await searchMapyPlaces(searchQuery);
      setSearchResults(results);
      if (!results.length) setSearchMessage('No results found.');
    } catch (err) {
      setSearchResults([]);
      setSearchMessage(err instanceof Error ? err.message : 'Search failed.');
    } finally {
      setSearching(false);
    }
  };

  const handleMapClick = (coords: { lat: number; lng: number }) => {
    const id = `map-click-${coords.lat}-${coords.lng}`;
    const nextPlace: GooglePlaceInput = {
      placeId: id,
      name: `Selected location (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)})`,
      geometry: { type: 'Point', coordinates: [coords.lng, coords.lat] }
    };
    setGooglePlaces((prev) => {
      if (prev.some((place) => place.placeId === nextPlace.placeId)) return prev;
      return [...prev, nextPlace];
    });
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">CoTravel</p>
          <h1 className="text-3xl font-bold text-slate-900">{isEdit ? 'Edit plan' : 'Create plan'}</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
        <Field label="Description" error={errors.description}>
          <textarea
            {...register('description', { required: 'Description is required' })}
            rows={4}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-brand-400"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start time" error={errors.startTime}>
            <input
              type="datetime-local"
              {...register('startTime', { required: 'Start time is required' })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-brand-400"
            />
          </Field>
          <Field label="Capacity" error={errors.capacity}>
            <input
              type="number"
              min={1}
              {...register('capacity', { valueAsNumber: true, required: 'Capacity is required' })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-brand-400"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" error={errors.category}>
            <select
              {...register('category', { valueAsNumber: true, required: 'Category is required' })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-brand-400"
            >
              <option value="">Select category</option>
              {(categoriesQuery.data ?? []).map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.title || cat.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Wanderer IDs (comma separated)">
            <input
              {...register('wanderers')}
              placeholder="e.g. 2,3,4"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-brand-400"
            />
          </Field>
        </div>

        <Field label="Tags">
          <select
            multiple
            {...register('tags', {
              setValueAs: (vals) =>
                Array.isArray(vals) ? vals.map((v) => Number(v)).filter((n) => !Number.isNaN(n)) : []
            })}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-brand-400"
          >
            {(tagsQuery.data ?? []).map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.title || tag.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Trips">
          <div className="space-y-2">
            <select
              multiple
              value={selectedTripIds.map(String)}
              onChange={(event) => {
                const values = Array.from(event.currentTarget.selectedOptions)
                  .map((option) => Number(option.value))
                  .filter((id) => Number.isFinite(id));
                setSelectedTripIds(values);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-brand-400"
            >
              {(tripsQuery.data?.data ?? []).map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.name}
                </option>
              ))}
            </select>
            {selectedTripIds.length === 1 ? (
              <a
                href={`/trips/${selectedTripIds[0]}`}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-300"
              >
                View selected trip
              </a>
            ) : (
              <span className="text-xs text-slate-500">Select a single trip to open its detail.</span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {tripsQuery.isLoading ? 'Loading trips...' : 'Select one or more trips to include.'}
          </p>
        </Field>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold text-slate-900">Mapy places</h3>
            <p className="text-xs text-slate-600">Search and add multiple places to this plan.</p>
          </div>

          <div className="mt-4 space-y-3">
            {canSearch ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search for a place"
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-brand-400"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={searching || !searchQuery.trim()}
                  className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {searching ? 'Searching...' : 'Search'}
                </button>
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                Provide <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">VITE_MAPY_API_KEY</code> to search
                Mapy places.
              </p>
            )}

            {searchMessage && <p className="text-xs text-slate-500">{searchMessage}</p>}
            {searchResults.length ? (
              <ul className="space-y-2">
                {searchResults.map((result) => (
                  <li
                    key={result.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{result.name}</p>
                      <p className="text-xs text-slate-500">
                        {result.lat.toFixed(5)}, {result.lng.toFixed(5)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => addSearchResult(result)}
                      className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                    >
                      Add place
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {hasTiles ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <MapContainer
                  center={mapCenter}
                  zoom={googlePlaces.length ? 11 : 6}
                  style={{ width: '100%', height: '260px' }}
                  scrollWheelZoom={false}
                >
                  <MapyTileLayer />
                  <MapClickHandler onClick={handleMapClick} />
                  {googlePlaces
                    .map((place) => ({
                      place,
                      coords: getCoordsFromGeometry(place.geometry)
                    }))
                    .filter((entry) => !!entry.coords)
                    .map((place, idx) => (
                      <CircleMarker
                        key={place.place.placeId}
                        center={place.coords as { lat: number; lng: number }}
                        radius={7}
                        pathOptions={{ color: '#0f172a', weight: 2, fillColor: '#ffffff', fillOpacity: 1 }}
                      >
                        <Tooltip direction="top" offset={[0, -8]}>{`${idx + 1}`}</Tooltip>
                      </CircleMarker>
                    ))}
                </MapContainer>
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                Provide <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">VITE_MAPY_API_KEY</code> to render
                the map.
              </p>
            )}
            {hasTiles && <p className="text-xs text-slate-500">Tip: click the map to add a location.</p>}

            {googlePlaces.length ? (
              <ul className="space-y-2">
                {googlePlaces.map((place, idx) => (
                  <li
                    key={place.placeId}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {idx + 1}. {place.name ?? 'Mapy place'}
                      </p>
                      <p className="text-xs text-slate-500">Place ID: {place.placeId}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeGooglePlace(place.placeId)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">No places added yet.</p>
            )}
          </div>
        </section>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting || createMut.isPending || updateMut.isPending}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isEdit ? (updateMut.isPending ? 'Saving...' : 'Save') : createMut.isPending ? 'Creating...' : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-400"
          >
            Cancel
          </button>
        </div>
      </form>
    </main>
  );
};

const Field = ({
  label,
  error,
  children
}: {
  label: string;
  error?: { message?: string };
  children: React.ReactNode;
}) => (
  <label className="space-y-1 text-sm text-slate-700">
    <span className="block font-semibold text-slate-900">{label}</span>
    {children}
    {error?.message && <p className="text-xs font-semibold text-rose-600">{error.message}</p>}
  </label>
);

const normalizeNumberList = (value: number[] | string | null | undefined) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((v) => Number(v.trim()))
      .filter((n) => !Number.isNaN(n));
  }
  return [];
};

const getCoordsFromGeometry = (geometry?: { type?: string; coordinates?: [number, number] } | null) => {
  if (!geometry || geometry.type !== 'Point' || !geometry.coordinates) return null;
  const [lng, lat] = geometry.coordinates;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
};

const MapClickHandler = ({ onClick }: { onClick: (coords: { lat: number; lng: number }) => void }) => {
  useMapEvents({
    click: (event) => onClick(event.latlng)
  });
  return null;
};

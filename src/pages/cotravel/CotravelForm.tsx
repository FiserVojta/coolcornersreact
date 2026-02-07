import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { createCotravel, fetchCotravel, updateCotravel } from '../../api/cotravel';
import { fetchCategories } from '../../api/categories';
import { fetchTags } from '../../api/tags';
import { fetchTrips } from '../../api/trips';
import { fetchPlaces } from '../../api/places';
import { searchMapyPlaces } from '../../api/mapy';
import type { CotravelCreateRequest } from '../../types/cotravel';
import type { GooglePlaceInput } from '../../types/trip';
import type { PlaceDetail } from '../../types/place';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { env } from '../../config/env';
import { CircleMarker, MapContainer, Tooltip, useMapEvents } from 'react-leaflet';
import { MapyTileLayer } from '../../components/MapyTileLayer';

type FormValues = CotravelCreateRequest;
type SegmentDraft = {
  id: string;
  name: string;
  tripIds: number[];
  placeIds: number[];
  googlePlaces: GooglePlaceInput[];
};

const createSegmentId = () => `segment-${Math.random().toString(36).slice(2, 9)}`;

const createSegment = (): SegmentDraft => ({
  id: createSegmentId(),
  name: '',
  tripIds: [],
  placeIds: [],
  googlePlaces: []
});

export const CotravelForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const cotravelId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [segments, setSegments] = useState<SegmentDraft[]>(() => [createSegment()]);

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

  const placesQuery = useQuery({
    queryKey: ['places'],
    queryFn: () => fetchPlaces()
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
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
            googlePlaces:
              part.googlePlaces?.map((place) => ({
                placeId: place.id,
                name: place.name,
                geometry: place.geometry ?? null
              })) ?? [],
            name: part.name ?? '',
            order: part.order
          })) ?? []
      });
      const draftSegments =
        detailQuery.data.wanderParts?.map((part) => ({
          id: createSegmentId(),
          name: part.name ?? '',
          tripIds: part.trips?.map((trip) => trip.id) ?? [],
          placeIds: part.places?.map((place) => place.id) ?? [],
          googlePlaces:
            part.googlePlaces?.map((place) => ({
              placeId: place.id,
              name: place.name,
              geometry: place.geometry ?? null
            })) ?? []
        })) ?? [];
      setSegments(draftSegments.length ? draftSegments : [createSegment()]);
    }
  }, [detailQuery.data, reset]);

  const selectedTags = watch('tags') ?? [];

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
    const preparedSegments = segments.filter((segment) => segment.tripIds.length || segment.placeIds.length);
    const payload: FormValues = {
      ...values,
      wanderers: normalizeNumberList(values.wanderers),
      tags: normalizeNumberList(values.tags),
      category: Number(values.category),
      wanderParts: preparedSegments.map((segment, index) => ({
        name: segment.name || undefined,
        places: segment.placeIds,
        trips: segment.tripIds,
        googlePlaces: segment.googlePlaces,
        order: index + 1
      })),
      googlePlaces: []
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

  const trips = tripsQuery.data?.data ?? [];
  const places = placesQuery.data?.data ?? [];

  const addSegment = () => {
    setSegments((prev) => [...prev, createSegment()]);
  };

  const removeSegment = (segmentId: string) => {
    setSegments((prev) => (prev.length > 1 ? prev.filter((segment) => segment.id !== segmentId) : prev));
  };

  const toggleSegmentTrip = (segmentId: string, tripId: number) => {
    setSegments((prev) =>
      prev.map((segment) =>
        segment.id === segmentId
          ? {
              ...segment,
              tripIds: segment.tripIds.includes(tripId)
                ? segment.tripIds.filter((id) => id !== tripId)
                : [...segment.tripIds, tripId]
            }
          : segment
      )
    );
  };

  const toggleSegmentPlace = (segmentId: string, placeId: number) => {
    setSegments((prev) =>
      prev.map((segment) =>
        segment.id === segmentId
          ? {
              ...segment,
              placeIds: segment.placeIds.includes(placeId)
                ? segment.placeIds.filter((id) => id !== placeId)
                : [...segment.placeIds, placeId]
            }
          : segment
      )
    );
  };

  const updateSegmentName = (segmentId: string, name: string) => {
    setSegments((prev) =>
      prev.map((segment) => (segment.id === segmentId ? { ...segment, name } : segment))
    );
  };

  const addSegmentGooglePlace = (segmentId: string, place: GooglePlaceInput) => {
    setSegments((prev) =>
      prev.map((segment) =>
        segment.id === segmentId
          ? {
              ...segment,
              googlePlaces: segment.googlePlaces.some((entry) => entry.placeId === place.placeId)
                ? segment.googlePlaces
                : [...segment.googlePlaces, place]
            }
          : segment
      )
    );
  };

  const removeSegmentGooglePlace = (segmentId: string, placeId: string) => {
    setSegments((prev) =>
      prev.map((segment) =>
        segment.id === segmentId
          ? {
              ...segment,
              googlePlaces: segment.googlePlaces.filter((place) => place.placeId !== placeId)
            }
          : segment
      )
    );
  };

  const toggleTag = (id: number) => {
    const normalized = normalizeNumberList(selectedTags);
    const next = normalized.includes(id) ? normalized.filter((item) => item !== id) : [...normalized, id];
    setValue('tags', next, { shouldValidate: true, shouldDirty: true });
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-slate-200">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-brand-50" />
        <div className="relative z-10 flex items-center justify-between px-6 py-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">CoTravel</p>
            <h1 className="text-3xl font-bold text-slate-900">{isEdit ? 'Edit plan' : 'Create plan'}</h1>
          </div>
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
          <Field label="Tags">
            <details className="group rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
              <summary className="cursor-pointer list-none font-semibold text-slate-700">
                {selectedTags.length
                  ? (tagsQuery.data ?? [])
                      .filter((tag) => selectedTags.includes(tag.id))
                      .map((tag) => tag.title || tag.name)
                      .join(', ')
                  : 'Select tags'}
              </summary>
              <div className="mt-3 max-h-48 space-y-2 overflow-auto pb-1 pr-1">
                {(tagsQuery.data ?? []).map((tag) => (
                  <label key={tag.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                      checked={selectedTags.includes(tag.id)}
                      onChange={() => toggleTag(tag.id)}
                    />
                    <span>{tag.title || tag.name}</span>
                  </label>
                ))}
                {!(tagsQuery.data ?? []).length && <p className="text-xs text-slate-500">No tags available.</p>}
              </div>
            </details>
          </Field>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Segments</h3>
              <p className="text-xs text-slate-600">Group trips and places into separate sections.</p>
            </div>
            <button
              type="button"
              onClick={addSegment}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300"
            >
              Add segment
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {segments.map((segment, index) => (
              <SegmentEditor
                key={segment.id}
                index={index}
                segment={segment}
                trips={trips}
                places={places}
                tripsLoading={tripsQuery.isLoading}
                placesLoading={placesQuery.isLoading}
                canSearchMapy={canSearch}
                hasMapTiles={hasTiles}
                onRename={updateSegmentName}
                onToggleTrip={toggleSegmentTrip}
                onTogglePlace={toggleSegmentPlace}
                onAddMapyPlace={addSegmentGooglePlace}
                onRemoveMapyPlace={removeSegmentGooglePlace}
                onRemove={removeSegment}
                canRemove={segments.length > 1}
              />
            ))}
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

const SegmentEditor = ({
  index,
  segment,
  trips,
  places,
  tripsLoading,
  placesLoading,
  canSearchMapy,
  hasMapTiles,
  onRename,
  onToggleTrip,
  onTogglePlace,
  onAddMapyPlace,
  onRemoveMapyPlace,
  onRemove,
  canRemove
}: {
  index: number;
  segment: SegmentDraft;
  trips: Array<{ id: number; name: string; category?: { title?: string | null } }>;
  places: PlaceDetail[];
  tripsLoading: boolean;
  placesLoading: boolean;
  canSearchMapy: boolean;
  hasMapTiles: boolean;
  onRename: (segmentId: string, name: string) => void;
  onToggleTrip: (segmentId: string, tripId: number) => void;
  onTogglePlace: (segmentId: string, placeId: number) => void;
  onAddMapyPlace: (segmentId: string, place: GooglePlaceInput) => void;
  onRemoveMapyPlace: (segmentId: string, placeId: string) => void;
  onRemove: (segmentId: string) => void;
  canRemove: boolean;
}) => {
  const [tripQuery, setTripQuery] = useState('');
  const [placeQuery, setPlaceQuery] = useState('');
  const [mapyQuery, setMapyQuery] = useState('');
  const [mapyResults, setMapyResults] = useState<
    Array<{ id: string; name: string; lat: number; lng: number }>
  >([]);
  const [mapyMessage, setMapyMessage] = useState<string | null>(null);
  const [mapySearching, setMapySearching] = useState(false);

  const filteredTrips = useMemo(() => {
    const query = tripQuery.trim().toLowerCase();
    if (!query) return trips;
    return trips.filter((trip) => trip.name?.toLowerCase().includes(query));
  }, [tripQuery, trips]);

  const filteredPlaces = useMemo(() => {
    const query = placeQuery.trim().toLowerCase();
    if (!query) return places;
    return places.filter((place) => place.name?.toLowerCase().includes(query));
  }, [placeQuery, places]);

  const mapyCoords = useMemo(
    () =>
      segment.googlePlaces
        .map((place) => getCoordsFromGeometry(place.geometry))
        .filter(Boolean) as { lat: number; lng: number }[],
    [segment.googlePlaces]
  );
  const mapyCenter = mapyCoords[0] ?? { lat: 50.0755, lng: 14.4378 };

  const handleMapyMapClick = (coords: { lat: number; lng: number }) => {
    const id = `segment-map-click-${coords.lat}-${coords.lng}`;
    const nextPlace: GooglePlaceInput = {
      placeId: id,
      name: `Selected location (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)})`,
      geometry: { type: 'Point', coordinates: [coords.lng, coords.lat] }
    };
    onAddMapyPlace(segment.id, nextPlace);
  };

  const handleMapySearch = async () => {
    if (!mapyQuery.trim()) return;
    setMapyMessage(null);
    setMapySearching(true);
    try {
      const results = await searchMapyPlaces(mapyQuery);
      setMapyResults(results);
      if (!results.length) setMapyMessage('No results found.');
    } catch (err) {
      setMapyResults([]);
      setMapyMessage(err instanceof Error ? err.message : 'Search failed.');
    } finally {
      setMapySearching(false);
    }
  };

  const handleAddMapy = (result: { id: string; name: string; lat: number; lng: number }) => {
    const nextPlace: GooglePlaceInput = {
      placeId: result.id,
      name: result.name,
      geometry: { type: 'Point', coordinates: [result.lng, result.lat] }
    };
    onAddMapyPlace(segment.id, nextPlace);
    setMapyResults([]);
    setMapyQuery('');
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3">
          <input
            value={segment.name}
            onChange={(event) => onRename(segment.id, event.target.value)}
            placeholder={`Segment ${index + 1}`}
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 shadow-sm outline-none focus:border-brand-400"
          />
        </div>
        <button
          type="button"
          onClick={() => onRemove(segment.id)}
          disabled={!canRemove}
          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Remove
        </button>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Trips</p>
            <span className="text-xs text-slate-500">{segment.tripIds.length} selected</span>
          </div>
          <input
            value={tripQuery}
            onChange={(event) => setTripQuery(event.target.value)}
            placeholder="Search trips"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 shadow-sm outline-none focus:border-brand-400"
          />
          <div className="max-h-48 space-y-2 overflow-auto">
            {tripsLoading ? (
              <p className="text-xs text-slate-500">Loading trips...</p>
            ) : filteredTrips.length ? (
              filteredTrips.map((trip) => {
                const isSelected = segment.tripIds.includes(trip.id);
                return (
                  <div
                    key={trip.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{trip.name}</p>
                      {trip.category?.title && <p className="text-[10px] text-slate-500">{trip.category.title}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleTrip(segment.id, trip.id)}
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold shadow-sm transition ${
                        isSelected
                          ? 'bg-slate-900 text-white'
                          : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {isSelected ? 'Selected' : 'Add'}
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-500">No trips found.</p>
            )}
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Places</p>
            <span className="text-xs text-slate-500">{segment.placeIds.length} selected</span>
          </div>
          <input
            value={placeQuery}
            onChange={(event) => setPlaceQuery(event.target.value)}
            placeholder="Search places"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 shadow-sm outline-none focus:border-brand-400"
          />
          <div className="max-h-48 space-y-2 overflow-auto">
            {placesLoading ? (
              <p className="text-xs text-slate-500">Loading places...</p>
            ) : filteredPlaces.length ? (
              filteredPlaces.map((place) => {
                const isSelected = segment.placeIds.includes(place.id);
                return (
                  <div
                    key={place.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{place.name}</p>
                      {place.city?.name && <p className="text-[10px] text-slate-500">{place.city.name}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => onTogglePlace(segment.id, place.id)}
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold shadow-sm transition ${
                        isSelected
                          ? 'bg-slate-900 text-white'
                          : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {isSelected ? 'Selected' : 'Add'}
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-500">No places found.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">Mapy places</p>
          <span className="text-xs text-slate-500">{segment.googlePlaces.length} selected</span>
        </div>

        <div className="mt-2 space-y-2">
          {canSearchMapy ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={mapyQuery}
                onChange={(event) => setMapyQuery(event.target.value)}
                placeholder="Search Mapy places"
                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 shadow-sm outline-none focus:border-brand-400"
              />
              <button
                type="button"
                onClick={handleMapySearch}
                disabled={mapySearching || !mapyQuery.trim()}
                className="rounded-full bg-slate-900 px-3 py-2 text-[10px] font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {mapySearching ? 'Searching...' : 'Search'}
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Provide <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px]">VITE_MAPY_API_KEY</code> to
              search Mapy places.
            </p>
          )}

          {mapyMessage && <p className="text-xs text-slate-500">{mapyMessage}</p>}
          {mapyResults.length ? (
            <ul className="space-y-2">
              {mapyResults.map((result) => (
                <li
                  key={result.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{result.name}</p>
                    <p className="text-[10px] text-slate-500">
                      {result.lat.toFixed(5)}, {result.lng.toFixed(5)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddMapy(result)}
                    className="rounded-full bg-slate-900 px-3 py-1 text-[10px] font-semibold text-white shadow-sm transition hover:bg-slate-800"
                  >
                    Add place
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {hasMapTiles ? (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <MapContainer
                center={mapyCenter}
                zoom={mapyCoords.length ? 11 : 6}
                style={{ width: '100%', height: '200px' }}
                scrollWheelZoom={false}
              >
                <MapyTileLayer />
                <SegmentMapClickHandler onClick={handleMapyMapClick} />
                {mapyCoords.map((coords, idx) => (
                  <CircleMarker
                    key={`${coords.lat}-${coords.lng}-${idx}`}
                    center={coords}
                    radius={6}
                    pathOptions={{ color: '#0f172a', weight: 2, fillColor: '#ffffff', fillOpacity: 1 }}
                  >
                    <Tooltip direction="top" offset={[0, -6]}>{`${idx + 1}`}</Tooltip>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Provide <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px]">VITE_MAPY_API_KEY</code> to render
              the map.
            </p>
          )}
          {hasMapTiles && <p className="text-xs text-slate-500">Tip: click the map to add a location.</p>}

          {segment.googlePlaces.length ? (
            <ul className="space-y-2">
              {segment.googlePlaces.map((place, idx) => (
                <li
                  key={place.placeId}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {idx + 1}. {place.name ?? 'Mapy place'}
                    </p>
                    <p className="text-[10px] text-slate-500">Place ID: {place.placeId}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveMapyPlace(segment.id, place.placeId)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold text-slate-700"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">No Mapy places added yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

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

const SegmentMapClickHandler = ({ onClick }: { onClick: (coords: { lat: number; lng: number }) => void }) => {
  useMapEvents({
    click: (event) => onClick(event.latlng)
  });
  return null;
};

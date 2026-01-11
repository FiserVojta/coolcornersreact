import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { createCotravel, fetchCotravel, updateCotravel } from '../../api/cotravel';
import { fetchCategories } from '../../api/categories';
import { fetchTags } from '../../api/tags';
import { fetchTrips } from '../../api/trips';
import type { CotravelCreateRequest } from '../../types/cotravel';
import type { GooglePlaceInput } from '../../types/trip';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { env } from '../../config/env';
import { Autocomplete, GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

type FormValues = CotravelCreateRequest;

export const CotravelForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const cotravelId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [googlePlaces, setGooglePlaces] = useState<GooglePlaceInput[]>([]);
  const [pendingPlace, setPendingPlace] = useState<GooglePlaceInput | null>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
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

  const hasKey = !!env.googleMapsApiKey;
  const { isLoaded } = useJsApiLoader({
    id: 'coolcorners-map',
    googleMapsApiKey: env.googleMapsApiKey ?? '',
    libraries: mapLibraries
  });

  const mapCenter = useMemo(() => {
    const firstCoords = googlePlaces
      .map((place) => getCoordsFromGeometry(place.geometry))
      .find((coords) => coords);
    if (firstCoords) return firstCoords;
    return { lat: 50.0755, lng: 14.4378 };
  }, [googlePlaces]);

  const handlePlaceChanged = () => {
    if (!autocomplete) return;
    const place = autocomplete.getPlace();
    if (!place?.place_id) return;
    const lat = place.geometry?.location?.lat();
    const lng = place.geometry?.location?.lng();
    setPendingPlace({
      placeId: place.place_id,
      name: place.name ?? place.formatted_address ?? 'Selected place',
      geometry:
        typeof lat === 'number' && typeof lng === 'number'
          ? { type: 'Point', coordinates: [lng, lat] }
          : null
    });
  };

  const addPendingPlace = () => {
    if (!pendingPlace) return;
    setGooglePlaces((prev) => {
      if (prev.some((place) => place.placeId === pendingPlace.placeId)) return prev;
      return [...prev, pendingPlace];
    });
    setPendingPlace(null);
    if (searchInputRef.current) searchInputRef.current.value = '';
  };

  const removeGooglePlace = (placeId: string) => {
    setGooglePlaces((prev) => prev.filter((place) => place.placeId !== placeId));
  };

  const handleMapClick = (event: google.maps.MapMouseEvent) => {
    if (!event.latLng) return;
    if (!geocoderRef.current) {
      geocoderRef.current = new google.maps.Geocoder();
    }
    const latLng = event.latLng;
    geocoderRef.current.geocode({ location: latLng }, (results, status) => {
      if (status !== 'OK' || !results?.length) return;
      const top = results[0];
      if (!top.place_id) return;
      const nextPlace: GooglePlaceInput = {
        placeId: top.place_id,
        name: top.formatted_address ?? 'Selected location',
        geometry: { type: 'Point', coordinates: [latLng.lng(), latLng.lat()] }
      };
      setGooglePlaces((prev) => {
        if (prev.some((place) => place.placeId === nextPlace.placeId)) return prev;
        return [...prev, nextPlace];
      });
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
            <h3 className="text-base font-semibold text-slate-900">Google places</h3>
            <p className="text-xs text-slate-600">Search and add multiple Google Places to this plan.</p>
          </div>

          <div className="mt-4 space-y-3">
            {hasKey ? (
              isLoaded ? (
                <>
                  <Autocomplete onLoad={(instance) => setAutocomplete(instance)} onPlaceChanged={handlePlaceChanged}>
                    <input
                      ref={searchInputRef}
                      placeholder="Search for a place"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-brand-400"
                    />
                  </Autocomplete>
                  {pendingPlace ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      <div>
                        <p className="font-semibold text-slate-900">{pendingPlace.name}</p>
                        <p className="text-xs text-slate-500">Place ID: {pendingPlace.placeId}</p>
                      </div>
                      <button
                        type="button"
                        onClick={addPendingPlace}
                        className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                      >
                        Add place
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">Select a result to add it.</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-600">Loading Google Places...</p>
              )
            ) : (
              <p className="text-sm text-slate-600">
                Provide <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">VITE_GOOGLE_MAPS_API_KEY</code> to
                search Google Places.
              </p>
            )}

            {hasKey && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {isLoaded ? (
                  <GoogleMap
                    center={mapCenter}
                    zoom={googlePlaces.length ? 11 : 6}
                    mapContainerStyle={{ width: '100%', height: '260px' }}
                    options={{ disableDefaultUI: true, zoomControl: true }}
                    onClick={handleMapClick}
                  >
                    {googlePlaces
                      .map((place) => ({
                        place,
                        coords: getCoordsFromGeometry(place.geometry)
                      }))
                      .filter((entry) => !!entry.coords)
                      .map((place, idx) => (
                        <Marker
                          key={place.place.placeId}
                          position={place.coords as { lat: number; lng: number }}
                          label={`${idx + 1}`}
                        />
                      ))}
                  </GoogleMap>
                ) : (
                  <div className="flex h-[260px] items-center justify-center text-sm text-slate-600">Loading map...</div>
                )}
              </div>
            )}
            {hasKey && isLoaded && (
              <p className="text-xs text-slate-500">Tip: click the map to add the nearest address as a Google place.</p>
            )}

            {googlePlaces.length ? (
              <ul className="space-y-2">
                {googlePlaces.map((place, idx) => (
                  <li
                    key={place.placeId}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {idx + 1}. {place.name ?? 'Google Place'}
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
              <p className="text-xs text-slate-500">No Google places added yet.</p>
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

const mapLibraries: ('places')[] = ['places'];

const getCoordsFromGeometry = (geometry?: { type?: string; coordinates?: [number, number] } | null) => {
  if (!geometry || geometry.type !== 'Point' || !geometry.coordinates) return null;
  const [lng, lat] = geometry.coordinates;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
};

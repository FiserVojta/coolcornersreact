import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { createTrip, fetchTrip, updateTrip } from '../../api/trips';
import { fetchCategories } from '../../api/categories';
import { fetchTags } from '../../api/tags';
import { uploadFile } from '../../api/files';
import type { GooglePlaceInput, TripCreateRequest, TripFileLinkRequest } from '../../types/trip';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { env } from '../../config/env';
import { Autocomplete, GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

export const TripForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const tripId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [googlePlaces, setGooglePlaces] = useState<GooglePlaceInput[]>([]);
  const [pendingPlace, setPendingPlace] = useState<GooglePlaceInput | null>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<TripFileLinkRequest[]>([]);

  const tripQuery = useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => fetchTrip(tripId),
    enabled: isEdit && Number.isFinite(tripId)
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories', 'TRIP'],
    queryFn: () => fetchCategories('TRIP')
  });

  const tagsQuery = useQuery({
    queryKey: ['tags'],
    queryFn: fetchTags
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<TripCreateRequest>({
    defaultValues: {
      name: '',
      description: '',
      author: '',
      categoryId: 1,
      duration: 60,
      rating: 0,
      tags: [],
      placeIds: [],
      googlePlaces: []
    }
  });

  useEffect(() => {
    if (tripQuery.data) {
      const googlePlacesFromTrip =
        tripQuery.data.googlePlaces?.map((place) => ({
          placeId: place.id,
          name: place.name,
          geometry: place.geometry ?? null
        })) ?? [];
      const categoryId =
        (tripQuery.data.category?.id ?? (tripQuery.data as { categoryId?: number }).categoryId) ?? 1;
      reset({
        name: tripQuery.data.name,
        description: tripQuery.data.description,
        author: tripQuery.data.createdBy ?? '',
        categoryId,
        duration: tripQuery.data.duration,
        rating: tripQuery.data.rating,
        tags: tripQuery.data.tags?.map((t) => t.id) ?? [],
        placeIds: tripQuery.data.places?.map((p) => p.id) ?? []
      });
      setImageUrl(tripQuery.data.images?.[0] ?? '');
      setGooglePlaces(googlePlacesFromTrip);
      if (Number.isFinite(categoryId)) {
        setValue('categoryId', categoryId, { shouldValidate: true });
      }
    }
  }, [tripQuery.data, reset, setValue]);

  const selectedTags = watch('tags') ?? [];

  const createMut = useMutation({
    mutationFn: (payload: TripCreateRequest) => createTrip(payload),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      navigate(`/trips/${created.id}`);
    }
  });

  const updateMut = useMutation({
    mutationFn: (payload: TripCreateRequest) => updateTrip(tripId, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.setQueryData(['trip', tripId], updated);
      navigate(`/trips/${tripId}`);
    }
  });

  const uploadMut = useMutation({
    mutationFn: uploadFile,
    onSuccess: (res) => {
      const fileId = typeof res?.id === 'string' ? Number(res.id) : res?.id;
      const fileName = res?.name ?? res?.filename;
      if (Number.isFinite(fileId) && fileName) {
        setUploadedFiles((prev) => {
          if (prev.some((file) => file.fileId === fileId)) return prev;
          return [...prev, { fileId: fileId as number, name: fileName }];
        });
      }
      if (res?.url) {
        setImageUrl(res.url);
        setUploadMessage(`Uploaded: ${res.url}`);
      } else {
        setUploadMessage('File uploaded.');
      }
      setSelectedFile(null);
    },
    onError: () => setUploadMessage('Upload failed. Please try again.')
  });

  const onSubmit = (values: TripCreateRequest) => {
    const payload: TripCreateRequest = {
      ...values,
      tags: normalizeNumberList(values.tags),
      placeIds: normalizeNumberList(values.placeIds),
      googlePlaces,
      images: imageUrl ? [imageUrl] : undefined,
      files: uploadedFiles.length ? uploadedFiles : undefined
    };
    if (isEdit) return updateMut.mutate(payload);
    return createMut.mutate(payload);
  };

  const toggleTag = (id: number) => {
    const normalized = normalizeNumberList(selectedTags);
    const next = normalized.includes(id) ? normalized.filter((item) => item !== id) : [...normalized, id];
    setValue('tags', next, { shouldValidate: true, shouldDirty: true });
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

  if (isEdit && tripQuery.isLoading) return <LoadingState label="Loading trip..." />;
  if (isEdit && tripQuery.error) return <ErrorState message="Failed to load trip for editing." />;

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
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Trips</p>
          <h1 className="text-3xl font-bold text-slate-900">{isEdit ? 'Edit trip' : 'Create trip'}</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
        <div className="grid gap-4">
          <Field label="Name" error={errors.name}>
            <input
              {...register('name', { required: 'Name is required' })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-brand-400"
            />
          </Field>
        </div>

        <Field label="Description" error={errors.description}>
          <textarea
            {...register('description', { required: 'Description is required' })}
            rows={4}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-brand-400"
          />
        </Field>

        <Field label="Trip photo">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setSelectedFile(file);
                  setUploadMessage(null);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none focus:border-brand-400 sm:w-auto"
              />
              <button
                type="button"
                onClick={() => {
                  if (!selectedFile) return;
                  uploadMut.mutate(selectedFile);
                }}
                disabled={!selectedFile || uploadMut.isPending}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {uploadMut.isPending ? 'Uploading...' : 'Upload'}
              </button>
            </div>
            {selectedFile && <p className="text-xs text-slate-600">Selected: {selectedFile.name}</p>}
            {uploadMessage && <p className="text-xs text-slate-600">{uploadMessage}</p>}
            {uploadedFiles.length ? (
              <ul className="text-xs text-slate-600">
                {uploadedFiles.map((file) => (
                  <li key={file.fileId}>{file.name}</li>
                ))}
              </ul>
            ) : null}
            {imageUrl && (
              <img
                src={imageUrl}
                alt="Trip upload preview"
                className="h-40 w-full rounded-2xl object-cover shadow-sm sm:h-48"
                loading="lazy"
              />
            )}
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Duration (minutes)" error={errors.duration}>
            <input
              type="number"
              min={0}
              {...register('duration', { valueAsNumber: true, required: 'Duration is required' })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-brand-400"
            />
          </Field>
          <Field label="Category ID" error={errors.categoryId}>
            <select
              {...register('categoryId', { valueAsNumber: true, required: 'Category is required' })}
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
        </div>

        <input type="hidden" {...register('author')} />
        <input type="hidden" {...register('rating', { valueAsNumber: true })} />

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

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold text-slate-900">Google places</h3>
            <p className="text-xs text-slate-600">Search and add multiple Google Places to this trip.</p>
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

        <Field label="Existing Place IDs (comma separated)">
          <input
            {...register('placeIds')}
            placeholder="e.g. 10,11"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-brand-400"
          />
        </Field>

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

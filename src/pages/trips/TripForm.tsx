import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { createTrip, fetchTrip, updateTrip } from '../../api/trips';
import { fetchCategories } from '../../api/categories';
import { fetchTags } from '../../api/tags';
import { uploadFile } from '../../api/files';
import { searchMapyPlaces } from '../../api/mapy';
import type { GooglePlaceInput, TripCreateRequest, TripFileLinkRequest } from '../../types/trip';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { env } from '../../config/env';
import { CircleMarker, MapContainer, Tooltip, useMapEvents } from 'react-leaflet';
import { MapyTileLayer } from '../../components/MapyTileLayer';

export const TripForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const tripId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [googlePlaces, setGooglePlaces] = useState<GooglePlaceInput[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<
    Array<{ id: string; name: string; lat: number; lng: number }>
  >([]);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<TripFileLinkRequest[]>([]);
  const [selectedBackgroundFile, setSelectedBackgroundFile] = useState<File | null>(null);
  const [backgroundUploadMessage, setBackgroundUploadMessage] = useState<string | null>(null);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string>('');
  const [backgroundImageFile, setBackgroundImageFile] = useState<TripFileLinkRequest | null>(null);

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
      if (tripQuery.data.backgroundImage?.url) {
        setBackgroundImageUrl(tripQuery.data.backgroundImage.url);
      }
      if (Number.isFinite(tripQuery.data.backgroundImage?.id)) {
        setBackgroundImageFile({
          fileId: tripQuery.data.backgroundImage?.id as number,
          name: tripQuery.data.backgroundImage?.name ?? 'background-image'
        });
      }
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

  const backgroundUploadMut = useMutation({
    mutationFn: uploadFile,
    onSuccess: (res) => {
      const fileId = typeof res?.id === 'string' ? Number(res.id) : res?.id;
      const fileName = res?.name ?? res?.filename ?? 'background-image';
      if (Number.isFinite(fileId)) {
        setBackgroundImageFile({ fileId: fileId as number, name: fileName });
      }
      if (res?.url) {
        setBackgroundImageUrl(res.url);
        setBackgroundUploadMessage(`Uploaded: ${res.url}`);
      } else {
        setBackgroundUploadMessage('File uploaded.');
      }
      setSelectedBackgroundFile(null);
    },
    onError: () => setBackgroundUploadMessage('Upload failed. Please try again.')
  });

  const onSubmit = (values: TripCreateRequest) => {
    const payload: TripCreateRequest = {
      ...values,
      tags: normalizeNumberList(values.tags),
      placeIds: normalizeNumberList(values.placeIds),
      googlePlaces,
      images: imageUrl ? [imageUrl] : undefined,
      files: uploadedFiles.length ? uploadedFiles : undefined,
      backgroundImage: backgroundImageFile ?? undefined
    };
    if (isEdit) return updateMut.mutate(payload);
    return createMut.mutate(payload);
  };

  const toggleTag = (id: number) => {
    const normalized = normalizeNumberList(selectedTags);
    const next = normalized.includes(id) ? normalized.filter((item) => item !== id) : [...normalized, id];
    setValue('tags', next, { shouldValidate: true, shouldDirty: true });
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

  if (isEdit && tripQuery.isLoading) return <LoadingState label="Loading trip..." />;
  if (isEdit && tripQuery.error) return <ErrorState message="Failed to load trip for editing." />;

  const heroTitleClass = backgroundImageUrl ? 'text-white' : 'text-slate-900';
  const heroLabelClass = backgroundImageUrl ? 'text-brand-100' : 'text-brand-700';

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
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-slate-200">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={backgroundImageUrl ? { backgroundImage: `url(${backgroundImageUrl})` } : undefined}
        />
        <div
          className={`absolute inset-0 ${
            backgroundImageUrl ? 'bg-slate-900/55' : 'bg-gradient-to-br from-slate-50 to-white'
          }`}
        />
        <div className="relative z-10 flex items-center justify-between px-6 py-10">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${heroLabelClass}`}>Trips</p>
            <h1 className={`text-3xl font-bold ${heroTitleClass}`}>{isEdit ? 'Edit trip' : 'Create trip'}</h1>
          </div>
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

        <Field label="Background image">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setSelectedBackgroundFile(file);
                  setBackgroundUploadMessage(null);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none focus:border-brand-400 sm:w-auto"
              />
              <button
                type="button"
                onClick={() => {
                  if (!selectedBackgroundFile) return;
                  backgroundUploadMut.mutate(selectedBackgroundFile);
                }}
                disabled={!selectedBackgroundFile || backgroundUploadMut.isPending}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {backgroundUploadMut.isPending ? 'Uploading...' : 'Upload'}
              </button>
            </div>
            {selectedBackgroundFile && (
              <p className="text-xs text-slate-600">Selected: {selectedBackgroundFile.name}</p>
            )}
            {backgroundUploadMessage && <p className="text-xs text-slate-600">{backgroundUploadMessage}</p>}
            {backgroundImageUrl && (
              <img
                src={backgroundImageUrl}
                alt="Background upload preview"
                className="h-40 w-full rounded-2xl object-cover shadow-sm sm:h-48"
                loading="lazy"
              />
            )}
          </div>
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
            <h3 className="text-base font-semibold text-slate-900">Mapy places</h3>
            <p className="text-xs text-slate-600">Search and add multiple places to this trip.</p>
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

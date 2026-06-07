import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createCotravel, fetchCotravel, updateCotravel } from '../../api/cotravel';
import { fetchCategories } from '../../api/categories';
import { fetchTags } from '../../api/tags';
import { fetchTrips } from '../../api/trips';
import { fetchPlaces } from '../../api/places';
import { uploadFile } from '../../api/files';
import { searchMapyPlaces } from '../../api/mapy';
import type { CotravelCreateRequest } from '../../types/cotravel';
import type { GooglePlaceInput, TripFileLinkRequest } from '../../types/trip';
import type { PlaceDetail } from '../../types/place';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { env } from '../../config/env';
import { CircleMarker, MapContainer, Tooltip, useMapEvents } from 'react-leaflet';
import { MapyTileLayer } from '../../components/MapyTileLayer';
import { UploadDropzone } from '../../components/UploadDropzone';
import '../../styles/create-form.css';

type FormValues = CotravelCreateRequest;
type SegmentDraft = {
  id: string;
  name: string;
  tripIds: number[];
  placeIds: number[];
  googlePlaces: GooglePlaceInput[];
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatPlanDate = (value?: string | null) => {
  if (!value) return 'Date TBD';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date TBD';
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

const planTitleFrom = (text?: string | null) => {
  const first = (text ?? '').split(/[.\n]/)[0].trim();
  return first || 'Untitled plan';
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
  const [segmentsOverride, setSegmentsOverride] = useState<SegmentDraft[] | undefined>(undefined);
  const [selectedBackgroundFile, setSelectedBackgroundFile] = useState<File | null>(null);
  const [backgroundUploadMessage, setBackgroundUploadMessage] = useState<string | null>(null);
  const [backgroundImageUrlOverride, setBackgroundImageUrlOverride] = useState<string | undefined>(undefined);
  const [backgroundImageFileOverride, setBackgroundImageFileOverride] = useState<TripFileLinkRequest | null | undefined>(
    undefined
  );

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
    control,
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

  const initialSegments = useMemo(() => {
    const draftSegments =
      detailQuery.data?.wanderParts?.map((part) => ({
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

    return draftSegments.length ? draftSegments : [createSegment()];
  }, [detailQuery.data]);

  const initialBackgroundImageUrl = detailQuery.data?.backgroundImage?.url ?? '';
  const initialBackgroundImageFile = Number.isFinite(detailQuery.data?.backgroundImage?.id)
    ? {
        fileId: detailQuery.data?.backgroundImage?.id as number,
        name: detailQuery.data?.backgroundImage?.name ?? 'background-image'
      }
    : null;

  const segments = segmentsOverride ?? initialSegments;
  const backgroundImageUrl = backgroundImageUrlOverride ?? initialBackgroundImageUrl;
  const backgroundImageFile = backgroundImageFileOverride ?? initialBackgroundImageFile;

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
    }
  }, [detailQuery.data, reset]);

  const selectedTags = useWatch({ control, name: 'tags' }) ?? [];
  const watchedDescription = useWatch({ control, name: 'description' });
  const watchedCategory = useWatch({ control, name: 'category' });
  const watchedCapacity = useWatch({ control, name: 'capacity' });
  const watchedStart = useWatch({ control, name: 'startTime' });

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

  const backgroundUploadMut = useMutation({
    mutationFn: uploadFile,
    onSuccess: (res) => {
      const fileId = typeof res?.id === 'string' ? Number(res.id) : res?.id;
      const fileName = res?.name ?? res?.filename ?? 'background-image';
      if (Number.isFinite(fileId)) {
        setBackgroundImageFileOverride({ fileId: fileId as number, name: fileName });
      }
      if (res?.url) {
        setBackgroundImageUrlOverride(res.url);
        setBackgroundUploadMessage(`Uploaded: ${res.url}`);
      } else {
        setBackgroundUploadMessage('File uploaded.');
      }
      setSelectedBackgroundFile(null);
    },
    onError: () => setBackgroundUploadMessage('Upload failed. Please try again.')
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
      googlePlaces: [],
      backgroundImage: backgroundImageFile ?? undefined
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

  const updateSegments = (updater: (current: SegmentDraft[]) => SegmentDraft[]) => {
    setSegmentsOverride((current) => updater(current ?? initialSegments));
  };

  const addSegment = () => {
    updateSegments((current) => [...current, createSegment()]);
  };

  const removeSegment = (segmentId: string) => {
    updateSegments((current) => (current.length > 1 ? current.filter((segment) => segment.id !== segmentId) : current));
  };

  const toggleSegmentTrip = (segmentId: string, tripId: number) => {
    updateSegments((current) =>
      current.map((segment) =>
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
    updateSegments((current) =>
      current.map((segment) =>
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
    updateSegments((current) => current.map((segment) => (segment.id === segmentId ? { ...segment, name } : segment)));
  };

  const addSegmentGooglePlace = (segmentId: string, place: GooglePlaceInput) => {
    updateSegments((current) =>
      current.map((segment) =>
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
    updateSegments((current) =>
      current.map((segment) =>
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

  const categories = categoriesQuery.data ?? [];
  const tags = tagsQuery.data ?? [];
  const activeCategory = categories.find((cat) => cat.id === Number(watchedCategory));
  const categoryLabel = activeCategory?.title || activeCategory?.name || 'Uncategorised';
  const previewTags = tags.filter((tag) => selectedTags.includes(tag.id));
  const segmentCount = segments.length;

  return (
    <main className="cf-page">
      <p className="crumbs">
        <Link to="/cotravel">CoTravel</Link>
        <span className="sep">/</span>
        <span className="here">{isEdit ? 'Edit' : 'New'}</span>
      </p>
      <p className="page-eyebrow">CoTravel</p>
      <h1 className="page-h1">{isEdit ? 'Edit plan' : 'Create plan'}</h1>
      <p className="page-desc">
        Organise a community-led trip others can join. Group your trips and places into segments, then set the group size.
      </p>

      <form className="split" onSubmit={handleSubmit(onSubmit)}>
        {/* LEFT: the form */}
        <div className="stack">
          {/* 1 · Basics */}
          <section className="panel">
            <div className="panel-head">
              <span className="n">1</span>
              <h3>Basics</h3>
            </div>
            <div className="panel-body">
              <label className="field">
                <span className="field-label">What's the plan</span>
                <textarea
                  className="textarea"
                  rows={4}
                  placeholder="Describe the journey — the first line becomes the title."
                  {...register('description', { required: 'Description is required' })}
                />
                {errors.description?.message ? (
                  <p className="field-error">{errors.description.message}</p>
                ) : (
                  <p className="field-hint">The first sentence is used as the plan's title across the app.</p>
                )}
              </label>
              <div className="grid-2">
                <label className="field">
                  <span className="field-label">Category</span>
                  <select
                    className="select-native"
                    {...register('category', { valueAsNumber: true, required: 'Category is required' })}
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.title || cat.name}
                      </option>
                    ))}
                  </select>
                  {errors.category?.message && <p className="field-error">{errors.category.message}</p>}
                </label>
                <div className="field">
                  <span className="field-label">Group size</span>
                  <div className="affix">
                    <input
                      type="number"
                      min={1}
                      {...register('capacity', { valueAsNumber: true, required: 'Capacity is required' })}
                    />
                    <span className="suf">wanderers</span>
                  </div>
                  {errors.capacity?.message && <p className="field-error">{errors.capacity.message}</p>}
                </div>
              </div>
              <div className="field">
                <span className="field-label">Tags</span>
                <div className="chips">
                  {tags.map((tag) => {
                    const on = selectedTags.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        className={`chip-toggle${on ? ' on' : ''}`}
                        onClick={() => toggleTag(tag.id)}
                      >
                        <span className="dot">{on ? '✓' : '+'}</span>
                        {tag.title || tag.name}
                      </button>
                    );
                  })}
                  {!tags.length && <p className="field-hint">No tags available.</p>}
                </div>
              </div>
            </div>
          </section>

          {/* 2 · When & cover */}
          <section className="panel">
            <div className="panel-head">
              <span className="n">2</span>
              <h3>When &amp; cover</h3>
            </div>
            <div className="panel-body">
              <label className="field" style={{ maxWidth: '320px' }}>
                <span className="field-label">Start</span>
                <input
                  className="input"
                  type="datetime-local"
                  {...register('startTime', { required: 'Start time is required' })}
                />
                {errors.startTime?.message && <p className="field-error">{errors.startTime.message}</p>}
              </label>
              <div className="field">
                <span className="field-label">
                  Cover image <span className="field-opt">Optional</span>
                </span>
                <UploadDropzone
                  variant="wide"
                  selectedFile={selectedBackgroundFile}
                  placeholder={<>Drop a cover or <b>browse</b></>}
                  hint="2400 × 800 · JPG or PNG"
                  onFile={(file) => {
                    setSelectedBackgroundFile(file);
                    setBackgroundUploadMessage(null);
                  }}
                />
                {selectedBackgroundFile && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => backgroundUploadMut.mutate(selectedBackgroundFile)}
                    disabled={backgroundUploadMut.isPending}
                  >
                    {backgroundUploadMut.isPending ? 'Uploading…' : 'Upload selected file'}
                  </button>
                )}
                {backgroundUploadMessage && <p className="upload-status">{backgroundUploadMessage}</p>}
                {backgroundImageUrl && (
                  <img className="upload-preview" src={backgroundImageUrl} alt="Cover preview" loading="lazy" />
                )}
              </div>
            </div>
          </section>

          {/* 3 · Segments */}
          <section className="panel">
            <div className="panel-head">
              <span className="n">3</span>
              <h3>Segments</h3>
              <button type="button" className="btn btn-dashed btn-sm head-action" onClick={addSegment}>
                Add segment
              </button>
            </div>
            <div className="panel-body">
              <p className="field-hint" style={{ marginTop: '-4px' }}>
                Group trips and places into legs of the journey. Order runs top to bottom.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
            </div>
          </section>

          <div className="form-actions">
            <span className="draft-note">Saved as a draft until you publish.</span>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || createMut.isPending || updateMut.isPending}
            >
              {isEdit ? (updateMut.isPending ? 'Saving…' : 'Save plan') : createMut.isPending ? 'Creating…' : 'Create plan'}
            </button>
          </div>
        </div>

        {/* RIGHT: live preview */}
        <aside className="preview-rail">
          <p className="preview-label">
            <span className="live" /> Live preview
          </p>
          <div className="pv-card">
            <div className="pv-img cotravel">
              <span className="pv-chip tr">1/{watchedCapacity || '—'} joined</span>
            </div>
            <div className="pv-body">
              <h3 className="pv-title">{planTitleFrom(watchedDescription)}</h3>
              <p className="pv-meta">
                {formatPlanDate(watchedStart)} · {segmentCount} segment{segmentCount === 1 ? '' : 's'} · {categoryLabel}
              </p>
              {previewTags.length ? (
                <div className="tag-row">
                  {previewTags.slice(0, 4).map((tag) => (
                    <span key={tag.id} className="tag-mini">
                      {tag.title || tag.name}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <p className="preview-tip">
            This is how the plan appears on the co-travel list and in search results as you fill the form.
          </p>
        </aside>
      </form>
    </main>
  );
};

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
    <div className="segment">
      <div className="segment-head">
        <span className="seg-n">{index + 1}</span>
        <span className="seg-name">
          <input
            value={segment.name}
            onChange={(event) => onRename(segment.id, event.target.value)}
            placeholder={`Segment ${index + 1}`}
          />
        </span>
        <button type="button" className="seg-remove" onClick={() => onRemove(segment.id)} disabled={!canRemove}>
          Remove
        </button>
      </div>

      <div className="seg-grid">
        <div className="seg-col">
          <div className="seg-col-head">
            <span className="ttl">Trips</span>
            <span className="cnt">{segment.tripIds.length} selected</span>
          </div>
          <input
            className="input"
            value={tripQuery}
            onChange={(event) => setTripQuery(event.target.value)}
            placeholder="Search trips"
          />
          <div className="pick-list">
            {tripsLoading ? (
              <p className="seg-empty">Loading trips…</p>
            ) : filteredTrips.length ? (
              filteredTrips.map((trip) => {
                const isSelected = segment.tripIds.includes(trip.id);
                return (
                  <div key={trip.id} className="pick">
                    <div>
                      <p className="p-name">{trip.name}</p>
                      {trip.category?.title && <p className="p-meta">{trip.category.title}</p>}
                    </div>
                    <button
                      type="button"
                      className={`pick-btn${isSelected ? ' on' : ''}`}
                      onClick={() => onToggleTrip(segment.id, trip.id)}
                    >
                      {isSelected ? 'Selected' : 'Add'}
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="seg-empty">No trips found.</p>
            )}
          </div>
        </div>

        <div className="seg-col">
          <div className="seg-col-head">
            <span className="ttl">Places</span>
            <span className="cnt">{segment.placeIds.length} selected</span>
          </div>
          <input
            className="input"
            value={placeQuery}
            onChange={(event) => setPlaceQuery(event.target.value)}
            placeholder="Search places"
          />
          <div className="pick-list">
            {placesLoading ? (
              <p className="seg-empty">Loading places…</p>
            ) : filteredPlaces.length ? (
              filteredPlaces.map((place) => {
                const isSelected = segment.placeIds.includes(place.id);
                return (
                  <div key={place.id} className="pick">
                    <div>
                      <p className="p-name">{place.name}</p>
                      {place.city?.name && <p className="p-meta">{place.city.name}</p>}
                    </div>
                    <button
                      type="button"
                      className={`pick-btn${isSelected ? ' on' : ''}`}
                      onClick={() => onTogglePlace(segment.id, place.id)}
                    >
                      {isSelected ? 'Selected' : 'Add'}
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="seg-empty">No places found.</p>
            )}
          </div>
        </div>
      </div>

      <div className="seg-col">
        <div className="seg-col-head">
          <span className="ttl">Mapy places</span>
          <span className="cnt">{segment.googlePlaces.length} selected</span>
        </div>

        {canSearchMapy ? (
          <div className="search-row">
            <input
              className="input"
              value={mapyQuery}
              onChange={(event) => setMapyQuery(event.target.value)}
              placeholder="Search Mapy places"
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleMapySearch}
              disabled={mapySearching || !mapyQuery.trim()}
            >
              {mapySearching ? 'Searching…' : 'Search'}
            </button>
          </div>
        ) : (
          <p className="field-hint">
            Provide <code>VITE_MAPY_API_KEY</code> to search Mapy places.
          </p>
        )}

        {mapyMessage && <p className="field-hint">{mapyMessage}</p>}
        {mapyResults.length ? (
          <div className="rows">
            {mapyResults.map((result) => (
              <div key={result.id} className="row-item">
                <div className="grow">
                  <p className="r-name">{result.name}</p>
                  <p className="r-meta mono">
                    {result.lat.toFixed(5)}, {result.lng.toFixed(5)}
                  </p>
                </div>
                <button type="button" className="pick-btn" onClick={() => handleAddMapy(result)}>
                  Add
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {hasMapTiles ? (
          <div className="map-frame">
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
          <p className="field-hint">
            Provide <code>VITE_MAPY_API_KEY</code> to render the map.
          </p>
        )}
        {hasMapTiles && <p className="map-note">Mapy.cz map · click to add a stop.</p>}

        {segment.googlePlaces.length ? (
          <div className="rows">
            {segment.googlePlaces.map((place, idx) => {
              const coords = getCoordsFromGeometry(place.geometry);
              return (
                <div key={place.placeId} className="row-item">
                  <span className="num">{idx + 1}</span>
                  <div className="grow">
                    <p className="r-name">{place.name ?? 'Mapy place'}</p>
                    <p className="r-meta mono">
                      {coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : `Place ID: ${place.placeId}`}
                    </p>
                  </div>
                  <button type="button" className="x" onClick={() => onRemoveMapyPlace(segment.id, place.placeId)}>
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="seg-empty">No Mapy places added yet.</p>
        )}
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

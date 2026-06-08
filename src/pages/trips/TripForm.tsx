import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createTrip, fetchTrip, updateTrip } from '../../api/trips';
import { fetchCategories } from '../../api/categories';
import { fetchTags } from '../../api/tags';
import { uploadFile } from '../../api/files';
import { searchMapyPlaces, type MapySearchResult } from '../../api/mapy';
import type { GooglePlaceInput, TripCreateRequest, TripFileLinkRequest } from '../../types/trip';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { env } from '../../config/env';
import { MapContainer, Marker, Tooltip, useMapEvents } from 'react-leaflet';
import type { LeafletMouseEvent } from 'leaflet';
import { MapyTileLayer } from '../../components/MapyTileLayer';
import { FitBounds, MapViewTracker, SearchResultMarkers } from '../../components/mapSearchLayers';
import { stopPinIcon } from '../../components/mapyIcons';
import { UploadDropzone } from '../../components/UploadDropzone';
import '../../styles/create-form.css';

const firstSentence = (text?: string | null) => {
  const first = (text?.split('. ')[0] ?? '').trim();
  return first ? first.replace(/\.?$/, '.') : 'Add a description…';
};

export const TripForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const tripId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [googlePlaces, setGooglePlaces] = useState<GooglePlaceInput[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MapySearchResult[]>([]);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [mapView, setMapView] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<Array<{ fileId: number; name: string; url?: string }>>([]);
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
      setGalleryFiles(
        tripQuery.data.files
          ?.filter((file) => Number.isFinite(file.id))
          .map((file) => ({ fileId: file.id as number, name: file.name ?? 'Trip photo', url: file.url ?? undefined })) ?? []
      );
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
      const fileName = res?.name ?? res?.filename ?? 'Trip photo';
      if (Number.isFinite(fileId)) {
        setGalleryFiles((prev) => {
          if (prev.some((file) => file.fileId === fileId)) return prev;
          return [...prev, { fileId: fileId as number, name: fileName, url: res?.url ?? undefined }];
        });
      }
      setUploadMessage(res?.url ? 'Photo added.' : 'File uploaded.');
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
      files: galleryFiles.length ? galleryFiles.map((file) => ({ fileId: file.fileId, name: file.name })) : undefined,
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

  // Every point currently on the map — added stops plus search-result pins —
  // used to auto-fit the view so they're all visible.
  const mapPoints = useMemo(() => {
    const stopCoords = googlePlaces
      .map((place) => getCoordsFromGeometry(place.geometry))
      .filter((coords): coords is { lat: number; lng: number } => !!coords);
    const resultCoords = searchResults.map((result) => ({ lat: result.lat, lng: result.lng }));
    return [...stopCoords, ...resultCoords];
  }, [googlePlaces, searchResults]);

  if (isEdit && tripQuery.isLoading) return <LoadingState label="Loading trip..." />;
  if (isEdit && tripQuery.error) return <ErrorState message="Failed to load trip for editing." />;

  const removeGooglePlace = (placeId: string) => {
    setGooglePlaces((prev) => prev.filter((place) => place.placeId !== placeId));
  };

  const addSearchResult = (result: MapySearchResult) => {
    const nextPlace: GooglePlaceInput = {
      placeId: result.id,
      name: result.name,
      geometry: { type: 'Point', coordinates: [result.lng, result.lat] }
    };
    // Keep the results visible so several pins can be added in one search.
    setGooglePlaces((prev) => {
      if (prev.some((place) => place.placeId === nextPlace.placeId)) return prev;
      return [...prev, nextPlace];
    });
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchMessage(null);
    setSearching(true);
    try {
      const results = await searchMapyPlaces(searchQuery, { near: mapView ?? mapCenter, limit: 15 });
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

  const removeGalleryFile = (fileId: number) => {
    setGalleryFiles((prev) => prev.filter((file) => file.fileId !== fileId));
  };

  const categories = categoriesQuery.data ?? [];
  const tags = tagsQuery.data ?? [];
  const watchedName = watch('name');
  const watchedDescription = watch('description');
  const watchedDuration = watch('duration');
  const watchedCategoryId = watch('categoryId');
  const activeCategory = categories.find((cat) => cat.id === Number(watchedCategoryId));
  const categoryLabel = activeCategory?.title || activeCategory?.name || 'Uncategorised';
  const previewTags = tags.filter((tag) => selectedTags.includes(tag.id));
  const stopCount = googlePlaces.length;

  return (
    <main className="cf-page">
      <p className="crumbs">
        <Link to="/trips">Trips</Link>
        <span className="sep">/</span>
        <span className="here">{isEdit ? 'Edit' : 'New'}</span>
      </p>
      <p className="page-eyebrow">Trips</p>
      <h1 className="page-h1">{isEdit ? 'Edit trip' : 'Create trip'}</h1>
      <p className="page-desc">Add a new trip for the community to discover. You can save and edit the details any time after.</p>

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
                <span className="field-label">Trip name</span>
                <input className="input" placeholder="Name your trip" {...register('name', { required: 'Name is required' })} />
                {errors.name?.message && <p className="field-error">{errors.name.message}</p>}
              </label>
              <label className="field">
                <span className="field-label">Description</span>
                <textarea
                  className="textarea"
                  rows={4}
                  placeholder="What's the shape of the trip and why is it worth doing."
                  {...register('description', { required: 'Description is required' })}
                />
                {errors.description?.message && <p className="field-error">{errors.description.message}</p>}
              </label>
              <div className="grid-2">
                <label className="field">
                  <span className="field-label">Category</span>
                  <select
                    className="select-native"
                    {...register('categoryId', { valueAsNumber: true, required: 'Category is required' })}
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.title || cat.name}
                      </option>
                    ))}
                  </select>
                  {errors.categoryId?.message && <p className="field-error">{errors.categoryId.message}</p>}
                </label>
                <label className="field">
                  <span className="field-label">Duration (minutes)</span>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    {...register('duration', { valueAsNumber: true, required: 'Duration is required' })}
                  />
                  {errors.duration?.message && <p className="field-error">{errors.duration.message}</p>}
                </label>
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
                <p className="field-hint">Pick a few that fit. Tags power filtering on the trips list.</p>
              </div>
            </div>
          </section>

          {/* 2 · Photos */}
          <section className="panel">
            <div className="panel-head">
              <span className="n">2</span>
              <h3>Photos</h3>
            </div>
            <div className="panel-body">
              <div className="field" style={{ maxWidth: '360px' }}>
                <span className="field-label">Cover photo</span>
                <UploadDropzone
                  variant="cover"
                  selectedFile={selectedBackgroundFile}
                  placeholder={<>Drop a cover or <b>browse</b></>}
                  hint="1600 × 900 · JPG or PNG"
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
                <p className="field-hint">Shown on the trip card and at the top of the trip page.</p>
              </div>

              <div className="field">
                <span className="field-label">
                  Photos <span className="field-opt">Optional</span>
                </span>
                <UploadDropzone
                  variant="wide"
                  selectedFile={selectedFile}
                  placeholder={<>Drop a photo or <b>browse</b></>}
                  hint="Add as many as you like · JPG or PNG"
                  onFile={(file) => {
                    setSelectedFile(file);
                    setUploadMessage(null);
                  }}
                />
                {selectedFile && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => uploadMut.mutate(selectedFile)}
                    disabled={uploadMut.isPending}
                  >
                    {uploadMut.isPending ? 'Uploading…' : 'Add photo'}
                  </button>
                )}
                {uploadMessage && <p className="upload-status">{uploadMessage}</p>}
                {galleryFiles.length ? (
                  <div className="photo-grid">
                    {galleryFiles.map((file) => (
                      <div key={file.fileId} className="photo-thumb">
                        {file.url ? (
                          <img src={file.url} alt={file.name} loading="lazy" />
                        ) : (
                          <span className="photo-name">{file.name}</span>
                        )}
                        <button
                          type="button"
                          className="photo-x"
                          onClick={() => removeGalleryFile(file.fileId)}
                          aria-label="Remove photo"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
                <p className="field-hint">Extra photos appear in the trip's Photos section.</p>
              </div>
            </div>
          </section>

          {/* 3 · Stops */}
          <section className="panel">
            <div className="panel-head">
              <span className="n">3</span>
              <h3>Stops on the route</h3>
            </div>
            <div className="panel-body">
              {canSearch ? (
                <div className="search-row">
                  <input
                    className="input"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleSearch();
                      }
                    }}
                    placeholder="Search a place or category — coffee shops, viewpoints, a town…"
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleSearch}
                    disabled={searching || !searchQuery.trim()}
                  >
                    {searching ? 'Searching…' : 'Search'}
                  </button>
                </div>
              ) : (
                <p className="field-hint">
                  Provide <code>VITE_MAPY_API_KEY</code> to search Mapy places.
                </p>
              )}

              {searchMessage && <p className="field-hint">{searchMessage}</p>}
              {searchResults.length ? (
                <p className="field-hint">
                  {searchResults.length} result{searchResults.length === 1 ? '' : 's'} shown as amber pins on the map — click one to add it.
                </p>
              ) : null}

              {hasTiles ? (
                <div className="map-frame">
                  <MapContainer
                    center={mapCenter}
                    zoom={googlePlaces.length ? 11 : 6}
                    style={{ width: '100%', height: '240px' }}
                    scrollWheelZoom={false}
                  >
                    <MapyTileLayer />
                    <MapClickHandler onClick={handleMapClick} />
                    <MapViewTracker onChange={setMapView} />
                    <FitBounds points={mapPoints} />
                    <SearchResultMarkers
                      results={searchResults.filter(
                        (result) => !googlePlaces.some((place) => place.placeId === result.id)
                      )}
                      onPick={addSearchResult}
                    />
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
                          icon={stopPinIcon}
                        >
                          <Tooltip direction="top">{`${idx + 1}`}</Tooltip>
                        </Marker>
                      ))}
                  </MapContainer>
                </div>
              ) : (
                <p className="field-hint">
                  Provide <code>VITE_MAPY_API_KEY</code> to render the map.
                </p>
              )}

              {hasTiles && (
                <p className="map-note">Mapy.cz map · category pins (☕, 🏛️, …) are search results — click one to add it (blue pins are your stops), or click anywhere to add a location.</p>
              )}

              {googlePlaces.length ? (
                <div className="rows">
                  {googlePlaces.map((place, idx) => {
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
                        <button type="button" className="x" onClick={() => removeGooglePlace(place.placeId)}>
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="seg-empty">No stops added yet — search or click the map to add them.</p>
              )}
            </div>
          </section>

          <input type="hidden" {...register('author')} />
          <input type="hidden" {...register('rating', { valueAsNumber: true })} />

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
              {isEdit ? (updateMut.isPending ? 'Saving…' : 'Save trip') : createMut.isPending ? 'Creating…' : 'Create trip'}
            </button>
          </div>
        </div>

        {/* RIGHT: live preview */}
        <aside className="preview-rail">
          <p className="preview-label">
            <span className="live" /> Live preview
          </p>
          <div className="pv-card">
            <div className="pv-img" style={backgroundImageUrl ? { backgroundImage: `url(${backgroundImageUrl})` } : undefined}>
              <span className="pv-chip tr">
                <span className="star">★</span> New
              </span>
            </div>
            <div className="pv-body">
              <div className="pv-row1">
                <h3 className="pv-title">{watchedName || 'Untitled trip'}</h3>
                <span className="pv-pill">{watchedDuration ? `${watchedDuration} min` : '—'}</span>
              </div>
              <p className="pv-desc">{firstSentence(watchedDescription)}</p>
              <p className="pv-meta">
                {stopCount} stop{stopCount === 1 ? '' : 's'} · {categoryLabel}
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
            This is how the trip appears on the trips list and in search results as you fill the form.
          </p>
        </aside>
      </form>
    </main>
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

const MapClickHandler = ({ onClick }: { onClick: (coords: { lat: number; lng: number }) => void }) => {
  useMapEvents({
    click: (event: LeafletMouseEvent) => onClick(event.latlng)
  });
  return null;
};

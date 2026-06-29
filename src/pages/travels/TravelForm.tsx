import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createTravel, fetchTravel, updateTravel } from '../../api/travels';
import { uploadFile } from '../../api/files';
import { searchMapyPlaces, type MapySearchResult } from '../../api/mapy';
import type { TravelCreateRequest, TravelPlace, TravelVisibility } from '../../types/travel';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { UploadDropzone } from '../../components/UploadDropzone';
import exifr from 'exifr';
import { toIsoDate } from '../../lib/travelFormat';
import { CircleMarker, MapContainer, Marker, Tooltip, useMapEvents } from 'react-leaflet';
import type { LeafletMouseEvent } from 'leaflet';
import { MapyTileLayer } from '../../components/MapyTileLayer';
import { FitBounds, MapViewTracker, SearchResultMarkers } from '../../components/mapSearchLayers';
import { env } from '../../config/env';
import '../../styles/create-form.css';

type FormValues = {
  title: string;
  location: string;
  description: string;
  startDate: string;
  endDate: string;
  visibility: TravelVisibility;
};

const VISIBILITY_OPTIONS: { value: TravelVisibility; label: string; hint: string }[] = [
  { value: 'PRIVATE', label: 'Private — only me', hint: 'Only you can see this travel.' },
  { value: 'FOLLOWERS', label: 'Followers', hint: 'People who follow you can see it.' },
  { value: 'PUBLIC', label: 'Public', hint: 'Anyone can find it in the public list.' }
];

export const TravelForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const travelId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedCover, setSelectedCover] = useState<File | null>(null);
  const [coverMessage, setCoverMessage] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<{ fileId: number; url?: string } | null>(null);
  const [photoMessage, setPhotoMessage] = useState<string | null>(null);
  const [photosUploading, setPhotosUploading] = useState(false);
  const [galleryFiles, setGalleryFiles] = useState<
    Array<{ fileId: number; name: string; url?: string; latitude?: number; longitude?: number; takenOn?: string }>
  >([]);
  // The photo currently being placed on the map (the next map click sets its coordinates).
  const [placingFileId, setPlacingFileId] = useState<number | null>(null);
  const [places, setPlaces] = useState<TravelPlace[]>([]);
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<MapySearchResult[]>([]);
  const [placeSearching, setPlaceSearching] = useState(false);
  const [placeMessage, setPlaceMessage] = useState<string | null>(null);
  const [mapView, setMapView] = useState<{ lat: number; lng: number } | null>(null);

  const travelQuery = useQuery({
    queryKey: ['travel', travelId],
    queryFn: () => fetchTravel(travelId),
    enabled: isEdit && Number.isFinite(travelId)
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    defaultValues: {
      title: '',
      location: '',
      description: '',
      startDate: '',
      endDate: '',
      visibility: 'PRIVATE'
    }
  });

  useEffect(() => {
    if (travelQuery.data) {
      const t = travelQuery.data;
      reset({
        title: t.title ?? '',
        location: t.location ?? '',
        description: t.description ?? '',
        startDate: t.startDate ?? '',
        endDate: t.endDate ?? '',
        visibility: t.visibility ?? 'PRIVATE'
      });
      if (t.coverImage && Number.isFinite(t.coverImage.id)) {
        setCoverImage({ fileId: t.coverImage.id, url: t.coverImage.url ?? undefined });
      }
      setGalleryFiles(
        (t.photos ?? [])
          .filter((photo) => Number.isFinite(photo.fileId))
          .map((photo) => ({
            fileId: photo.fileId,
            name: photo.name ?? 'Travel photo',
            url: photo.url ?? undefined,
            latitude: photo.latitude ?? undefined,
            longitude: photo.longitude ?? undefined,
            takenOn: photo.takenOn ?? undefined
          }))
      );
      setPlaces(t.places ?? []);
    }
  }, [travelQuery.data, reset]);

  const createMut = useMutation({
    mutationFn: (payload: TravelCreateRequest) => createTravel(payload),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['travels'] });
      navigate(`/travels/${created.id}`);
    }
  });

  const updateMut = useMutation({
    mutationFn: (payload: TravelCreateRequest) => updateTravel(travelId, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['travels'] });
      queryClient.setQueryData(['travel', travelId], updated);
      navigate(`/travels/${travelId}`);
    }
  });

  const coverUploadMut = useMutation({
    mutationFn: uploadFile,
    onSuccess: (res) => {
      const fileId = typeof res?.id === 'string' ? Number(res.id) : res?.id;
      if (Number.isFinite(fileId)) {
        setCoverImage({ fileId: fileId as number, url: res?.url ?? undefined });
      }
      setCoverMessage(res?.url ? 'Cover added.' : 'File uploaded.');
      setSelectedCover(null);
    },
    onError: () => setCoverMessage('Upload failed. Please try again.')
  });

  // Upload several photos in one go (multi-select or drag-drop), reading EXIF GPS from each
  // so geotagged photos are auto-placed on the map; the rest can be placed manually.
  const uploadPhotos = async (files: File[]) => {
    if (!files.length) return;
    setPhotoMessage(null);
    setPhotosUploading(true);
    try {
      const results = await Promise.allSettled(
        files.map(async (file) => {
          const [uploaded, gps, meta] = await Promise.all([
            uploadFile(file),
            exifr.gps(file).catch(() => undefined),
            exifr.parse(file, ['DateTimeOriginal', 'CreateDate', 'ModifyDate']).catch(() => undefined)
          ]);
          return { uploaded, gps, meta };
        })
      );
      const added: Array<{
        fileId: number;
        name: string;
        url?: string;
        latitude?: number;
        longitude?: number;
        takenOn?: string;
      }> = [];
      let failed = 0;
      let located = 0;
      let dated = 0;
      results.forEach((result, index) => {
        if (result.status !== 'fulfilled') {
          failed += 1;
          return;
        }
        const { uploaded, gps, meta } = result.value;
        const fileId = typeof uploaded?.id === 'string' ? Number(uploaded.id) : uploaded?.id;
        if (!Number.isFinite(fileId)) return;
        const latitude = gps && Number.isFinite(gps.latitude) ? gps.latitude : undefined;
        const longitude = gps && Number.isFinite(gps.longitude) ? gps.longitude : undefined;
        if (latitude != null && longitude != null) located += 1;
        const takenDate = meta?.DateTimeOriginal ?? meta?.CreateDate ?? meta?.ModifyDate;
        const takenOn = takenDate instanceof Date ? toIsoDate(takenDate) : undefined;
        if (takenOn) dated += 1;
        added.push({
          fileId: fileId as number,
          name: uploaded?.name ?? uploaded?.filename ?? files[index]?.name ?? 'Travel photo',
          url: uploaded?.url ?? undefined,
          latitude,
          longitude,
          takenOn
        });
      });
      if (added.length) {
        setGalleryFiles((prev) => {
          const seen = new Set(prev.map((file) => file.fileId));
          return [...prev, ...added.filter((file) => !seen.has(file.fileId))];
        });
      }
      const parts = [`${added.length} photo${added.length === 1 ? '' : 's'} added`];
      if (located) parts.push(`${located} located`);
      if (dated) parts.push(`${dated} dated from photo data`);
      if (failed) parts.push(`${failed} failed`);
      setPhotoMessage(`${parts.join(' · ')}.`);
    } finally {
      setPhotosUploading(false);
    }
  };

  const setPhotoLocation = (fileId: number, coords: { lat: number; lng: number } | null) => {
    setGalleryFiles((prev) =>
      prev.map((file) =>
        file.fileId === fileId
          ? { ...file, latitude: coords?.lat ?? undefined, longitude: coords?.lng ?? undefined }
          : file
      )
    );
  };

  const setPhotoDate = (fileId: number, takenOn: string) => {
    setGalleryFiles((prev) =>
      prev.map((file) => (file.fileId === fileId ? { ...file, takenOn: takenOn || undefined } : file))
    );
  };

  const onSubmit = (values: FormValues) => {
    const payload: TravelCreateRequest = {
      title: values.title,
      description: values.description || null,
      location: values.location || null,
      startDate: values.startDate || null,
      endDate: values.endDate || null,
      visibility: values.visibility,
      coverImageId: coverImage?.fileId ?? null,
      photos: galleryFiles.map((file) => ({
        fileId: file.fileId,
        latitude: file.latitude ?? null,
        longitude: file.longitude ?? null,
        takenOn: file.takenOn ?? null
      })),
      places: places.map((place) => ({
        name: place.name ?? null,
        latitude: place.latitude,
        longitude: place.longitude
      }))
    };
    if (isEdit) return updateMut.mutate(payload);
    return createMut.mutate(payload);
  };

  const removeGalleryFile = (fileId: number) => {
    setGalleryFiles((prev) => prev.filter((file) => file.fileId !== fileId));
  };

  const addPlace = (place: TravelPlace) => {
    setPlaces((prev) => {
      if (prev.some((p) => p.latitude === place.latitude && p.longitude === place.longitude)) return prev;
      return [...prev, place];
    });
  };

  const removePlace = (index: number) => {
    setPlaces((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePlaceSearch = async () => {
    if (!placeQuery.trim()) return;
    setPlaceMessage(null);
    setPlaceSearching(true);
    try {
      const results = await searchMapyPlaces(placeQuery, { near: mapView, limit: 15 });
      setPlaceResults(results);
      if (!results.length) setPlaceMessage('No results found.');
    } catch (err) {
      setPlaceResults([]);
      setPlaceMessage(err instanceof Error ? err.message : 'Search failed.');
    } finally {
      setPlaceSearching(false);
    }
  };

  if (isEdit && travelQuery.isLoading) return <LoadingState label="Loading travel..." />;
  if (isEdit && travelQuery.error) return <ErrorState message="Failed to load travel for editing." />;

  const selectedVisibility = watch('visibility');
  const visibilityHint = VISIBILITY_OPTIONS.find((opt) => opt.value === selectedVisibility)?.hint;

  const needsTileKey =
    env.mapyTilesUrl.includes('{apikey}') ||
    env.mapyTilesUrl.includes('{API_KEY}') ||
    env.mapyTilesUrl.includes('${API_KEY}');
  const hasTiles = !!env.mapyApiKey || !needsTileKey;
  const canSearch = !!env.mapyApiKey && !!env.mapySearchUrl;
  const placeCoords = places
    .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
    .map((p) => ({ lat: p.latitude, lng: p.longitude }));
  const resultCoords = placeResults.map((r) => ({ lat: r.lat, lng: r.lng }));
  const mapCenter = placeCoords[0] ?? { lat: 50.0755, lng: 14.4378 };
  const photoMarkers = galleryFiles
    .filter((file) => file.latitude != null && file.longitude != null)
    .map((file) => ({ lat: file.latitude as number, lng: file.longitude as number, name: file.name, fileId: file.fileId }));
  const photoMapCenter = photoMarkers[0] ?? mapCenter;
  const placingPhoto = placingFileId != null ? galleryFiles.find((file) => file.fileId === placingFileId) : undefined;

  return (
    <main className="cf-page">
      <p className="crumbs">
        <Link to="/travels">My Travels</Link>
        <span className="sep">/</span>
        <span className="here">{isEdit ? 'Edit' : 'New'}</span>
      </p>
      <p className="page-eyebrow">My Travels</p>
      <h1 className="page-h1">{isEdit ? 'Edit travel' : 'Add a travel'}</h1>
      <p className="page-desc">Record a trip you've done, add your photos, and choose who can see it.</p>

      <form className="split" onSubmit={handleSubmit(onSubmit)}>
        <div className="stack">
          <section className="panel">
            <div className="panel-head">
              <span className="n">1</span>
              <h3>Basics</h3>
            </div>
            <div className="panel-body">
              <label className="field">
                <span className="field-label">Title</span>
                <input className="input" placeholder="e.g. Patagonia road trip" {...register('title', { required: 'Title is required' })} />
                {errors.title?.message && <p className="field-error">{errors.title.message}</p>}
              </label>
              <label className="field">
                <span className="field-label">Destination</span>
                <input className="input" placeholder="Where did you go?" {...register('location')} />
              </label>
              <div className="grid-2">
                <label className="field">
                  <span className="field-label">Start date</span>
                  <input className="input" type="date" {...register('startDate')} />
                </label>
                <label className="field">
                  <span className="field-label">End date</span>
                  <input className="input" type="date" {...register('endDate')} />
                </label>
              </div>
              <label className="field">
                <span className="field-label">Story</span>
                <textarea
                  className="textarea"
                  rows={5}
                  placeholder="What did you do, see, and love about this trip?"
                  {...register('description')}
                />
              </label>
              <label className="field">
                <span className="field-label">Who can see this?</span>
                <select className="select-native" {...register('visibility')}>
                  {VISIBILITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {visibilityHint && <p className="field-hint">{visibilityHint}</p>}
                <p className="field-hint">You can always create a private share link later, whatever this is set to.</p>
              </label>
            </div>
          </section>

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
                  selectedFile={selectedCover}
                  placeholder={<>Drop a cover or <b>browse</b></>}
                  hint="1600 × 900 · JPG or PNG"
                  onFile={(file) => {
                    setSelectedCover(file);
                    setCoverMessage(null);
                  }}
                />
                {selectedCover && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => coverUploadMut.mutate(selectedCover)}
                    disabled={coverUploadMut.isPending}
                  >
                    {coverUploadMut.isPending ? 'Uploading…' : 'Upload selected file'}
                  </button>
                )}
                {coverMessage && <p className="upload-status">{coverMessage}</p>}
                {coverImage?.url && <img className="upload-preview" src={coverImage.url} alt="Cover preview" loading="lazy" />}
              </div>

              <div className="field">
                <span className="field-label">
                  Photos <span className="field-opt">Optional</span>
                </span>
                <UploadDropzone
                  variant="wide"
                  multiple
                  placeholder={<>Drop photos or <b>browse</b></>}
                  hint="Select several at once · JPG or PNG"
                  onFiles={uploadPhotos}
                />
                {photosUploading && <p className="upload-status">Uploading…</p>}
                {photoMessage && <p className="upload-status">{photoMessage}</p>}
                <p className="field-hint">
                  Photos with GPS data are placed on the map automatically. For the rest, use “Place on map”.
                </p>
                {galleryFiles.length ? (
                  <div className="rows">
                    {galleryFiles.map((file) => {
                      const located = file.latitude != null && file.longitude != null;
                      const placing = placingFileId === file.fileId;
                      return (
                        <div key={file.fileId} className="row-item">
                          {file.url ? (
                            <img
                              src={file.url}
                              alt={file.name}
                              loading="lazy"
                              style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }}
                            />
                          ) : (
                            <span className="num">📷</span>
                          )}
                          <div className="grow">
                            <p className="r-name">{file.name}</p>
                            <p className="r-meta mono">
                              {located
                                ? `📍 ${file.latitude!.toFixed(5)}, ${file.longitude!.toFixed(5)}`
                                : 'No location'}
                            </p>
                            <label className="r-meta" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>Taken</span>
                              <input
                                type="date"
                                className="input"
                                style={{ maxWidth: 170, padding: '2px 8px' }}
                                value={file.takenOn ?? ''}
                                onChange={(event) => setPhotoDate(file.fileId, event.target.value)}
                              />
                            </label>
                          </div>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setPlacingFileId(placing ? null : file.fileId)}
                          >
                            {placing ? 'Click map…' : located ? 'Move' : 'Place on map'}
                          </button>
                          {located && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setPhotoLocation(file.fileId, null)}
                            >
                              Clear
                            </button>
                          )}
                          <button
                            type="button"
                            className="x"
                            onClick={() => removeGalleryFile(file.fileId)}
                            aria-label="Remove photo"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {galleryFiles.length && hasTiles ? (
                  <>
                    {placingPhoto && (
                      <p className="field-hint">Click the map to place “{placingPhoto.name}”.</p>
                    )}
                    <div className="map-frame">
                      <MapContainer
                        center={photoMapCenter}
                        zoom={photoMarkers.length ? 9 : 5}
                        style={{ width: '100%', height: '240px' }}
                        scrollWheelZoom={false}
                      >
                        <MapyTileLayer />
                        <PlaceClickHandler
                          onClick={(coords) => {
                            if (placingFileId != null) {
                              setPhotoLocation(placingFileId, coords);
                              setPlacingFileId(null);
                            }
                          }}
                        />
                        {photoMarkers.map((pos) => (
                          <CircleMarker
                            key={pos.fileId}
                            center={pos}
                            radius={8}
                            pathOptions={{ color: '#b45309', weight: 2, fillColor: '#f59e0b', fillOpacity: 1 }}
                          >
                            <Tooltip direction="top">{pos.name}</Tooltip>
                          </CircleMarker>
                        ))}
                      </MapContainer>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <span className="n">3</span>
              <h3>Visited places</h3>
            </div>
            <div className="panel-body">
              {canSearch ? (
                <div className="search-row">
                  <input
                    className="input"
                    value={placeQuery}
                    onChange={(event) => setPlaceQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handlePlaceSearch();
                      }
                    }}
                    placeholder="Search a place you visited — a city, landmark, restaurant…"
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handlePlaceSearch}
                    disabled={placeSearching || !placeQuery.trim()}
                  >
                    {placeSearching ? 'Searching…' : 'Search'}
                  </button>
                </div>
              ) : (
                <p className="field-hint">
                  Provide <code>VITE_MAPY_API_KEY</code> to search and pin visited places.
                </p>
              )}

              {placeMessage && <p className="field-hint">{placeMessage}</p>}

              {hasTiles ? (
                <div className="map-frame">
                  <MapContainer
                    center={mapCenter}
                    zoom={placeCoords.length ? 9 : 5}
                    style={{ width: '100%', height: '240px' }}
                    scrollWheelZoom={false}
                  >
                    <MapyTileLayer />
                    <PlaceClickHandler
                      onClick={(coords) =>
                        addPlace({
                          name: `Pin (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`,
                          latitude: coords.lat,
                          longitude: coords.lng
                        })
                      }
                    />
                    <MapViewTracker onChange={setMapView} />
                    <FitBounds points={[...placeCoords, ...resultCoords]} />
                    <SearchResultMarkers
                      results={placeResults}
                      onPick={(result) =>
                        addPlace({ name: result.name, latitude: result.lat, longitude: result.lng })
                      }
                    />
                    {placeCoords.map((pos, idx) => (
                      <Marker key={`${pos.lat}-${pos.lng}-${idx}`} position={pos}>
                        <Tooltip direction="top">{places[idx]?.name || `Place ${idx + 1}`}</Tooltip>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              ) : (
                <p className="field-hint">
                  Provide <code>VITE_MAPY_API_KEY</code> to render the map.
                </p>
              )}

              {places.length ? (
                <div className="rows">
                  {places.map((place, idx) => (
                    <div key={`${place.latitude}-${place.longitude}-${idx}`} className="row-item">
                      <span className="num">{idx + 1}</span>
                      <div className="grow">
                        <p className="r-name">{place.name || 'Visited place'}</p>
                        <p className="r-meta mono">
                          {place.latitude.toFixed(5)}, {place.longitude.toFixed(5)}
                        </p>
                      </div>
                      <button type="button" className="x" onClick={() => removePlace(idx)}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="seg-empty">No places added yet — search or click the map to add them.</p>
              )}
            </div>
          </section>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || createMut.isPending || updateMut.isPending}
            >
              {isEdit
                ? updateMut.isPending
                  ? 'Saving…'
                  : 'Save travel'
                : createMut.isPending
                  ? 'Creating…'
                  : 'Create travel'}
            </button>
          </div>
        </div>
      </form>
    </main>
  );
};

const PlaceClickHandler = ({ onClick }: { onClick: (coords: { lat: number; lng: number }) => void }) => {
  useMapEvents({
    click: (event: LeafletMouseEvent) => onClick(event.latlng)
  });
  return null;
};

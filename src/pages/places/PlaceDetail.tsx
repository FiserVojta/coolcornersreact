import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPlace, addPlaceComment, addPlaceRating, deletePlace } from '../../api/places';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { RatingBadge } from '../../components/RatingBadge';
import { TagList } from '../../components/TagList';
import { useAuth } from '../../auth/KeycloakProvider';
import { env } from '../../config/env';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { CommentModel } from '../../types/place';
import { fetchFiles, uploadFile } from '../../api/files';
import { CircleMarker, MapContainer } from 'react-leaflet';
import { MapyTileLayer } from '../../components/MapyTileLayer';
import { Button } from '../../components/ui/Button';
import { SurfaceCard } from '../../components/ui/SurfaceCard';
import { TextArea } from '../../components/ui/FormField';

export const PlaceDetail = () => {
  const { id } = useParams();
  const placeId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const commentForm = useForm<CommentModel>({ defaultValues: { value: '' } });
  const { data, isLoading, error } = useQuery({
    queryKey: ['place', placeId],
    queryFn: () => fetchPlace(placeId),
    enabled: Number.isFinite(placeId)
  });
  const { data: files, isLoading: filesLoading, error: filesError } = useQuery({
    queryKey: ['files', 'public'],
    queryFn: fetchFiles
  });
  const { authenticated, initializing, login, canEdit } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  const commentMut = useMutation({
    mutationFn: (payload: CommentModel) => addPlaceComment(placeId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['place', placeId] });
      commentForm.reset({ name: '', value: '' });
    }
  });

  const ratingMut = useMutation({
    mutationFn: (rating: number) =>
      addPlaceRating(placeId, { id: placeId, rating, createdBy: 'web-client' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['place', placeId] });
    }
  });

  const deleteMut = useMutation({
    mutationFn: () => deletePlace(placeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['places'] });
      navigate('/places');
    }
  });

  const uploadMut = useMutation({
    mutationFn: uploadFile,
    onSuccess: (res) => {
      setUploadMessage(res?.url ? `Uploaded: ${res.url}` : 'File uploaded.');
      setSelectedFile(null);
    },
    onError: () => setUploadMessage('Upload failed. Please try again.')
  });

  if (!Number.isFinite(placeId)) {
    return <ErrorState message="Invalid place id" />;
  }

  if (isLoading) return <LoadingState label="Loading place..." />;
  if (error || !data) return <ErrorState message="Unable to load this place right now." />;

  const canUserEdit = canEdit(data.createdBy);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
            {data.category?.title ?? 'Place'}
          </p>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900">{data.name}</h1>
            <RatingBadge rating={data.rating} />
          </div>
          <p className="text-slate-600">{data.address ?? data.city?.name}</p>
        </div>
        {canUserEdit && (
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              You can edit
            </span>
            <Button onClick={() => navigate(`/places/${placeId}/edit`)} variant="secondary" size="sm">
              Edit
            </Button>
            <Button
              onClick={() => {
                if (confirm('Delete this place?')) deleteMut.mutate();
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

      {data.images?.length ? (
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <img
            src={data.images[0]}
            alt={data.name}
            className="h-72 w-full rounded-2xl object-cover shadow-card"
            loading="lazy"
          />
          {data.images[1] && (
            <img
              src={data.images[1]}
              alt={data.name}
              className="h-72 w-full rounded-2xl object-cover shadow-card"
              loading="lazy"
            />
          )}
        </div>
      ) : (
        <div className="mt-6 h-56 rounded-2xl border border-dashed border-slate-200 bg-white/70 px-6 py-5 text-slate-500 shadow-inner">
          No images for this place yet.
        </div>
      )}

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
            <h3 className="text-lg font-semibold text-slate-900">Details</h3>
            <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
              <Detail label="City" value={data.city?.name} />
              <Detail label="Opening hours" value={data.openingHours} />
              <Detail label="Phone" value={data.phoneNumber} />
              <Detail label="Website" value={data.website} />
              <Detail label="Email" value={data.email} />
              <Detail label="Address" value={data.address} />
            </div>
          </SurfaceCard>
        </div>

        <aside className="space-y-6">
          <LocationMap featureCoords={data.feature?.geometry.coordinates} />
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
            <h3 className="text-lg font-semibold text-slate-900">Rate this place</h3>
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
          <SurfaceCard>
            <h3 className="text-lg font-semibold text-slate-900">Upload a file</h3>
            {authenticated ? (
              <form
                className="mt-3 space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!selectedFile) return;
                  setUploadMessage(null);
                  uploadMut.mutate(selectedFile);
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setSelectedFile(file);
                    setUploadMessage(null);
                  }}
                  className="block w-full text-sm text-slate-700"
                />
                {selectedFile && <p className="text-xs text-slate-600">Selected: {selectedFile.name}</p>}
                <Button
                  type="submit"
                  disabled={!selectedFile || uploadMut.isPending}
                  size="sm"
                  className="disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {uploadMut.isPending ? 'Uploading...' : 'Upload'}
                </Button>
                {uploadMessage && (
                  <p className="text-xs text-slate-600">
                    {uploadMessage}
                    {uploadMut.data?.url && (
                      <a
                        href={uploadMut.data.url}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-2 text-brand-700 underline"
                      >
                        Open
                      </a>
                    )}
                  </p>
                )}
              </form>
            ) : (
              <p className="mt-3 text-sm text-slate-600">
                Please login to upload files.
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
            <h3 className="text-lg font-semibold text-slate-900">Uploaded files</h3>
            {filesLoading ? (
              <p className="mt-3 text-sm text-slate-600">Loading files...</p>
            ) : filesError ? (
              <p className="mt-3 text-sm text-rose-600">Unable to load files.</p>
            ) : files?.data?.length ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {files.data.map((file) => (
                  <a
                    key={file.id}
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative block overflow-hidden rounded-xl border border-slate-100 bg-slate-50"
                  >
                    <img
                      src={file.url}
                      alt={`File ${file.id}`}
                      className="h-32 w-full object-cover transition duration-150 group-hover:scale-105"
                      loading="lazy"
                    />
                  </a>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-600">No files uploaded yet.</p>
            )}
          </SurfaceCard>
        </aside>
      </div>
    </main>
  );
};

const Detail = ({ label, value }: { label: string; value?: string }) => (
  <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-1 text-slate-800">{value ?? '—'}</p>
  </div>
);

const mapContainerStyle = { width: '100%', height: '280px', borderRadius: '16px', overflow: 'hidden' };

const LocationMap = ({ featureCoords }: { featureCoords?: [number, number] }) => {
  const needsTileKey =
    env.mapyTilesUrl.includes('{apikey}') ||
    env.mapyTilesUrl.includes('{API_KEY}') ||
    env.mapyTilesUrl.includes('${API_KEY}');
  const hasTiles = !!env.mapyApiKey || !needsTileKey;
  const coords = useMemo(() => {
    if (!featureCoords) return null;
    const [lng, lat] = featureCoords;
    return { lat, lng };
  }, [featureCoords]);

  if (!coords) {
    return (
      <SurfaceCard className="border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900">Location</h3>
        <p className="mt-2 text-sm text-slate-600">No coordinates available.</p>
      </SurfaceCard>
    );
  }

  if (!hasTiles) {
    return (
      <SurfaceCard className="border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900">Location</h3>
        <p className="mt-2 text-sm text-slate-600">
          Provide <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">VITE_MAPY_API_KEY</code> to render the
          map.
        </p>
      </SurfaceCard>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <MapContainer center={coords} zoom={14} style={mapContainerStyle} scrollWheelZoom={false}>
        <MapyTileLayer />
        <CircleMarker
          center={coords}
          radius={7}
          pathOptions={{ color: '#0f172a', weight: 2, fillColor: '#ffffff', fillOpacity: 1 }}
        />
      </MapContainer>
    </div>
  );
};

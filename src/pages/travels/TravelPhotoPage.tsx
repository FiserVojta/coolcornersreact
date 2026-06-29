import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { fetchSharedTravel, fetchTravel } from '../../api/travels';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { PageContainer } from '../../components/layout/PageContainer';
import { Button } from '../../components/ui/Button';
import type { TravelPhoto } from '../../types/travel';

/**
 * Full-page view of a single travel photo. Reachable from the gallery and the map markers,
 * for both the owner's travel (`/travels/:id/photos/:photoId`) and a public share link
 * (`/travels/share/:token/photos/:photoId`). Reuses the cached travel query — no extra backend call.
 */
export const TravelPhotoPage = () => {
  const { id, token, photoId } = useParams();
  const shared = !!token;
  const travelId = Number(id);
  const numericPhotoId = Number(photoId);

  const { data: travel, isLoading, error } = useQuery({
    queryKey: shared ? ['travel', 'shared', token] : ['travel', travelId],
    queryFn: () => (shared ? fetchSharedTravel(token as string) : fetchTravel(travelId)),
    enabled: shared ? !!token : Number.isFinite(travelId)
  });

  if (isLoading) return <LoadingState label="Loading photo..." />;
  if (error || !travel) return <ErrorState message="Unable to load this photo." />;

  const photos = travel.photos ?? [];
  const index = photos.findIndex((photo) => photo.id === numericPhotoId);
  const photo = index >= 0 ? photos[index] : undefined;
  if (!photo) return <ErrorState message="Photo not found." />;

  const base = shared ? `/travels/share/${token}` : `/travels/${travel.id}`;
  const hrefFor = (target: TravelPhoto) => `${base}/photos/${target.id}`;
  const prev = index > 0 ? photos[index - 1] : undefined;
  const next = index < photos.length - 1 ? photos[index + 1] : undefined;

  return (
    <PageContainer>
      <div className="mb-4 flex items-center justify-between gap-2">
        <Button to={base} variant="secondary" size="sm">
          ← Back to travel
        </Button>
        <div className="flex gap-2">
          {prev ? (
            <Button to={hrefFor(prev)} variant="secondary" size="sm">
              Previous
            </Button>
          ) : null}
          {next ? (
            <Button to={hrefFor(next)} variant="secondary" size="sm">
              Next
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-center overflow-hidden rounded-2xl bg-slate-900/5">
        {photo.url ? (
          <img
            src={photo.url}
            alt={photo.name ?? 'Travel photo'}
            className="max-h-[80vh] w-auto max-w-full object-contain"
          />
        ) : (
          <div className="p-10 text-center text-ink-muted">{photo.name ?? 'Photo'}</div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-xl font-semibold text-ink-strong">{photo.name ?? 'Photo'}</h1>
        {photo.latitude != null && photo.longitude != null ? (
          <span className="text-sm font-label text-ink-muted">
            📍 {photo.latitude.toFixed(5)}, {photo.longitude.toFixed(5)}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-sm font-label text-ink-subtle">
        Photo {index + 1} of {photos.length} · {travel.title}
      </p>
    </PageContainer>
  );
};

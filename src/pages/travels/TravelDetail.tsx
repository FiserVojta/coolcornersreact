import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createTravel, deleteTravel, fetchTravel, rateTravel } from '../../api/travels';
import { createCotravel } from '../../api/cotravel';
import { fetchCategories } from '../../api/categories';
import type { CotravelCreateRequest } from '../../types/cotravel';
import type { TravelDetail as TravelDetailData } from '../../types/travel';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { PageContainer } from '../../components/layout/PageContainer';
import { Button } from '../../components/ui/Button';
import { TravelView } from '../../components/TravelView';
import { RatingBadge } from '../../components/RatingBadge';
import { useAuth } from '../../auth/AuthContext';
import { buildCotravelRequest } from '../../lib/cotravelFromTravel';
import { buildTravelVersionRequest } from '../../lib/travelVersionFromTravel';
import { formatTravelDates } from '../../lib/travelFormat';

export const TravelDetail = () => {
  const { authenticated } = useAuth();
  const { id } = useParams();
  const travelId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [markedTravelId, setMarkedTravelId] = useState<number | null>(null);

  const { data: travel, isLoading, error } = useQuery({
    queryKey: ['travel', travelId],
    queryFn: () => fetchTravel(travelId),
    enabled: Number.isFinite(travelId)
  });

  // Co-travel categories, so "Plan a co-travel" seeds a real COTRAVEL category. Only needed
  // for authenticated viewers (the only ones who see the button).
  const cotravelCategoriesQuery = useQuery({
    queryKey: ['categories', 'COTRAVEL'],
    queryFn: () => fetchCategories('COTRAVEL'),
    enabled: authenticated
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteTravel(travelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travels'] });
      navigate('/travels');
    }
  });

  const rateMut = useMutation({
    mutationFn: (rating: number) => rateTravel(travelId, rating),
    onSuccess: (updated) => {
      queryClient.setQueryData(['travel', travelId], updated);
      queryClient.invalidateQueries({ queryKey: ['travels'] });
    }
  });

  // "Mark as done": records the viewer's own version of this trip with no photos and no form,
  // so the trip counts as done. The viewer stays on the page and gets a link to fill it in later.
  const markDoneMut = useMutation({
    mutationFn: (travelToCopy: TravelDetailData) => createTravel(buildTravelVersionRequest(travelToCopy)),
    onSuccess: (created) => {
      setMarkedTravelId(created.id);
      queryClient.invalidateQueries({ queryKey: ['travels'] });
      queryClient.invalidateQueries({ queryKey: ['travel', travelId] });
    }
  });

  const createCotravelMut = useMutation({
    mutationFn: (payload: CotravelCreateRequest) => createCotravel(payload),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['cotravel'] });
      navigate(`/cotravel/${created.id}`);
    }
  });

  if (isLoading) return <LoadingState label="Loading travel..." />;
  if (error || !travel) return <ErrorState message="Unable to load this travel." />;

  // The backend only returns the share token to the owner, so it doubles as an "is owner" signal.
  const isOwner = !!travel.shareToken;

  // How often this trip was done (original + everyone's versions) and the versions the viewer may open.
  const timesDone = travel.timesDone ?? 1;
  const otherVersions = travel.otherVersions ?? [];

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/travels/share/${travel.shareToken}`;
    try {
      await navigator.clipboard?.writeText(shareUrl);
      setShareMessage('Share link copied to clipboard!');
    } catch {
      setShareMessage(shareUrl);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Delete this travel? This cannot be undone.')) {
      deleteMut.mutate();
    }
  };

  // Create a co-travel plan seeded from this travel (title, dates, tags, visited places), then
  // jump straight to the new plan — no intermediate form.
  const cotravelCategoryId = cotravelCategoriesQuery.data?.[0]?.id;
  const handleCreateCotravel = () => {
    if (cotravelCategoryId == null) return;
    createCotravelMut.mutate(buildCotravelRequest(travel, cotravelCategoryId));
  };

  const actions =
    isOwner || authenticated ? (
      <>
        {isOwner ? (
          <Button variant="primary" size="sm" onClick={handleShare}>
            Share link
          </Button>
        ) : null}
        {authenticated ? (
          <>
            <Button to={`/travels/create?basedOn=${travel.id}`} variant="primary" size="sm">
              Make a copy
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => markDoneMut.mutate(travel)}
              disabled={markDoneMut.isPending || markedTravelId != null}
              title="Record that you did this trip, without uploading photos"
            >
              {markDoneMut.isPending ? 'Saving…' : 'Mark as done'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCreateCotravel}
              disabled={createCotravelMut.isPending || cotravelCategoryId == null}
            >
              {createCotravelMut.isPending ? 'Creating…' : 'Plan a co-travel'}
            </Button>
          </>
        ) : null}
        {isOwner ? (
          <>
            <Button to={`/travels/${travel.id}/edit`} variant="secondary" size="sm">
              Edit
            </Button>
            <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleteMut.isPending}>
              {deleteMut.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </>
        ) : null}
      </>
    ) : null;

  return (
    <PageContainer>
      <TravelView
        travel={travel}
        actions={actions}
        showVisibility={isOwner}
        getPhotoHref={(photo) => (photo.id != null ? `/travels/${travel.id}/photos/${photo.id}` : undefined)}
      />
      {shareMessage ? (
        <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">{shareMessage}</p>
      ) : null}
      {markedTravelId != null ? (
        <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
          Noted — this trip is now on your travels.{' '}
          <Link to={`/travels/${markedTravelId}`} className="underline">
            Open it to add photos
          </Link>
        </p>
      ) : null}
      {markDoneMut.isError ? (
        <p className="mt-4 rounded-xl bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700">
          Could not record this trip. Please try again.
        </p>
      ) : null}

      {timesDone > 1 || otherVersions.length ? (
        <section className="mt-6 rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold font-display text-ink-strong">Who else did this trip</h3>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold font-label text-brand-700">
              Done {timesDone} {timesDone === 1 ? 'time' : 'times'}
            </span>
          </div>
          {travel.originTravelId ? (
            <p className="mt-2 text-xs text-ink-muted">This is another version of an earlier travel.</p>
          ) : null}
          {otherVersions.length ? (
            <ul className="mt-3 flex flex-col gap-2">
              {otherVersions.map((version) => (
                <li key={version.id}>
                  <Link
                    to={`/travels/${version.id}`}
                    className="flex items-center gap-3 rounded-xl border border-brand-100 px-3 py-2 transition hover:border-brand-300"
                  >
                    {version.coverImage?.url ? (
                      <img
                        src={version.coverImage.thumbnailUrl ?? version.coverImage.url}
                        alt=""
                        className="h-10 w-10 rounded-lg object-cover"
                        loading="lazy"
                      />
                    ) : null}
                    <span className="flex flex-col">
                      <span className="text-sm font-semibold font-label text-ink-strong">
                        {version.owner?.displayName ?? version.owner?.name ?? 'Someone'}
                        {version.id === travel.originTravelId ? ' · original' : ''}
                      </span>
                      <span className="text-xs text-ink-muted">
                        {formatTravelDates(version.startDate, version.endDate)} · {version.photoCount}{' '}
                        {version.photoCount === 1 ? 'photo' : 'photos'}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-ink-muted">
              The other versions of this trip aren't shared with you.
            </p>
          )}
        </section>
      ) : null}

      <section className="mt-6 rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold font-display text-ink-strong">Rate this travel</h3>
          <RatingBadge rating={travel.rating ?? undefined} />
        </div>
        {authenticated ? (
          <>
            <div className="mt-3 flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => rateMut.mutate(star)}
                  disabled={rateMut.isPending}
                  aria-label={`Rate ${star} out of 5`}
                  aria-pressed={travel.myRating === star}
                  className={`h-9 w-9 rounded-full text-sm font-semibold transition ${
                    travel.myRating != null && travel.myRating >= star
                      ? 'border border-brand-100 bg-brand-600 text-white'
                      : 'border border-brand-100 bg-white text-ink-strong hover:border-brand-300'
                  }`}
                >
                  {star}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-muted">
              {rateMut.isPending
                ? 'Submitting...'
                : travel.myRating != null
                  ? `You rated this travel ${travel.myRating}/5.`
                  : 'Tap a number to rate this travel.'}
            </p>
          </>
        ) : (
          <p className="mt-2 text-xs text-ink-muted">Log in to rate this travel.</p>
        )}
      </section>
    </PageContainer>
  );
};

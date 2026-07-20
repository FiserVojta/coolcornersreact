import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { deleteTravel, fetchTravel, rateTravel } from '../../api/travels';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { PageContainer } from '../../components/layout/PageContainer';
import { Button } from '../../components/ui/Button';
import { TravelView } from '../../components/TravelView';
import { RatingBadge } from '../../components/RatingBadge';
import { useAuth } from '../../auth/AuthContext';

export const TravelDetail = () => {
  const { authenticated } = useAuth();
  const { id } = useParams();
  const travelId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  const { data: travel, isLoading, error } = useQuery({
    queryKey: ['travel', travelId],
    queryFn: () => fetchTravel(travelId),
    enabled: Number.isFinite(travelId)
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

  if (isLoading) return <LoadingState label="Loading travel..." />;
  if (error || !travel) return <ErrorState message="Unable to load this travel." />;

  // The backend only returns the share token to the owner, so it doubles as an "is owner" signal.
  const isOwner = !!travel.shareToken;

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

  const actions = isOwner ? (
    <>
      <Button variant="primary" size="sm" onClick={handleShare}>
        Share link
      </Button>
      <Button to={`/travels/${travel.id}/edit`} variant="secondary" size="sm">
        Edit
      </Button>
      <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleteMut.isPending}>
        {deleteMut.isPending ? 'Deleting…' : 'Delete'}
      </Button>
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

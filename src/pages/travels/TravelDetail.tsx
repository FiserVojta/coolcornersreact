import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { deleteTravel, fetchTravel } from '../../api/travels';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { PageContainer } from '../../components/layout/PageContainer';
import { Button } from '../../components/ui/Button';
import { TravelView } from '../../components/TravelView';

export const TravelDetail = () => {
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
    </PageContainer>
  );
};

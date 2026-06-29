import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { fetchSharedTravel } from '../../api/travels';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { PageContainer } from '../../components/layout/PageContainer';
import { TravelView } from '../../components/TravelView';

export const SharedTravel = () => {
  const { token } = useParams();

  const { data: travel, isLoading, error } = useQuery({
    queryKey: ['travel', 'shared', token],
    queryFn: () => fetchSharedTravel(token as string),
    enabled: !!token
  });

  if (isLoading) return <LoadingState label="Loading shared travel..." />;
  if (error || !travel) return <ErrorState message="This shared travel link is invalid or no longer available." />;

  return (
    <PageContainer>
      <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold font-label text-brand-700">
        🔗 Shared with you
      </p>
      <TravelView
        travel={travel}
        getPhotoHref={(photo) => (photo.id != null ? `/travels/share/${token}/photos/${photo.id}` : undefined)}
      />
    </PageContainer>
  );
};

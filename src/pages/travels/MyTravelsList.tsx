import { useQuery } from '@tanstack/react-query';
import { fetchMyTravels } from '../../api/travels';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { TravelCard } from '../../components/TravelCard';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';

export const MyTravelsList = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['travels', 'mine'],
    queryFn: fetchMyTravels
  });

  if (isLoading) return <LoadingState label="Loading your travels..." />;
  if (error) return <ErrorState message="Unable to load your travels right now." />;

  const travels = data ?? [];

  return (
    <PageContainer>
      <PageHeader
        eyebrow="My Travels"
        title="Trips you've done"
        description="Keep a journal of the trips you've taken, add your photos, and share them with friends."
        className="md:items-start"
        actions={<Button to="/travels/create">New travel</Button>}
      />

      {travels.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-brand-100 bg-white/60 px-6 py-12 text-center">
          <p className="text-sm text-ink-muted">You haven't added any travels yet.</p>
          <Button to="/travels/create">Create your first travel</Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {travels.map((travel) => (
            <TravelCard key={travel.id} travel={travel} />
          ))}
        </div>
      )}
    </PageContainer>
  );
};

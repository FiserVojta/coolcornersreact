import { useQuery } from '@tanstack/react-query';
import { fetchPlaces } from '../../api/places';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { PlaceCard } from '../../components/PlaceCard';
import { useAuth } from '../../auth/AuthContext';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';

export const PlacesList = () => {
  const { authenticated, login } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ['places'],
    queryFn: () => fetchPlaces()
  });
  const places = data?.data ?? [];
  const totalItems = data?.totalItems ?? places.length;

  if (isLoading) return <LoadingState label="Loading places..." />;
  if (error) return <ErrorState message="Unable to load places right now." />;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Places"
        title="Discover curated corners"
        description={`Fetched from ${totalItems} entries.`}
        actions={
          <>
          {authenticated ? (
            <Button
              to="/places/create"
            >
              Create place
            </Button>
          ) : (
            <Button
              onClick={() => login()}
              variant="secondary"
            >
              Login to create
            </Button>
          )}
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
            React port
          </span>
          </>
        }
      />

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {places.map((place) => (
          <PlaceCard key={place.id} place={place} />
        ))}
      </div>
    </PageContainer>
  );
};

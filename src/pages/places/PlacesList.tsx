import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchPlaces } from '../../api/places';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { PlaceCard } from '../../components/PlaceCard';
import { useAuth } from '../../auth/AuthContext';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { TagInput } from '../../components/TagInput';
import { FilterShell } from '../../components/filters';
import { useTagFilter } from '../../hooks/useTagFilter';

export const PlacesList = () => {
  const { authenticated, login } = useAuth();
  const { selectedTags, selectedTagIds, setSelectedTags, isResolving: tagsResolving } = useTagFilter();
  const { data, isLoading, error } = useQuery({
    queryKey: ['places', selectedTagIds],
    queryFn: () => fetchPlaces({ tagIds: selectedTagIds }),
    placeholderData: keepPreviousData,
    // Wait for ?tags= to resolve so unfiltered results never flash.
    enabled: !tagsResolving
  });
  const places = data?.data ?? [];
  const totalItems = data?.totalItems ?? places.length;

  if (isLoading || tagsResolving) return <LoadingState label="Loading places..." />;
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
          </>
        }
      />

      <FilterShell>
        <TagInput label="Tags" allowCreate={false} value={selectedTags} onChange={setSelectedTags} />
      </FilterShell>

      {places.length === 0 && (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-brand-100 bg-white/60 px-6 py-12 text-center">
          <p className="text-sm text-ink-muted">No places match these filters.</p>
          {selectedTags.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedTags([])}
              className="rounded-full border border-brand-100 bg-white px-4 py-2 text-sm font-semibold text-ink-strong shadow-sm transition hover:border-brand-300"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {places.map((place) => (
          <PlaceCard key={place.id} place={place} />
        ))}
      </div>
    </PageContainer>
  );
};

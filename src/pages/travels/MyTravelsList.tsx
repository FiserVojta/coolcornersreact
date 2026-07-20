import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAccessibleTravels } from '../../api/travels';
import { useAuth } from '../../auth/AuthContext';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { TravelCard } from '../../components/TravelCard';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { FilterShell, MultiSelectFilter, RatingThreshold, SearchInput } from '../../components/filters';

export const MyTravelsList = () => {
  const { authenticated, email } = useAuth();
  const [search, setSearch] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [selectedAuthors, setSelectedAuthors] = useState<number[]>([]);
  const { data, isLoading, error } = useQuery({
    queryKey: ['travels', 'accessible', email ?? 'anonymous'],
    queryFn: fetchAccessibleTravels
  });

  const travels = useMemo(() => data ?? [], [data]);

  // Distinct owners of the currently visible travels, offered as author filter options.
  const authorOptions = useMemo(() => {
    const byId = new Map<number, string>();
    for (const travel of travels) {
      const owner = travel.owner;
      if (owner?.id != null && !byId.has(owner.id)) {
        byId.set(owner.id, owner.displayName ?? owner.name ?? `User ${owner.id}`);
      }
    }
    return Array.from(byId, ([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [travels]);

  const filteredTravels = useMemo(() => {
    const query = search.trim().toLowerCase();
    return travels.filter((travel) => {
      if (minRating > 0 && (travel.rating ?? 0) < minRating) return false;
      if (
        selectedAuthors.length > 0 &&
        (travel.owner?.id == null || !selectedAuthors.includes(travel.owner.id))
      ) {
        return false;
      }
      if (!query) return true;
      const ownerName = travel.owner?.displayName ?? travel.owner?.name ?? '';
      const haystack = `${travel.title} ${travel.location ?? ''} ${ownerName}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [travels, search, minRating, selectedAuthors]);

  const toggleAuthor = (id: number) => {
    setSelectedAuthors((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const clearFilters = () => {
    setSearch('');
    setMinRating(0);
    setSelectedAuthors([]);
  };

  if (isLoading) return <LoadingState label="Loading travels..." />;
  if (error) return <ErrorState message="Unable to load travels right now." />;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Travels"
        title="Trips you've done"
        description={
          authenticated
            ? "Keep a journal of the trips you've taken, browse travels shared with you, and share yours with friends."
            : 'Browse public travels from the community. Log in to keep a journal of your own trips.'
        }
        className="md:items-start"
        actions={authenticated ? <Button to="/travels/create">New travel</Button> : undefined}
      />

      <FilterShell>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search travels — try 'Patagonia' or 'Argentina'"
          ariaLabel="Search travels"
        />
        <div className="mt-3.5 flex flex-wrap items-end gap-4">
          <MultiSelectFilter
            label="Authors"
            placeholder="Select authors"
            options={authorOptions}
            selectedIds={selectedAuthors}
            onToggle={toggleAuthor}
            countNoun={{ singular: 'author', plural: 'authors' }}
            emptyMessage="No authors available."
          />
          <RatingThreshold value={minRating} onChange={setMinRating} />
        </div>
      </FilterShell>

      {travels.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-brand-100 bg-white/60 px-6 py-12 text-center">
          {authenticated ? (
            <>
              <p className="text-sm text-ink-muted">You haven't added any travels yet.</p>
              <Button to="/travels/create">Create your first travel</Button>
            </>
          ) : (
            <p className="text-sm text-ink-muted">There are no public travels to show yet.</p>
          )}
        </div>
      ) : filteredTravels.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-brand-100 bg-white/60 px-6 py-12 text-center">
          <p className="text-sm text-ink-muted">No travels match these filters.</p>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-full border border-brand-100 bg-white px-4 py-2 text-sm font-semibold text-ink-strong shadow-sm transition hover:border-brand-300"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTravels.map((travel) => (
            <TravelCard key={travel.id} travel={travel} />
          ))}
        </div>
      )}
    </PageContainer>
  );
};

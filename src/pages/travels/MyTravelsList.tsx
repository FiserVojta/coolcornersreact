import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAccessibleTravels } from '../../api/travels';
import { fetchCategories } from '../../api/categories';
import { fetchTags } from '../../api/tags';
import { useAuth } from '../../auth/AuthContext';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { TravelCard } from '../../components/TravelCard';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import {
  FilterShell,
  MultiSelectFilter,
  RatingThreshold,
  SearchInput,
  SortSelect,
  type SortOption
} from '../../components/filters';
import type { TravelSummary } from '../../types/travel';

type SortKey = 'recent' | 'date_desc' | 'date_asc' | 'rating_desc' | 'rating_asc';

const SORT_OPTIONS: (SortOption & { value: SortKey })[] = [
  { value: 'recent', label: 'Most recent' },
  { value: 'date_desc', label: 'Travel date — newest' },
  { value: 'date_asc', label: 'Travel date — oldest' },
  { value: 'rating_desc', label: 'Highest rated' },
  { value: 'rating_asc', label: 'Lowest rated' }
];

/** Sort key for travel dates; travels without dates sort last in either direction. */
const travelDate = (travel: TravelSummary) => travel.startDate ?? travel.endDate ?? null;

const sortTravels = (travels: TravelSummary[], sortKey: SortKey): TravelSummary[] => {
  if (sortKey === 'recent') return travels; // Keep the API order: newest created first.
  const sorted = [...travels];
  sorted.sort((a, b) => {
    if (sortKey === 'rating_desc' || sortKey === 'rating_asc') {
      const aRating = a.rating;
      const bRating = b.rating;
      if (aRating == null && bRating == null) return 0;
      if (aRating == null) return 1; // Unrated travels go last.
      if (bRating == null) return -1;
      return sortKey === 'rating_desc' ? bRating - aRating : aRating - bRating;
    }
    const aDate = travelDate(a);
    const bDate = travelDate(b);
    if (aDate == null && bDate == null) return 0;
    if (aDate == null) return 1; // Undated travels go last.
    if (bDate == null) return -1;
    return sortKey === 'date_desc' ? bDate.localeCompare(aDate) : aDate.localeCompare(bDate);
  });
  return sorted;
};

export const MyTravelsList = () => {
  const { authenticated, email } = useAuth();
  const [search, setSearch] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [selectedAuthors, setSelectedAuthors] = useState<number[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('recent');
  const { data, isLoading, error } = useQuery({
    queryKey: ['travels', 'accessible', email ?? 'anonymous'],
    queryFn: fetchAccessibleTravels
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories', 'TRAVEL'],
    queryFn: () => fetchCategories('TRAVEL')
  });

  const tagsQuery = useQuery({
    queryKey: ['tags'],
    queryFn: fetchTags
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
      if (
        selectedCategories.length > 0 &&
        (travel.category?.id == null || !selectedCategories.includes(travel.category.id))
      ) {
        return false;
      }
      if (
        selectedTags.length > 0 &&
        !(travel.tags ?? []).some((tag) => selectedTags.includes(tag.id))
      ) {
        return false;
      }
      if (!query) return true;
      const ownerName = travel.owner?.displayName ?? travel.owner?.name ?? '';
      const haystack = `${travel.title} ${travel.location ?? ''} ${ownerName}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [travels, search, minRating, selectedAuthors, selectedCategories, selectedTags]);

  const sortedTravels = useMemo(() => sortTravels(filteredTravels, sortKey), [filteredTravels, sortKey]);

  const toggleAuthor = (id: number) => {
    setSelectedAuthors((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleCategory = (id: number) => {
    setSelectedCategories((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleTag = (id: number) => {
    setSelectedTags((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const clearFilters = () => {
    setSearch('');
    setMinRating(0);
    setSelectedAuthors([]);
    setSelectedCategories([]);
    setSelectedTags([]);
  };

  const categoryOptions = (categoriesQuery.data ?? []).map((category) => ({
    id: category.id,
    label: category.title || category.name
  }));
  const tagOptions = (tagsQuery.data ?? []).map((tag) => ({ id: tag.id, label: tag.title || tag.name }));

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
            label="Categories"
            placeholder="Select categories"
            options={categoryOptions}
            selectedIds={selectedCategories}
            onToggle={toggleCategory}
            countNoun={{ singular: 'category', plural: 'categories' }}
            emptyMessage="No categories available."
          />
          <MultiSelectFilter
            label="Tags"
            placeholder="Select tags"
            options={tagOptions}
            selectedIds={selectedTags}
            onToggle={toggleTag}
            countNoun={{ singular: 'tag', plural: 'tags' }}
            emptyMessage="No tags available."
          />
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
          <div className="ml-auto pb-0.5">
            <SortSelect
              value={sortKey}
              options={SORT_OPTIONS}
              onChange={(value) => setSortKey(value as SortKey)}
            />
          </div>
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
          {sortedTravels.map((travel) => (
            <TravelCard key={travel.id} travel={travel} />
          ))}
        </div>
      )}
    </PageContainer>
  );
};

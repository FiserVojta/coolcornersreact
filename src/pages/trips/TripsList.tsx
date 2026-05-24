import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchTrips } from '../../api/trips';
import { fetchCategories } from '../../api/categories';
import { fetchTags } from '../../api/tags';
import { fetchCurrentUser } from '../../api/users';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { TripCard } from '../../components/TripCard';
import { useAuth } from '../../auth/AuthContext';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { PaginationControls } from '../../components/ui/PaginationControls';
import {
  FilterChip,
  FilterShell,
  ListToolbar,
  MultiSelectFilter,
  RatingThreshold,
  SearchInput,
  SortSelect,
  type SortOption
} from '../../components/filters';

const PAGE_SIZE = 9;

type SortKey = 'recent' | 'highest' | 'lowest' | 'most_completed' | 'least_completed';

const SORT_OPTIONS: { key: SortKey; label: string; orderBy?: string; order?: 'ASC' | 'DESC' }[] = [
  { key: 'recent', label: 'Most recent' },
  { key: 'highest', label: 'Highest rated', orderBy: 'RATING', order: 'DESC' },
  { key: 'lowest', label: 'Lowest rated', orderBy: 'RATING', order: 'ASC' },
  { key: 'most_completed', label: 'Most completed', orderBy: 'COMPLETED_COUNT', order: 'DESC' },
  { key: 'least_completed', label: 'Least completed', orderBy: 'COMPLETED_COUNT', order: 'ASC' }
];

const SORT_SELECT_OPTIONS: SortOption[] = SORT_OPTIONS.map(({ key, label }) => ({ value: key, label }));

export const TripsList = () => {
  const { authenticated, login } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [minRating, setMinRating] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('recent');
  const [page, setPage] = useState(0);
  const safePage = Math.max(0, page);

  const sortOption = SORT_OPTIONS.find((opt) => opt.key === sortKey) ?? SORT_OPTIONS[0];

  const categoriesQuery = useQuery({
    queryKey: ['categories', 'TRIP'],
    queryFn: () => fetchCategories('TRIP')
  });

  const tagsQuery = useQuery({
    queryKey: ['tags'],
    queryFn: fetchTags
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['trips', selectedCategories, selectedTags, minRating, sortKey, safePage],
    queryFn: () =>
      fetchTrips({
        categories: selectedCategories,
        tags: selectedTags,
        minRating,
        page: safePage,
        size: PAGE_SIZE,
        orderBy: sortOption.orderBy,
        order: sortOption.order
      }),
    placeholderData: keepPreviousData
  });

  const meQuery = useQuery({
    queryKey: ['currentUser'],
    queryFn: fetchCurrentUser,
    enabled: authenticated
  });
  const currentUserId = meQuery.data?.id;
  const trips = data?.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const tags = tagsQuery.data ?? [];
  const totalItems = data?.totalItems ?? trips.length;

  const filteredTrips = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return trips;
    return trips.filter((trip) => {
      const haystack = `${trip.name ?? ''} ${trip.description ?? ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [trips, search]);

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(safePage, totalPages - 1);
  const canPrevious = currentPage > 0;
  const canNext = currentPage + 1 < totalPages;

  const categoryOptions = categories.map((category) => ({
    id: category.id,
    label: category.title || category.name
  }));
  const tagOptions = tags.map((tag) => ({ id: tag.id, label: tag.title || tag.name }));
  const selectedCategoryObjs = categoryOptions.filter((category) => selectedCategories.includes(category.id));
  const selectedTagObjs = tagOptions.filter((tag) => selectedTags.includes(tag.id));
  const hasActiveFilters =
    selectedCategories.length > 0 || selectedTags.length > 0 || minRating > 0 || search.trim().length > 0;

  const toggleCategory = (id: number) => {
    setPage(0);
    setSelectedCategories((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleTag = (id: number) => {
    setPage(0);
    setSelectedTags((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const removeCategory = (id: number) => {
    setPage(0);
    setSelectedCategories((prev) => prev.filter((item) => item !== id));
  };

  const removeTag = (id: number) => {
    setPage(0);
    setSelectedTags((prev) => prev.filter((item) => item !== id));
  };

  const handleRatingChange = (value: number) => {
    setPage(0);
    setMinRating(value);
  };

  const clearRating = () => {
    setPage(0);
    setMinRating(0);
  };

  const clearAll = () => {
    setSearch('');
    setSelectedCategories([]);
    setSelectedTags([]);
    setMinRating(0);
    setPage(0);
  };

  if (isLoading) return <LoadingState label="Loading trips..." />;
  if (error) return <ErrorState message="Unable to load trips right now." />;

  const chips = (
    <>
      {selectedCategoryObjs.map((category) => (
        <FilterChip
          key={`cat-${category.id}`}
          label={category.label}
          onRemove={() => removeCategory(category.id)}
        />
      ))}
      {selectedTagObjs.map((tag) => (
        <FilterChip key={`tag-${tag.id}`} label={tag.label} onRemove={() => removeTag(tag.id)} />
      ))}
      {minRating > 0 && (
        <FilterChip
          label={`${minRating}${minRating === 5 ? '' : '+'}`}
          prefix={<span className="text-amber-500">★</span>}
          ariaLabel={`minimum rating ${minRating}${minRating === 5 ? '' : ' or higher'}`}
          onRemove={clearRating}
        />
      )}
    </>
  );

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Trips"
        title="Plan your next wander"
        description={`Found ${totalItems} trips.`}
        className="md:items-start"
        actions={
          <>
          {authenticated ? (
            <Button
              to="/trips/create"
            >
              Create trip
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
        <SearchInput
          value={search}
          onChange={(value) => {
            setPage(0);
            setSearch(value);
          }}
          placeholder="Search trips — try 'Krumlov' or 'food'"
          ariaLabel="Search trips"
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
          <RatingThreshold value={minRating} onChange={handleRatingChange} />
        </div>
      </FilterShell>

      <ListToolbar
        chips={chips}
        hasActiveFilters={hasActiveFilters}
        onClearAll={clearAll}
        countLabel={`${filteredTrips.length} of ${totalItems} trips`}
        sortControl={
          <SortSelect
            value={sortKey}
            options={SORT_SELECT_OPTIONS}
            onChange={(value) => {
              setPage(0);
              setSortKey(value as SortKey);
            }}
          />
        }
      />

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredTrips.map((trip) => (
          <TripCard
            key={trip.id}
            trip={trip}
            done={currentUserId != null && (trip.completedByUsers?.some((u) => u.id === currentUserId) ?? false)}
          />
        ))}
      </div>

      {filteredTrips.length === 0 && (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-brand-100 bg-white/60 px-6 py-12 text-center">
          <p className="text-sm text-ink-muted">No trips match these filters.</p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="rounded-full border border-brand-100 bg-white px-4 py-2 text-sm font-semibold text-ink-strong shadow-sm transition hover:border-brand-300"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {totalItems > PAGE_SIZE && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalLabel={`Total: ${totalItems} trips`}
          previousDisabled={!canPrevious}
          nextDisabled={!canNext}
          onPrevious={() => setPage(Math.max(0, currentPage - 1))}
          onNext={() => setPage(Math.min(totalPages - 1, currentPage + 1))}
        />
      )}
    </PageContainer>
  );
};

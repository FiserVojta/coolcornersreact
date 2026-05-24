import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchCotravelList } from '../../api/cotravel';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { CotravelCard } from '../../components/CotravelCard';
import { useAuth } from '../../auth/AuthContext';
import { fetchCategories } from '../../api/categories';
import { fetchTags } from '../../api/tags';
import { fetchCurrentUser, fetchUsers } from '../../api/users';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { PaginationControls } from '../../components/ui/PaginationControls';
import {
  FilterChip,
  FilterShell,
  ListToolbar,
  MultiSelectFilter,
  SearchInput,
  SingleSelectFilter,
  SortSelect,
  type SingleSelectOption,
  type SortOption
} from '../../components/filters';

const PAGE_SIZE = 9;

type SortKey = 'soonest' | 'latest';

const SORT_OPTIONS: { key: SortKey; label: string; sortBy?: string; sortDir?: 'ASC' | 'DESC' }[] = [
  { key: 'soonest', label: 'Starting soonest', sortBy: 'START_TIME', sortDir: 'ASC' },
  { key: 'latest', label: 'Starting latest', sortBy: 'START_TIME', sortDir: 'DESC' }
];

const SORT_SELECT_OPTIONS: SortOption[] = SORT_OPTIONS.map(({ key, label }) => ({ value: key, label }));

const toStartOfDay = (date: string) => (date ? `${date}T00:00:00` : undefined);
const toEndOfDay = (date: string) => (date ? `${date}T23:59:59` : undefined);

const getUserLabel = (user: {
  displayName?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
}) =>
  user.displayName ||
  user.name ||
  [user.firstName, user.lastName].filter(Boolean).join(' ') ||
  user.username ||
  'Traveler';

const formatDateChip = (value: string) => {
  if (!value) return '';
  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return value;
  }
};

export const CotravelList = () => {
  const { authenticated, login } = useAuth();
  const [search, setSearch] = useState('');
  const [startsFrom, setStartsFrom] = useState('');
  const [startsUntil, setStartsUntil] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('soonest');
  const [page, setPage] = useState(0);
  const safePage = Math.max(0, page);

  const sortOption = SORT_OPTIONS.find((opt) => opt.key === sortKey) ?? SORT_OPTIONS[0];

  const categoriesQuery = useQuery({
    queryKey: ['categories', 'COTRAVEL'],
    queryFn: () => fetchCategories('COTRAVEL')
  });

  const tagsQuery = useQuery({
    queryKey: ['tags'],
    queryFn: fetchTags
  });

  const usersQuery = useQuery({
    queryKey: ['users', 'cotravel-filter'],
    queryFn: () => fetchUsers({ size: 100 })
  });

  const meQuery = useQuery({
    queryKey: ['currentUser'],
    queryFn: fetchCurrentUser,
    enabled: authenticated
  });
  const currentUserId = meQuery.data?.id;

  const queryFilters = useMemo(() => {
    const createdById = createdBy ? Number(createdBy) : undefined;
    return {
      search: search.trim() || undefined,
      startsFrom: toStartOfDay(startsFrom),
      startsUntil: toEndOfDay(startsUntil),
      createdBy: Number.isFinite(createdById ?? NaN) ? createdById : undefined,
      categories: selectedCategories,
      tags: selectedTags,
      page: safePage,
      size: PAGE_SIZE,
      sortBy: sortOption.sortBy,
      sortDir: sortOption.sortDir
    };
  }, [search, startsFrom, startsUntil, createdBy, selectedCategories, selectedTags, safePage, sortOption]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['cotravel', queryFilters],
    queryFn: () => fetchCotravelList(queryFilters),
    placeholderData: keepPreviousData
  });

  const plans = data?.data ?? [];
  const totalItems = data?.totalItems ?? plans.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(safePage, totalPages - 1);
  const canPrevious = currentPage > 0;
  const canNext = currentPage + 1 < totalPages;

  if (isLoading) return <LoadingState label="Loading co-travel plans..." />;
  if (error) return <ErrorState message="Unable to load co-travel plans right now." />;

  const categoryOptions = (categoriesQuery.data ?? []).map((category) => ({
    id: category.id,
    label: category.title || category.name
  }));
  const tagOptions = (tagsQuery.data ?? []).map((tag) => ({ id: tag.id, label: tag.title || tag.name }));
  const userOptions: SingleSelectOption[] = (usersQuery.data?.data ?? []).map((user) => ({
    value: String(user.id),
    label: getUserLabel(user)
  }));

  const selectedCategoryObjs = categoryOptions.filter((category) => selectedCategories.includes(category.id));
  const selectedTagObjs = tagOptions.filter((tag) => selectedTags.includes(tag.id));
  const selectedUser = userOptions.find((opt) => opt.value === createdBy);
  const hasActiveFilters =
    search.trim().length > 0 ||
    startsFrom !== '' ||
    startsUntil !== '' ||
    createdBy !== '' ||
    selectedCategories.length > 0 ||
    selectedTags.length > 0;

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

  const clearAll = () => {
    setSearch('');
    setStartsFrom('');
    setStartsUntil('');
    setCreatedBy('');
    setSelectedCategories([]);
    setSelectedTags([]);
    setPage(0);
  };

  const chips = (
    <>
      {startsFrom && (
        <FilterChip
          key="from"
          label={`From ${formatDateChip(startsFrom)}`}
          ariaLabel={`starts from ${startsFrom}`}
          onRemove={() => {
            setPage(0);
            setStartsFrom('');
          }}
        />
      )}
      {startsUntil && (
        <FilterChip
          key="until"
          label={`Until ${formatDateChip(startsUntil)}`}
          ariaLabel={`starts until ${startsUntil}`}
          onRemove={() => {
            setPage(0);
            setStartsUntil('');
          }}
        />
      )}
      {selectedUser && (
        <FilterChip
          key="creator"
          label={`By ${selectedUser.label}`}
          ariaLabel={`created by ${selectedUser.label}`}
          onRemove={() => {
            setPage(0);
            setCreatedBy('');
          }}
        />
      )}
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
    </>
  );

  return (
    <PageContainer>
      <PageHeader
        eyebrow="CoTravel"
        title="Join community-led trips"
        description={`Found ${totalItems} co-travel plans.`}
        actions={
          <>
          {authenticated ? (
            <Button to="/cotravel/create">
              Create plan
            </Button>
          ) : (
            <Button onClick={() => login()} variant="secondary">
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
          placeholder="Search plans by name or description"
          ariaLabel="Search plans"
        />
        <div className="mt-3.5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="flex min-w-0 flex-col">
            <span className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.2em] text-ink-subtle">
              Starts from
            </span>
            <input
              type="date"
              aria-label="Starts from"
              value={startsFrom}
              onChange={(event) => {
                setPage(0);
                setStartsFrom(event.target.value);
              }}
              className="w-full rounded-full border border-brand-100 bg-white px-3 py-1.5 text-[13px] font-medium text-ink-strong shadow-sm outline-none focus:border-brand-300"
            />
          </label>
          <label className="flex min-w-0 flex-col">
            <span className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.2em] text-ink-subtle">
              Starts until
            </span>
            <input
              type="date"
              aria-label="Starts until"
              value={startsUntil}
              onChange={(event) => {
                setPage(0);
                setStartsUntil(event.target.value);
              }}
              className="w-full rounded-full border border-brand-100 bg-white px-3 py-1.5 text-[13px] font-medium text-ink-strong shadow-sm outline-none focus:border-brand-300"
            />
          </label>
          <SingleSelectFilter
            label="Created by"
            placeholder="Any organizer"
            options={userOptions}
            value={createdBy}
            onChange={(value) => {
              setPage(0);
              setCreatedBy(value);
            }}
            ariaLabel="Created By"
            emptyMessage="No organizers available."
          />
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
        </div>
      </FilterShell>

      <ListToolbar
        chips={chips}
        hasActiveFilters={hasActiveFilters}
        onClearAll={clearAll}
        countLabel={`${plans.length} of ${totalItems} plans`}
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
        {plans.map((wander) => (
          <CotravelCard
            key={wander.id}
            cotravel={wander}
            joined={currentUserId != null && (wander.wandererIds?.includes(currentUserId) ?? false)}
          />
        ))}
      </div>

      {plans.length === 0 && (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-brand-100 bg-white/60 px-6 py-12 text-center">
          <p className="text-sm text-ink-muted">No co-travel plans match these filters.</p>
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
          totalLabel={`Total: ${totalItems} plans`}
          previousDisabled={!canPrevious}
          nextDisabled={!canNext}
          onPrevious={() => setPage(Math.max(0, currentPage - 1))}
          onNext={() => setPage(Math.min(totalPages - 1, currentPage + 1))}
        />
      )}
    </PageContainer>
  );
};

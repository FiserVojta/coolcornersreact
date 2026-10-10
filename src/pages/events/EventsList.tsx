import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchEvents } from '../../api/events';
import { fetchCategories } from '../../api/categories';
import { fetchUsers } from '../../api/users';
import { getUserLabel } from '../../lib/userLabel';
import { formatDateChip, toLocalEndOfDayIso, toLocalStartOfDayIso } from '../../lib/dateFilter';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { EventCard } from '../../components/EventCard';
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

export const EventsList = () => {
  const { authenticated, login } = useAuth();
  const [search, setSearch] = useState('');
  const [startsFrom, setStartsFrom] = useState('');
  const [startsUntil, setStartsUntil] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('soonest');
  const [page, setPage] = useState(0);
  const safePage = Math.max(0, page);

  const sortOption = SORT_OPTIONS.find((opt) => opt.key === sortKey) ?? SORT_OPTIONS[0];

  const categoriesQuery = useQuery({
    queryKey: ['categories', 'EVENT'],
    queryFn: () => fetchCategories('EVENT')
  });

  const usersQuery = useQuery({
    queryKey: ['users', 'events-filter'],
    queryFn: () => fetchUsers({ size: 100 })
  });

  const queryFilters = useMemo(
    () => ({
      search: search.trim() || undefined,
      startsFrom: toLocalStartOfDayIso(startsFrom),
      startsUntil: toLocalEndOfDayIso(startsUntil),
      createdBy: createdBy || undefined,
      categories: selectedCategories,
      page: safePage,
      size: PAGE_SIZE,
      sortBy: sortOption.sortBy,
      sortDir: sortOption.sortDir
    }),
    [search, startsFrom, startsUntil, createdBy, selectedCategories, safePage, sortOption]
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ['events', queryFilters],
    queryFn: () => fetchEvents(queryFilters),
    placeholderData: keepPreviousData
  });

  const events = data?.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const totalItems = data?.totalItems ?? events.length;

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(safePage, totalPages - 1);
  const canPrevious = currentPage > 0;
  const canNext = currentPage + 1 < totalPages;

  const categoryOptions = categories.map((category) => ({
    id: category.id,
    label: category.title || category.name
  }));
  const userOptions: SingleSelectOption[] = (usersQuery.data?.data ?? [])
    .filter((user) => Boolean(user.email))
    .map((user) => ({
      value: user.email as string,
      label: getUserLabel(user)
    }));
  const selectedCategoryObjs = categoryOptions.filter((category) => selectedCategories.includes(category.id));
  const selectedUser = userOptions.find((opt) => opt.value === createdBy);
  const hasActiveFilters =
    search.trim().length > 0 ||
    startsFrom !== '' ||
    startsUntil !== '' ||
    createdBy !== '' ||
    selectedCategories.length > 0;

  const toggleCategory = (id: number) => {
    setPage(0);
    setSelectedCategories((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const removeCategory = (id: number) => {
    setPage(0);
    setSelectedCategories((prev) => prev.filter((item) => item !== id));
  };

  const clearAll = () => {
    setSearch('');
    setStartsFrom('');
    setStartsUntil('');
    setCreatedBy('');
    setSelectedCategories([]);
    setPage(0);
  };

  if (isLoading) return <LoadingState label="Loading events..." />;
  if (error) return <ErrorState message="Unable to load events right now." />;

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
        <FilterChip key={`cat-${category.id}`} label={category.label} onRemove={() => removeCategory(category.id)} />
      ))}
    </>
  );

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Events"
        title="Discover what's happening"
        description={`Found ${totalItems} events.`}
        className="md:items-start"
        actions={
          <>
          {authenticated ? (
            <Button
              to="/events/create"
            >
              Create event
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
          placeholder="Search events by name or description"
          ariaLabel="Search events"
        />
        <div className="mt-3.5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
        </div>
      </FilterShell>

      <ListToolbar
        chips={chips}
        hasActiveFilters={hasActiveFilters}
        onClearAll={clearAll}
        countLabel={`${events.length} of ${totalItems} events`}
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
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>

      {events.length === 0 && (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-brand-100 bg-white/60 px-6 py-12 text-center">
          <p className="text-sm text-ink-muted">No events match these filters.</p>
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
          totalLabel={`Total: ${totalItems} events`}
          previousDisabled={!canPrevious}
          nextDisabled={!canNext}
          onPrevious={() => setPage(Math.max(0, currentPage - 1))}
          onNext={() => setPage(Math.min(totalPages - 1, currentPage + 1))}
        />
      )}
    </PageContainer>
  );
};

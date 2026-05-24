import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchUsers } from '../../api/users';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { UserCard } from '../../components/UserCard';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import {
  FilterChip,
  FilterShell,
  ListToolbar,
  RatingThreshold,
  SearchInput,
  SortSelect,
  type SortOption
} from '../../components/filters';

type SortKey = 'recent' | 'most_trips' | 'most_created' | 'most_joined';

const SORT_OPTIONS: { key: SortKey; label: string; sortBy?: string; sortDir?: 'ASC' | 'DESC' }[] = [
  { key: 'recent', label: 'Most recent' },
  { key: 'most_trips', label: 'Most trips completed', sortBy: 'TRIPS_COMPLETED', sortDir: 'DESC' },
  { key: 'most_created', label: 'Most plans created', sortBy: 'COTRAVELS_CREATED', sortDir: 'DESC' },
  { key: 'most_joined', label: 'Most plans joined', sortBy: 'COTRAVELS_PARTICIPATED', sortDir: 'DESC' }
];

const SORT_SELECT_OPTIONS: SortOption[] = SORT_OPTIONS.map(({ key, label }) => ({ value: key, label }));

export const UsersList = () => {
  const [search, setSearch] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('recent');

  const sortOption = SORT_OPTIONS.find((opt) => opt.key === sortKey) ?? SORT_OPTIONS[0];

  const { data, isLoading, error } = useQuery({
    queryKey: ['users', search, minRating, sortKey],
    queryFn: () =>
      fetchUsers({
        search: search.trim() || undefined,
        minRating: minRating || undefined,
        sortBy: sortOption.sortBy,
        sortDir: sortOption.sortDir
      }),
    placeholderData: keepPreviousData
  });

  const users = data?.data ?? [];
  const totalItems = data?.totalItems ?? users.length;
  const hasActiveFilters = search.trim().length > 0 || minRating > 0;

  if (isLoading) return <LoadingState label="Loading users..." />;
  if (error) return <ErrorState message="Unable to load users right now." />;

  const clearAll = () => {
    setSearch('');
    setMinRating(0);
  };

  const chips = minRating > 0 ? (
    <FilterChip
      key="rating"
      label={`${minRating}${minRating === 5 ? '' : '+'}`}
      prefix={<span className="text-amber-500">★</span>}
      ariaLabel={`minimum rating ${minRating}${minRating === 5 ? '' : ' or higher'}`}
      onRemove={() => setMinRating(0)}
    />
  ) : null;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Users"
        title="Community members"
        description={`Found ${totalItems} users.`}
      />

      <FilterShell>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name or username"
          ariaLabel="Search users"
        />
        <div className="mt-3.5 flex flex-wrap items-end gap-4">
          <RatingThreshold value={minRating} onChange={setMinRating} />
        </div>
      </FilterShell>

      <ListToolbar
        chips={chips}
        hasActiveFilters={hasActiveFilters}
        onClearAll={clearAll}
        countLabel={`${users.length} of ${totalItems} users`}
        sortControl={
          <SortSelect
            value={sortKey}
            options={SORT_SELECT_OPTIONS}
            onChange={(value) => setSortKey(value as SortKey)}
          />
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {users.map((user) => (
          <UserCard key={user.id} user={user} />
        ))}
      </div>

      {users.length === 0 && (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-brand-100 bg-white/60 px-6 py-12 text-center">
          <p className="text-sm text-ink-muted">No users match these filters.</p>
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
    </PageContainer>
  );
};

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchUsers } from '../../api/users';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { UserCard } from '../../components/UserCard';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { TextInput } from '../../components/ui/FormField';

type RatingFilter = '' | '1' | '2' | '3' | '4' | '5';

export const UsersList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('');
  const { data, isLoading, error } = useQuery({
    queryKey: ['users', searchTerm],
    queryFn: () => fetchUsers({ search: searchTerm.trim() || undefined })
  });

  const filteredUsers = useMemo(() => {
    const users = data?.data ?? [];
    if (!ratingFilter) return users;
    const minRating = Number(ratingFilter);
    return users.filter((user) => (user.rating ?? 0) >= minRating);
  }, [data?.data, ratingFilter]);

  if (isLoading) return <LoadingState label="Loading users..." />;
  if (error) return <ErrorState message="Unable to load users right now." />;

  const resetFilters = () => {
    setSearchTerm('');
    setRatingFilter('');
  };

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Users"
        title="Community members"
        description={`Found ${filteredUsers.length} users.`}
      />

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[220px]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Search</p>
            <TextInput
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="mt-2"
              placeholder="Search by name..."
            />
          </div>
          <div className="flex-1 min-w-[220px]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Rating</p>
            <select
              aria-label="Filter by rating"
              value={ratingFilter}
              onChange={(event) => setRatingFilter(event.target.value as RatingFilter)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-brand-400"
            >
              <option value="">Any rating</option>
              <option value="1">1+ rating</option>
              <option value="2">2+ rating</option>
              <option value="3">3+ rating</option>
              <option value="4">4+ rating</option>
              <option value="5">5 rating</option>
            </select>
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-400"
          >
            Clear filters
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
          <p>Search by name or narrow the list by rating.</p>
        </div>
      </section>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredUsers.map((user) => (
          <UserCard key={user.id} user={user} />
        ))}
      </div>
    </PageContainer>
  );
};

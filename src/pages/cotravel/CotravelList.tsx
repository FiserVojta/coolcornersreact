import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCotravelList } from '../../api/cotravel';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { CotravelCard } from '../../components/CotravelCard';
import { useAuth } from '../../auth/AuthContext';
import { fetchCategories } from '../../api/categories';
import { fetchTags } from '../../api/tags';
import { fetchUsers } from '../../api/users';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { PaginationControls } from '../../components/ui/PaginationControls';
import { TextInput } from '../../components/ui/FormField';
import { SurfaceCard } from '../../components/ui/SurfaceCard';

type FilterDraft = {
  startsFrom: string;
  startsUntil: string;
  createdBy: string;
  categories: number[];
  tags: number[];
};

const emptyFilters: FilterDraft = {
  startsFrom: '',
  startsUntil: '',
  createdBy: '',
  categories: [],
  tags: []
};

const toStartOfDay = (date: string) => (date ? `${date}T00:00:00` : undefined);
const toEndOfDay = (date: string) => (date ? `${date}T23:59:59` : undefined);
const toggleId = (list: number[], id: number) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);
const getUserLabel = (user: { displayName?: string; name?: string; firstName?: string; lastName?: string; email: string }) =>
  user.displayName || user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;

export const CotravelList = () => {
  const { authenticated, login } = useAuth();
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isTagsOpen, setIsTagsOpen] = useState(false);
  const [draft, setDraft] = useState<FilterDraft>(emptyFilters);
  const [filters, setFilters] = useState<FilterDraft>(emptyFilters);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(9);
  const safePage = Math.max(0, page);

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

  const queryFilters = useMemo(() => {
    const createdBy = filters.createdBy ? Number(filters.createdBy) : undefined;
    return {
      startsFrom: toStartOfDay(filters.startsFrom),
      startsUntil: toEndOfDay(filters.startsUntil),
      createdBy: Number.isFinite(createdBy ?? NaN) ? createdBy : undefined,
      categories: filters.categories,
      tags: filters.tags,
      page: safePage,
      size: pageSize
    };
  }, [filters, pageSize, safePage]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['cotravel', queryFilters],
    queryFn: () => fetchCotravelList(queryFilters)
  });

  const plans = data?.data ?? [];
  const totalItems = data?.totalItems ?? plans.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(safePage, totalPages - 1);
  const canPrevious = currentPage > 0;
  const canNext = currentPage + 1 < totalPages;

  if (isLoading) return <LoadingState label="Loading co-travel plans..." />;
  if (error) return <ErrorState message="Unable to load co-travel plans right now." />;

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
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
            React port
          </span>
          </>
        }
      />

      <SurfaceCard className="mt-6 border border-slate-200 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Starts From
            <TextInput
              type="date"
              value={draft.startsFrom}
              onChange={(event) => setDraft((prev) => ({ ...prev, startsFrom: event.target.value }))}
              className="font-medium text-slate-900"
            />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Starts Until
            <TextInput
              type="date"
              value={draft.startsUntil}
              onChange={(event) => setDraft((prev) => ({ ...prev, startsUntil: event.target.value }))}
              className="font-medium text-slate-900"
            />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Created By
            <select
              value={draft.createdBy}
              onChange={(event) => setDraft((prev) => ({ ...prev, createdBy: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm outline-none focus:border-brand-400"
            >
              <option value="">Any organizer</option>
              {(usersQuery.data?.data ?? []).map((user) => (
                <option key={user.id} value={String(user.id)}>
                  {getUserLabel(user)}
                </option>
                ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="relative rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Categories</p>
            <button
              type="button"
              aria-expanded={isCategoriesOpen}
              onClick={() => setIsCategoriesOpen((prev) => !prev)}
              className="mt-3 flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700 shadow-sm"
            >
              <span className="truncate pr-3">
                {draft.categories.length
                  ? (categoriesQuery.data ?? [])
                      .filter((category) => draft.categories.includes(category.id))
                      .map((category) => category.title || category.name)
                      .join(', ')
                  : 'Select categories'}
              </span>
              <span className={`text-xs text-slate-500 transition ${isCategoriesOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {isCategoriesOpen && (
              <div className="absolute left-4 right-4 z-20 mt-2 max-h-60 overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                {(categoriesQuery.data ?? []).map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    aria-pressed={draft.categories.includes(category.id)}
                    onClick={() =>
                      setDraft((prev) => ({ ...prev, categories: toggleId(prev.categories, category.id) }))
                    }
                    className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition ${
                      draft.categories.includes(category.id)
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {category.title || category.name}
                  </button>
                ))}
                {!categoriesQuery.isLoading && !(categoriesQuery.data ?? []).length && (
                  <p className="px-3 py-2 text-xs text-slate-500">No categories available.</p>
                )}
              </div>
            )}
          </div>
          <div className="relative rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tags</p>
            <button
              type="button"
              aria-expanded={isTagsOpen}
              onClick={() => setIsTagsOpen((prev) => !prev)}
              className="mt-3 flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700 shadow-sm"
            >
              <span className="truncate pr-3">
                {draft.tags.length
                  ? (tagsQuery.data ?? [])
                      .filter((tag) => draft.tags.includes(tag.id))
                      .map((tag) => tag.title || tag.name)
                      .join(', ')
                  : 'Select tags'}
              </span>
              <span className={`text-xs text-slate-500 transition ${isTagsOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {isTagsOpen && (
              <div className="absolute left-4 right-4 z-20 mt-2 max-h-60 overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                {(tagsQuery.data ?? []).map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    aria-pressed={draft.tags.includes(tag.id)}
                    onClick={() => setDraft((prev) => ({ ...prev, tags: toggleId(prev.tags, tag.id) }))}
                    className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition ${
                      draft.tags.includes(tag.id)
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {tag.title || tag.name}
                  </button>
                ))}
                {!tagsQuery.isLoading && !(tagsQuery.data ?? []).length && (
                  <p className="px-3 py-2 text-xs text-slate-500">No tags available.</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => {
                setPage(0);
                setIsCategoriesOpen(false);
                setIsTagsOpen(false);
                setFilters(draft);
              }}
            >
              Apply filters
            </Button>
            <Button
              onClick={() => {
                setIsCategoriesOpen(false);
                setIsTagsOpen(false);
                setDraft(emptyFilters);
                setFilters(emptyFilters);
                setPage(0);
              }}
              variant="secondary"
              size="sm"
            >
              Reset
            </Button>
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Page size
            <select
              value={pageSize}
              onChange={(event) => {
                setPage(0);
                setPageSize(Number(event.target.value));
              }}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700 shadow-sm"
            >
              {[6, 9, 12, 18].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>
      </SurfaceCard>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((wander) => (
          <CotravelCard key={wander.id} cotravel={wander} />
        ))}
      </div>

      {totalItems > pageSize && (
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

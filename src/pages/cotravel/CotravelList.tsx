import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCotravelList } from '../../api/cotravel';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { CotravelCard } from '../../components/CotravelCard';
import { useAuth } from '../../auth/KeycloakProvider';
import { Link } from 'react-router-dom';
import { fetchCategories } from '../../api/categories';
import { fetchTags } from '../../api/tags';

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

export const CotravelList = () => {
  const { authenticated, login } = useAuth();
  const [draft, setDraft] = useState<FilterDraft>(emptyFilters);
  const [filters, setFilters] = useState<FilterDraft>(emptyFilters);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(9);

  const categoriesQuery = useQuery({
    queryKey: ['categories', 'COTRAVEL'],
    queryFn: () => fetchCategories('COTRAVEL')
  });

  const tagsQuery = useQuery({
    queryKey: ['tags'],
    queryFn: fetchTags
  });

  const queryFilters = useMemo(() => {
    const createdBy = filters.createdBy ? Number(filters.createdBy) : undefined;
    return {
      startsFrom: toStartOfDay(filters.startsFrom),
      startsUntil: toEndOfDay(filters.startsUntil),
      createdBy: Number.isFinite(createdBy ?? NaN) ? createdBy : undefined,
      categories: filters.categories,
      tags: filters.tags,
      page,
      size: pageSize
    };
  }, [filters, page, pageSize]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['cotravel', queryFilters],
    queryFn: () => fetchCotravelList(queryFilters)
  });

  const plans = data?.data ?? [];
  const totalItems = data?.totalItems ?? plans.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const canPrevious = page > 0;
  const canNext = page + 1 < totalPages;

  useEffect(() => {
    setPage(0);
  }, [filters, pageSize]);

  useEffect(() => {
    if (page > totalPages - 1) setPage(totalPages - 1);
  }, [page, totalPages]);

  if (isLoading) return <LoadingState label="Loading co-travel plans..." />;
  if (error) return <ErrorState message="Unable to load co-travel plans right now." />;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">CoTravel</p>
          <h1 className="text-3xl font-bold text-slate-900">Join community-led trips</h1>
          <p className="mt-2 text-slate-600">Found {totalItems} co-travel plans.</p>
        </div>
        <div className="flex items-center gap-3">
          {authenticated ? (
            <Link
              to="/cotravel/create"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Create plan
            </Link>
          ) : (
            <button
              onClick={() => login()}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-400"
            >
              Login to create
            </button>
          )}
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
            React port
          </span>
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Filters</p>
            <p className="text-sm text-slate-600">Refine the wander list by time, author, category, or tags.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilters(draft)}
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Apply filters
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(emptyFilters);
                setFilters(emptyFilters);
              }}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Starts From
            <input
              type="date"
              value={draft.startsFrom}
              onChange={(event) => setDraft((prev) => ({ ...prev, startsFrom: event.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 focus:border-slate-400 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Starts Until
            <input
              type="date"
              value={draft.startsUntil}
              onChange={(event) => setDraft((prev) => ({ ...prev, startsUntil: event.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 focus:border-slate-400 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Created By (User ID)
            <input
              type="number"
              min="1"
              inputMode="numeric"
              value={draft.createdBy}
              onChange={(event) => setDraft((prev) => ({ ...prev, createdBy: event.target.value }))}
              placeholder="e.g. 42"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 focus:border-slate-400 focus:outline-none"
            />
          </label>
          <div className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Active Filters
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
              {filters.categories.length + filters.tags.length + Number(!!filters.createdBy) + Number(!!filters.startsFrom) + Number(!!filters.startsUntil) || 0}{' '}
              applied
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
          <p>Filter by time, author, categories, or tags.</p>
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Page size
            <select
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
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

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Categories</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(categoriesQuery.data ?? []).map((category) => (
                <label key={category.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={draft.categories.includes(category.id)}
                    onChange={() =>
                      setDraft((prev) => ({ ...prev, categories: toggleId(prev.categories, category.id) }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                  />
                  <span>{category.title || category.name}</span>
                </label>
              ))}
              {!categoriesQuery.isLoading && !(categoriesQuery.data ?? []).length && (
                <p className="text-xs text-slate-500">No categories available.</p>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tags</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(tagsQuery.data ?? []).map((tag) => (
                <label key={tag.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={draft.tags.includes(tag.id)}
                    onChange={() => setDraft((prev) => ({ ...prev, tags: toggleId(prev.tags, tag.id) }))}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                  />
                  <span>{tag.title || tag.name}</span>
                </label>
              ))}
              {!tagsQuery.isLoading && !(tagsQuery.data ?? []).length && (
                <p className="text-xs text-slate-500">No tags available.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((wander) => (
          <CotravelCard key={wander.id} cotravel={wander} />
        ))}
      </div>

      {totalItems > pageSize && (
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            disabled={!canPrevious}
            onClick={() => setPage((prev) => Math.max(0, prev - 1))}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <span className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Page {page + 1} of {totalPages}
          </span>
          <button
            type="button"
            disabled={!canNext}
            onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
          <span className="text-sm text-slate-500">Total: {totalItems} plans</span>
        </div>
      )}
    </main>
  );
};

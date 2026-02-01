import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTrips } from '../../api/trips';
import { fetchCategories } from '../../api/categories';
import { fetchTags } from '../../api/tags';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { TripCard } from '../../components/TripCard';
import { useAuth } from '../../auth/KeycloakProvider';
import { Link } from 'react-router-dom';

export const TripsList = () => {
  const { authenticated, login } = useAuth();
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(9);

  const categoriesQuery = useQuery({
    queryKey: ['categories', 'TRIP'],
    queryFn: () => fetchCategories('TRIP')
  });

  const tagsQuery = useQuery({
    queryKey: ['tags'],
    queryFn: fetchTags
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['trips', selectedCategories, selectedTags, page, pageSize],
    queryFn: () => fetchTrips({ categories: selectedCategories, tags: selectedTags, page, size: pageSize })
  });
  const trips = data?.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const tags = tagsQuery.data ?? [];
  const totalItems = data?.totalItems ?? trips.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const canPrevious = page > 0;
  const canNext = page + 1 < totalPages;

  const toggleCategory = (id: number) => {
    setSelectedCategories((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleTag = (id: number) => {
    setSelectedTags((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const resetFilters = () => {
    setSelectedCategories([]);
    setSelectedTags([]);
    setPage(0);
  };

  useEffect(() => {
    setPage(0);
  }, [selectedCategories, selectedTags, pageSize]);

  useEffect(() => {
    if (page > totalPages - 1) setPage(totalPages - 1);
  }, [page, totalPages]);

  if (isLoading) return <LoadingState label="Loading trips..." />;
  if (error) return <ErrorState message="Unable to load trips right now." />;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Trips</p>
          <h1 className="text-3xl font-bold text-slate-900">Plan your next wander</h1>
          <p className="mt-2 text-slate-600">Found {totalItems} trips.</p>
        </div>
        <div className="flex items-center gap-3">
          {authenticated ? (
            <Link
              to="/trips/create"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Create trip
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

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[220px]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Categories</p>
            <details className="group mt-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
              <summary className="cursor-pointer list-none font-semibold text-slate-700">
                {selectedCategories.length
                  ? categories
                      .filter((category) => selectedCategories.includes(category.id))
                      .map((category) => category.title || category.name)
                      .join(', ')
                  : 'Select categories'}
              </summary>
              <div className="mt-3 max-h-48 space-y-2 overflow-auto pb-1 pr-1">
                {categories.map((category) => (
                  <label key={category.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                      checked={selectedCategories.includes(category.id)}
                      onChange={() => toggleCategory(category.id)}
                    />
                    <span>{category.title || category.name}</span>
                  </label>
                ))}
                {!categories.length && <p className="text-xs text-slate-500">No categories available.</p>}
              </div>
            </details>
          </div>
          <div className="flex-1 min-w-[220px]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tags</p>
            <details className="group mt-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
              <summary className="cursor-pointer list-none font-semibold text-slate-700">
                {selectedTags.length
                  ? tags
                      .filter((tag) => selectedTags.includes(tag.id))
                      .map((tag) => tag.title || tag.name)
                      .join(', ')
                  : 'Select tags'}
              </summary>
              <div className="mt-3 max-h-48 space-y-2 overflow-auto pb-1 pr-1">
                {tags.map((tag) => (
                  <label key={tag.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                      checked={selectedTags.includes(tag.id)}
                      onChange={() => toggleTag(tag.id)}
                    />
                    <span>{tag.title || tag.name}</span>
                  </label>
                ))}
                {!tags.length && <p className="text-xs text-slate-500">No tags available.</p>}
              </div>
            </details>
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
          <p>Select multiple categories or tags to narrow the list.</p>
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
      </section>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {trips.map((trip) => (
          <TripCard key={trip.id} trip={trip} />
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
          <span className="text-sm text-slate-500">Total: {totalItems} trips</span>
        </div>
      )}
    </main>
  );
};

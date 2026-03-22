import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTrips } from '../../api/trips';
import { fetchCategories } from '../../api/categories';
import { fetchTags } from '../../api/tags';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { TripCard } from '../../components/TripCard';
import { useAuth } from '../../auth/AuthContext';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { PaginationControls } from '../../components/ui/PaginationControls';

export const TripsList = () => {
  const { authenticated, login } = useAuth();
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(9);
  const safePage = Math.max(0, page);

  const categoriesQuery = useQuery({
    queryKey: ['categories', 'TRIP'],
    queryFn: () => fetchCategories('TRIP')
  });

  const tagsQuery = useQuery({
    queryKey: ['tags'],
    queryFn: fetchTags
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['trips', selectedCategories, selectedTags, safePage, pageSize],
    queryFn: () => fetchTrips({ categories: selectedCategories, tags: selectedTags, page: safePage, size: pageSize })
  });
  const trips = data?.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const tags = tagsQuery.data ?? [];
  const totalItems = data?.totalItems ?? trips.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(safePage, totalPages - 1);
  const canPrevious = currentPage > 0;
  const canNext = currentPage + 1 < totalPages;

  const toggleCategory = (id: number) => {
    setPage(0);
    setSelectedCategories((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleTag = (id: number) => {
    setPage(0);
    setSelectedTags((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const resetFilters = () => {
    setSelectedCategories([]);
    setSelectedTags([]);
    setPage(0);
  };

  if (isLoading) return <LoadingState label="Loading trips..." />;
  if (error) return <ErrorState message="Unable to load trips right now." />;

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
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
            React port
          </span>
          </>
        }
      />

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
      </section>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {trips.map((trip) => (
          <TripCard key={trip.id} trip={trip} />
        ))}
      </div>

      {totalItems > pageSize && (
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

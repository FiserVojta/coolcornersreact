import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchEvents } from '../../api/events';
import { fetchCategories } from '../../api/categories';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { EventCard } from '../../components/EventCard';
import { useAuth } from '../../auth/AuthContext';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { PaginationControls } from '../../components/ui/PaginationControls';

export const EventsList = () => {
  const { authenticated, login } = useAuth();
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(9);
  const safePage = Math.max(0, page);

  const categoriesQuery = useQuery({
    queryKey: ['categories', 'EVENT'],
    queryFn: () => fetchCategories('EVENT')
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['events', selectedCategories, safePage, pageSize],
    queryFn: () => fetchEvents({ categories: selectedCategories, page: safePage, size: pageSize })
  });
  const events = data?.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const totalItems = data?.totalItems ?? events.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(safePage, totalPages - 1);
  const canPrevious = currentPage > 0;
  const canNext = currentPage + 1 < totalPages;

  const toggleCategory = (id: number) => {
    setPage(0);
    setSelectedCategories((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const resetFilters = () => {
    setIsCategoriesOpen(false);
    setSelectedCategories([]);
    setPage(0);
  };

  if (isLoading) return <LoadingState label="Loading events..." />;
  if (error) return <ErrorState message="Unable to load events right now." />;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Events"
        title="Discover what’s happening"
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
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
            React port
          </span>
          </>
        }
      />

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div className="relative flex-1 min-w-[220px]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Categories</p>
            <button
              type="button"
              aria-expanded={isCategoriesOpen}
              onClick={() => setIsCategoriesOpen((prev) => !prev)}
              className="mt-2 flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700 shadow-sm"
            >
              <span className="truncate pr-3">
                {selectedCategories.length
                  ? categories
                      .filter((category) => selectedCategories.includes(category.id))
                      .map((category) => category.title || category.name)
                      .join(', ')
                  : 'Select categories'}
              </span>
              <span className={`text-xs text-slate-500 transition ${isCategoriesOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {isCategoriesOpen && (
              <div className="absolute left-0 right-0 z-20 mt-2 max-h-60 overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    aria-pressed={selectedCategories.includes(category.id)}
                    onClick={() => toggleCategory(category.id)}
                    className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition ${
                      selectedCategories.includes(category.id)
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {category.title || category.name}
                  </button>
                ))}
                {!categories.length && <p className="text-xs text-slate-500">No categories available.</p>}
              </div>
            )}
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
          <p>Select categories to narrow the list.</p>
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
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>

      {totalItems > pageSize && (
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

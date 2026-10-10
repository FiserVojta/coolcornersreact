import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { isAxiosError } from 'axios';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAdminTags, mergeTag, setTagStatus } from '../../api/adminTags';
import { useAuth } from '../../auth/AuthContext';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { TagInput } from '../../components/TagInput';
import { FilterShell, SearchInput } from '../../components/filters';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { PaginationControls } from '../../components/ui/PaginationControls';
import type { Tag } from '../../types/place';
import type { TagAdminResponse, TagStatus } from '../../types/tag';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 250;
const ADMIN_TAGS_KEY = ['admin', 'tags'] as const;

const STATUS_OPTIONS: { value: TagStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'HIDDEN', label: 'Hidden' }
];

const useDebouncedValue = <T,>(value: T, delayMs: number) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
};

const errorMessage = (error: unknown, fallback: string) => {
  if (isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: unknown } | undefined)?.detail;
    if (typeof detail === 'string' && detail.trim()) return detail;
  }
  return fallback;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const AdminTags = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TagStatus | ''>('');
  const [page, setPage] = useState(0);
  const [mergeSource, setMergeSource] = useState<TagAdminResponse | null>(null);

  const q = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);

  // Reset paging whenever the effective filters change.
  const [filterKey, setFilterKey] = useState(`${q}|${status}`);
  if (filterKey !== `${q}|${status}`) {
    setFilterKey(`${q}|${status}`);
    setPage(0);
  }

  const tagsQuery = useQuery({
    queryKey: [...ADMIN_TAGS_KEY, { q, status, page, size: PAGE_SIZE }],
    queryFn: () => fetchAdminTags({ q, status, page, size: PAGE_SIZE }),
    enabled: isAdmin,
    placeholderData: keepPreviousData
  });

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ADMIN_TAGS_KEY }),
      queryClient.invalidateQueries({ queryKey: ['tags'] })
    ]);

  const statusMut = useMutation({
    mutationFn: ({ id, next }: { id: number; next: TagStatus }) => setTagStatus(id, next),
    onSuccess: invalidate
  });

  if (!isAdmin) {
    return (
      <PageContainer>
        <p className="font-label text-ink-muted">You don&apos;t have access to this page.</p>
      </PageContainer>
    );
  }

  const tags = tagsQuery.data?.data ?? [];
  const totalItems = tagsQuery.data?.totalItems ?? tags.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Admin"
        title="Tag moderation"
        description={tagsQuery.data ? `Found ${totalItems} tags.` : undefined}
      />

      <FilterShell>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <SearchInput value={search} onChange={setSearch} placeholder="Search tags" ariaLabel="Search tags" />
          </div>
          <label className="flex items-center gap-2 text-sm font-label font-semibold text-ink-strong">
            Status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as TagStatus | '')}
              className="rounded-full border border-brand-100 bg-white px-3 py-2 text-sm font-normal text-ink-strong shadow-sm"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </FilterShell>

      {statusMut.isError ? (
        <p role="alert" className="mt-4 text-sm font-semibold text-rose-600">
          {errorMessage(statusMut.error, 'Could not update the tag. Please try again.')}
        </p>
      ) : null}

      {tagsQuery.isLoading ? (
        <LoadingState label="Loading tags..." />
      ) : tagsQuery.error ? (
        <ErrorState message="Unable to load tags right now." />
      ) : tags.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-brand-100 bg-white/60 px-6 py-12 text-center">
          <p className="text-sm text-ink-muted">No tags match these filters.</p>
        </div>
      ) : (
        <div className="mt-6 max-w-full overflow-x-auto rounded-2xl border border-brand-100 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm font-label">
            <thead className="border-b border-brand-100 text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th scope="col" className="px-4 py-3">Name</th>
                <th scope="col" className="px-4 py-3">Creator</th>
                <th scope="col" className="px-4 py-3 text-right">Uses</th>
                <th scope="col" className="px-4 py-3">Created</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {tags.map((tag) => {
                const hidden = tag.status === 'HIDDEN';
                return (
                  <tr key={tag.id} className="border-b border-brand-50 last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-ink-strong">{tag.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{tag.creator}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{tag.usageCount}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{formatDate(tag.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${hidden ? 'bg-slate-100 text-slate-600' : 'bg-brand-50 text-brand-700'}`}
                      >
                        {hidden ? 'Hidden' : 'Active'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={hidden ? 'secondary' : 'danger'}
                          aria-label={`${hidden ? 'Unhide' : 'Hide'} ${tag.name}`}
                          disabled={statusMut.isPending}
                          onClick={() => statusMut.mutate({ id: tag.id, next: hidden ? 'ACTIVE' : 'HIDDEN' })}
                          className="disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {hidden ? 'Unhide' : 'Hide'}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          aria-label={`Merge ${tag.name}`}
                          onClick={() => setMergeSource(tag)}
                        >
                          Merge
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalItems > PAGE_SIZE ? (
        <PaginationControls
          currentPage={page}
          totalPages={totalPages}
          previousDisabled={page === 0}
          nextDisabled={page + 1 >= totalPages}
          onPrevious={() => setPage((current) => Math.max(0, current - 1))}
          onNext={() => setPage((current) => current + 1)}
        />
      ) : null}

      {mergeSource ? (
        <MergeDialog source={mergeSource} onClose={() => setMergeSource(null)} onMerged={invalidate} />
      ) : null}
    </PageContainer>
  );
};

type MergeDialogProps = {
  source: TagAdminResponse;
  onClose: () => void;
  onMerged: () => Promise<unknown>;
};

const MergeDialog = ({ source, onClose, onMerged }: MergeDialogProps) => {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState<Tag[]>([]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => previous?.focus?.();
  }, []);

  const mergeMut = useMutation({
    mutationFn: (targetId: number) => mergeTag(source.id, targetId),
    onSuccess: async () => {
      onClose();
      await onMerged();
    }
  });

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // TagInput consumes Escape (preventDefault) to close its suggestion list first.
    if (event.key === 'Escape' && !event.defaultPrevented) {
      event.stopPropagation();
      onClose();
    }
  };

  const picked = target[0];

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/40 px-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-card outline-none"
      >
        <h2 id={titleId} className="font-display text-xl font-semibold text-ink-strong">
          Merge &quot;{source.name}&quot;
        </h2>
        <p className="mt-1 text-sm font-label text-ink-muted">
          All uses move to the target tag and &quot;{source.name}&quot; is deleted.
        </p>
        <div className="mt-4">
          <TagInput
            label="Merge into"
            allowCreate={false}
            max={1}
            value={target}
            onChange={(next) => setTarget(next.filter((tag) => tag.id !== source.id))}
          />
        </div>
        {mergeMut.isError ? (
          <p role="alert" className="mt-3 text-sm font-semibold text-rose-600">
            {errorMessage(mergeMut.error, 'Could not merge the tag. Please try again.')}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!picked || mergeMut.isPending}
            onClick={() => picked && mergeMut.mutate(picked.id)}
            className="disabled:cursor-not-allowed disabled:opacity-50"
          >
            Merge
          </Button>
        </div>
      </div>
    </div>
  );
};

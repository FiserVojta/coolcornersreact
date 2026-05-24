import type { ReactNode } from 'react';

type ListToolbarProps = {
  chips: ReactNode;
  hasActiveFilters: boolean;
  onClearAll: () => void;
  countLabel: string;
  sortControl: ReactNode;
  className?: string;
};

export const ListToolbar = ({
  chips,
  hasActiveFilters,
  onClearAll,
  countLabel,
  sortControl,
  className = ''
}: ListToolbarProps) => (
  <div className={`mt-4 flex flex-wrap items-center justify-between gap-4 ${className}`.trim()}>
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      {hasActiveFilters && <span className="mr-0.5 text-xs font-medium text-ink-muted">Active:</span>}
      {chips}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClearAll}
          className="px-1 py-1 text-xs font-semibold text-ink-muted underline decoration-ink-faint underline-offset-[3px] transition hover:text-ink-strong hover:decoration-ink-muted"
        >
          Clear all
        </button>
      )}
    </div>
    <div className="flex shrink-0 items-center gap-3.5">
      <span className="text-xs font-medium text-ink-muted">{countLabel}</span>
      <span className="text-ink-faint">·</span>
      {sortControl}
    </div>
  </div>
);

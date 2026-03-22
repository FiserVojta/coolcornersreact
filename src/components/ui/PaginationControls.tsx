import { Button } from './Button';

type PaginationControlsProps = {
  currentPage: number;
  totalPages: number;
  totalLabel?: string;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  onPrevious: () => void;
  onNext: () => void;
};

export const PaginationControls = ({
  currentPage,
  totalPages,
  totalLabel,
  previousDisabled,
  nextDisabled,
  onPrevious,
  onNext
}: PaginationControlsProps) => (
  <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
    <Button variant="secondary" className="disabled:cursor-not-allowed disabled:opacity-50" disabled={previousDisabled} onClick={onPrevious}>
      Previous
    </Button>
    <span className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
      Page {currentPage + 1} of {totalPages}
    </span>
    <Button variant="secondary" className="disabled:cursor-not-allowed disabled:opacity-50" disabled={nextDisabled} onClick={onNext}>
      Next
    </Button>
    {totalLabel ? <span className="text-sm text-slate-500">{totalLabel}</span> : null}
  </div>
);

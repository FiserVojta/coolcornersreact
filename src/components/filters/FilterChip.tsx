import type { ReactNode } from 'react';

type FilterChipProps = {
  label: string;
  onRemove: () => void;
  prefix?: ReactNode;
  ariaLabel?: string;
};

export const FilterChip = ({ label, onRemove, prefix, ariaLabel }: FilterChipProps) => (
  <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-700/10 bg-brand-50 px-3 py-1 pr-2 text-[12.5px] font-semibold text-brand-700">
    {prefix}
    <span>{label}</span>
    <button
      type="button"
      aria-label={`Remove ${ariaLabel ?? label} filter`}
      onClick={onRemove}
      className="inline-flex h-4 w-4 items-center justify-center rounded-full text-sm leading-none text-brand-700 transition hover:bg-brand-700/10"
    >
      ×
    </button>
  </span>
);

import { useState } from 'react';

export type MultiSelectOption = {
  id: number;
  label: string;
};

type MultiSelectFilterProps = {
  label: string;
  placeholder: string;
  options: MultiSelectOption[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  countNoun: { singular: string; plural: string };
  emptyMessage?: string;
};

export const MultiSelectFilter = ({
  label,
  placeholder,
  options,
  selectedIds,
  onToggle,
  countNoun,
  emptyMessage = 'No options available.'
}: MultiSelectFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedCount = selectedIds.length;
  const triggerLabel =
    selectedCount === 0
      ? placeholder
      : `${selectedCount} ${selectedCount === 1 ? countNoun.singular : countNoun.plural} selected`;

  return (
    <div className="relative min-w-[200px] flex-1">
      <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.2em] text-ink-subtle">{label}</p>
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between gap-2.5 rounded-full border bg-white px-3 py-1.5 text-left text-[13px] font-semibold shadow-sm transition ${
          selectedCount ? 'border-brand-300 text-ink-strong' : 'border-brand-100 text-ink-default'
        }`}
      >
        <span className="truncate">{triggerLabel}</span>
        <span className={`text-[10px] text-ink-subtle transition ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {isOpen && (
        <div className="absolute left-0 right-0 z-20 mt-2 max-h-60 overflow-auto rounded-2xl border border-brand-100 bg-white p-1.5 shadow-lg">
          {options.map((option) => {
            const active = selectedIds.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => onToggle(option.id)}
                className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition ${
                  active ? 'bg-brand-700 font-semibold text-white' : 'text-ink-default hover:bg-brand-50'
                }`}
              >
                {option.label}
              </button>
            );
          })}
          {!options.length && <p className="px-3 py-2 text-xs text-ink-muted">{emptyMessage}</p>}
        </div>
      )}
    </div>
  );
};

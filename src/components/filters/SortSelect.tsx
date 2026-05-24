import { useState } from 'react';

export type SortOption = {
  value: string;
  label: string;
};

type SortSelectProps = {
  value: string;
  options: SortOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
};

export const SortSelect = ({ value, options, onChange, ariaLabel = 'Sort by' }: SortSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find((opt) => opt.value === value) ?? options[0];

  return (
    <div className="relative">
      <label className="flex items-center gap-2">
        <span className="text-xs font-medium text-ink-muted">Sort:</span>
        <button
          type="button"
          aria-label={ariaLabel}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex items-center justify-between gap-2.5 rounded-full border border-brand-300 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-ink-strong shadow-sm"
        >
          <span>{selected?.label ?? '—'}</span>
          <span className={`text-[10px] text-ink-subtle transition ${isOpen ? 'rotate-180' : ''}`}>▼</span>
        </button>
      </label>
      {isOpen && (
        <ul
          role="listbox"
          className="absolute right-0 z-20 mt-2 w-48 rounded-2xl border border-brand-100 bg-white p-1.5 shadow-lg"
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <li key={opt.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition ${
                    active ? 'bg-brand-700 font-semibold text-white' : 'text-ink-default hover:bg-brand-50'
                  }`}
                >
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

import { useState } from 'react';

export type SingleSelectOption = {
  value: string;
  label: string;
};

type SingleSelectFilterProps = {
  label: string;
  placeholder: string;
  options: SingleSelectOption[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  emptyMessage?: string;
};

export const SingleSelectFilter = ({
  label,
  placeholder,
  options,
  value,
  onChange,
  ariaLabel,
  emptyMessage = 'No options available.'
}: SingleSelectFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const triggerLabel = selected ? selected.label : placeholder;

  return (
    <div className="relative min-w-[200px] flex-1">
      <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.2em] text-ink-subtle">{label}</p>
      <button
        type="button"
        aria-label={ariaLabel ?? label}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between gap-2.5 rounded-full border bg-white px-3 py-1.5 text-left text-[13px] font-semibold shadow-sm transition ${
          selected ? 'border-brand-300 text-ink-strong' : 'border-brand-100 text-ink-default'
        }`}
      >
        <span className="truncate">{triggerLabel}</span>
        <span className={`text-[10px] text-ink-subtle transition ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {isOpen && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 z-20 mt-2 max-h-60 overflow-auto rounded-2xl border border-brand-100 bg-white p-1.5 shadow-lg"
        >
          <li>
            <button
              type="button"
              role="option"
              aria-selected={!value}
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition ${
                !value ? 'bg-brand-700 font-semibold text-white' : 'text-ink-default hover:bg-brand-50'
              }`}
            >
              {placeholder}
            </button>
          </li>
          {options.map((option) => {
            const active = option.value === value;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition ${
                    active ? 'bg-brand-700 font-semibold text-white' : 'text-ink-default hover:bg-brand-50'
                  }`}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
          {!options.length && <p className="px-3 py-2 text-xs text-ink-muted">{emptyMessage}</p>}
        </ul>
      )}
    </div>
  );
};

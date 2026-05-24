type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel?: string;
};

export const SearchInput = ({ value, onChange, placeholder, ariaLabel }: SearchInputProps) => (
  <label className="flex w-full items-center gap-2.5 rounded-full border border-brand-100 bg-white px-3.5 py-2 shadow-sm">
    <span aria-hidden="true" className="relative inline-block h-3 w-3 shrink-0">
      <span className="absolute inset-0 rounded-full border-[1.5px] border-ink-subtle" />
      <span
        className="absolute left-[10px] top-[10px] h-[1.5px] w-[5px] origin-top-left rounded-[1px] bg-ink-subtle"
        style={{ transform: 'translate(-2px, -2px) rotate(45deg)' }}
      />
    </span>
    <input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel ?? placeholder}
      className="w-full flex-1 bg-transparent text-sm text-ink-default outline-none placeholder:text-ink-subtle"
    />
  </label>
);

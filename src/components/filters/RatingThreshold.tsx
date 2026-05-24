type RatingThresholdProps = {
  label?: string;
  value: number;
  onChange: (value: number) => void;
};

const STEPS: { value: number; label: string; aria: string }[] = [
  { value: 0, label: 'Any', aria: 'Show any rating' },
  { value: 2, label: '2+', aria: 'Filter to rating 2 or higher' },
  { value: 3, label: '3+', aria: 'Filter to rating 3 or higher' },
  { value: 4, label: '4+', aria: 'Filter to rating 4 or higher' },
  { value: 5, label: '5', aria: 'Filter to rating 5 or higher' }
];

export const RatingThreshold = ({ label = 'Minimum rating', value, onChange }: RatingThresholdProps) => (
  <div className="min-w-[260px] flex-[1.2]">
    <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.2em] text-ink-subtle">{label}</p>
    <div
      role="group"
      aria-label={label}
      className="inline-flex items-stretch rounded-full border border-brand-100 bg-white p-0.5 shadow-sm"
    >
      {STEPS.map((step) => {
        const active = value === step.value;
        return (
          <button
            key={step.value}
            type="button"
            aria-label={step.aria}
            aria-pressed={active}
            onClick={() => onChange(active ? 0 : step.value)}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold leading-none transition ${
              active ? 'bg-brand-700 text-white' : 'text-ink-muted hover:text-ink-strong'
            }`}
          >
            {step.value > 0 && (
              <span className={`text-[12px] ${active ? 'text-amber-200' : 'text-amber-500'}`}>★</span>
            )}
            {step.label}
          </button>
        );
      })}
    </div>
  </div>
);

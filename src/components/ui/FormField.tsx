import { forwardRef, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

type FormFieldProps = {
  label: string;
  error?: { message?: string };
  children: ReactNode;
};

const controlClassName =
  'w-full rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm text-ink-strong shadow-sm outline-none transition focus:border-brand-400 placeholder:text-ink-subtle';

export const FormField = ({ label, error, children }: FormFieldProps) => (
  <label className="space-y-1 text-sm font-label text-ink-muted">
    <span className="block font-semibold text-ink-strong">{label}</span>
    {children}
    {error?.message ? <p className="text-xs font-semibold text-rose-600">{error.message}</p> : null}
  </label>
);

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} {...props} className={[controlClassName, className].filter(Boolean).join(' ')} />
  )
);

TextInput.displayName = 'TextInput';

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} {...props} className={[controlClassName, className].filter(Boolean).join(' ')} />
  )
);

TextArea.displayName = 'TextArea';

export const SelectInput = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select ref={ref} {...props} className={[controlClassName, className].filter(Boolean).join(' ')} />
  )
);

SelectInput.displayName = 'SelectInput';

import type { ReactNode } from 'react';

type FilterShellProps = {
  children: ReactNode;
  className?: string;
};

export const FilterShell = ({ children, className = '' }: FilterShellProps) => (
  <section className={`mt-8 rounded-3xl border border-brand-100 bg-white p-5 shadow-sm ${className}`.trim()}>
    {children}
  </section>
);

import type { ReactNode } from 'react';

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export const PageHeader = ({ eyebrow, title, description, actions, className }: PageHeaderProps) => (
  <div
    className={[
      'flex flex-col gap-4 md:flex-row md:items-center md:justify-between',
      className
    ]
      .filter(Boolean)
      .join(' ')}
  >
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">{eyebrow}</p>
      <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
      {description ? <p className="mt-2 text-slate-600">{description}</p> : null}
    </div>
    {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
  </div>
);

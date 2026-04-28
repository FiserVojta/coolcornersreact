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
      <p className="text-xs font-semibold font-label uppercase tracking-[0.2em] text-brand-700">{eyebrow}</p>
      <h1 className="font-display text-3xl font-semibold text-ink-strong">{title}</h1>
      {description ? <p className="mt-2 font-label text-ink-muted">{description}</p> : null}
    </div>
    {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
  </div>
);

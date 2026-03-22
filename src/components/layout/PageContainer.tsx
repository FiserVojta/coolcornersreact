import type { ReactNode } from 'react';

type PageContainerProps = {
  children: ReactNode;
  className?: string;
};

export const PageContainer = ({ children, className }: PageContainerProps) => (
  <main className={['mx-auto w-full max-w-page px-4 py-10', className].filter(Boolean).join(' ')}>{children}</main>
);

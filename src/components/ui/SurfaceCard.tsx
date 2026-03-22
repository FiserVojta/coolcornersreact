import type { HTMLAttributes, ReactNode } from 'react';

type SurfaceCardProps = HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'section' | 'aside';
  children: ReactNode;
  padding?: 'md' | 'lg';
};

const paddingClassName = {
  md: 'p-5',
  lg: 'p-6'
};

export const SurfaceCard = ({
  as = 'section',
  children,
  className,
  padding = 'md',
  ...props
}: SurfaceCardProps) => {
  const Component = as;

  return (
    <Component
      {...props}
      className={['rounded-2xl bg-white shadow-card', paddingClassName[padding], className].filter(Boolean).join(' ')}
    >
      {children}
    </Component>
  );
};

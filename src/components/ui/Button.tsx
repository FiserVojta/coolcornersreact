import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

type ButtonVariant = 'primary' | 'secondary' | 'danger';
type ButtonSize = 'sm' | 'md';

const baseClassName =
  'inline-flex items-center justify-center rounded-full font-semibold font-label transition hover:-translate-y-0.5';

const variantClassName: Record<ButtonVariant, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-600',
  secondary: 'bg-white text-brand-700 border border-brand-200 hover:border-brand-300',
  danger: 'bg-brand-50 text-rose-700 border border-brand-200 hover:border-rose-300'
};

const sizeClassName: Record<ButtonSize, string> = {
  sm: 'px-3 py-1 text-xs',
  md: 'px-4 py-2 text-sm'
};

type SharedProps = {
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

type ButtonProps = SharedProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    to?: never;
  };

type ButtonLinkProps = SharedProps &
  Omit<LinkProps, 'className'> & {
    to: LinkProps['to'];
  };

export const Button = (props: ButtonProps | ButtonLinkProps) => {
  const { children, className, variant = 'primary', size = 'md' } = props;
  const resolvedClassName = [baseClassName, sizeClassName[size], variantClassName[variant], className]
    .filter(Boolean)
    .join(' ');

  if (Object.prototype.hasOwnProperty.call(props, 'to')) {
    const { to, ...linkProps } = props as ButtonLinkProps;
    return (
      <Link {...linkProps} to={to} className={resolvedClassName}>
        {children}
      </Link>
    );
  }

  const { type, ...buttonProps } = props as ButtonProps;
  return (
    <button {...buttonProps} type={type ?? 'button'} className={resolvedClassName}>
      {children}
    </button>
  );
};

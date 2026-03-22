import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

type ButtonVariant = 'primary' | 'secondary' | 'danger';
type ButtonSize = 'sm' | 'md';

const baseClassName =
  'inline-flex items-center justify-center rounded-full font-semibold transition';

const variantClassName: Record<ButtonVariant, string> = {
  primary: 'bg-slate-900 text-white hover:bg-slate-800',
  secondary: 'border border-slate-300 bg-white text-slate-900 shadow-sm hover:border-slate-400',
  danger: 'border border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300'
};

const sizeClassName: Record<ButtonSize, string> = {
  sm: 'px-3 py-1 text-xs',
  md: 'px-4 py-2 text-sm shadow-sm'
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

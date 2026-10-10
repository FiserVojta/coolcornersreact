import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const adminItems = [{ to: '/admin/tags', label: 'Tags' }];

export const AdminMenu = () => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const triggerId = useId();
  const menuId = useId();
  const { pathname } = useLocation();
  const isActive = pathname.startsWith('/admin');

  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open]);

  const close = (restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        data-active={isActive}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex items-center gap-1 text-sm font-medium font-label transition-colors ${
          isActive ? 'text-brand-700' : 'text-ink-muted hover:text-ink-strong'
        }`}
      >
        Administration
        <span aria-hidden="true" className={`text-[10px] transition ${open ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-labelledby={triggerId}
          onKeyDown={(event) => {
            if (event.key === 'Escape') close(true);
          }}
          className="absolute right-0 z-40 mt-2 min-w-[160px] rounded-2xl border border-brand-100 bg-white p-1.5 shadow-lg"
        >
          {adminItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              role="menuitem"
              onClick={() => close(false)}
              className={`block rounded-xl px-3 py-2 text-sm font-label transition hover:bg-brand-50 ${
                pathname.startsWith(item.to) ? 'font-semibold text-brand-700' : 'text-ink-default'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

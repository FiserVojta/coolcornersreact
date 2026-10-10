import { useEffect, type RefObject } from 'react';

/**
 * Closes a popup (dropdown, menu) when the user presses outside `containerRef` or hits Escape.
 * On Escape, focus returns to `triggerRef` so keyboard users don't lose their place.
 */
export const useDismiss = ({
  open,
  onDismiss,
  containerRef,
  triggerRef
}: {
  open: boolean;
  onDismiss: () => void;
  containerRef: RefObject<HTMLElement | null>;
  triggerRef?: RefObject<HTMLElement | null>;
}) => {
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) onDismiss();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      onDismiss();
      triggerRef?.current?.focus();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onDismiss, containerRef, triggerRef]);
};

import { useCallback, useState, type DragEvent } from 'react';

const fileMatchesAccept = (file: File, accept?: string) => {
  if (!accept) return true;
  return accept.split(',').some((rule) => {
    const r = rule.trim().toLowerCase();
    if (!r) return false;
    if (r.endsWith('/*')) return file.type.toLowerCase().startsWith(r.slice(0, -1));
    if (r.startsWith('.')) return file.name.toLowerCase().endsWith(r);
    return file.type.toLowerCase() === r;
  });
};

/**
 * Drag-and-drop file handling shared by every upload control. Returns an
 * `isDragging` flag (for highlight styling) and the drag/drop event props to
 * spread onto the drop target. Dropped files are filtered by `accept` (the
 * same value passed to the underlying <input>), since `accept` only filters
 * the browse dialog and not native file drops.
 */
export const useFileDrop = (
  onFile: (file: File) => void,
  accept?: string,
  /** When provided, all dropped files (filtered by `accept`) are passed at once instead of just the first. */
  onFiles?: (files: File[]) => void
) => {
  const [isDragging, setIsDragging] = useState(false);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      setIsDragging(false);
      const dropped = Array.from(event.dataTransfer.files ?? []).filter((file) => fileMatchesAccept(file, accept));
      if (!dropped.length) return;
      if (onFiles) onFiles(dropped);
      else onFile(dropped[0]);
    },
    [onFile, onFiles, accept]
  );

  const dropProps = {
    onDragOver: (event: DragEvent) => event.preventDefault(),
    onDragEnter: (event: DragEvent) => {
      event.preventDefault();
      setIsDragging(true);
    },
    onDragLeave: (event: DragEvent) => {
      // Ignore leave events fired when moving between child nodes.
      if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsDragging(false);
    },
    onDrop,
  };

  return { isDragging, dropProps };
};

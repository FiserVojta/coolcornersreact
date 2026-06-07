import { type ReactNode } from 'react';
import { useFileDrop } from '../hooks/useFileDrop';

const UPLOAD_GLYPH = (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path
      d="M10 13V4M10 4L6.5 7.5M10 4l3.5 3.5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M4 13v2.5A1.5 1.5 0 005.5 17h9a1.5 1.5 0 001.5-1.5V13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

type UploadDropzoneProps = {
  variant?: 'cover' | 'wide';
  selectedFile: File | null;
  onFile: (file: File | null) => void;
  placeholder: ReactNode;
  hint: string;
  accept?: string;
};

/**
 * The dashed "Drop … or browse" upload box used across the create/edit forms.
 * Supports both click-to-browse and drag-and-drop.
 */
export const UploadDropzone = ({
  variant = 'wide',
  selectedFile,
  onFile,
  placeholder,
  hint,
  accept = 'image/*',
}: UploadDropzoneProps) => {
  const { isDragging, dropProps } = useFileDrop((file) => onFile(file), accept);

  return (
    <label className={`upload ${variant}${isDragging ? ' is-dragging' : ''}`} {...dropProps}>
      <span className="glyph">{UPLOAD_GLYPH}</span>
      <span className="up-title">{selectedFile ? selectedFile.name : placeholder}</span>
      <span className="up-mono">{hint}</span>
      <input
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(event) => onFile(event.target.files?.[0] ?? null)}
      />
    </label>
  );
};

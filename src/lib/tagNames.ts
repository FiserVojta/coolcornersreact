import type { Tag } from '../types/place';

/**
 * Mirrors the backend tag normalization (NFKC, lowercase, letters and digits only).
 * Used only to detect an exact match; the server remains the validator.
 */
export const normalizeTagName = (name: string) =>
  name.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

export const tagLabel = (tag: Pick<Tag, 'name' | 'title'>) => tag.title || tag.name;

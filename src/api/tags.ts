import { apiClient } from './client';
import type { Tag, TagSuggestion } from '../types/place';

export const fetchTags = async () => {
  const { data } = await apiClient.get<Tag[]>('/public/tags');
  return data;
};

/** Prefix matches first, then contains-matches; an empty `q` returns the most-used tags. */
export const searchTags = async (q: string, limit?: number) => {
  const { data } = await apiClient.get<TagSuggestion[]>('/public/tags/search', {
    params: { q, ...(limit != null ? { limit } : {}) }
  });
  return data;
};

/** Find-or-create: a name that normalizes to an existing tag returns that tag. */
export const createTag = async (name: string) => {
  const { data } = await apiClient.post<Tag>('/tags', { name });
  return data;
};

/** Resolves normalized tag names to tags, in input order; unknown names are skipped. */
export const resolveTags = async (names: string[]) => {
  if (!names.length) return [];
  const params = new URLSearchParams();
  names.forEach((name) => params.append('names', name));
  const { data } = await apiClient.get<Tag[]>('/public/tags/resolve', { params });
  return data;
};

import { apiClient } from './client';
import type { PagedResult } from '../types/place';
import type { AdminTagsParams, TagAdminResponse, TagStatus } from '../types/tag';

/** Admin-only tag list, ordered by usage desc. Empty `q`/`status` are omitted. */
export const fetchAdminTags = async ({ q, status, page, size }: AdminTagsParams) => {
  const trimmed = q?.trim();
  const { data } = await apiClient.get<PagedResult<TagAdminResponse>>('/admin/tags', {
    params: {
      ...(trimmed ? { q: trimmed } : {}),
      ...(status ? { status } : {}),
      page,
      size
    }
  });
  return data;
};

export const setTagStatus = async (id: number, status: TagStatus) => {
  const { data } = await apiClient.patch<TagAdminResponse>(`/admin/tags/${id}`, { status });
  return data;
};

/** Moves all usages of `sourceId` to `targetId` and deletes the source; returns the target. */
export const mergeTag = async (sourceId: number, targetId: number) => {
  const { data } = await apiClient.post<TagAdminResponse>(`/admin/tags/${sourceId}/merge`, { targetId });
  return data;
};

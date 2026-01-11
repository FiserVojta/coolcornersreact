import { apiClient } from './client';
import type { Tag } from '../types/place';

export const fetchTags = async () => {
  const { data } = await apiClient.get<Tag[]>('/public/tags');
  return data;
};

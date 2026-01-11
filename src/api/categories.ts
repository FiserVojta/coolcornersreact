import { apiClient } from './client';
import type { Category } from '../types/place';

export const fetchCategories = async (type?: string) => {
  const params = new URLSearchParams();
  if (type) params.set('type', type);
  const { data } = await apiClient.get<Category[]>('/public/categories', { params });
  return data;
};

import { apiClient } from './client';
import type { PagedResult } from '../types/place';
import type { Cotravel, CotravelCreateRequest } from '../types/cotravel';

interface CotravelListParams {
  page?: number;
  size?: number;
  search?: string;
}

const defaultParams: Required<Omit<CotravelListParams, 'search'>> = {
  page: 0,
  size: 12
};

export const fetchCotravelList = async (params?: CotravelListParams) => {
  const query = new URLSearchParams();
  const { page, size, search } = { ...defaultParams, ...params };
  query.set('page', String(page));
  query.set('size', String(size));
  if (search) query.set('search', search);

  const { data } = await apiClient.get<PagedResult<Cotravel>>('/public/wanders', { params: query });
  return data;
};

export const fetchCotravel = async (id: number) => {
  const { data } = await apiClient.get<Cotravel>(`/public/wanders/${id}`);
  return data;
};

export const joinCotravel = async (id: number) => {
  const { data } = await apiClient.post<Cotravel>(`/wanders/${id}/join`, {});
  return data;
};

export const leaveCotravel = async (id: number) => {
  const { data } = await apiClient.post<Cotravel>(`/wanders/${id}/leave`, {});
  return data;
};

export const createCotravel = async (payload: CotravelCreateRequest) => {
  const { data } = await apiClient.post<Cotravel>('/wanders', payload);
  return data;
};

export const updateCotravel = async (id: number, payload: CotravelCreateRequest) => {
  const { data } = await apiClient.put<Cotravel>(`/wanders/${id}`, payload);
  return data;
};

export const deleteCotravel = async (id: number) => {
  const { data } = await apiClient.delete<Cotravel>(`/wanders/${id}`);
  return data;
};

import { apiClient } from './client';
import type { PagedResult } from '../types/place';
import type { Cotravel, CotravelCreateRequest, CotravelSearchRequest } from '../types/cotravel';

type CotravelListParams = Partial<CotravelSearchRequest>;

const defaultParams = {
  page: 0,
  size: 12
};

export const fetchCotravelList = async (params?: CotravelListParams) => {
  const query = new URLSearchParams();
  const { page, size, search, startsFrom, startsUntil, createdBy, categories, tags } = { ...defaultParams, ...params };
  query.set('page', String(page));
  query.set('size', String(size));
  if (search) query.set('search', search);
  if (startsFrom) query.set('startsFrom', startsFrom);
  if (startsUntil) query.set('startsUntil', startsUntil);
  if (Number.isFinite(createdBy)) query.set('createdBy', String(createdBy));
  categories?.forEach((id) => query.append('categories', String(id)));
  tags?.forEach((id) => query.append('tags', String(id)));

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

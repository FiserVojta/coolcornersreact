import { apiClient } from './client';
import type { PagedResult } from '../types/place';
import type {
  TravelCreateRequest,
  TravelDetail,
  TravelSummary,
  TravelVisibility
} from '../types/travel';

/**
 * Travels the current viewer can see. Works for anonymous visitors (public travels only);
 * when logged in, the bearer token unlocks own + followed users' travels.
 */
export const fetchAccessibleTravels = async () => {
  const { data } = await apiClient.get<TravelSummary[]>('/public/travels/accessible');
  return data;
};

/**
 * A single travel the current viewer can see. Works for anonymous visitors (public
 * travels only); when logged in, the bearer token unlocks own + followed users' travels.
 */
export const fetchTravel = async (id: number) => {
  const { data } = await apiClient.get<TravelDetail>(`/public/travels/${id}`);
  return data;
};

export const fetchSharedTravel = async (token: string) => {
  const { data } = await apiClient.get<TravelDetail>(`/public/travels/share/${token}`);
  return data;
};

export const fetchPublicTravels = async (params?: { page?: number; size?: number }) => {
  const search = new URLSearchParams();
  if (Number.isFinite(params?.page)) search.append('page', String(params?.page));
  if (Number.isFinite(params?.size)) search.append('size', String(params?.size));
  const { data } = await apiClient.get<PagedResult<TravelSummary>>('/public/travels', { params: search });
  return data;
};

/**
 * A user's travels visible to the current viewer (public only for anonymous visitors;
 * own + followed users' FOLLOWERS travels unlock with the bearer token).
 */
export const fetchUserTravels = async (userId: number) => {
  const { data } = await apiClient.get<TravelSummary[]>(`/public/travels/user/${userId}`);
  return data;
};

export const createTravel = async (payload: TravelCreateRequest) => {
  const { data } = await apiClient.post<TravelDetail>('/travels', payload);
  return data;
};

export const updateTravel = async (id: number, payload: TravelCreateRequest) => {
  const { data } = await apiClient.put<TravelDetail>(`/travels/${id}`, payload);
  return data;
};

export const updateTravelVisibility = async (id: number, visibility: TravelVisibility) => {
  const { data } = await apiClient.patch<TravelDetail>(`/travels/${id}/visibility`, { visibility });
  return data;
};

export const deleteTravel = async (id: number) => {
  await apiClient.delete(`/travels/${id}`);
};

export const rateTravel = async (id: number, rating: number) => {
  const { data } = await apiClient.patch<TravelDetail>(`/travels/${id}/rate`, { rating });
  return data;
};

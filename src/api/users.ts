import { apiClient } from './client';
import type { PagedResult, Place } from '../types/place';
import type { Trip } from '../types/trip';
import type { User, UserDetail, UserFollowRequest } from '../types/user';

export const fetchUsers = async (params?: { page?: number; size?: number; search?: string }) => {
  const query = new URLSearchParams();
  const page = params?.page ?? 0;
  const size = params?.size ?? 20;
  query.set('page', String(page));
  query.set('size', String(size));
  if (params?.search) query.set('search', params.search);

  const { data } = await apiClient.get<PagedResult<User>>('/public/users', { params: query });
  return data;
};

export const fetchUser = async (email: string) => {
  const { data } = await apiClient.get<UserDetail>(`/public/users/${encodeURIComponent(email)}`);
  return data;
};

export const fetchCurrentUser = async () => {
  const { data } = await apiClient.get<User>('/users/me');
  return data;
};

export const followUsers = async (payload: UserFollowRequest) => {
  const { data } = await apiClient.post<User>('/users/follow', payload);
  return data;
};

export const unfollowUsers = async (payload: UserFollowRequest) => {
  const { data } = await apiClient.post<User>('/users/unfollow', payload);
  return data;
};

export const fetchUserPlaces = async (email: string) => {
  const { data } = await apiClient.get<Place[]>(`/public/users/${encodeURIComponent(email)}/places`);
  return data;
};

export const fetchUserTrips = async (email: string) => {
  const { data } = await apiClient.get<Trip[]>(`/public/users/${encodeURIComponent(email)}/trips`);
  return data;
};

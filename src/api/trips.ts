import { apiClient } from './client';
import type { CommentModel } from '../types/place';
import type { PagedResult } from '../types/place';
import type { TripCreateRequest, TripModel, TripRatingModel, TripSearchRequest } from '../types/trip';

const defaultSearch: TripSearchRequest = {
  categories: [],
  cities: [],
  countries: [],
  tags: [],
  durations: [],
  minRating: 0
};

export const fetchTrips = async (filters?: Partial<TripSearchRequest>) => {
  const request = { ...defaultSearch, ...filters };
  const params = new URLSearchParams();

  request.categories.forEach((id) => params.append('categories', String(id)));
  request.tags.forEach((id) => params.append('tags', String(id)));
  request.cities.forEach((id) => params.append('cities', String(id)));
  request.countries.forEach((id) => params.append('countries', String(id)));
  request.durations.forEach((duration) => params.append('durations', String(duration)));
  if (request.minRating) params.append('minRating', String(request.minRating));
  if (Number.isFinite(request.page)) params.append('page', String(request.page));
  if (Number.isFinite(request.size)) params.append('size', String(request.size));
  if (request.orderBy) params.append('orderBy', request.orderBy);
  if (request.order) params.append('order', request.order);

  const { data } = await apiClient.get<PagedResult<TripModel>>('/public/trips', { params });
  return data;
};

export const fetchTrip = async (id: number) => {
  const { data } = await apiClient.get<TripModel>(`/public/trips/${id}`);
  return data;
};

export const addTripComment = async (tripId: number, payload: CommentModel) => {
  const { data } = await apiClient.patch<CommentModel>(`/trips/${tripId}/comment`, payload);
  return data;
};

export const addTripRating = async (tripId: number, payload: TripRatingModel) => {
  const { data } = await apiClient.patch<number>(`/trips/${tripId}/rate`, payload);
  return data;
};

export const createTrip = async (payload: TripCreateRequest) => {
  const { data } = await apiClient.post<TripModel>('/trips', payload);
  return data;
};

export const updateTrip = async (id: number, payload: TripCreateRequest) => {
  const { data } = await apiClient.put<TripModel>(`/trips/${id}`, payload);
  return data;
};

export const deleteTrip = async (id: number) => {
  const { data } = await apiClient.delete<TripModel>(`/trips/${id}`);
  return data;
};

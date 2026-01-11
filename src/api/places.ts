import { apiClient } from './client';
import type {
  CommentModel,
  PagedResult,
  PlaceCreateRequest,
  PlaceDetail,
  PlaceRatingModel,
  PlaceSearchRequest
} from '../types/place';

const defaultSearch: PlaceSearchRequest = {
  categoryIds: [],
  tagIds: [],
  cityIds: [],
  rating: 0
};

export const fetchPlaces = async (filters?: Partial<PlaceSearchRequest>) => {
  const request = { ...defaultSearch, ...filters };
  const params = new URLSearchParams();

  request.categoryIds.forEach((category) => params.append('category', String(category)));
  request.tagIds.forEach((tag) => params.append('tags', String(tag)));
  request.cityIds.forEach((city) => params.append('cities', String(city)));
  if (request.rating) {
    params.append('rating', String(request.rating));
  }

  const { data } = await apiClient.get<PagedResult<PlaceDetail>>('/public/places', { params });
  return data;
};

export const fetchPlace = async (id: number) => {
  const { data } = await apiClient.get<PlaceDetail>(`/public/places/${id}`);
  return data;
};

export const addPlaceComment = async (placeId: number, payload: CommentModel) => {
  const { data } = await apiClient.post<CommentModel>(`/places/${placeId}/comment`, payload);
  return data;
};

export const addPlaceRating = async (placeId: number, payload: PlaceRatingModel) => {
  const { data } = await apiClient.patch<number>(`/places/${placeId}/rate`, payload);
  return data;
};

export const createPlace = async (payload: PlaceCreateRequest) => {
  const { data } = await apiClient.post<PlaceDetail>('/places', payload);
  return data;
};

export const updatePlace = async (id: number, payload: PlaceCreateRequest) => {
  const { data } = await apiClient.put<PlaceDetail>(`/places/${id}`, payload);
  return data;
};

export const deletePlace = async (id: number) => {
  const { data } = await apiClient.delete<PlaceDetail>(`/places/${id}`);
  return data;
};

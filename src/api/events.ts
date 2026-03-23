import { apiClient } from './client';
import type { PagedResult } from '../types/place';
import type { EventCreateRequest, EventModel, EventSearchRequest } from '../types/event';

const defaultSearch: EventSearchRequest = {
  categories: []
};

export const fetchEvents = async (filters?: Partial<EventSearchRequest>) => {
  const request = { ...defaultSearch, ...filters };
  const params = new URLSearchParams();

  request.categories.forEach((id) => params.append('categories', String(id)));
  if (Number.isFinite(request.page)) params.append('page', String(request.page));
  if (Number.isFinite(request.size)) params.append('size', String(request.size));
  if (request.orderBy) params.append('orderBy', request.orderBy);
  if (request.order) params.append('order', request.order);

  const { data } = await apiClient.get<PagedResult<EventModel>>('/public/events', { params });
  return data;
};

export const fetchEvent = async (id: number) => {
  const { data } = await apiClient.get<EventModel>(`/public/events/${id}`);
  return data;
};

export const createEvent = async (payload: EventCreateRequest) => {
  const { data } = await apiClient.post<EventModel>('/events', payload);
  return data;
};

export const updateEvent = async (id: number, payload: Partial<EventCreateRequest>) => {
  const { data } = await apiClient.put<EventModel>(`/events/${id}`, payload);
  return data;
};

export const deleteEvent = async (id: number) => {
  const { data } = await apiClient.delete<EventModel>(`/events/${id}`);
  return data;
};

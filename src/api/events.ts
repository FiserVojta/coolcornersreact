import { apiClient } from './client';
import type { PagedResult } from '../types/place';
import type { EventCreateRequest, EventModel } from '../types/event';

export const fetchEvents = async () => {
  const { data } = await apiClient.get<PagedResult<EventModel>>('/public/events');
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

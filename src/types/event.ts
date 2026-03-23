import type { Category } from './place';

export interface EventModel {
  id: number;
  name: string;
  description: string;
  venue: string;
  startTime: string;
  createdAt: string;
  category: Category;
  capacity: number;
  price: number;
  duration: number;
  createdBy: string;
}

export interface EventCreateRequest {
  name: string;
  description: string;
  venue: string;
  startTime: string;
  time: string;
  capacity: number;
  duration: number;
  price: number;
  categoryId: number;
}

export interface EventSearchRequest {
  categories: number[];
  page?: number;
  size?: number;
  orderBy?: string;
  order?: string;
}

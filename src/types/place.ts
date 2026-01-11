export interface Category {
  id: number;
  name: string;
  main: boolean;
  title: string;
}

export interface City {
  id: number;
  name: string;
  description: string;
}

export interface Tag {
  id: number;
  name: string;
  title: string;
  value: string;
  creator: string;
}

export interface Geometry {
  type: string;
  coordinates: [number, number];
}

export interface Feature {
  type: string;
  geometry: Geometry;
  properties: {
    id: string;
    name: string;
  };
}

export interface CommentModel {
  value: string;
  name?: string;
}

export interface Comment {
  id: string;
  name: string;
  value: string;
  title: string;
  author: string;
}

export interface Place {
  id: number;
  name: string;
  description?: string;
}

export interface PlaceCardModel {
  id: number;
  name: string;
  region: string;
  imageUrl: string;
  rating: number;
  description: string;
  phoneNumber: string;
  feature: unknown;
  openingHours: string;
  comments: unknown[];
}

export interface PlaceCreateRequest {
  name: string | null | undefined;
  description: string | null | undefined;
  rating: number | null | undefined;
  phoneNumber: string | null | undefined;
  price: number | null | undefined;
  openingHours: string | null | undefined;
  image: string | null | undefined;
  gallery: string | null | undefined;
  categoryId: number | null | undefined;
  geometry: Geometry | null | undefined;
  tags: number[] | null | undefined;
}

export interface PlaceDetail {
  id: number;
  name: string;
  description: string;
  phoneNumber: string;
  feature: Feature;
  openingHours: string;
  comments?: CommentModel[];
  category: Category;
  tags: Tag[];
  city: City;
  images?: string[];
  rating?: number;
  website?: string;
  email?: string;
  address?: string;
  createdBy?: string;
}

export interface PlaceSearchRequest {
  cityIds: number[];
  rating: number;
  tagIds: number[];
  categoryIds: number[];
}

export interface PlaceRatingModel {
  id: number;
  rating: number;
  createdBy: string;
}

export interface PagedResult<T> {
  totalItems: number;
  data: T[];
}

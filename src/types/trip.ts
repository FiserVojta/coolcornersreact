import type { Category, CommentModel, PlaceDetail, Tag } from './place';

export interface Trip {
  id: number;
  name: string;
  description?: string;
}

export interface TripModel {
  id: number;
  name: string;
  description: string;
  rating: number;
  duration: number;
  category: Category;
  creator: string;
  createdBy?: string;
  places?: PlaceDetail[];
  googlePlaces?: GooglePlaceSummary[];
  tags: Tag[];
  comments?: CommentModel[];
  images?: string[];
  files?: TripFile[];
}

export interface TripRatingModel {
  id: number;
  rating: number;
  createdBy: string;
}

export interface TripFile {
  id: number;
  url?: string | null;
  name?: string | null;
}

export interface TripFileLinkRequest {
  fileId: number;
  name: string;
}

export interface TripCreateRequest {
  name: string | null | undefined;
  description: string | null | undefined;
  author: string | null | undefined;
  categoryId: number | null | undefined;
  duration: number | null | undefined;
  rating: number | null | undefined;
  tags: number[] | null | undefined;
  placeIds: number[] | null | undefined;
  googlePlaces?: GooglePlaceInput[] | null | undefined;
  images?: string[] | null | undefined;
  files?: TripFileLinkRequest[] | null | undefined;
}

export interface GooglePlaceInput {
  placeId: string;
  name?: string | null;
  geometry?: GeometryPoint | null;
}

export interface GooglePlaceSummary {
  id: string;
  name: string;
  geometry?: GeometryPoint | null;
}

export interface GeometryPoint {
  type: 'Point';
  coordinates: [number, number];
}

export interface TripSearchRequest {
  categories: number[];
  cities: number[];
  countries: number[];
  tags: number[];
  durations: number[];
  minRating: number;
}

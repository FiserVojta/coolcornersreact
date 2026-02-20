import type { Category, Tag, PlaceDetail } from './place';
import type { GooglePlaceInput, GooglePlaceSummary, TripFile, TripFileLinkRequest, TripModel } from './trip';
import type { User } from './user';

export interface CotravelPart {
  id: number;
  name?: string;
  places?: PlaceDetail[];
  trips?: TripModel[];
  googlePlaces?: GooglePlaceSummary[];
  order: number;
}

export interface Cotravel {
  id: number;
  createdBy: User;
  description: string;
  capacity: number;
  startTime: string | number;
  wanderers?: User[];
  tags?: Tag[];
  category?: Category;
  wanderParts?: CotravelPart[];
  googlePlaces?: GooglePlaceSummary[];
  backgroundImage?: TripFile;
}

export interface CotravelCreateRequest {
  description: string;
  capacity: number;
  startTime: string;
  wanderers: number[];
  tags: number[];
  category: number;
  wanderParts: CotravelPartCreateRequest[];
  googlePlaces?: GooglePlaceInput[] | null | undefined;
  backgroundImage?: TripFileLinkRequest | null | undefined;
}

export interface CotravelPartCreateRequest {
  name?: string | null | undefined;
  places: number[];
  trips: number[];
  googlePlaces?: GooglePlaceInput[] | null | undefined;
  order: number;
}

export interface CotravelSearchRequest {
  startsFrom?: string | null;
  startsUntil?: string | null;
  createdBy?: number | null;
  categories: number[];
  tags: number[];
  page?: number;
  size?: number;
  search?: string;
}

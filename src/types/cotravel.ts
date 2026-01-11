import type { Category, Tag, PlaceDetail } from './place';
import type { GooglePlaceInput, GooglePlaceSummary, TripModel } from './trip';
import type { User } from './user';

export interface CotravelPart {
  id: number;
  places?: PlaceDetail[];
  trips?: TripModel[];
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
}

export interface CotravelPartCreateRequest {
  places: number[];
  trips: number[];
  order: number;
}

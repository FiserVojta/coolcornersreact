export type TravelVisibility = 'PRIVATE' | 'FOLLOWERS' | 'PUBLIC';

export interface TravelFile {
  id: number;
  url?: string | null;
  name?: string | null;
}

export interface TravelOwner {
  id: number;
  name?: string | null;
  displayName?: string | null;
  profilePictureUrl?: string | null;
}

export interface TravelPlace {
  id?: number;
  name?: string | null;
  latitude: number;
  longitude: number;
}

export interface TravelPhoto {
  id?: number;
  fileId: number;
  name?: string | null;
  url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  /** Date the photo was taken (ISO yyyy-MM-dd), from EXIF or set manually. */
  takenOn?: string | null;
}

export interface TravelSummary {
  id: number;
  title: string;
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  visibility: TravelVisibility;
  coverImage?: TravelFile | null;
  photoCount: number;
  owner?: TravelOwner | null;
}

export interface TravelDetail {
  id: number;
  title: string;
  description?: string | null;
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  visibility: TravelVisibility;
  /** Only present when the current viewer owns the travel. */
  shareToken?: string | null;
  owner?: TravelOwner | null;
  coverImage?: TravelFile | null;
  photos?: TravelPhoto[];
  places?: TravelPlace[];
  createdAt?: string | null;
}

export interface TravelCreateRequest {
  title: string;
  description?: string | null;
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  visibility: TravelVisibility;
  coverImageId?: number | null;
  photos?: { fileId: number; latitude?: number | null; longitude?: number | null; takenOn?: string | null }[];
  places?: TravelPlace[];
}

export const VISIBILITY_LABELS: Record<TravelVisibility, string> = {
  PRIVATE: 'Private',
  FOLLOWERS: 'Followers',
  PUBLIC: 'Public'
};

import type { Category, Tag } from './place';

export type TravelVisibility = 'PRIVATE' | 'FOLLOWERS' | 'PUBLIC';

export interface TravelFile {
  id: number;
  url?: string | null;
  thumbnailUrl?: string | null;
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
  /** Downscaled preview used in gallery grids; falls back to `url` when absent (e.g. older photos). */
  thumbnailUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  /** Date the photo was taken (ISO yyyy-MM-dd), from EXIF or set manually. */
  takenOn?: string | null;
  /** Optional free-text note/caption for this photo. */
  note?: string | null;
}

export interface TravelDayNote {
  id?: number;
  /** The day this note is about (ISO yyyy-MM-dd). */
  day: string;
  note?: string | null;
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
  /** Average of all user ratings; null until the travel is first rated. */
  rating?: number | null;
  category?: Category | null;
  tags?: Tag[];
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
  /** Per-day notes for this travel. */
  dayNotes?: TravelDayNote[];
  /** Average of all user ratings; null until the travel is first rated. */
  rating?: number | null;
  /** The current viewer's own rating, when they have rated this travel. */
  myRating?: number | null;
  category?: Category | null;
  tags?: Tag[];
  createdAt?: string | null;
}

export interface TravelCreateRequest {
  title: string;
  description?: string | null;
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  visibility: TravelVisibility;
  categoryId?: number | null;
  tags?: number[];
  coverImageId?: number | null;
  photos?: {
    fileId: number;
    latitude?: number | null;
    longitude?: number | null;
    takenOn?: string | null;
    note?: string | null;
  }[];
  places?: TravelPlace[];
  dayNotes?: { day: string; note?: string | null }[];
}

export const VISIBILITY_LABELS: Record<TravelVisibility, string> = {
  PRIVATE: 'Private',
  FOLLOWERS: 'Followers',
  PUBLIC: 'Public'
};

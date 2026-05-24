import type { Cotravel } from './cotravel';

export interface User {
  id: number;
  keycloakId: string;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  displayName?: string;
  rating?: number | null;
  createdAt: string | number;
  introduction?: string | null;
  profilePictureUrl?: string | null;
  followers?: User[];
  following?: User[];
  tripsCompleted?: number | null;
  cotravelsOrganized?: number | null;
  cotravelsAttended?: number | null;
}

export interface UserDetail extends User {
  wandersOrganized?: Cotravel[];
  wandersAttended?: Cotravel[];
}

export interface UserFollowRequest {
  userIds: number[];
}

export interface UserRateRequest {
  rating: number;
  createdBy: string;
}

export interface UserUpdateRequest {
  name?: string;
  displayName?: string;
  discordId?: string;
  introduction?: string;
  profilePictureFileId?: number | null;
}

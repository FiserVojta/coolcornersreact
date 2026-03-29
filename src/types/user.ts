import type { Cotravel } from './cotravel';

export interface User {
  id: number;
  keycloakId: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  displayName?: string;
  rating?: number | null;
  createdAt: string | number;
  followers?: User[];
  following?: User[];
}

export interface UserDetail extends User {
  wandersOrganized?: Cotravel[];
  wandersAttended?: Cotravel[];
}

export interface UserFollowRequest {
  userIds: number[];
}

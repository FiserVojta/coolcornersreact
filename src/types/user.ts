export interface User {
  id: number;
  keycloakId: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  displayName?: string;
  createdAt: string | number;
  followers?: User[];
  following?: User[];
}

export interface UserFollowRequest {
  userIds: number[];
}

import type { User } from '../types/user';

export const getUserLabel = (
  user: Pick<User, 'displayName' | 'name' | 'firstName' | 'lastName' | 'username'>
) =>
  user.displayName ||
  user.name ||
  [user.firstName, user.lastName].filter(Boolean).join(' ') ||
  user.username ||
  'Traveler';

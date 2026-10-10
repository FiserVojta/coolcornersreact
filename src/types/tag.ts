export type TagStatus = 'ACTIVE' | 'HIDDEN';

/** Row of `GET /admin/tags`; also returned by the status and merge endpoints. */
export interface TagAdminResponse {
  id: number;
  name: string;
  normalizedName: string;
  creator: string;
  status: TagStatus;
  createdAt: string;
  usageCount: number;
}

export interface AdminTagsParams {
  q?: string;
  status?: TagStatus | '';
  page: number;
  size: number;
}

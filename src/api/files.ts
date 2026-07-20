import { apiClient } from './client';
import { compressImageForUpload, generateThumbnailForUpload } from '../lib/imageCompression';

export interface UploadedFile {
  url?: string;
  thumbnailUrl?: string;
  id?: string | number;
  name?: string;
  filename?: string;
  [key: string]: unknown;
}

export interface FileItem {
  id: number;
  url: string;
  thumbnailUrl?: string | null;
}

export interface FileListResponse {
  totalItems: number;
  data: FileItem[];
}

/** Backend contract: POST /files/presign (CornerFilePresignResponse). */
interface PresignResponse {
  key: string;
  uploadUrl: string;
  publicUrl: string;
  headers: Record<string, string>;
  thumbnailKey?: string | null;
  thumbnailUploadUrl?: string | null;
  thumbnailPublicUrl?: string | null;
  thumbnailHeaders?: Record<string, string> | null;
}

/** The presigned headers are part of the URL's signature and must be sent verbatim. */
const putToStorage = async (
  url: string,
  body: Blob,
  headers: Record<string, string> | null | undefined
) => {
  const response = await fetch(url, { method: 'PUT', body, headers: headers ?? undefined });
  if (!response.ok) {
    throw new Error(`Storage upload failed with status ${response.status}`);
  }
};

/**
 * Direct-to-storage upload: presign PUT URLs on the backend, upload the bytes (and a
 * client-generated thumbnail for images) straight to object storage from the browser,
 * then register the file with /files/complete. A failed thumbnail upload degrades to
 * "no thumbnail" instead of failing the whole upload.
 */
export const uploadFile = async (file: File) => {
  const upload = await compressImageForUpload(file);
  const thumbnail = await generateThumbnailForUpload(upload);

  const { data: presign } = await apiClient.post<PresignResponse>('/files/presign', {
    fileName: upload.name,
    contentType: upload.type || 'application/octet-stream',
    withThumbnail: thumbnail !== null
  });

  await putToStorage(presign.uploadUrl, upload, presign.headers);

  let thumbnailKey: string | null = null;
  if (thumbnail && presign.thumbnailUploadUrl && presign.thumbnailKey) {
    try {
      await putToStorage(presign.thumbnailUploadUrl, thumbnail, presign.thumbnailHeaders);
      thumbnailKey = presign.thumbnailKey;
    } catch {
      // Main object is already in storage; register it without a thumbnail.
    }
  }

  const { data } = await apiClient.post<UploadedFile>('/files/complete', {
    key: presign.key,
    thumbnailKey
  });

  return data;
};

export const fetchFiles = async () => {
  const { data } = await apiClient.get<FileListResponse>('/public/files/list');
  return data;
};

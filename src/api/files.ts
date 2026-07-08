import { apiClient } from './client';
import { compressImageForUpload } from '../lib/imageCompression';

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

export const uploadFile = async (file: File) => {
  const upload = await compressImageForUpload(file);
  const formData = new FormData();
  formData.append('file', upload);

  const { data } = await apiClient.post<UploadedFile>('/files', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

  return data;
};

export const fetchFiles = async () => {
  const { data } = await apiClient.get<FileListResponse>('/public/files/list');
  return data;
};

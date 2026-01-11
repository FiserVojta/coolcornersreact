import { apiClient } from './client';

export interface UploadedFile {
  url?: string;
  id?: string | number;
  filename?: string;
  [key: string]: unknown;
}

export interface FileItem {
  id: number;
  url: string;
}

export interface FileListResponse {
  totalItems: number;
  data: FileItem[];
}

export const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await apiClient.post<UploadedFile>('/files', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

  return data;
};

export const fetchFiles = async () => {
  const { data } = await apiClient.get<FileListResponse>('/public/files/list');
  return data;
};

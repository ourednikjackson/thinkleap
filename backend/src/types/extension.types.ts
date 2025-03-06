export interface FileUploadResponse {
  status: 'success' | 'error';
  redirect?: string;
  message?: string;
}

export interface UrlUploadRequest {
  url: string;
  headers?: Record<string, string>;
  cookies?: string;
  targetSite?: string;
}

export interface FileMetadata {
  originalname: string;
  filename: string;
  mimetype: string;
  size: number;
  path: string;
}
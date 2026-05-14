export type UploadStatus = "ready" | "uploading" | "success" | "fail";

export interface UploadFile {
  name: string;
  percentage?: number;
  status?: UploadStatus;
  size?: number;
  response?: unknown;
  uid: number;
  url?: string;
  raw?: File;
}

export type UploadListType = "text" | "picture" | "picture-card";

export interface UploadChangeOptions {
  file: UploadFile;
  fileList: UploadFile[];
}

export interface UploadProgressEvent extends ProgressEvent {
  percent: number;
}

export interface UploadRequestOptions {
  action: string;
  method: string;
  data: Record<string, unknown>;
  filename: string;
  file: File;
  headers: Record<string, string>;
  onError: (evt: Error) => void;
  onProgress: (evt: UploadProgressEvent) => void;
  onSuccess: (response: any) => void;
  withCredentials: boolean;
}

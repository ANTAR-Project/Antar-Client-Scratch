export interface FileEntry {
  name: string;
  isDirectory: boolean;
  size: number;
  lastModified: number;
}

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

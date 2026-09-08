import { useCallback, useState } from 'react';
import { NAS_API } from '../config';
import { useAuth } from '../context/AuthContext';
import type { FileEntry } from '../types';

export type BrowserStatus = 'idle' | 'loading' | 'error';

export function useNasApi() {
  const { appendToken } = useAuth();

  const [entries, setEntries]   = useState<FileEntry[]>([]);
  const [status, setStatus]     = useState<BrowserStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const listDirectory = useCallback(async (path: string) => {
    setStatus('loading');
    setErrorMsg('');
    try {
      const url = appendToken(`${NAS_API}/files/list?path=${encodeURIComponent(path)}`);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEntries(data.entry ?? []);
      setStatus('idle');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setStatus('error');
    }
  }, [appendToken]);

  const deleteEntry = useCallback(async (path: string): Promise<boolean> => {
    const url = appendToken(`${NAS_API}/files/delete?path=${encodeURIComponent(path)}`);
    const res = await fetch(url, { method: 'DELETE' });
    return res.ok || res.status === 204;
  }, [appendToken]);

  const getPreviewUrl = useCallback((path: string) => {
    return appendToken(`${NAS_API}/files/preview?path=${encodeURIComponent(path)}`);
  }, [appendToken]);

  const getDownloadUrl = useCallback((path: string) => {
    return appendToken(`${NAS_API}/files/download?path=${encodeURIComponent(path)}`);
  }, [appendToken]);

  /** Upload a single file via XHR so we can track progress. Returns a cleanup function. */
  const uploadFile = useCallback(
    (
      file: File,
      destPath: string,
      onProgress: (pct: number) => void,
      onDone: (ok: boolean, status: number) => void,
    ) => {
      const fd = new FormData();
      fd.append('path', destPath || '/');
      fd.append('file', file);

      const xhr = new XMLHttpRequest();
      // Use ?token= query param — safest for XHR multipart (avoids header forwarding quirks)
      xhr.open('POST', appendToken(`${NAS_API}/files/upload/file`));
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload  = () => onDone(xhr.status >= 200 && xhr.status < 300, xhr.status);
      xhr.onerror = () => onDone(false, 0);
      xhr.send(fd);
      return () => xhr.abort();
    },
    [appendToken],
  );

  /** Upload a folder (FileList with webkitRelativePath). */
  const uploadFolder = useCallback(
    async (
      files: FileList,
      destPath: string,
      onProgress: (msg: string) => void,
    ): Promise<boolean> => {
      const fd = new FormData();
      fd.append('path', destPath || '/');
      for (const f of Array.from(files)) {
        fd.append('files', f);
        fd.append('relativePaths', f.webkitRelativePath);
      }
      onProgress('Uploading…');
      try {
        const res = await fetch(appendToken(`${NAS_API}/files/upload/folder`), {
          method: 'POST',
          // Do NOT set headers manually — let the browser set Content-Type with boundary
          body:   fd,
        });
        return res.ok;
      } catch {
        return false;
      }
    },
    [appendToken],
  );

  return {
    entries,
    status,
    errorMsg,
    listDirectory,
    deleteEntry,
    getPreviewUrl,
    getDownloadUrl,
    uploadFile,
    uploadFolder,
  };
}

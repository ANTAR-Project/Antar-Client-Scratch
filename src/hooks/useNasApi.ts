import { useCallback, useState } from 'react';
import { NAS_API } from '../config';
import { useAuth } from '../context/AuthContext';
import type { FileEntry } from '../types';

export type BrowserStatus = 'idle' | 'loading' | 'error';

// ── User Files API (/api/v1/nas-orchestrator/files) ──────────────────────────
// ── Shared Workspace API (/api/v1/nas-orchestrator/shared) ───────────────────
// ── Workspace Management API (/api/v1/nas-orchestrator/workspace) ─────────────
export function useNasApi() {
  const { appendToken } = useAuth();

  const [entries, setEntries]   = useState<FileEntry[]>([]);
  const [status, setStatus]     = useState<BrowserStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // ── User Files API ─────────────────────────────────────────────────────────

  /** GET /files/list — List files/folders in the user's scoped workspace. */
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

  /** DELETE /files/delete — Delete a file or directory from the user's workspace. */
  const deleteEntry = useCallback(async (path: string): Promise<boolean> => {
    const url = appendToken(`${NAS_API}/files/delete?path=${encodeURIComponent(path)}`);
    const res = await fetch(url, { method: 'DELETE' });
    return res.ok || res.status === 204;
  }, [appendToken]);

  /** GET /files/preview — Stream-preview an inline media or text file. */
  const getPreviewUrl = useCallback((path: string) => {
    return appendToken(`${NAS_API}/files/preview?path=${encodeURIComponent(path)}`);
  }, [appendToken]);

  /** GET /files/download — Stream-download a file from the user's workspace. */
  const getDownloadUrl = useCallback((path: string) => {
    return appendToken(`${NAS_API}/files/download?path=${encodeURIComponent(path)}`);
  }, [appendToken]);

  /** POST /files/upload/file — Upload a single file via XHR so we can track progress.
   *  Returns an abort cleanup function. */
  const uploadFile = useCallback(
    (
      file: File,
      destPath: string,
      onProgress: (pct: number) => void,
      onDone: (ok: boolean, status: number) => void,
    ) => {
      const fd = new FormData();
      fd.append('path', destPath);
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

  /** POST /files/upload/folder — Upload a folder (FileList with webkitRelativePath). */
  const uploadFolder = useCallback(
    async (
      files: FileList,
      destPath: string,
      onProgress: (msg: string) => void,
    ): Promise<boolean> => {
      const fd = new FormData();
      fd.append('path', destPath);
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

  /** POST /files/mkdir — Create a folder (and any intermediate directories) inside the caller's scoped workspace.
   *  `path` is required and must not contain `..`, backslashes, or a leading `/`.
   *  Returns true on HTTP 200/201. */
  const mkdirFiles = useCallback(async (path: string): Promise<boolean> => {
    const url = appendToken(`${NAS_API}/files/mkdir?path=${encodeURIComponent(path)}`);
    const res = await fetch(url, { method: 'POST' });
    return res.ok || res.status === 201;
  }, [appendToken]);

  // ── Shared Workspace API ───────────────────────────────────────────────────

  /** GET /shared/list — List files/folders in the shared workspace. */
  const listShared = useCallback(async (path: string): Promise<FileEntry[]> => {
    const url = appendToken(`${NAS_API}/shared/list?path=${encodeURIComponent(path)}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.entry ?? [];
  }, [appendToken]);

  /** POST /shared/upload/file — Upload a single file into the shared workspace via XHR.
   *  Returns an abort cleanup function. */
  const uploadSharedFile = useCallback(
    (
      file: File,
      destPath: string,
      onProgress: (pct: number) => void,
      onDone: (ok: boolean, status: number) => void,
    ) => {
      const fd = new FormData();
      fd.append('path', destPath);
      fd.append('file', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', appendToken(`${NAS_API}/shared/upload/file`));
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

  /** POST /shared/upload/folder — Upload a folder hierarchy into the shared workspace. */
  const uploadSharedFolder = useCallback(
    async (
      files: FileList,
      destPath: string,
      onProgress: (msg: string) => void,
    ): Promise<boolean> => {
      const fd = new FormData();
      fd.append('path', destPath);
      for (const f of Array.from(files)) {
        fd.append('files', f);
        fd.append('relativePaths', f.webkitRelativePath);
      }
      onProgress('Uploading…');
      try {
        const res = await fetch(appendToken(`${NAS_API}/shared/upload/folder`), {
          method: 'POST',
          body:   fd,
        });
        return res.ok;
      } catch {
        return false;
      }
    },
    [appendToken],
  );

  /** POST /shared/mkdir — Create a folder (and any intermediate directories) inside the shared workspace.
   *  `path` is required and must not contain `..`, backslashes, or a leading `/`.
   *  Returns true on HTTP 200/201. */
  const mkdirShared = useCallback(async (path: string): Promise<boolean> => {
    const url = appendToken(`${NAS_API}/shared/mkdir?path=${encodeURIComponent(path)}`);
    const res = await fetch(url, { method: 'POST' });
    return res.ok || res.status === 201;
  }, [appendToken]);

  /** GET /shared/download — Stream-download a file from the shared workspace. */
  const getSharedDownloadUrl = useCallback((path: string) => {
    return appendToken(`${NAS_API}/shared/download?path=${encodeURIComponent(path)}`);
  }, [appendToken]);

  /** GET /shared/preview — Preview an inline file in the shared workspace. */
  const getSharedPreviewUrl = useCallback((path: string) => {
    return appendToken(`${NAS_API}/shared/preview?path=${encodeURIComponent(path)}`);
  }, [appendToken]);

  /** DELETE /shared/delete — Delete a file or folder from the shared workspace. */
  const deleteSharedEntry = useCallback(async (path: string): Promise<boolean> => {
    const url = appendToken(`${NAS_API}/shared/delete?path=${encodeURIComponent(path)}`);
    const res = await fetch(url, { method: 'DELETE' });
    return res.ok || res.status === 204;
  }, [appendToken]);

  /** DELETE /shared/clear — Purge ALL files in the shared workspace. */
  const clearShared = useCallback(async (): Promise<boolean> => {
    const url = appendToken(`${NAS_API}/shared/clear`);
    const res = await fetch(url, { method: 'DELETE' });
    return res.ok || res.status === 204;
  }, [appendToken]);

  // ── Workspace Management API ───────────────────────────────────────────────

  /** POST /workspace/create — Provision an isolated workspace folder for a user. */
  const createWorkspace = useCallback(async (name: string): Promise<boolean> => {
    const url = appendToken(`${NAS_API}/workspace/create`);
    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name }),
    });
    return res.ok || res.status === 201;
  }, [appendToken]);

  /** DELETE /workspace/delete — Delete the calling user's root workspace directory. */
  const deleteWorkspace = useCallback(async (): Promise<boolean> => {
    const url = appendToken(`${NAS_API}/workspace/delete`);
    const res = await fetch(url, { method: 'DELETE' });
    return res.ok || res.status === 204;
  }, [appendToken]);

  /** DELETE /workspace/clear — Clear all contents inside the calling user's workspace. */
  const clearWorkspace = useCallback(async (): Promise<boolean> => {
    const url = appendToken(`${NAS_API}/workspace/clear`);
    const res = await fetch(url, { method: 'DELETE' });
    return res.ok || res.status === 204;
  }, [appendToken]);

  return {
    // state
    entries,
    status,
    errorMsg,
    // User Files API
    listDirectory,
    deleteEntry,
    getPreviewUrl,
    getDownloadUrl,
    uploadFile,
    uploadFolder,
    mkdirFiles,
    // Shared Workspace API
    listShared,
    uploadSharedFile,
    uploadSharedFolder,
    mkdirShared,
    getSharedDownloadUrl,
    getSharedPreviewUrl,
    deleteSharedEntry,
    clearShared,
    // Workspace Management API
    createWorkspace,
    deleteWorkspace,
    clearWorkspace,
  };
}

import { useCallback, useEffect, useState } from 'react';
import Breadcrumb from '../components/Breadcrumb';
import FileBrowserTable from '../components/FileBrowserTable';
import UploadDrawer from '../components/UploadDrawer';
import { useNasApi } from '../hooks/useNasApi';
import type { BrowserStatus } from '../hooks/useNasApi';
import type { FileEntry } from '../types';
import { FaRotateRight, FaUpload, FaXmark, FaTrash } from 'react-icons/fa6';

interface SharedWorkspacePageProps {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function SharedWorkspacePage({ showToast }: SharedWorkspacePageProps) {
  const {
    listShared,
    deleteSharedEntry,
    getSharedPreviewUrl,
    getSharedDownloadUrl,
    uploadSharedFile,
    uploadSharedFolder,
    clearShared,
  } = useNasApi();

  const [entries,     setEntries]     = useState<FileEntry[]>([]);
  const [status,      setStatus]      = useState<BrowserStatus>('idle');
  const [errorMsg,    setErrorMsg]    = useState('');
  const [currentPath, setCurrentPath] = useState('');
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [uploadPct,   setUploadPct]   = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const loadDirectory = useCallback(async (path: string) => {
    setStatus('loading');
    setErrorMsg('');
    try {
      const data = await listShared(path);
      setEntries(data);
      setStatus('idle');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setStatus('error');
    }
  }, [listShared]);

  const navigate = useCallback(
    (path: string) => { setCurrentPath(path); loadDirectory(path); },
    [loadDirectory],
  );

  useEffect(() => { loadDirectory(''); }, [loadDirectory]);

  const handleDelete = async (path: string, name: string) => {
    if (!confirm(`Delete "${name}" from the shared workspace?\n\nThis cannot be undone.`)) return;
    try {
      const ok = await deleteSharedEntry(path);
      if (ok) { showToast(`🗑 "${name}" deleted`, 'success'); loadDirectory(currentPath); }
      else      showToast('❌ Delete failed', 'error');
    } catch (err) {
      showToast('❌ ' + (err instanceof Error ? err.message : String(err)), 'error');
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Purge ALL files in the shared workspace?\n\nThis cannot be undone.')) return;
    try {
      const ok = await clearShared();
      if (ok) { showToast('🗑 Shared workspace cleared', 'success'); loadDirectory(''); }
      else      showToast('❌ Clear failed', 'error');
    } catch (err) {
      showToast('❌ ' + (err instanceof Error ? err.message : String(err)), 'error');
    }
  };

  const handleUploadFile = (file: File, destPath: string) => {
    setIsUploading(true);
    setUploadPct(0);
    uploadSharedFile(file, destPath,
      (pct) => setUploadPct(pct),
      (ok, httpStatus) => {
        setIsUploading(false);
        if (ok) { showToast(`✅ "${file.name}" uploaded to shared`, 'success'); loadDirectory(currentPath); }
        else      showToast(`❌ Upload failed: HTTP ${httpStatus}`, 'error');
      },
    );
  };

  const handleUploadFolder = async (files: FileList, destPath: string) => {
    setIsUploading(true);
    const ok = await uploadSharedFolder(files, destPath, () => {});
    setIsUploading(false);
    if (ok) { showToast(`✅ Folder uploaded to shared (${files.length} files)`, 'success'); loadDirectory(currentPath); }
    else      showToast('❌ Folder upload failed', 'error');
  };

  return (
    <div id="panel-shared" className="page-enter">
      <div className="panel">
        {/* Toolbar */}
        <div className="browser-toolbar">
          <Breadcrumb currentPath={currentPath} onNavigate={navigate} />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginLeft: 'auto' }}>
            <button
              id="btn-clear-shared"
              className="btn btn-danger-soft"
              title="Purge all files in the shared workspace"
              onClick={handleClearAll}
            >
              <FaTrash /> Clear All
            </button>
            <button className="btn" id="btn-toggle-shared-upload" onClick={() => setDrawerOpen(o => !o)}>
              {drawerOpen ? <><FaXmark /> Close</> : <><FaUpload /> Upload</>}
            </button>
            <button className="btn btn-icon" onClick={() => navigate(currentPath)} title="Refresh">
              <FaRotateRight />
            </button>
          </div>
        </div>

        {/* Upload Drawer */}
        <UploadDrawer
          isOpen={drawerOpen}
          currentPath={currentPath}
          onUploadFile={handleUploadFile}
          onUploadFolder={handleUploadFolder}
          uploadPct={uploadPct}
          isUploading={isUploading}
        />

        {/* File Table */}
        <FileBrowserTable
          entries={entries}
          status={status}
          errorMsg={errorMsg}
          currentPath={currentPath}
          onNavigate={navigate}
          onPreview={(path)  => window.open(getSharedPreviewUrl(path), '_blank')}
          onDownload={(path) => { window.location.href = getSharedDownloadUrl(path); }}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}

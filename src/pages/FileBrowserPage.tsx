import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Breadcrumb from '../components/Breadcrumb';
import FileBrowserTable from '../components/FileBrowserTable';
import UploadDrawer from '../components/UploadDrawer';
import { useNasApi } from '../hooks/useNasApi';
import { FaRotateRight, FaUpload, FaXmark } from 'react-icons/fa6';

interface FileBrowserPageProps {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function FileBrowserPage({ showToast }: FileBrowserPageProps) {
  const routerNavigate = useNavigate();
  const {
    entries, status, errorMsg,
    listDirectory, deleteEntry,
    getPreviewUrl, getDownloadUrl,
    uploadFile, uploadFolder, mkdirFiles,
  } = useNasApi();

  const [currentPath, setCurrentPath] = useState('');
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [uploadPct,   setUploadPct]   = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const navigate = useCallback(
    (path: string) => { setCurrentPath(path); listDirectory(path); },
    [listDirectory],
  );

  useEffect(() => { listDirectory(''); }, [listDirectory]);

  const handleDelete = async (path: string, name: string) => {
    if (!confirm(`Delete "${name}" from TrueNAS?\n\nThis cannot be undone.`)) return;
    try {
      const ok = await deleteEntry(path);
      if (ok) { showToast(`🗑 "${name}" deleted`, 'success'); listDirectory(currentPath); }
      else      showToast('❌ Delete failed', 'error');
    } catch (err) {
      showToast('❌ ' + (err instanceof Error ? err.message : String(err)), 'error');
    }
  };

  /** Navigate to the HLS player page with the video's NAS path pre-filled. */
  const handleStream = (nasPath: string) => {
    routerNavigate(`/player?path=${encodeURIComponent(nasPath)}`);
  };

  const handleMkdir = async (folderPath: string) => {
    try {
      const ok = await mkdirFiles(folderPath);
      if (ok) { showToast(`📁 Folder "${folderPath}" created`, 'success'); listDirectory(currentPath); }
      else      showToast('❌ Create folder failed', 'error');
    } catch (err) {
      showToast('❌ ' + (err instanceof Error ? err.message : String(err)), 'error');
    }
  };

  const handleUploadFile = (file: File, destPath: string) => {
    setIsUploading(true);
    setUploadPct(0);
    uploadFile(file, destPath,
      (pct) => setUploadPct(pct),
      (ok, httpStatus) => {
        setIsUploading(false);
        if (ok) { showToast(`✅ "${file.name}" uploaded`, 'success'); listDirectory(currentPath); }
        else      showToast(`❌ Upload failed: HTTP ${httpStatus}`, 'error');
      },
    );
  };

  const handleUploadFolder = async (files: FileList, destPath: string) => {
    setIsUploading(true);
    const ok = await uploadFolder(files, destPath, () => {});
    setIsUploading(false);
    if (ok) { showToast(`✅ Folder uploaded (${files.length} files)`, 'success'); listDirectory(currentPath); }
    else      showToast('❌ Folder upload failed', 'error');
  };

  return (
    <div id="panel-browser" className="page-enter">
      <div className="panel">
        {/* Toolbar */}
        <div className="browser-toolbar">
          <Breadcrumb currentPath={currentPath} onNavigate={navigate} />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginLeft: 'auto' }}>
            <button className="btn" id="btn-toggle-upload" onClick={() => setDrawerOpen(o => !o)}>
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
          onMkdir={handleMkdir}
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
          onPreview={(path)  => window.open(getPreviewUrl(path), '_blank')}
          onDownload={(path) => { window.location.href = getDownloadUrl(path); }}
          onDelete={handleDelete}
          onStream={handleStream}
        />
      </div>
    </div>
  );
}

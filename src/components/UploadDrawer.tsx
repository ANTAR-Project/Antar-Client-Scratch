import { useRef, useState } from 'react';
import { FaFile, FaFolder, FaFolderPlus } from 'react-icons/fa6';

interface UploadDrawerProps {
  isOpen: boolean;
  currentPath: string;
  onUploadFile: (file: File, destPath: string) => void;
  onUploadFolder: (files: FileList, destPath: string) => void;
  /** Called when the user submits a new folder name. Path is joined with currentPath internally. */
  onMkdir?: (folderPath: string) => void;
  uploadPct: number;
  isUploading: boolean;
}

export default function UploadDrawer({
  isOpen,
  currentPath,
  onUploadFile,
  onUploadFolder,
  onMkdir,
  uploadPct,
  isUploading,
}: UploadDrawerProps) {
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [chosenLabel,  setChosenLabel]  = useState('No file chosen');
  const [folderName,   setFolderName]   = useState('');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setChosenLabel(file.name);
    onUploadFile(file, currentPath);
  };

  const handleFolder = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    setChosenLabel(`${files.length} file(s)`);
    onUploadFolder(files, currentPath);
  };

  const handleMkdir = () => {
    const name = folderName.trim();
    if (!name || !onMkdir) return;
    // Join with currentPath: if inside a sub-directory, mkdir creates it there
    const fullPath = currentPath ? `${currentPath}/${name}` : name;
    onMkdir(fullPath);
    setFolderName('');
  };

  return (
    <div className={`upload-drawer${isOpen ? ' open' : ''}`} id="upload-drawer">
      <div className="upload-drawer-inner">

        <div className="dest-badge">
          <span className="dest-badge-label">Destination</span>
          <span className="dest-badge-value" id="upload-dest-display">
            {currentPath ? `/${currentPath}` : '/'}
          </span>
        </div>

        <div className="picker-row">
          <button className="btn" onClick={() => fileInputRef.current?.click()}>
            <FaFile /> Choose File
          </button>
          <button className="btn" onClick={() => folderInputRef.current?.click()}>
            <FaFolder /> Choose Folder
          </button>
          <span className="picker-label" id="upload-chosen-label">{chosenLabel}</span>

          <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFile} />
          <input
            ref={folderInputRef}
            type="file"
            style={{ display: 'none' }}
            // @ts-ignore
            webkitdirectory="true"
            multiple
            onChange={handleFolder}
          />
        </div>

        {/* Create Folder (mkdir) — only shown when onMkdir is provided */}
        {onMkdir && (
          <div className="picker-row" style={{ marginTop: 10, borderTop: '1px solid #1a1a1a', paddingTop: 12 }}>
            <input
              id="mkdir-input"
              className="input"
              type="text"
              placeholder="New folder name…"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleMkdir(); }}
              style={{ flex: 1, minWidth: 0 }}
            />
            <button
              id="mkdir-btn"
              className="btn"
              onClick={handleMkdir}
              disabled={!folderName.trim()}
              title="Create folder at current path"
            >
              <FaFolderPlus /> Create Folder
            </button>
          </div>
        )}

        {isUploading && (
          <div id="upload-progress-inline">
            <div className="progress-track" style={{ marginTop: 0 }}>
              <div className="progress-fill" style={{ width: `${uploadPct}%` }} />
            </div>
            <div style={{ marginTop: 8, fontSize: 12, fontFamily: 'monospace', color: '#888', textAlign: 'right' }}>
              {uploadPct}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

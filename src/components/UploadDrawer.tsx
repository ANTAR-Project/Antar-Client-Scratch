import { useRef, useState } from 'react';
import { FaFile, FaFolder } from 'react-icons/fa6';

interface UploadDrawerProps {
  isOpen: boolean;
  currentPath: string;
  onUploadFile: (file: File, destPath: string) => void;
  onUploadFolder: (files: FileList, destPath: string) => void;
  uploadPct: number;
  isUploading: boolean;
}

export default function UploadDrawer({
  isOpen,
  currentPath,
  onUploadFile,
  onUploadFolder,
  uploadPct,
  isUploading,
}: UploadDrawerProps) {
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [chosenLabel, setChosenLabel] = useState('No file chosen');

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

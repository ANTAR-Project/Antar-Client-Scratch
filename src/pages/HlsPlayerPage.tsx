import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PipelineBadge from '../components/PipelineBadge';
import VideoPlayer from '../components/VideoPlayer';
import { useHlsPlayer } from '../hooks/useHlsPlayer';
import { FaUpload, FaPlay } from 'react-icons/fa6';

interface HlsPlayerPageProps {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function HlsPlayerPage({ showToast: _showToast }: HlsPlayerPageProps) {
  const {
    videoRef,
    uploadStatus, uploadPct, uploading,
    playerStatus,
    infoBox,
    levels, currentLevel,
    uploadVideo, loadStream, switchQuality,
  } = useHlsPlayer();

  const [searchParams] = useSearchParams();

  // ── Upload state ─────────────────────────────────────────────
  // subPath is an optional sub-directory under the user's workspace.
  // File will land at {username}/{subPath}/{filename} on the NAS.
  const [subPath,     setSubPath]     = useState('');
  const [chosenFile,  setChosenFile]  = useState<File | null>(null);
  const [isDragging,  setIsDragging]  = useState(false);

  // ── Playback state ───────────────────────────────────────────
  // nasPath is the raw NAS path of the uploaded video, e.g. "alice/sample.mp4".
  // Pre-filled from ?path= query param when navigating from the file browser.
  const [nasPath, setNasPath] = useState('');

  const uploadFileInputRef = useRef<HTMLInputElement>(null);
  const canUpload = chosenFile !== null;

  // Pre-fill nasPath from query param (set by file browser "Stream" action)
  useEffect(() => {
    const p = searchParams.get('path');
    if (p) {
      setNasPath(p);
      // Auto-trigger playback when arriving directly from file browser
      loadStream(p);
    }
    // Only run on mount / when the query param changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) setChosenFile(file);
  };

  return (
    <div id="panel-player" className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Pipeline */}
      <PipelineBadge />

      {/* ── Step 1: Upload ── */}
      <div
        className={`panel-dashed${isDragging ? ' drag-over' : ''}`}
        id="uploadPanel"
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="step-panel">
          <div className="section-label">📤 Step 1 — Upload Video to pipeline</div>

          <div className="input-row">
            {/* Optional sub-path */}
            <input
              type="text"
              className="input"
              style={{ flex: '0 0 220px' }}
              id="uploadSubPath"
              placeholder="Sub-path (optional, e.g. movies)"
              autoComplete="off"
              value={subPath}
              onChange={(e) => setSubPath(e.target.value)}
              title="Optional sub-directory under your workspace. Leave empty to upload directly to your workspace root."
            />

            {/* File picker */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '13px 18px',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid #222',
                borderRadius: 12,
                cursor: 'pointer',
                minWidth: 0,
                transition: 'border-color 0.2s',
              }}
              id="filePickArea"
              onClick={() => uploadFileInputRef.current?.click()}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#333')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#222')}
            >
              <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1 }}>🎬</span>
              <span
                id="filePickLabel"
                style={{
                  fontSize: 14.5,
                  color: chosenFile ? '#e8e8e8' : '#3a3a3a',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  fontWeight: 500,
                }}
              >
                {chosenFile ? chosenFile.name : 'Choose or drag a video file…'}
              </span>
            </div>

            <input
              ref={uploadFileInputRef}
              type="file"
              id="uploadFileInput"
              accept="video/*"
              style={{ display: 'none' }}
              onChange={(e) => setChosenFile(e.target.files?.[0] ?? null)}
            />

            <button
              id="uploadBtn"
              className="btn-primary"
              onClick={() => {
                if (canUpload && chosenFile) {
                  uploadVideo(subPath, chosenFile, (returnedNasPath) => {
                    // Auto-fill the stream path after upload completes
                    if (returnedNasPath) setNasPath(returnedNasPath);
                  });
                }
              }}
              disabled={!canUpload || uploading}
            >
              <FaUpload style={{ fontSize: 13 }} />
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </div>

          {uploading && (
            <div className="progress-track" id="progressWrap">
              <div className="progress-fill" id="progressBar" style={{ width: `${uploadPct}%` }} />
            </div>
          )}

          {uploadStatus.msg && (
            <div id="uploadStatus" className={`status-line ${uploadStatus.type || ''}`}>
              {uploadStatus.msg}
            </div>
          )}
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="divider">
        <div className="divider-line" />
        <span className="divider-text">then play</span>
        <div className="divider-line right" />
      </div>

      {/* ── Step 2: Play ── */}
      <div className="panel-glass">
        <div className="step-panel">
          <div className="section-label">▶ Step 2 — Stream by NAS Path</div>
          <div style={{ fontSize: 12.5, color: '#555', marginBottom: 10 }}>
            Enter the raw NAS path of the uploaded <code>.mp4</code> file — same as the path shown after upload
            (e.g. <code>alice/sample.mp4</code>). Or click a video file in the File Browser to stream it directly.
          </div>
          <div className="input-row">
            <input
              type="text"
              className="input"
              id="nasPathInput"
              placeholder="NAS path (e.g. alice/sample.mp4)"
              autoComplete="off"
              value={nasPath}
              onChange={(e) => setNasPath(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') loadStream(nasPath.trim()); }}
            />
            <button id="playBtn" className="btn-primary" onClick={() => loadStream(nasPath.trim())}>
              <FaPlay style={{ fontSize: 12 }} /> Play
            </button>
          </div>
        </div>
      </div>

      {/* ── Video + Quality Selector + Info ── */}
      <VideoPlayer
        ref={videoRef}
        playerStatus={playerStatus}
        infoBox={infoBox}
        levels={levels}
        currentLevel={currentLevel}
        onSwitchQuality={switchQuality}
      />
    </div>
  );
}

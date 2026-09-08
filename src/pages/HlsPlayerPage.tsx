import { useRef, useState } from 'react';
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
    uploadVideo, loadMovie, switchQuality,
  } = useHlsPlayer();


  const [uploadMovieId, setUploadMovieId] = useState('');
  const [chosenFile,    setChosenFile]    = useState<File | null>(null);
  const [movieId,       setMovieId]       = useState('');
  const [isDragging,    setIsDragging]    = useState(false);

  const uploadFileInputRef = useRef<HTMLInputElement>(null);
  const canUpload = uploadMovieId.trim().length > 0 && chosenFile !== null;

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
            {/* Movie ID */}
            <input
              type="text"
              className="input"
              style={{ flex: '0 0 200px' }}
              id="uploadMovieId"
              placeholder="Movie ID"
              autoComplete="off"
              value={uploadMovieId}
              onChange={(e) => setUploadMovieId(e.target.value)}
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
              onClick={() => { if (canUpload && chosenFile) uploadVideo(uploadMovieId.trim(), chosenFile, setMovieId); }}
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
          <div className="section-label">▶ Step 2 — Stream by Movie ID</div>
          <div className="input-row">
            <input
              type="text"
              className="input"
              id="movieId"
              placeholder="Enter Movie ID (e.g. movie-001)"
              autoComplete="off"
              value={movieId}
              onChange={(e) => setMovieId(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') loadMovie(movieId.trim()); }}
            />
            <button id="playBtn" className="btn-primary" onClick={() => loadMovie(movieId.trim())}>
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

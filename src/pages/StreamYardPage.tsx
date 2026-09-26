import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PipelineBadge from '../components/PipelineBadge';
import { useAuth } from '../context/AuthContext';
import { NAS_API, STREAMING_API } from '../config';
import { FaUpload, FaFilm, FaRotateRight } from 'react-icons/fa6';

interface StreamYardPageProps {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

interface PlaylistEntry {
  path: string;
  thumbnailUrl: string | null;
}

export default function StreamYardPage({ showToast }: StreamYardPageProps) {
  const { appendToken, authHeader } = useAuth();
  const [searchParams] = useSearchParams();

  // ── Upload state ──────────────────────────────────────────────
  const [chosenFile,    setChosenFile]    = useState<File | null>(null);
  const [isDragging,    setIsDragging]    = useState(false);
  const [uploading,     setUploading]     = useState(false);
  const [uploadPct,     setUploadPct]     = useState(0);
  const [uploadMsg,     setUploadMsg]     = useState<{ text: string; ok: boolean } | null>(null);
  const uploadFileInputRef = useRef<HTMLInputElement>(null);

  // ── Playlist library state ────────────────────────────────────
  const [playlists,        setPlaylists]        = useState<PlaylistEntry[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);

  // ── Fetch playlist library ────────────────────────────────────
  const fetchPlaylists = useCallback(async () => {
    setPlaylistsLoading(true);
    try {
      const res = await fetch(appendToken(`${STREAMING_API}/playlists`), { headers: authHeader });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: PlaylistEntry[] = await res.json();
      setPlaylists(data);
    } catch (err) {
      showToast('❌ Failed to load library: ' + (err instanceof Error ? err.message : String(err)), 'error');
    } finally {
      setPlaylistsLoading(false);
    }
  }, [appendToken, authHeader, showToast]);

  useEffect(() => { fetchPlaylists(); }, [fetchPlaylists]);

  // Pre-fill from ?path= query param — open the player directly
  useEffect(() => {
    const p = searchParams.get('path');
    if (p) openPlayer(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ── Open player in new tab ─────────────────────────────────────
  const openPlayer = (path: string) => {
    const url = `/stream?path=${encodeURIComponent(path)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // ── Upload ─────────────────────────────────────────────────────
  const handleUpload = () => {
    if (!chosenFile) return;
    setUploading(true);
    setUploadPct(0);
    setUploadMsg(null);

    const fd = new FormData();
    fd.append('file', chosenFile);

    const xhr = new XMLHttpRequest();
    const uploadUrl = appendToken(`/api/v1/videos/upload`);
    xhr.open('POST', uploadUrl);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) setUploadPct(Math.round((e.loaded / e.total) * 100));
    });

    xhr.addEventListener('load', () => {
      setUploading(false);
      setUploadPct(100);
      if (xhr.status >= 200 && xhr.status < 300) {
        setUploadMsg({ text: '✅ Upload complete — encoding pipeline triggered. Your video will appear in the library once encoding finishes.', ok: true });
        setChosenFile(null);
        if (uploadFileInputRef.current) uploadFileInputRef.current.value = '';
        // Refresh library after a delay to pick up newly encoded content
        setTimeout(() => fetchPlaylists(), 5000);
      } else {
        setUploadMsg({ text: `❌ Upload failed: HTTP ${xhr.status}`, ok: false });
      }
    });

    xhr.addEventListener('error', () => {
      setUploading(false);
      setUploadMsg({ text: '❌ Network error — is video-service running on :8082?', ok: false });
    });

    xhr.send(fd);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) setChosenFile(file);
  };

  // ── Thumbnail URL builder ──────────────────────────────────────
  const thumbnailSrc = (thumbnailUrl: string | null): string | null => {
    if (!thumbnailUrl) return null;
    return appendToken(`${NAS_API}/files/preview?path=${encodeURIComponent(thumbnailUrl)}`);
  };

  return (
    <div id="panel-streamyard" className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Pipeline */}
      <PipelineBadge />

      {/* ── Page header ── */}
      <div className="streamyard-header">
        <div>
          <div className="streamyard-title">StreamYard</div>
          <div className="streamyard-subtitle">Upload · Encode · Stream your video library</div>
        </div>
      </div>

      {/* ── Upload Panel ── */}
      <div
        className={`panel-dashed${isDragging ? ' drag-over' : ''}`}
        id="uploadPanel"
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="step-panel">
          <div className="section-label">📤 Upload Video to Pipeline</div>

          <div className="input-row">
            {/* File picker area */}
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
              {chosenFile && (
                <span style={{ fontSize: 11, color: '#555', flexShrink: 0 }}>
                  {(chosenFile.size / 1024 / 1024).toFixed(1)} MB
                </span>
              )}
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
              onClick={handleUpload}
              disabled={!chosenFile || uploading}
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

          {uploadMsg && (
            <div
              id="uploadStatus"
              className={`status-line ${uploadMsg.ok ? 'success' : 'error'}`}
              style={{ marginTop: 14 }}
            >
              {uploadMsg.text}
            </div>
          )}
        </div>
      </div>

      {/* ── Playlist Library ── */}
      <div>
        <div className="streamyard-library-header">
          <div className="section-label" style={{ margin: 0 }}>🎞 Your Library</div>
          <button
            id="btn-refresh-library"
            className="btn btn-icon"
            onClick={fetchPlaylists}
            title="Refresh library"
            disabled={playlistsLoading}
          >
            <FaRotateRight className={playlistsLoading ? 'spin' : ''} />
          </button>
        </div>

        {playlistsLoading && playlists.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon spin">⏳</div>
            <div className="empty-state-text">Loading library…</div>
          </div>
        ) : playlists.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎬</div>
            <div className="empty-state-text">
              No videos yet — upload one to get started.
            </div>
          </div>
        ) : (
          <div className="playlist-grid" id="playlist-grid">
            {playlists.map((entry) => {
              const src = thumbnailSrc(entry.thumbnailUrl);
              return (
                <div
                  key={entry.path}
                  id={`playlist-card-${entry.path.replace(/[^a-zA-Z0-9]/g, '-')}`}
                  className="playlist-card"
                  onClick={() => openPlayer(entry.path)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openPlayer(entry.path); }}
                  title={`Play "${entry.path.replace(/^.*\//, '')}"`}
                >
                  <div className="playlist-thumb-wrap">
                    {src ? (
                      <img
                        src={src}
                        alt={entry.path}
                        className="playlist-thumb"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="playlist-thumb-placeholder">
                        <FaFilm style={{ fontSize: 32, color: '#2a2a2a' }} />
                      </div>
                    )}
                    <div className="playlist-play-overlay">
                      <div className="playlist-play-btn">▶</div>
                    </div>
                  </div>

                  <div className="playlist-card-body">
                    <div className="playlist-card-title" title={entry.path}>
                      {entry.path.replace(/^.*\//, '')}
                    </div>
                    {entry.path.includes('/') && (
                      <div className="playlist-card-sub">
                        {entry.path.substring(0, entry.path.lastIndexOf('/'))}
                      </div>
                    )}
                    <div className="playlist-card-badge">HLS · Multi-bitrate</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

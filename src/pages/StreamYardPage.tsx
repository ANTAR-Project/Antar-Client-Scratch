import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PipelineBadge from '../components/PipelineBadge';
import Breadcrumb from '../components/Breadcrumb';
import FileBrowserTable from '../components/FileBrowserTable';
import UploadDrawer from '../components/UploadDrawer';
import { useAuth } from '../context/AuthContext';
import { useNasApi } from '../hooks/useNasApi';
import { NAS_API, STREAMING_API } from '../config';
import { FaUpload, FaFilm, FaRotateRight, FaXmark } from 'react-icons/fa6';

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

  // ── NAS file-browser state ─────────────────────────────────────
  const {
    entries, status, errorMsg,
    listDirectory,
    getPreviewUrl, getDownloadUrl,
  } = useNasApi();

  const [currentPath, setCurrentPath] = useState('');
  const [drawerOpen,  setDrawerOpen]  = useState(false);

  // ── Upload state ──────────────────────────────────────────────
  const [uploading,  setUploading]  = useState(false);
  const [uploadPct,  setUploadPct]  = useState(0);
  const [uploadMsg,  setUploadMsg]  = useState<{ text: string; ok: boolean } | null>(null);

  // ── Playlist library state ────────────────────────────────────
  const [playlists,        setPlaylists]        = useState<PlaylistEntry[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);

  // ── Browse navigation ─────────────────────────────────────────
  const navigate = useCallback(
    (path: string) => { setCurrentPath(path); listDirectory(path); },
    [listDirectory],
  );

  useEffect(() => { listDirectory(''); }, [listDirectory]);

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

  // ── Upload .mp4 to the video pipeline ─────────────────────────
  // UploadDrawer calls onUploadFile(file, destPath) where destPath is currentPath.
  const handleUploadFile = (file: File, destPath: string) => {
    // Guard: pipeline only accepts .mp4
    if (!file.name.toLowerCase().endsWith('.mp4')) {
      showToast('⚠️ Only .mp4 files are accepted by the pipeline.', 'error');
      return;
    }

    setUploading(true);
    setUploadPct(0);
    setUploadMsg(null);

    const fd = new FormData();
    fd.append('file', file);
    fd.append('path', destPath);   // honour the currently-browsed directory

    const xhr = new XMLHttpRequest();
    xhr.open('POST', appendToken(`/api/v1/videos/upload`));

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) setUploadPct(Math.round((e.loaded / e.total) * 100));
    });

    xhr.addEventListener('load', () => {
      setUploading(false);
      setUploadPct(100);
      if (xhr.status >= 200 && xhr.status < 300) {
        setUploadMsg({
          text: '✅ Upload complete — encoding pipeline triggered. Your video will appear in the library once encoding finishes.',
          ok: true,
        });
        setDrawerOpen(false);
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

      {/* ── Upload / File Explorer Panel ── */}
      <div className="panel" id="uploadPanel">
        <div className="section-label" style={{ marginBottom: 12 }}>📤 Upload .mp4 to Pipeline</div>

        {/* Toolbar — mirrors FileBrowserPage */}
        <div className="browser-toolbar">
          <Breadcrumb currentPath={currentPath} onNavigate={navigate} />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginLeft: 'auto' }}>
            <button
              className="btn"
              id="btn-toggle-upload-drawer"
              onClick={() => setDrawerOpen(o => !o)}
            >
              {drawerOpen ? <><FaXmark /> Close</> : <><FaUpload /> Upload .mp4</>}
            </button>
            <button
              className="btn btn-icon"
              id="btn-refresh-browser"
              onClick={() => navigate(currentPath)}
              title="Refresh"
            >
              <FaRotateRight />
            </button>
          </div>
        </div>

        {/* Upload status message — persists outside the drawer */}
        {uploadMsg && (
          <div
            id="uploadStatus"
            className={`status-line ${uploadMsg.ok ? 'success' : 'error'}`}
            style={{ marginTop: 10 }}
          >
            {uploadMsg.text}
          </div>
        )}

        {/* Upload Drawer — .mp4 only, no folder upload, no mkdir */}
        <UploadDrawer
          isOpen={drawerOpen}
          currentPath={currentPath}
          onUploadFile={handleUploadFile}
          uploadPct={uploadPct}
          isUploading={uploading}
          accept="video/mp4,.mp4"
          hideFolder
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
          onDelete={() => { /* delete disabled in StreamYard context */ }}
          onStream={openPlayer}
        />
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

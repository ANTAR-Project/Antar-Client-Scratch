import { useCallback, useRef, useState } from 'react';
import Hls from 'hls.js';
import { STREAMING_API, VIDEO_API } from '../config';
import { useAuth } from '../context/AuthContext';

export type UploadStatus = { msg: string; type: 'loading' | 'success' | 'error' | '' };
export type PlayerStatus = { msg: string; type: 'loading' | 'success' | 'error' | '' };

export interface QualityLevel {
  index: number;   // hls.js level index
  label: string;   // e.g. "1080p", "720p"
  height: number;
  bitrate: number;
}

export function useHlsPlayer() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef   = useRef<Hls | null>(null);
  const { appendToken } = useAuth();

  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ msg: '', type: '' });
  const [uploadPct,    setUploadPct]    = useState(0);
  const [uploading,    setUploading]    = useState(false);

  const [playerStatus, setPlayerStatus] = useState<PlayerStatus>({ msg: '', type: '' });
  const [infoBox, setInfoBox] = useState<{
    visible: boolean; movieId: string; nasPath: string; level: string; source: string;
  }>({ visible: false, movieId: '', nasPath: '', level: '', source: '' });

  // Quality state
  const [levels,        setLevels]        = useState<QualityLevel[]>([]);
  const [currentLevel,  setCurrentLevel]  = useState<number>(-1); // -1 = Auto

  // ── Switch Quality ──────────────────────────────────────────────
  const switchQuality = useCallback((levelIndex: number) => {
    const hls = hlsRef.current;
    if (!hls) return;
    hls.nextLevel = levelIndex; // -1 = Auto, 0..n = forced level (soft switch)
    setCurrentLevel(levelIndex);
  }, []);

  // ── Video Upload ──────────────────────────────────────────────
  const uploadVideo = useCallback(
    (movieId: string, file: File, onMovieId: (id: string) => void) => {
      setUploading(true);
      setUploadPct(0);
      setUploadStatus({ msg: '⏳ Uploading…', type: 'loading' });

      const fd = new FormData();
      fd.append('file', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${VIDEO_API}/upload/${encodeURIComponent(movieId)}`);
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) setUploadPct(Math.round((e.loaded / e.total) * 100));
      });
      xhr.addEventListener('load', () => {
        setUploadPct(100);
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadStatus({
            msg: `✅ Upload complete (HTTP ${xhr.status}) — encoding pipeline triggered.`,
            type: 'success',
          });
          onMovieId(movieId);
        } else {
          setUploadStatus({ msg: `❌ Upload failed: HTTP ${xhr.status}`, type: 'error' });
        }
        setUploading(false);
      });
      xhr.addEventListener('error', () => {
        setUploadStatus({ msg: '❌ Network error — is video-service running on :8082?', type: 'error' });
        setUploadPct(0);
        setUploading(false);
      });
      xhr.send(fd);
    },
    [],
  );

  // ── HLS Playback ──────────────────────────────────────────────
  const loadMovie = useCallback(async (movieId: string) => {
    if (!movieId) {
      setPlayerStatus({ msg: '❌ Please enter a Movie ID', type: 'error' });
      return;
    }
    setPlayerStatus({ msg: '⏳ Fetching playlist from streaming-service…', type: 'loading' });
    setLevels([]);
    setCurrentLevel(-1);

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    try {
      const streamUrl = appendToken(`${STREAMING_API}/${encodeURIComponent(movieId)}`);
      const r = await fetch(streamUrl);
      if (r.status === 404) throw new Error(`Movie "${movieId}" not found — has it been encoded yet?`);
      if (!r.ok) throw new Error(`streaming-service error: HTTP ${r.status}`);
      const m3u8Text = await r.text();

      setPlayerStatus({ msg: '✅ Playlist received — starting HLS playback…', type: 'success' });

      // Parse info box data from first non-comment URI line
      const line  = m3u8Text.split('\n').find((l) => l.trim() && !l.trim().startsWith('#')) || '—';
      const match = line.match(/path=([^&\s]+)/);
      const nasPath = match
        ? decodeURIComponent(match[1]).replace(/\/[^/]+$/, '/…')
        : line.trim().substring(0, 60);
      setInfoBox({
        visible: true,
        movieId,
        nasPath,
        level: 'Parsing manifest…',
        source: 'streaming-service :8084 → nas-orchestrator :8081',
      });

      // Segment paths from the backend are root-relative (/api/v1/nas-orchestrator/...).
      // Prefix with current origin so hls.js resolves them correctly through the proxy.
      const absoluteM3u8 = m3u8Text.replace(
        /^(\/api\/v1\/nas-orchestrator\/)/gm,
        `${window.location.origin}$1`,
      );
      const blobUrl = URL.createObjectURL(
        new Blob([absoluteM3u8], { type: 'application/x-mpegURL' }),
      );

      const video = videoRef.current;
      if (!video) return;

      if (Hls.isSupported()) {
        const hls = new Hls({
          debug: false,
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
          startLevel: -1, // auto pick best starting level
        });
        hlsRef.current = hls;
        hls.loadSource(blobUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
          // Build quality level list, sorted highest → lowest
          const parsed: QualityLevel[] = data.levels
            .map((l, idx) => ({
              index: idx,
              height: l.height,
              bitrate: l.bitrate,
              label: l.height ? `${l.height}p` : `Level ${idx}`,
            }))
            .sort((a, b) => b.height - a.height);
          setLevels(parsed);
          setCurrentLevel(-1); // Auto
          setInfoBox((prev) => ({
            ...prev,
            level: `Auto (${data.levels.length} levels available)`,
          }));
          video.play().catch(() => {});
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
          const lvl = hls.levels[data.level];
          if (lvl) {
            setInfoBox((prev) => ({
              ...prev,
              level: hls.autoLevelEnabled
                ? `Auto → ${lvl.height}p @ ${Math.round(lvl.bitrate / 1000)} kbps`
                : `${lvl.height}p @ ${Math.round(lvl.bitrate / 1000)} kbps (manual)`,
            }));
          }
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) setPlayerStatus({ msg: '❌ HLS fatal error: ' + data.details, type: 'error' });
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = blobUrl;
        video.play().catch(() => {});
      } else {
        setPlayerStatus({ msg: '❌ HLS not supported in this browser', type: 'error' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPlayerStatus({ msg: '❌ ' + msg, type: 'error' });
    }
  }, [appendToken]);

  return {
    videoRef,
    uploadStatus, uploadPct, uploading,
    playerStatus,  infoBox,
    levels, currentLevel,
    uploadVideo, loadMovie, switchQuality,
    setInfoBox,
  };
}

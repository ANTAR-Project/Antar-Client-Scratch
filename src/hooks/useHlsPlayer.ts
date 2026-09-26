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
    visible: boolean; nasPath: string; playlistPath: string; level: string; source: string;
  }>({ visible: false, nasPath: '', playlistPath: '', level: '', source: '' });

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
  // Upload goes through video-service, which scopes destination to {username}/{subPath}/{filename}.
  // subPath is an optional sub-directory under the user's workspace (replaces the old movieId).
  const uploadVideo = useCallback(
    (subPath: string, file: File, onNasPath: (nasPath: string) => void) => {
      setUploading(true);
      setUploadPct(0);
      setUploadStatus({ msg: '⏳ Uploading…', type: 'loading' });

      const fd = new FormData();
      fd.append('file', file);

      const xhr = new XMLHttpRequest();
      // path is an optional sub-directory; if empty, video lands at {username}/{filename}
      // appendToken attaches ?token= so video-service's TokenValidationFilter accepts the request
      const baseUrl = subPath.trim()
        ? `${VIDEO_API}/upload?path=${encodeURIComponent(subPath.trim())}`
        : `${VIDEO_API}/upload`;
      xhr.open('POST', appendToken(baseUrl));
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) setUploadPct(Math.round((e.loaded / e.total) * 100));
      });
      xhr.addEventListener('load', () => {
        setUploadPct(100);
        if (xhr.status >= 200 && xhr.status < 300) {
          // Response body is the nasPath, e.g. "video uploaded successfully! Key = alice/sample.mp4 ..."
          // Extract nasPath from the Key= portion of the response string
          const body = xhr.responseText ?? '';
          const keyMatch = body.match(/Key\s*=\s*([^\s:]+)/);
          const nasPath = keyMatch ? keyMatch[1] : '';
          setUploadStatus({
            msg: `✅ Upload complete (HTTP ${xhr.status}) — encoding pipeline triggered.${
              nasPath ? ` NAS path: ${nasPath}` : ''
            }`,
            type: 'success',
          });
          onNasPath(nasPath);
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
    [appendToken],
  );

  // ── HLS Playback ──────────────────────────────────────────────
  // nasPath is the raw NAS path of the original uploaded video file,
  // e.g. "alice/sample.mp4" — the same value used as the Kafka key in video.uploaded.
  // streaming-service resolves this to the master.m3u8 path via Redis.
  const loadStream = useCallback(async (nasPath: string) => {
    if (!nasPath) {
      setPlayerStatus({ msg: '❌ Please enter a NAS path (e.g. alice/sample.mp4)', type: 'error' });
      return;
    }
    setPlayerStatus({ msg: '⏳ Fetching playlist from streaming-service…', type: 'loading' });
    setLevels([]);
    setCurrentLevel(-1);

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    try {
      // Path-based lookup — streaming-service scopes to {username}/{path} internally
      const streamUrl = appendToken(`${STREAMING_API}?path=${encodeURIComponent(nasPath)}`);
      const r = await fetch(streamUrl);
      if (r.status === 404) throw new Error(`No playlist found for "${nasPath}" — has encoding completed?`);
      if (!r.ok) throw new Error(`streaming-service error: HTTP ${r.status}`);
      const m3u8Text = await r.text();

      setPlayerStatus({ msg: '✅ Playlist received — starting HLS playback…', type: 'success' });

      // Parse playlist path from first non-comment URI line for the info box
      const line  = m3u8Text.split('\n').find((l) => l.trim() && !l.trim().startsWith('#')) || '—';
      const match = line.match(/path=([^&\s]+)/);
      const playlistPath = match
        ? decodeURIComponent(match[1]).replace(/\/[^/]+$/, '/…')
        : line.trim().substring(0, 60);
      setInfoBox({
        visible: true,
        nasPath,
        playlistPath,
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
    uploadVideo, loadStream, switchQuality,
    setInfoBox,
  };
}

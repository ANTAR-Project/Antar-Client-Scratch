import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Hls from 'hls.js';
import { STREAMING_API } from '../config';
import { useAuth } from '../context/AuthContext';
import type { QualityLevel } from '../hooks/useHlsPlayer';

/** Standalone, full-page immersive HLS player opened in a new tab. */
export default function StreamPlayerPage() {
  const { appendToken, token } = useAuth();
  const [searchParams] = useSearchParams();
  const nasPath = searchParams.get('path') ?? '';

  const videoRef   = useRef<HTMLVideoElement>(null);
  const hlsRef     = useRef<Hls | null>(null);
  const overlayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [status,       setStatus]       = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg,     setErrorMsg]     = useState('');
  const [levels,       setLevels]       = useState<QualityLevel[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1);
  const [hlsAutoLevel, setHlsAutoLevel] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [isMuted,      setIsMuted]      = useState(false);
  const [volume,       setVolume]       = useState(1);
  const [currentTime,  setCurrentTime]  = useState(0);
  const [duration,     setDuration]     = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showQuality,  setShowQuality]  = useState(false);
  const [buffered,     setBuffered]     = useState(0);
  const [activeLevelLabel, setActiveLevelLabel] = useState('Auto');

  const title = nasPath.replace(/^.*\//, '').replace(/\.[^.]+$/, '');

  // ── Auto-hide controls ────────────────────────────────────────
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (overlayRef.current) clearTimeout(overlayRef.current);
    overlayRef.current = setTimeout(() => setShowControls(false), 3500);
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => { if (overlayRef.current) clearTimeout(overlayRef.current); };
  }, [resetHideTimer]);

  // ── Load HLS stream ───────────────────────────────────────────
  useEffect(() => {
    if (!nasPath || !token) {
      setStatus('error');
      setErrorMsg(!token ? 'You are not authenticated — please sign in.' : 'No video path specified.');
      return;
    }

    let destroyed = false;

    (async () => {
      setStatus('loading');
      try {
        const streamUrl = appendToken(`${STREAMING_API}?path=${encodeURIComponent(nasPath)}`);
        const r = await fetch(streamUrl);
        if (r.status === 404) throw new Error(`Playlist not found for "${nasPath}" — encoding may still be in progress.`);
        if (!r.ok) throw new Error(`streaming-service: HTTP ${r.status}`);
        const m3u8Text = await r.text();

        if (destroyed) return;

        const absoluteM3u8 = m3u8Text.replace(
          /^(\/api\/v1\/nas-orchestrator\/)/gm,
          `${window.location.origin}$1`,
        );
        const blobUrl = URL.createObjectURL(
          new Blob([absoluteM3u8], { type: 'application/x-mpegURL' }),
        );

        const video = videoRef.current;
        if (!video || destroyed) return;

        if (Hls.isSupported()) {
          const hls = new Hls({ debug: false, enableWorker: true, backBufferLength: 90, startLevel: -1 });
          hlsRef.current = hls;
          hls.loadSource(blobUrl);
          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
            if (destroyed) return;
            const parsed: QualityLevel[] = data.levels
              .map((l, idx) => ({ index: idx, height: l.height, bitrate: l.bitrate, label: l.height ? `${l.height}p` : `Level ${idx}` }))
              .sort((a, b) => b.height - a.height);
            setLevels(parsed);
            setCurrentLevel(-1);
            setHlsAutoLevel(true);
            setActiveLevelLabel('Auto');
            setStatus('ready');
            video.play().catch(() => {});
          });

          hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
            const lvl = hls.levels[data.level];
            if (lvl) {
              const label = hls.autoLevelEnabled
                ? `Auto · ${lvl.height}p`
                : `${lvl.height}p`;
              setActiveLevelLabel(label);
            }
          });

          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal && !destroyed) {
              setStatus('error');
              setErrorMsg('HLS fatal error: ' + data.details);
            }
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = blobUrl;
          setStatus('ready');
          video.play().catch(() => {});
        } else {
          throw new Error('HLS is not supported in this browser.');
        }
      } catch (err: unknown) {
        if (!destroyed) {
          setStatus('error');
          setErrorMsg(err instanceof Error ? err.message : String(err));
        }
      }
    })();

    return () => {
      destroyed = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nasPath, token]);

  // ── Video event listeners ─────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay   = () => setIsPlaying(true);
    const onPause  = () => setIsPlaying(false);
    const onTime   = () => {
      setCurrentTime(video.currentTime);
      if (video.buffered.length) setBuffered(video.buffered.end(video.buffered.length - 1));
    };
    const onDur    = () => setDuration(video.duration);
    const onVol    = () => { setIsMuted(video.muted); setVolume(video.volume); };
    const onFs     = () => setIsFullscreen(!!document.fullscreenElement);

    video.addEventListener('play',            onPlay);
    video.addEventListener('pause',           onPause);
    video.addEventListener('timeupdate',      onTime);
    video.addEventListener('durationchange',  onDur);
    video.addEventListener('volumechange',    onVol);
    document.addEventListener('fullscreenchange', onFs);

    return () => {
      video.removeEventListener('play',            onPlay);
      video.removeEventListener('pause',           onPause);
      video.removeEventListener('timeupdate',      onTime);
      video.removeEventListener('durationchange',  onDur);
      video.removeEventListener('volumechange',    onVol);
      document.removeEventListener('fullscreenchange', onFs);
    };
  }, []);

  // ── Controls ──────────────────────────────────────────────────
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play() : v.pause();
  };

  const seek = (to: number) => {
    const v = videoRef.current;
    if (!v || !isFinite(to)) return;
    v.currentTime = to;
  };

  const changeVolume = (val: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = val;
    v.muted  = val === 0;
    setVolume(val);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  };

  const switchQuality = (idx: number) => {
    const hls = hlsRef.current;
    if (!hls) return;
    hls.nextLevel = idx;
    setCurrentLevel(idx);
    setHlsAutoLevel(idx === -1);
    setShowQuality(false);
  };

  const toggleFullscreen = () => {
    const el = document.getElementById('stream-player-root');
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  const fmt = (s: number) => {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufPct = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      id="stream-player-root"
      className="sp-root"
      onMouseMove={resetHideTimer}
      onClick={resetHideTimer}
    >
      {/* ── Video element ── */}
      <video
        ref={videoRef}
        id="sp-video"
        className="sp-video"
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        playsInline
      />

      {/* ── Loading overlay ── */}
      {status === 'loading' && (
        <div className="sp-loading">
          <div className="sp-spinner" />
          <div className="sp-loading-text">Loading stream…</div>
        </div>
      )}

      {/* ── Error overlay ── */}
      {status === 'error' && (
        <div className="sp-error">
          <div className="sp-error-icon">⚠</div>
          <div className="sp-error-title">Playback Error</div>
          <div className="sp-error-msg">{errorMsg}</div>
          <button className="sp-retry-btn" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      )}

      {/* ── Top gradient + title bar ── */}
      <div className={`sp-topbar${showControls ? ' visible' : ''}`}>
        <button className="sp-back-btn" onClick={() => window.close()}>
          ← Close
        </button>
        <div className="sp-title">{title || 'Streaming…'}</div>
        <div className="sp-quality-badge">{activeLevelLabel}</div>
      </div>

      {/* ── Bottom controls ── */}
      <div className={`sp-controls${showControls ? ' visible' : ''}`}>
        {/* Progress bar */}
        <div
          className="sp-progress-area"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            seek(((e.clientX - rect.left) / rect.width) * duration);
          }}
        >
          <div className="sp-progress-track">
            <div className="sp-progress-buffer" style={{ width: `${bufPct}%` }} />
            <div className="sp-progress-fill" style={{ width: `${pct}%` }}>
              <div className="sp-progress-thumb" />
            </div>
          </div>
        </div>

        {/* Control row */}
        <div className="sp-control-row">
          {/* Left cluster */}
          <div className="sp-ctrl-left">
            <button id="sp-play-btn" className="sp-ctrl-btn sp-play-btn" onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1"/>
                  <rect x="14" y="4" width="4" height="16" rx="1"/>
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5,3 19,12 5,21"/>
                </svg>
              )}
            </button>

            {/* Volume */}
            <div className="sp-volume-group">
              <button id="sp-mute-btn" className="sp-ctrl-btn" onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'}>
                {isMuted || volume === 0 ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 9v6h4l5 5V4L7 9H3z"/>
                    <line x1="17" y1="7" x2="23" y2="13" stroke="currentColor" strokeWidth="2"/>
                    <line x1="23" y1="7" x2="17" y2="13" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 9v6h4l5 5V4L7 9H3z"/>
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" opacity=".6"/>
                    <path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                  </svg>
                )}
              </button>
              <input
                id="sp-volume-slider"
                type="range"
                className="sp-volume-slider"
                min={0} max={1} step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => changeVolume(Number(e.target.value))}
              />
            </div>

            {/* Time */}
            <span className="sp-time">{fmt(currentTime)} / {fmt(duration)}</span>
          </div>

          {/* Right cluster */}
          <div className="sp-ctrl-right">
            {/* Quality selector */}
            {levels.length > 0 && (
              <div className="sp-quality-wrap">
                <button
                  id="sp-quality-btn"
                  className="sp-ctrl-btn sp-quality-toggle"
                  onClick={() => setShowQuality(v => !v)}
                  title="Quality"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5"/>
                    <path d="M2 12l10 5 10-5"/>
                  </svg>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>HD</span>
                </button>

                {showQuality && (
                  <div className="sp-quality-menu" id="sp-quality-menu">
                    <div className="sp-quality-menu-title">Quality</div>
                    <button
                      className={`sp-quality-option${currentLevel === -1 ? ' active' : ''}`}
                      onClick={() => switchQuality(-1)}
                    >
                      <span>Auto</span>
                      {currentLevel === -1 && <span className="sp-quality-check">✓</span>}
                    </button>
                    {levels.map(lvl => (
                      <button
                        key={lvl.index}
                        className={`sp-quality-option${currentLevel === lvl.index ? ' active' : ''}`}
                        onClick={() => switchQuality(lvl.index)}
                      >
                        <span>{lvl.label} <span style={{ opacity: 0.5, fontSize: 11 }}>{Math.round(lvl.bitrate / 1000)}k</span></span>
                        {currentLevel === lvl.index && <span className="sp-quality-check">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Fullscreen */}
            <button id="sp-fullscreen-btn" className="sp-ctrl-btn" onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
              {isFullscreen ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Big play/pause centre button (flash) ── */}
      {status === 'ready' && !isPlaying && (
        <button className="sp-centre-play" onClick={togglePlay} id="sp-centre-play-btn">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21"/>
          </svg>
        </button>
      )}
    </div>
  );
}

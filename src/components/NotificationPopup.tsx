import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PlaylistReadyPayload } from '../hooks/useNotifications';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Derive a human-friendly title from the raw NAS path. */
function titleFromPath(rawPath: string): string {
  const parts = rawPath.replace(/\\/g, '/').split('/');
  const name  = parts[parts.length - 1] || rawPath;
  // Strip common video extensions
  return name.replace(/\.(mp4|mkv|avi|mov|webm|ts|m4v)$/i, '');
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface NotificationItem {
  id: string;
  payload: PlaylistReadyPayload;
  /** true once the dismiss animation is in progress */
  exiting: boolean;
}

interface NotificationPopupProps {
  notifications: NotificationItem[];
  onDismiss: (id: string) => void;
}

// ── Single notification card ──────────────────────────────────────────────────

function NotificationCard({
  item,
  onDismiss,
}: {
  item: NotificationItem;
  onDismiss: () => void;
}) {
  const navigate = useNavigate();

  const handlePlay = () => {
    // StreamPlayerPage forwards ?path= to the streaming-service as the movieId,
    // which must be the original raw NAS path — NOT the playlistPath (m3u8 URL).
    navigate(`/player?path=${encodeURIComponent(item.payload.rawPath)}`);
    onDismiss();
  };

  const title = titleFromPath(item.payload.rawPath);

  return (
    <div
      className={`notif-card ${item.exiting ? 'notif-card--exit' : 'notif-card--enter'}`}
      role="alert"
      aria-live="polite"
    >
      {/* Glow accent bar */}
      <div className="notif-accent" />

      {/* Icon */}
      <div className="notif-icon-wrap" aria-hidden="true">
        <svg
          className="notif-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
        </svg>
      </div>

      {/* Body */}
      <div className="notif-body">
        <p className="notif-label">Playlist ready</p>
        <p className="notif-title" title={title}>{title}</p>
        <p className="notif-sub" title={item.payload.playlistPath}>
          {item.payload.playlistPath}
        </p>

        {/* Actions */}
        <div className="notif-actions">
          <button
            id={`notif-play-${item.id}`}
            className="notif-btn-play"
            onClick={handlePlay}
          >
            ▶ Play now
          </button>
          <button
            id={`notif-dismiss-${item.id}`}
            className="notif-btn-dismiss"
            onClick={onDismiss}
          >
            Dismiss
          </button>
        </div>
      </div>

      {/* Close × */}
      <button
        id={`notif-close-${item.id}`}
        className="notif-close"
        onClick={onDismiss}
        aria-label="Close notification"
      >
        ×
      </button>

      {/* Auto-dismiss progress ring */}
      <div className="notif-timer" aria-hidden="true" />
    </div>
  );
}

// ── Popup container ───────────────────────────────────────────────────────────

export default function NotificationPopup({ notifications, onDismiss }: NotificationPopupProps) {
  if (notifications.length === 0) return null;

  return (
    <div className="notif-portal" role="region" aria-label="Notifications">
      {notifications.map((item) => (
        <NotificationCard
          key={item.id}
          item={item}
          onDismiss={() => onDismiss(item.id)}
        />
      ))}
    </div>
  );
}

// ── useNotificationQueue — manages the popup list ─────────────────────────────

const DISPLAY_MS   = 8_000; // how long before auto-dismiss
const EXIT_ANIM_MS = 350;   // duration of the exit CSS animation

export function useNotificationQueue() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const scheduleAutoDismiss = (id: string) => {
    const t = setTimeout(() => dismiss(id), DISPLAY_MS);
    timers.current.set(id, t);
  };

  const enqueue = (payload: PlaylistReadyPayload) => {
    const id = crypto.randomUUID();
    setItems((prev) => [...prev, { id, payload, exiting: false }]);
    scheduleAutoDismiss(id);
  };

  const dismiss = (id: string) => {
    // Clear the auto-dismiss timer (in case dismiss was user-triggered).
    const t = timers.current.get(id);
    if (t !== undefined) { clearTimeout(t); timers.current.delete(id); }

    // Trigger the exit animation first.
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, exiting: true } : item))
    );

    // Remove from state after animation completes.
    setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, EXIT_ANIM_MS);
  };

  // Cleanup timers on unmount.
  useEffect(() => {
    return () => { timers.current.forEach(clearTimeout); };
  }, []);

  return { items, enqueue, dismiss };
}

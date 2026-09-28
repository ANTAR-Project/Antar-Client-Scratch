import { useCallback, useEffect, useRef, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PlaylistReadyPayload {
  type: 'PLAYLIST_READY';
  rawPath: string;
  playlistPath: string;
  thumbnailPath: string;
}

export type NotificationPayload = PlaylistReadyPayload;

export type WsStatus = 'connecting' | 'connected' | 'disconnected';

interface UseNotificationsOptions {
  /** Fired every time a PLAYLIST_READY message arrives. */
  onPlaylistReady: (payload: PlaylistReadyPayload) => void;
  /** WebSocket URL including the path, e.g. ws://localhost:8087/ws/notifications */
  url: string;
  /** JWT — if null/empty the hook does nothing (user not logged in). */
  token: string | null;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

const MIN_RECONNECT_MS = 1_000;
const MAX_RECONNECT_MS = 30_000;

/**
 * Manages a persistent WebSocket connection to notification-service.
 *
 * • Reconnects automatically on close/error with exponential back-off (1 s → 30 s).
 * • Resets and reconnects whenever `token` changes (logout → new login).
 * • Cleans up cleanly on unmount.
 */
export function useNotifications({ url, token, onPlaylistReady }: UseNotificationsOptions) {
  const [status, setStatus] = useState<WsStatus>('disconnected');
  const socketRef      = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelay = useRef(MIN_RECONNECT_MS);
  const onMessageRef   = useRef(onPlaylistReady);

  // Keep the callback ref up to date without restarting the connection.
  useEffect(() => { onMessageRef.current = onPlaylistReady; }, [onPlaylistReady]);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimer.current !== null) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    clearReconnectTimer();
    if (socketRef.current) {
      // Prevent the onclose handler from scheduling another reconnect.
      socketRef.current.onclose = null;
      socketRef.current.onerror = null;
      socketRef.current.close();
      socketRef.current = null;
    }
    setStatus('disconnected');
  }, [clearReconnectTimer]);

  const connect = useCallback(() => {
    if (!token) return;

    clearReconnectTimer();
    setStatus('connecting');

    const ws = new WebSocket(`${url}?token=${encodeURIComponent(token)}`);
    socketRef.current = ws;

    ws.onopen = () => {
      reconnectDelay.current = MIN_RECONNECT_MS; // reset back-off on success
      setStatus('connected');
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data as string) as NotificationPayload;
        if (payload.type === 'PLAYLIST_READY') {
          onMessageRef.current(payload);
        }
      } catch {
        // malformed JSON — ignore silently
      }
    };

    ws.onerror = () => {
      // onerror is always followed by onclose; let onclose schedule reconnect.
    };

    ws.onclose = () => {
      setStatus('disconnected');
      socketRef.current = null;
      // Schedule reconnect with exponential back-off.
      reconnectTimer.current = setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, MAX_RECONNECT_MS);
        connect();
      }, reconnectDelay.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, url, clearReconnectTimer]);

  // Connect on mount / whenever token changes; disconnect on unmount.
  useEffect(() => {
    if (!token) {
      disconnect();
      return;
    }
    connect();
    return disconnect;
  }, [token, connect, disconnect]);

  return { status };
}

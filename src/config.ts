export const API     = import.meta.env.VITE_API_URL as string;
export const NAS_IP  = import.meta.env.VITE_NAS_IP  as string;

// In dev, all requests go through the Vite proxy (same origin → no CORS).
// In production, the reverse proxy must serve these paths from the same origin.
export const NAS_API       = '/api/v1/nas-orchestrator';
export const STREAMING_API = '/api/v1/stream';
export const VIDEO_API     = '/api/v1/videos';
export const AUTH_API      = '/api/v1/auth-service';

// notification-service WebSocket endpoint.
// WebSocket upgrades cannot be trivially proxied through Vite's HTTP proxy,
// so we connect directly to the service port in dev.
// Override via VITE_WS_NOTIFICATION_URL in your .env if needed.
export const NOTIFICATION_WS_URL =
  (import.meta.env.VITE_WS_NOTIFICATION_URL as string | undefined) ??
  'ws://localhost:8087/ws/notifications';

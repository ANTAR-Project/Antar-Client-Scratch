export const API     = import.meta.env.VITE_API_URL as string;
export const NAS_IP  = import.meta.env.VITE_NAS_IP  as string;

// In dev, all requests go through the Vite proxy (same origin → no CORS).
// In production, the reverse proxy must serve these paths from the same origin.
export const NAS_API       = '/api/v1/nas-orchestrator';
export const STREAMING_API = '/api/v1/stream';
export const VIDEO_API     = '/api/v1/videos';


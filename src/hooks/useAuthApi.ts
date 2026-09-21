import { useCallback } from 'react';
import { AUTH_API } from '../config';

// ── auth-service API (/api/v1/auth-service) ───────────────────────────────────
// Endpoints:
//   POST   /tokens            — Mint or re-issue an opaque auth token
//   GET    /tokens/validate   — Validate a token over HTTP REST
//   GET    /health            — Health check

export interface MintTokenResponse {
  token: string;
}

export interface ValidateTokenResponse {
  valid: boolean;
  username?: string;
}

export function useAuthApi() {
  /**
   * POST /api/v1/auth-service/tokens
   * Mint or re-issue an opaque auth token for the given username.
   * Re-issuing invalidates any previously active token for that identity.
   */
  const mintToken = useCallback(async (username: string): Promise<MintTokenResponse> => {
    const res = await fetch(`${AUTH_API}/tokens`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<MintTokenResponse>;
  }, []);

  /**
   * GET /api/v1/auth-service/tokens/validate?token=<token>
   * Validate an opaque token over HTTP REST.
   * (High-throughput path uses gRPC ValidateToken on :4091 — this is the REST equivalent.)
   */
  const validateToken = useCallback(async (token: string): Promise<ValidateTokenResponse> => {
    const res = await fetch(
      `${AUTH_API}/tokens/validate?token=${encodeURIComponent(token)}`,
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<ValidateTokenResponse>;
  }, []);

  /**
   * GET /api/v1/auth-service/health
   * Auth-service liveness check — returns 200 when the service is up.
   */
  const healthCheck = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`${AUTH_API}/health`);
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  return {
    mintToken,
    validateToken,
    healthCheck,
  };
}

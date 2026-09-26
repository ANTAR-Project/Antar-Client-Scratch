import { useCallback } from 'react';
import { AUTH_API } from '../config';

// ── auth-service API (/api/v1/auth-service) ───────────────────────────────────
// Endpoints:
//   POST   /register             — Register a new user identity (bcrypt-hashed password)
//   POST   /login                — Authenticate and receive a signed HS256 JWT
//   GET    /tokens/validate      — Validate a JWT over HTTP REST
//   GET    /health               — Health check

export interface RegisterRequest {
  username: string;
  password: string;
  accountType?: 'USER' | 'SERVICE';
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  username: string;
  token: string;
}

export interface ValidateTokenResponse {
  username: string;
}

export function useAuthApi() {
  /**
   * POST /api/v1/auth-service/register
   * Register a new user identity with a bcrypt-hashed password.
   * Username must match ^[a-zA-Z0-9._-]{1,64}$; password must be ≥ 12 chars.
   * Returns 201 on success, 409 if username already exists.
   */
  const register = useCallback(async (req: RegisterRequest): Promise<void> => {
    const res = await fetch(`${AUTH_API}/register`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(req),
    });
    if (res.status === 409) throw new Error('Username already taken');
    if (!res.ok) {
      let detail = '';
      try { detail = await res.text(); } catch { /* ignore */ }
      throw new Error(`Registration failed: HTTP ${res.status}${detail ? ` — ${detail}` : ''}`);
    }
  }, []);

  /**
   * POST /api/v1/auth-service/login
   * Authenticate with username + password and receive a signed HS256 JWT.
   * Returns 401 on bad credentials.
   */
  const login = useCallback(async (req: LoginRequest): Promise<LoginResponse> => {
    const res = await fetch(`${AUTH_API}/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(req),
    });
    if (res.status === 401) throw new Error('Invalid username or password');
    if (!res.ok) throw new Error(`Login failed: HTTP ${res.status}`);
    return res.json() as Promise<LoginResponse>;
  }, []);

  /**
   * GET /api/v1/auth-service/tokens/validate?token=<token>
   * Validate a JWT over HTTP REST; returns the subject username on success.
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
    register,
    login,
    validateToken,
    healthCheck,
  };
}

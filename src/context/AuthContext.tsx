import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';

// ── Constants ────────────────────────────────────────────────────────────────
const LS_TOKEN_KEY    = 'antar_auth_token';
const LS_USERNAME_KEY = 'antar_username';

// ── Types ────────────────────────────────────────────────────────────────────
interface AuthState {
  token:    string | null;
  username: string | null;
}

interface AuthContextValue extends AuthState {
  /** Store the supplied token in context & localStorage. */
  setToken: (token: string, username?: string) => void;
  logout: () => void;
  /** Convenience: auth header object to spread into fetch() options */
  authHeader: Record<string, string>;
  /** Append ?token=... to a URL string */
  appendToken: (url: string) => string;
}

// ── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => ({
    token:    localStorage.getItem(LS_TOKEN_KEY),
    username: localStorage.getItem(LS_USERNAME_KEY),
  }));

  // Keep localStorage in sync whenever state changes
  useEffect(() => {
    if (state.token) {
      localStorage.setItem(LS_TOKEN_KEY, state.token);
    } else {
      localStorage.removeItem(LS_TOKEN_KEY);
    }
    if (state.username) {
      localStorage.setItem(LS_USERNAME_KEY, state.username);
    } else {
      localStorage.removeItem(LS_USERNAME_KEY);
    }
  }, [state.token, state.username]);

  const setToken = useCallback((token: string, username?: string) => {
    setState({ token: token.trim(), username: username?.trim() ?? null });
  }, []);

  const logout = useCallback(() => {
    setState({ token: null, username: null });
  }, []);

  const authHeader = useMemo<Record<string, string>>(
    () => (state.token ? { 'X-Auth-Token': state.token } : ({} as Record<string, string>)),
    [state.token],
  );

  const appendToken = useCallback(
    (url: string): string => {
      if (!state.token) return url;
      const sep = url.includes('?') ? '&' : '?';
      return `${url}${sep}token=${encodeURIComponent(state.token)}`;
    },
    [state.token],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, setToken, logout, authHeader, appendToken }),
    [state, setToken, logout, authHeader, appendToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

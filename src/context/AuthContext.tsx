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
const LS_TOKEN_KEY = 'antar_auth_token';

// ── Types ────────────────────────────────────────────────────────────────────
interface AuthState {
  token: string | null;
}

interface AuthContextValue extends AuthState {
  /** Store the supplied token in context & localStorage. */
  setToken: (token: string) => void;
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
    token: localStorage.getItem(LS_TOKEN_KEY),
  }));

  // Keep localStorage in sync whenever state changes
  useEffect(() => {
    if (state.token) {
      localStorage.setItem(LS_TOKEN_KEY, state.token);
    } else {
      localStorage.removeItem(LS_TOKEN_KEY);
    }
  }, [state.token]);

  const setToken = useCallback((token: string) => {
    setState({ token: token.trim() });
  }, []);

  const logout = useCallback(() => {
    setState({ token: null });
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

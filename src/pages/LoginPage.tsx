import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAuthApi } from '../hooks/useAuthApi';

interface LoginPageProps {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

type Tab = 'login' | 'register';

export default function LoginPage({ showToast }: LoginPageProps) {
  const { setToken } = useAuth();
  const { login, register } = useAuthApi();

  const [tab,      setTab]      = useState<Tab>('login');
  const [loading,  setLoading]  = useState(false);

  // Login fields
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register fields
  const [regUsername,  setRegUsername]  = useState('');
  const [regPassword,  setRegPassword]  = useState('');
  const [regPassword2, setRegPassword2] = useState('');

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword) return;
    setLoading(true);
    try {
      const res = await login({ username: loginUsername.trim(), password: loginPassword });
      setToken(res.token, res.username);
      showToast(`✅ Welcome back, ${res.username}!`, 'success');
    } catch (err: unknown) {
      showToast('❌ ' + (err instanceof Error ? err.message : String(err)), 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Register ───────────────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const u = regUsername.trim();
    const p = regPassword;
    const p2 = regPassword2;

    if (!u || !p) return;
    if (p !== p2) { showToast('❌ Passwords do not match', 'error'); return; }
    if (p.length < 12) { showToast('❌ Password must be at least 12 characters', 'error'); return; }
    if (!/^[a-zA-Z0-9._-]{1,64}$/.test(u)) {
      showToast('❌ Username may only contain letters, digits, . _ -  (max 64 chars)', 'error');
      return;
    }

    setLoading(true);
    try {
      await register({ username: u, password: p });
      showToast('✅ Account created! You can now sign in.', 'success');
      setRegUsername(''); setRegPassword(''); setRegPassword2('');
      setTab('login');
      setLoginUsername(u);
    } catch (err: unknown) {
      showToast('❌ ' + (err instanceof Error ? err.message : String(err)), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page page-enter">
      <div className="login-card">
        {/* ── Brand ── */}
        <div className="login-logo-row">
          <img src="/logo.png" alt="ANTAR Logo" className="login-logo" />
          <div>
            <div className="login-brand">ANTAR</div>
            <div className="login-subtitle">NAS Orchestrator</div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="auth-tabs">
          <button
            id="tab-btn-login"
            className={`auth-tab${tab === 'login' ? ' active' : ''}`}
            onClick={() => setTab('login')}
            type="button"
          >
            Sign In
          </button>
          <button
            id="tab-btn-register"
            className={`auth-tab${tab === 'register' ? ' active' : ''}`}
            onClick={() => setTab('register')}
            type="button"
          >
            Create Account
          </button>
        </div>

        {/* ── Login Form ── */}
        {tab === 'login' && (
          <form className="login-form" onSubmit={handleLogin} autoComplete="on">
            <div>
              <label className="login-label" htmlFor="login-username">Username</label>
              <input
                id="login-username"
                type="text"
                className="input"
                style={{ marginTop: 8 }}
                placeholder="e.g. alice"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                autoFocus
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="login-label" htmlFor="login-password" style={{ display: 'block', marginBottom: 8 }}>Password</label>
              <input
                id="login-password"
                type="password"
                className="input"
                placeholder="Your password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <button
              id="login-submit"
              className="btn-primary login-submit-btn"
              type="submit"
              disabled={loading || !loginUsername.trim() || !loginPassword}
            >
              {loading ? <span className="login-spinner" /> : null}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        )}

        {/* ── Register Form ── */}
        {tab === 'register' && (
          <form className="login-form" onSubmit={handleRegister} autoComplete="off">
            <div>
              <label className="login-label" htmlFor="reg-username">Username</label>
              <input
                id="reg-username"
                type="text"
                className="input"
                style={{ marginTop: 8 }}
                placeholder="Letters, digits, . _ - (max 64)"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                autoFocus
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="login-label" htmlFor="reg-password" style={{ display: 'block', marginBottom: 8 }}>Password <span style={{ opacity: 0.45, fontWeight: 400 }}>(min 12 chars)</span></label>
              <input
                id="reg-password"
                type="password"
                className="input"
                placeholder="At least 12 characters"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <div>
              <label className="login-label" htmlFor="reg-password2" style={{ display: 'block', marginBottom: 8 }}>Confirm Password</label>
              <input
                id="reg-password2"
                type="password"
                className="input"
                placeholder="Repeat your password"
                value={regPassword2}
                onChange={(e) => setRegPassword2(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <button
              id="register-submit"
              className="btn-primary login-submit-btn"
              type="submit"
              disabled={loading || !regUsername.trim() || !regPassword || !regPassword2}
            >
              {loading ? <span className="login-spinner" /> : null}
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
        )}

        <div className="login-hint">
          Your JWT is stored in <code>localStorage</code> and sent as{' '}
          <code>X-Auth-Token</code> on every protected API call.
        </div>
      </div>
    </div>
  );
}

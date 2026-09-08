import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface LoginPageProps {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function LoginPage({ showToast }: LoginPageProps) {
  const { setToken } = useAuth();
  const [token, setTokenInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = token.trim();
    if (!trimmed) return;
    setToken(trimmed);
    showToast('✅ Token saved — you are now signed in', 'success');
  };

  return (
    <div className="login-page page-enter">
      <div className="login-card">
        <div className="login-logo-row">
          <img src="/logo.png" alt="ANTAR Logo" className="login-logo" />
          <div>
            <div className="login-brand">ANTAR</div>
            <div className="login-subtitle">NAS Orchestrator</div>
          </div>
        </div>

        <p className="login-desc">
          Paste your <strong>auth token</strong> below. It will be stored locally and
          attached to every API request automatically.
        </p>

        <form className="login-form" onSubmit={handleSubmit} autoComplete="off">
          <label className="login-label" htmlFor="login-token">Auth Token</label>
          <input
            id="login-token"
            type="password"
            className="input"
            placeholder="Paste your token here…"
            value={token}
            onChange={(e) => setTokenInput(e.target.value)}
            autoFocus
            autoComplete="current-password"
          />
          <button
            id="login-submit"
            className="btn-primary login-submit-btn"
            type="submit"
            disabled={token.trim().length === 0}
          >
            Save Token &amp; Sign In
          </button>
        </form>

        <div className="login-hint">
          The token is stored in <code>localStorage</code> and sent as{' '}
          <code>X-Auth-Token</code> on every protected API call.
        </div>
      </div>
    </div>
  );
}

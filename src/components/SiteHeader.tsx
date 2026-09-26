import { NavLink } from 'react-router-dom';
import { API, NAS_IP } from '../config';
import logoUrl from '/logo.png';
import { FaFolder, FaFolderOpen, FaGear, FaPlay, FaRightFromBracket } from 'react-icons/fa6';
import { useAuth } from '../context/AuthContext';

export default function SiteHeader() {
  const { username, logout } = useAuth();

  return (
    <div className="app-header">
      <header className="app-header-inner">
        <div className="logo-group">
          <img src={logoUrl} alt="ANTAR Logo" className="logo-img" />
          <div>
            <div className="logo-text-brand">ANTAR</div>
            <div className="logo-text-title">NAS Orchestrator</div>
            <div className="logo-text-sub">TrueNAS SCALE · ZFS SMB · Kafka HLS Pipeline</div>
          </div>
        </div>

        <div className="meta-chips">
          <div className="meta-chip">
            <span className="meta-chip-label">NAS</span>
            <span className="meta-chip-value">{NAS_IP}</span>
          </div>
          <div className="meta-chip">
            <span className="meta-chip-label">API</span>
            <span className="meta-chip-value">{API}</span>
          </div>

          {/* ── Auth chip ──────────────────────────────────────────── */}
          {username && (
            <div className="meta-chip meta-chip-auth">
              <span className="meta-chip-label">User</span>
              <span className="meta-chip-value" id="header-username">{username}</span>
              <button
                id="header-logout-btn"
                className="logout-btn"
                title="Sign out"
                onClick={logout}
              >
                <FaRightFromBracket />
              </button>
            </div>
          )}
        </div>
      </header>

      <nav className="app-tabs">
        <NavLink to="/" end id="tab-browser" className={({ isActive }) => `app-tab${isActive ? ' active' : ''}`}>
          <FaFolder style={{ fontSize: 13 }} />
          My Files
        </NavLink>
        <NavLink to="/shared" id="tab-shared" className={({ isActive }) => `app-tab${isActive ? ' active' : ''}`}>
          <FaFolderOpen style={{ fontSize: 13 }} />
          Shared
        </NavLink>
        <NavLink to="/workspace" id="tab-workspace" className={({ isActive }) => `app-tab${isActive ? ' active' : ''}`}>
          <FaGear style={{ fontSize: 13 }} />
          Workspace
        </NavLink>
        <NavLink to="/player" id="tab-player" className={({ isActive }) => `app-tab${isActive ? ' active' : ''}`}>
          <FaPlay style={{ fontSize: 12 }} />
          StreamYard
        </NavLink>
      </nav>
    </div>
  );
}

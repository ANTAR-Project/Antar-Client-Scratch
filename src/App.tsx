import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SiteHeader from './components/SiteHeader';
import ToastContainer from './components/ToastContainer';
import FileBrowserPage from './pages/FileBrowserPage';
import HlsPlayerPage from './pages/HlsPlayerPage';
import LoginPage from './pages/LoginPage';
import { useToast } from './hooks/useToast';
import { useAuth } from './context/AuthContext';

function App() {
  const { toasts, showToast, removeToast } = useToast();
  const { token } = useAuth();

  // ── Not authenticated — show login gate ────────────────────────────────────
  if (!token) {
    return (
      <>
        <LoginPage showToast={showToast} />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  return (
    <BrowserRouter>
      <div className="app-shell">
        <SiteHeader />

        <main className="app-main">
          <Routes>
            <Route path="/"       element={<FileBrowserPage showToast={showToast} />} />
            <Route path="/player" element={<HlsPlayerPage  showToast={showToast} />} />
          </Routes>
        </main>

        <footer className="app-footer">
          Playlist broker: <strong style={{ color: '#888' }}>streaming-service :8084</strong>
          {' → '}Segments: <strong style={{ color: '#888' }}>nas-orchestrator :8081</strong>
          {' '}(L1 Caffeine → SMB) · Segment URLs rewritten by{' '}
          <strong style={{ color: '#888' }}>PlaylistRewriteService</strong>
        </footer>

        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </BrowserRouter>
  );
}

export default App;
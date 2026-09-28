import { useCallback } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import SiteHeader from './components/SiteHeader';
import ToastContainer from './components/ToastContainer';
import NotificationPopup, { useNotificationQueue } from './components/NotificationPopup';
import FileBrowserPage from './pages/FileBrowserPage';
import StreamYardPage from './pages/StreamYardPage';
import StreamPlayerPage from './pages/StreamPlayerPage';
import LoginPage from './pages/LoginPage';
import SharedWorkspacePage from './pages/SharedWorkspacePage';
import WorkspacePage from './pages/WorkspacePage';
import { useToast } from './hooks/useToast';
import { useNotifications } from './hooks/useNotifications';
import type { PlaylistReadyPayload } from './hooks/useNotifications';
import { useAuth } from './context/AuthContext';
import { NOTIFICATION_WS_URL } from './config';

/** Routes that render without the shell chrome (header / footer). */
const BARE_ROUTES = ['/stream'];

function AppShell() {
  const { toasts, showToast, removeToast } = useToast();
  const { token } = useAuth();
  const { pathname } = useLocation();

  const isBare = BARE_ROUTES.some(p => pathname.startsWith(p));

  // ── Playlist-ready notifications ───────────────────────────────────────────
  const { items: notifications, enqueue, dismiss } = useNotificationQueue();

  const handlePlaylistReady = useCallback((payload: PlaylistReadyPayload) => {
    enqueue(payload);
  }, [enqueue]);

  useNotifications({
    url: NOTIFICATION_WS_URL,
    token,
    onPlaylistReady: handlePlaylistReady,
  });

  // ── Not authenticated — show login gate ────────────────────────────────────
  if (!token) {
    return (
      <>
        <LoginPage showToast={showToast} />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  // ── Bare routes (full-screen player) — no shell chrome ───────────────────
  if (isBare) {
    return (
      <>
        <Routes>
          <Route path="/stream" element={<StreamPlayerPage />} />
        </Routes>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
        <NotificationPopup notifications={notifications} onDismiss={dismiss} />
      </>
    );
  }

  return (
    <div className="app-shell">
      <SiteHeader />

      <main className="app-main">
        <Routes>
          <Route path="/"          element={<FileBrowserPage    showToast={showToast} />} />
          <Route path="/shared"    element={<SharedWorkspacePage showToast={showToast} />} />
          <Route path="/workspace" element={<WorkspacePage       showToast={showToast} />} />
          <Route path="/player"    element={<StreamYardPage      showToast={showToast} />} />
        </Routes>
      </main>

      <footer className="app-footer">
        Playlist broker: <strong style={{ color: '#888' }}>streaming-service :8084</strong>
        {' → '}Segments: <strong style={{ color: '#888' }}>nas-orchestrator :8081</strong>
        {' '}(L1 Caffeine → SMB) · Segment URLs rewritten by{' '}
        <strong style={{ color: '#888' }}>PlaylistRewriteService</strong>
      </footer>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <NotificationPopup notifications={notifications} onDismiss={dismiss} />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

export default App;
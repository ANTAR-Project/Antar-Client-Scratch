import type { FileEntry } from '../types';
import { getIcon, isPreviewable, formatSize, formatDate, joinPath } from '../utils';
import { FaEye, FaDownload, FaTrash, FaCirclePlay } from 'react-icons/fa6';

interface FileBrowserTableProps {
  entries: FileEntry[];
  status: 'idle' | 'loading' | 'error';
  errorMsg: string;
  currentPath: string;
  onNavigate: (path: string) => void;
  onPreview: (path: string) => void;
  onDownload: (path: string) => void;
  onDelete: (path: string, name: string) => void;
  /** Called when user clicks the Stream button on a video file. Path is the full NAS path. */
  onStream?: (path: string) => void;
}

/** Returns true for raw video formats that can be ingested through the HLS pipeline. */
function isStreamable(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return ['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext);
}

export default function FileBrowserTable({
  entries, status, errorMsg, currentPath,
  onNavigate, onPreview, onDownload, onDelete, onStream,
}: FileBrowserTableProps) {
  const sorted = [...entries].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });

  return (
    <div style={{ overflowX: 'auto', width: '100%' }} id="browser-body-wrap">
      <table className="file-table">
        <thead>
          <tr>
            <th style={{ width: '100%' }}>Name</th>
            <th>Size</th>
            <th>Modified</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="browser-body">

          {status === 'loading' && (
            <tr><td colSpan={4}>
              <div className="empty-state">
                <div className="empty-state-icon spin">⏳</div>
                <div className="empty-state-text">Loading…</div>
              </div>
            </td></tr>
          )}

          {status === 'error' && (
            <tr><td colSpan={4}>
              <div className="empty-state">
                <div className="empty-state-icon">⚠️</div>
                <div className="empty-state-text error">{errorMsg}</div>
              </div>
            </td></tr>
          )}

          {status === 'idle' && sorted.length === 0 && (
            <tr><td colSpan={4}>
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <div className="empty-state-text">This folder is empty</div>
              </div>
            </td></tr>
          )}

          {status === 'idle' && sorted.map((entry) => {
            const displayName  = entry.isDirectory ? entry.name.replace(/\/$/, '') : entry.name;
            const fullPath     = joinPath(currentPath, entry.name);
            const icon         = getIcon(entry.name, entry.isDirectory);
            const canPreview   = !entry.isDirectory && isPreviewable(entry.name);
            const canStream    = !entry.isDirectory && isStreamable(entry.name) && !!onStream;

            return (
              <tr key={fullPath} className="file-row">
                <td style={{ padding: 0 }}>
                  <div
                    className="file-cell-name"
                    onClick={() =>
                      entry.isDirectory
                        ? onNavigate(fullPath)
                        : canPreview
                        ? onPreview(fullPath)
                        : onDownload(fullPath)
                    }
                  >
                    <span className="file-icon">{icon}</span>
                    <span className="file-name">{displayName}</span>
                  </div>
                </td>
                <td className="file-cell-meta mono">
                  {entry.isDirectory ? '—' : formatSize(entry.size)}
                </td>
                <td className="file-cell-meta">
                  {formatDate(entry.lastModified)}
                </td>
                <td className="file-cell-actions">
                  <div className="file-row-actions">
                    {canStream && (
                      <button
                        className="btn-icon-sm"
                        title="Stream via HLS pipeline"
                        onClick={(e) => { e.stopPropagation(); onStream!(fullPath); }}
                        style={{ color: 'var(--accent, #6ee7b7)' }}
                      >
                        <FaCirclePlay />
                      </button>
                    )}
                    {!entry.isDirectory && canPreview && (
                      <button
                        className="btn-icon-sm"
                        title="Preview"
                        onClick={(e) => { e.stopPropagation(); onPreview(fullPath); }}
                      >
                        <FaEye />
                      </button>
                    )}
                    {!entry.isDirectory && (
                      <button
                        className="btn-icon-sm"
                        title="Download"
                        onClick={(e) => { e.stopPropagation(); onDownload(fullPath); }}
                      >
                        <FaDownload />
                      </button>
                    )}
                    <button
                      className="btn-icon-sm danger"
                      title="Delete"
                      onClick={(e) => { e.stopPropagation(); onDelete(fullPath, displayName); }}
                    >
                      <FaTrash />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

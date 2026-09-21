import { useState } from 'react';
import { useNasApi } from '../hooks/useNasApi';
import { useAuth } from '../context/AuthContext';
import { FaPlus, FaTrash, FaBroom } from 'react-icons/fa6';

interface WorkspacePageProps {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function WorkspacePage({ showToast }: WorkspacePageProps) {
  const { createWorkspace, deleteWorkspace, clearWorkspace } = useNasApi();
  const { username } = useAuth();

  const [workspaceName, setWorkspaceName] = useState(username ?? '');
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (
    label: string,
    action: () => Promise<boolean>,
    successMsg: string,
    failMsg: string,
  ) => {
    setBusy(label);
    try {
      const ok = await action();
      showToast(ok ? successMsg : failMsg, ok ? 'success' : 'error');
    } catch (err) {
      showToast('❌ ' + (err instanceof Error ? err.message : String(err)), 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div id="panel-workspace" className="page-enter">
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Workspace Management</h2>
          <p className="panel-subtitle">
            Provision, clear, or delete your isolated workspace directory on the NAS.
            These operations call{' '}
            <code>/api/v1/nas-orchestrator/workspace</code>.
          </p>
        </div>

        {/* Create Workspace */}
        <div className="workspace-card">
          <div className="workspace-card-header">
            <FaPlus className="workspace-card-icon icon-create" />
            <div>
              <div className="workspace-card-title">Create Workspace</div>
              <div className="workspace-card-desc">
                Provisions an isolated workspace folder for a user on TrueNAS.
                Body: <code>{`{ "name": "workspace_name" }`}</code>
              </div>
            </div>
          </div>
          <div className="workspace-card-row">
            <input
              id="workspace-name-input"
              className="input workspace-name-input"
              type="text"
              placeholder="workspace name (e.g. tester)"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
            />
            <button
              id="btn-create-workspace"
              className="btn btn-primary"
              disabled={!workspaceName.trim() || busy !== null}
              onClick={() =>
                run(
                  'create',
                  () => createWorkspace(workspaceName.trim()),
                  `✅ Workspace "${workspaceName.trim()}" created`,
                  '❌ Create workspace failed',
                )
              }
            >
              {busy === 'create' ? 'Creating…' : <><FaPlus /> Create</>}
            </button>
          </div>
        </div>

        {/* Clear Workspace */}
        <div className="workspace-card">
          <div className="workspace-card-header">
            <FaBroom className="workspace-card-icon icon-clear" />
            <div>
              <div className="workspace-card-title">Clear Workspace</div>
              <div className="workspace-card-desc">
                Removes all contents inside your workspace directory but keeps the directory itself.
                Endpoint: <code>DELETE /workspace/clear</code>
              </div>
            </div>
          </div>
          <div className="workspace-card-row">
            <button
              id="btn-clear-workspace"
              className="btn btn-warning"
              disabled={busy !== null}
              onClick={() => {
                if (!confirm('Clear all contents inside your workspace?\n\nThis cannot be undone.')) return;
                run(
                  'clear',
                  () => clearWorkspace(),
                  '✅ Workspace contents cleared',
                  '❌ Clear workspace failed',
                );
              }}
            >
              {busy === 'clear' ? 'Clearing…' : <><FaBroom /> Clear Contents</>}
            </button>
          </div>
        </div>

        {/* Delete Workspace */}
        <div className="workspace-card workspace-card-danger">
          <div className="workspace-card-header">
            <FaTrash className="workspace-card-icon icon-delete" />
            <div>
              <div className="workspace-card-title">Delete Workspace</div>
              <div className="workspace-card-desc">
                Permanently deletes your entire workspace root directory from TrueNAS.
                Endpoint: <code>DELETE /workspace/delete</code>
              </div>
            </div>
          </div>
          <div className="workspace-card-row">
            <button
              id="btn-delete-workspace"
              className="btn btn-danger"
              disabled={busy !== null}
              onClick={() => {
                if (!confirm('Permanently delete your entire workspace?\n\nAll files will be lost. This cannot be undone.')) return;
                run(
                  'delete',
                  () => deleteWorkspace(),
                  '✅ Workspace deleted',
                  '❌ Delete workspace failed',
                );
              }}
            >
              {busy === 'delete' ? 'Deleting…' : <><FaTrash /> Delete Workspace</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

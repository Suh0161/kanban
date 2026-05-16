import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { apiDelete } from '../../../../api/client.js';
import { useNavigate } from 'react-router-dom';

export default function SettingsDangerZone({ workspaceId, workspaceName }) {
  const [confirmName, setConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();

  const handleDelete = async () => {
    if (confirmName !== workspaceName) return;
    setDeleting(true);
    setError(null);
    try {
      await apiDelete(`/workspaces/${workspaceId}`);
      navigate('/workspace');
    } catch (err) {
      setError(err.message || 'Failed to delete workspace');
      setDeleting(false);
    }
  };

  return (
    <div className="settings-content-panel settings-danger-panel">
      <div className="settings-panel-header">
        <div>
          <h2 className="settings-panel-title danger">Danger Zone</h2>
          <p className="settings-panel-desc">Irreversible and destructive actions</p>
        </div>
        <AlertTriangle size={18} className="settings-danger-icon" />
      </div>

      <div className="settings-form">
        <div className="settings-danger-item">
          <div>
            <strong>Delete this workspace</strong>
            <p>Once deleted, all boards, tasks, comments, and attachments will be permanently removed. This cannot be undone.</p>
          </div>
          {!showConfirm ? (
            <button
              type="button"
              className="btn btn-sm settings-danger-btn"
              onClick={() => setShowConfirm(true)}
            >
              Delete workspace
            </button>
          ) : (
            <div className="settings-danger-confirm">
              <p>Type <strong>{workspaceName}</strong> to confirm deletion:</p>
              <input
                type="text"
                className="settings-input"
                value={confirmName}
                onChange={e => setConfirmName(e.target.value)}
                placeholder={workspaceName}
                autoFocus
              />
              {error && <p className="settings-invite-error">{error}</p>}
              <div className="settings-danger-confirm-actions">
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => { setShowConfirm(false); setConfirmName(''); setError(null); }}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-sm settings-danger-btn"
                  onClick={handleDelete}
                  disabled={confirmName !== workspaceName || deleting}
                >
                  {deleting ? 'Deleting...' : 'I understand, delete this workspace'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

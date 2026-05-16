import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { UserPlus, X } from 'lucide-react';

export default function InviteMemberModal({ onSubmit, onClose, error }) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(email.trim());
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="invite-modal-backdrop" onClick={onClose}>
      <div className="invite-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="invite-modal-title">
        <div className="invite-modal-header">
          <h2 id="invite-modal-title">
            <UserPlus size={16} /> Add member
          </h2>
          <button type="button" className="invite-modal-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="invite-modal-body">
          <label className="invite-field">
            <span>Email address</span>
            <input
              ref={inputRef}
              type="email"
              className="invite-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="teammate@example.com"
              required
            />
          </label>
          <p className="invite-hint">The user must already have a Jokel account.</p>
          {error && <div className="invite-error">{error}</div>}
          <div className="invite-modal-actions">
            <button type="button" className="btn btn-outline btn-sm" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={!email.trim() || submitting}>
              {submitting ? 'Adding...' : 'Add member'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

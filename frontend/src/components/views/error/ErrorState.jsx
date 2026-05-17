/**
 * Inline error placeholder for failed fetches inside a view.
 *
 * The view passes the caught error (`ApiError` from `api/client.js`) and we
 * render the right icon / copy based on `error.status`. Falls back to a
 * generic message for network or unknown errors.
 *
 * Usage:
 *   const [error, setError] = useState(null);
 *   ...
 *   if (error) return <ErrorState error={error} onRetry={refetch} />;
 */

import {
  AlertTriangle,
  Lock,
  RefreshCw,
  SearchX,
  WifiOff,
} from 'lucide-react';
import './css/error.css';

const STATUS_INFO = {
  401: {
    icon: Lock,
    accent: 'amber',
    title: 'Sign in to continue',
    body: 'Your session expired. Reload the page to sign in again.',
  },
  403: {
    icon: Lock,
    accent: 'red',
    title: 'Restricted',
    body: "You don't have permission to view this resource.",
  },
  404: {
    icon: SearchX,
    accent: 'amber',
    title: 'Not found',
    body: "We couldn't find that resource.",
  },
  429: {
    icon: AlertTriangle,
    accent: 'amber',
    title: 'Slow down',
    body: 'Too many requests in a short time. Try again in a moment.',
  },
};

const NETWORK_INFO = {
  icon: WifiOff,
  accent: 'slate',
  title: "Can't reach the server",
  body: "Check your connection and try again.",
};

const SERVER_INFO = {
  icon: AlertTriangle,
  accent: 'red',
  title: 'Something went wrong',
  body: 'The server returned an error. Retrying usually works.',
};

const DEFAULT_INFO = {
  icon: AlertTriangle,
  accent: 'red',
  title: 'Something went wrong',
  body: 'An unexpected error occurred.',
};

function pickInfo(error) {
  if (!error) return DEFAULT_INFO;
  if (error.name === 'NetworkError') return NETWORK_INFO;
  if (error.status >= 500) return SERVER_INFO;
  return STATUS_INFO[error.status] || DEFAULT_INFO;
}

export default function ErrorState({
  error,
  title,
  body,
  onRetry,
  retryLabel = 'Try again',
  compact = false,
  className = '',
}) {
  const info = pickInfo(error);
  const Icon = info.icon;

  const displayTitle = title || info.title;
  const displayBody = body || error?.message || info.body;
  const requestId = error?.requestId;

  return (
    <div
      className={`error-state error-${info.accent} ${compact ? 'is-compact' : ''} ${className}`}
      role="alert"
    >
      <div className="error-state-icon" aria-hidden="true">
        <Icon size={compact ? 14 : 18} />
      </div>
      <div className="error-state-text">
        <strong>{displayTitle}</strong>
        <span>{displayBody}</span>
        {requestId && <span className="error-state-request-id">Request ID: <code>{requestId}</code></span>}
      </div>
      {onRetry && (
        <button type="button" className="error-state-retry" onClick={onRetry}>
          <RefreshCw size={13} /> {retryLabel}
        </button>
      )}
    </div>
  );
}

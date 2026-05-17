/**
 * Full-page error template used by 404 / 403 / 500 / offline.
 *
 * The same component handles all of them so the layout, animation, and
 * spacing stay perfectly consistent — only the icon, copy, and primary
 * action change. Render variants are picked by the wrapper components
 * (`NotFoundPage`, `ForbiddenPage`, etc.) which set `kind` accordingly.
 */

import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Home,
  Lock,
  RefreshCw,
  WifiOff,
} from 'lucide-react';
import './css/error.css';

const VARIANTS = {
  '404': {
    code: '404',
    icon: AlertTriangle,
    accent: 'amber',
    title: 'Page not found',
    body: "We couldn't find the page you were looking for. It may have been moved, renamed, or never existed.",
    primary: { label: 'Back to workspaces', to: '/workspace', icon: Home },
  },
  '403': {
    code: '403',
    icon: Lock,
    accent: 'red',
    title: 'You don\u2019t have access',
    body: "You're signed in, but this resource is restricted. If you think this is a mistake, ask the workspace owner to invite you or update your role.",
    primary: { label: 'Back to workspaces', to: '/workspace', icon: Home },
  },
  '500': {
    code: '500',
    icon: AlertTriangle,
    accent: 'red',
    title: 'Something went wrong',
    body: "An unexpected error happened on our end. The team has been notified, and a refresh usually helps.",
    primary: { label: 'Try again', icon: RefreshCw, action: 'reload' },
  },
  offline: {
    code: 'Offline',
    icon: WifiOff,
    accent: 'slate',
    title: 'You\u2019re offline',
    body: "We can't reach Elevate right now. Check your connection \u2014 we'll retry as soon as you're back online.",
    primary: { label: 'Try again', icon: RefreshCw, action: 'reload' },
  },
};

export default function ErrorPage({
  kind = '404',
  title,
  message,
  details,
  requestId,
  primary,
  secondary,
}) {
  const navigate = useNavigate();
  const variant = VARIANTS[kind] || VARIANTS['404'];
  const Icon = variant.icon;

  const finalPrimary = primary || variant.primary;

  const handlePrimary = () => {
    if (!finalPrimary) return;
    if (finalPrimary.action === 'reload') {
      window.location.reload();
      return;
    }
    if (finalPrimary.onClick) {
      finalPrimary.onClick();
      return;
    }
    if (finalPrimary.to) {
      navigate(finalPrimary.to);
    }
  };

  const PrimaryIcon = finalPrimary?.icon;

  return (
    <main className={`error-page error-${variant.accent}`}>
      <div className="error-shell">
        <span className="error-code">{variant.code}</span>

        <div className="error-icon" aria-hidden="true">
          <Icon size={26} />
        </div>

        <h1 className="error-title">{title || variant.title}</h1>
        <p className="error-body">{message || variant.body}</p>

        {details && (
          <pre className="error-details">{details}</pre>
        )}
        {requestId && (
          <p className="error-request-id">
            Request ID: <code>{requestId}</code>
          </p>
        )}

        <div className="error-actions">
          <button type="button" className="error-btn-secondary" onClick={() => navigate(-1)}>
            <ArrowLeft size={14} /> Go back
          </button>

          {finalPrimary && (
            <button type="button" className="error-btn-primary" onClick={handlePrimary}>
              {PrimaryIcon && <PrimaryIcon size={14} />}
              {finalPrimary.label}
            </button>
          )}

          {secondary?.to && (
            <Link className="error-btn-secondary" to={secondary.to}>
              {secondary.icon && <secondary.icon size={14} />}
              {secondary.label}
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

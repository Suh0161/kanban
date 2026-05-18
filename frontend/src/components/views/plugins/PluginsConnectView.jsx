import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import PluginConnectCatalog from './components/PluginConnectCatalog.jsx';
import './css/plugins.css';

export default function PluginsConnectView({ workspaceId }) {
  const base = `/workspace/${workspaceId}`;

  return (
    <div className="plugins-connect-view">
      <div className="plugins-connect-view__inner">
        <Link to={base} className="plugins-connect-back">
          <ChevronLeft size={16} aria-hidden />
          Back to Plugins
        </Link>

        <header className="plugins-connect-header">
          <h1 className="plugins-connect-header__title">Connect a tool</h1>
          <p className="plugins-connect-header__subtitle">
            Choose a familiar integration. Connect and install flows are not available yet.
          </p>
        </header>

        <div className="plugins-connect-stub-callout" role="status">
          <p className="plugins-connect-stub-callout__text">
            <strong className="plugins-connect-stub-callout__label">Preview</strong>
            <span className="plugins-connect-stub-callout__body">
              Integration connect and install features are not available yet—this catalog is for browsing only.
            </span>
          </p>
        </div>

        <section className="plugins-connect-catalog" aria-label="Integration catalog">
          <PluginConnectCatalog />
        </section>
      </div>
    </div>
  );
}

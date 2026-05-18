import IntegrationsSection from './components/IntegrationsSection.jsx';
import './css/plugins.css';

export default function PluginsView({ workspaceId, workspaceName }) {
  return (
    <div className="plugins-view">
      <IntegrationsSection workspaceId={workspaceId} workspaceName={workspaceName} />
    </div>
  );
}

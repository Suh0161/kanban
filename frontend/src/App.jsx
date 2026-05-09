import { Routes, Route } from 'react-router-dom';
import { LoginPage, WorkspaceList, WorkspaceLayout } from './components';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/workspace" element={<WorkspaceList />} />
      <Route path="/workspace/:workspaceId/*" element={<WorkspaceLayout />} />
    </Routes>
  );
}

import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { TaskDetailHeader, TaskDetailMain, TaskDetailSidebar } from './components/index.js';
import Lightbox from '../../modals/Lightbox.jsx';
import { apiGet } from '../../../api/client.js';
import './css/task-detail.css';

export default function TaskDetailView({
  workspaceId,
  boardData,
  onDeleteTask,
  onUpdateTask,
  onUpdateDescription,
  onUpdateDueDate,
  onMoveTask,
  onAddComment,
  onFileSelect,
  onDeleteAttachment,
  onAddChecklist,
  onAddChecklistItem,
  onToggleChecklistItem,
  onUpdateChecklistItemCount,
  onDeleteChecklist,
  onDeleteChecklistItem,
}) {
  const { taskCode } = useParams();
  const navigate = useNavigate();
  const [lightboxImage, setLightboxImage] = useState(null);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (!workspaceId) return;
    apiGet(`/workspaces/${workspaceId}/members`)
      .then(data => setMembers(Array.isArray(data) ? data : []))
      .catch(() => setMembers([]));
  }, [workspaceId]);

  const task = useMemo(() => {
    if (!taskCode) return null;
    return Object.values(boardData.tasks).find(t => t.code === taskCode) || null;
  }, [boardData.tasks, taskCode]);

  const currentColumnId = useMemo(() => {
    if (!task) return null;
    return boardData.columnOrder.find(columnId => boardData.columns[columnId]?.taskIds?.includes(task.id)) || null;
  }, [task, boardData.columns, boardData.columnOrder]);

  const columnTitle = currentColumnId ? boardData.columns[currentColumnId]?.title : null;

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(`/workspace/${workspaceId}`);
  };

  // ESC closes the detail page (matches modal muscle memory)
  useEffect(() => {
    const handler = (e) => {
      const tag = e.target.tagName?.toLowerCase();
      const isEditing = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;
      if (isEditing) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        handleBack();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (taskCode && Object.keys(boardData.tasks).length > 0 && !task) {
    return <Navigate to={`/workspace/${workspaceId}`} replace />;
  }

  if (!task) {
    return (
      <div className="task-detail-loading">
        <div className="app-loading-spinner" />
      </div>
    );
  }

  const handleDelete = (taskId) => {
    onDeleteTask(taskId);
    handleBack();
  };

  return (
    <div className="task-detail-page">
      <div className="task-detail-shell">
        <TaskDetailHeader
          task={task}
          columnTitle={columnTitle}
          onBack={handleBack}
          onDelete={handleDelete}
          onUpdateTask={onUpdateTask}
        />

        <div className="task-detail-body">
          <TaskDetailMain
            task={task}
            customFieldsConfig={boardData.customFields}
            onUpdateDescription={onUpdateDescription}
            onUpdateTask={onUpdateTask}
            onAddChecklist={onAddChecklist}
            onAddChecklistItem={onAddChecklistItem}
            onToggleChecklistItem={onToggleChecklistItem}
            onUpdateChecklistItemCount={onUpdateChecklistItemCount}
            onDeleteChecklist={onDeleteChecklist}
            onDeleteChecklistItem={onDeleteChecklistItem}
            onFileSelect={onFileSelect}
            onDeleteAttachment={onDeleteAttachment}
            onLightboxOpen={setLightboxImage}
            onAddComment={onAddComment}
          />

          <TaskDetailSidebar
            task={task}
            columns={boardData.columns}
            columnOrder={boardData.columnOrder}
            currentColumnId={currentColumnId}
            labels={boardData.labels || []}
            members={members}
            onMoveTask={onMoveTask}
            onUpdateTask={onUpdateTask}
            onUpdateDueDate={onUpdateDueDate}
          />
        </div>
      </div>

      <Lightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />
    </div>
  );
}

import { useState, useCallback, useEffect, useRef } from 'react';
import { apiGetBoard, apiPost, apiPatch, apiDelete, getApiBase } from '../api/client.js';

function getToken() {
  return localStorage.getItem('jokel-token');
}

export function useBoard(workspaceId) {
  const [data, setData] = useState({ tasks: {}, columns: {}, columnOrder: [], customFields: [], labels: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [allAvailableTags, setAllAvailableTags] = useState([]);

  const cancelledRef = useRef(false);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!workspaceId) {
        if (!cancelled) setLoading(false);
        return;
      }
      if (!cancelled) {
        setLoading(true);
        setError(null);
      }
      try {
        const boardData = await apiGetBoard(workspaceId);
        if (!cancelled) {
          setData(boardData || { tasks: {}, columns: {}, columnOrder: [], customFields: [], labels: [] });
          // Compute all available tags from unfiltered data
          const tags = new Set();
          Object.values(boardData?.tasks || {}).forEach(t => t.tags?.forEach(tag => tags.add(tag)));
          setAllAvailableTags(Array.from(tags));
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to fetch board');
          setLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [workspaceId]);

  const allTags = allAvailableTags;

  const getColumnForTask = useCallback((taskId) => {
    for (const colId of data.columnOrder) {
      if (data.columns[colId]?.taskIds?.includes(taskId)) return data.columns[colId];
    }
    return null;
  }, [data]);

  const onDragEnd = useCallback((result, isFiltered) => {
    if (isFiltered) return;
    const { destination, source, draggableId, type } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    if (type === 'COLUMN') {
      const newColumnOrder = Array.from(data.columnOrder);
      const [moved] = newColumnOrder.splice(source.index, 1);
      newColumnOrder.splice(destination.index, 0, moved);
      setData(prev => ({ ...prev, columnOrder: newColumnOrder }));
      apiPost('/columns/reorder', { columnOrder: newColumnOrder }).catch(() => {});
      return;
    }

    const start = data.columns[source.droppableId];
    const finish = data.columns[destination.droppableId];

    if (start === finish) {
      const newTaskIds = Array.from(start.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, draggableId);
      const newColumn = { ...start, taskIds: newTaskIds };
      setData(prev => ({ ...prev, columns: { ...prev.columns, [newColumn.id]: newColumn } }));
      return;
    }

    const startTaskIds = Array.from(start.taskIds);
    startTaskIds.splice(source.index, 1);
    const newStart = { ...start, taskIds: startTaskIds };

    const finishTaskIds = Array.from(finish.taskIds);
    finishTaskIds.splice(destination.index, 0, draggableId);
    const newFinish = { ...finish, taskIds: finishTaskIds };

    setData(prev => ({
      ...prev,
      columns: {
        ...prev.columns,
        [newStart.id]: newStart,
        [newFinish.id]: newFinish,
      }
    }));

    apiPatch(`/tasks/${draggableId}/move`, { targetColumnId: destination.droppableId }).catch(() => {});
  }, [data.columns, data.columnOrder]);

  const createTask = async (columnId, { title, priority, tags, description, dueDate, assigneeId, assigneeName, assigneeImg }) => {
    const parsedTags = typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : (tags || []);
    const newTask = await apiPost('/tasks', {
      columnId, title, priority, tags: parsedTags, description, dueDate, assigneeId
    });
    
    // Update all available tags if new tags were added
    if (parsedTags.length > 0) {
      setAllAvailableTags(prev => {
        const newTags = new Set(prev);
        parsedTags.forEach(tag => newTags.add(tag));
        return Array.from(newTags);
      });
    }
    
    setData(prev => ({
      ...prev,
      tasks: {
        ...prev.tasks,
        [newTask.id]: {
          ...newTask,
          assigneeName: assigneeName || newTask.assigneeName || null,
          assigneeImg: assigneeImg || newTask.assigneeImg || null,
          metrics: newTask.metrics || { comments: 0, attachments: 0 }
        }
      },
      columns: {
        ...prev.columns,
        [columnId]: { ...prev.columns[columnId], taskIds: [...prev.columns[columnId].taskIds, newTask.id] }
      }
    }));
    return newTask.id;
  };

  const addColumn = async (title) => {
    const newCol = await apiPost('/columns', { workspaceId, title });
    setData(prev => ({
      ...prev,
      columns: { ...prev.columns, [newCol.id]: { ...newCol, taskIds: newCol.taskIds || [] } },
      columnOrder: [...prev.columnOrder, newCol.id]
    }));
  };

  const deleteColumn = async (colId) => {
    await apiDelete(`/columns/${colId}`);
    setData(prev => {
      const col = prev.columns[colId];
      const newTasks = { ...prev.tasks };
      col?.taskIds?.forEach(tid => {
        const inOtherCol = Object.values(prev.columns).some(c => c.id !== colId && c.taskIds.includes(tid));
        if (!inOtherCol) delete newTasks[tid];
      });
      const newColumns = { ...prev.columns };
      delete newColumns[colId];
      return {
        ...prev,
        tasks: newTasks,
        columns: newColumns,
        columnOrder: prev.columnOrder.filter(id => id !== colId)
      };
    });
  };

  const clearColumn = async (colId) => {
    const col = data.columns[colId];
    if (!col) return;
    await Promise.all(col.taskIds.map(tid => apiDelete(`/tasks/${tid}`)));
    setData(prev => {
      const newTasks = { ...prev.tasks };
      col.taskIds.forEach(tid => {
        const inOtherCol = Object.values(prev.columns).some(c => c.id !== colId && c.taskIds.includes(tid));
        if (!inOtherCol) delete newTasks[tid];
      });
      return {
        ...prev,
        tasks: newTasks,
        columns: { ...prev.columns, [colId]: { ...prev.columns[colId], taskIds: [] } }
      };
    });
  };

  const renameColumn = async (colId, title) => {
    if (!title.trim()) return;
    await apiPatch(`/columns/${colId}`, { title });
    setData(prev => ({
      ...prev,
      columns: { ...prev.columns, [colId]: { ...prev.columns[colId], title: title.trim() } }
    }));
  };

  const deleteTask = async (taskId) => {
    await apiDelete(`/tasks/${taskId}`);
    setData(prev => {
      const newTasks = { ...prev.tasks };
      delete newTasks[taskId];
      const newColumns = { ...prev.columns };
      Object.keys(newColumns).forEach(cid => {
        newColumns[cid] = { ...newColumns[cid], taskIds: newColumns[cid].taskIds.filter(tid => tid !== taskId) };
      });
      return { ...prev, tasks: newTasks, columns: newColumns };
    });
  };

  const updateTask = async (taskId, updates) => {
    await apiPatch(`/tasks/${taskId}`, updates);
    
    // Update all available tags if tags were updated
    if (updates.tags) {
      setAllAvailableTags(prev => {
        const newTags = new Set(prev);
        updates.tags.forEach(tag => newTags.add(tag));
        return Array.from(newTags);
      });
    }
    
    setData(prev => ({
      ...prev,
      tasks: { ...prev.tasks, [taskId]: { ...prev.tasks[taskId], ...updates } }
    }));
  };

  const updateWorkspaceLabels = useCallback(async (labels) => {
    await apiPatch(`/workspaces/${workspaceId}`, { labels });
    setData(prev => ({ ...prev, labels }));
  }, [workspaceId]);

  const moveTask = async (taskId, targetColumnId) => {
    if (!data.tasks[taskId] || !data.columns[targetColumnId]) return;
    await apiPatch(`/tasks/${taskId}/move`, { targetColumnId });
    setData(prev => {
      const sourceColumnId = Object.keys(prev.columns).find(colId =>
        prev.columns[colId].taskIds.includes(taskId)
      );
      if (!sourceColumnId || sourceColumnId === targetColumnId) return prev;
      return {
        ...prev,
        columns: {
          ...prev.columns,
          [sourceColumnId]: {
            ...prev.columns[sourceColumnId],
            taskIds: prev.columns[sourceColumnId].taskIds.filter(id => id !== taskId)
          },
          [targetColumnId]: {
            ...prev.columns[targetColumnId],
            taskIds: [...prev.columns[targetColumnId].taskIds, taskId]
          }
        }
      };
    });
  };

  const addComment = async (taskId, text) => {
    if (!text.trim()) return;
    const comment = await apiPost(`/tasks/${taskId}/comments`, { text });
    setData(prev => {
      const task = prev.tasks[taskId];
      return {
        ...prev,
        tasks: {
          ...prev.tasks,
          [taskId]: {
            ...task,
            comments: [...(task.comments || []), comment],
            metrics: { ...task.metrics, comments: (task.metrics.comments || 0) + 1 }
          }
        }
      };
    });
  };

  const addChecklist = async (taskId, title) => {
    const checklist = await apiPost(`/tasks/${taskId}/checklists`, { title });
    setData(prev => ({
      ...prev,
      tasks: {
        ...prev.tasks,
        [taskId]: { ...prev.tasks[taskId], checklists: [...(prev.tasks[taskId].checklists || []), checklist] }
      }
    }));
  };

  const addChecklistItem = async (taskId, checklistId, text, targetCount = 1) => {
    const item = await apiPost(`/checklists/${checklistId}/items`, { text, targetCount: targetCount > 1 ? targetCount : undefined });
    setData(prev => ({
      ...prev,
      tasks: {
        ...prev.tasks,
        [taskId]: {
          ...prev.tasks[taskId],
          checklists: prev.tasks[taskId].checklists.map(cl =>
            cl.id === checklistId ? { ...cl, items: [...cl.items, item] } : cl
          )
        }
      }
    }));
  };

  const toggleChecklistItem = async (taskId, checklistId, itemId) => {
    const task = data.tasks[taskId];
    const checklist = task?.checklists?.find(cl => cl.id === checklistId);
    const item = checklist?.items?.find(i => i.id === itemId);
    if (!item) return;
    const done = !item.done;
    const result = await apiPatch(`/checklist-items/${itemId}`, { done });
    setData(prev => ({
      ...prev,
      tasks: {
        ...prev.tasks,
        [taskId]: {
          ...prev.tasks[taskId],
          checklists: prev.tasks[taskId].checklists.map(cl =>
            cl.id === checklistId
              ? { ...cl, items: cl.items.map(i => i.id === itemId ? { ...i, ...result } : i) }
              : cl
          )
        }
      }
    }));
  };

  const updateChecklistItemCount = async (taskId, checklistId, itemId, currentCount) => {
    const result = await apiPatch(`/checklist-items/${itemId}`, { currentCount });
    setData(prev => ({
      ...prev,
      tasks: {
        ...prev.tasks,
        [taskId]: {
          ...prev.tasks[taskId],
          checklists: prev.tasks[taskId].checklists.map(cl =>
            cl.id === checklistId
              ? { ...cl, items: cl.items.map(i => i.id === itemId ? { ...i, ...result } : i) }
              : cl
          )
        }
      }
    }));
  };

  const deleteChecklist = async (taskId, checklistId) => {
    await apiDelete(`/checklists/${checklistId}`);
    setData(prev => ({
      ...prev,
      tasks: {
        ...prev.tasks,
        [taskId]: {
          ...prev.tasks[taskId],
          checklists: prev.tasks[taskId].checklists.filter(cl => cl.id !== checklistId)
        }
      }
    }));
  };

  const deleteChecklistItem = async (taskId, checklistId, itemId) => {
    await apiDelete(`/checklist-items/${itemId}`);
    setData(prev => ({
      ...prev,
      tasks: {
        ...prev.tasks,
        [taskId]: {
          ...prev.tasks[taskId],
          checklists: prev.tasks[taskId].checklists.map(cl =>
            cl.id === checklistId
              ? { ...cl, items: cl.items.filter(i => i.id !== itemId) }
              : cl
          )
        }
      }
    }));
  };

  const addAttachment = (taskId, attachment) => {
    setData(prev => {
      const task = prev.tasks[taskId];
      return {
        ...prev,
        tasks: {
          ...prev.tasks,
          [taskId]: {
            ...task,
            attachments: [...(task.attachments || []), attachment],
            metrics: { ...task.metrics, attachments: (task.metrics.attachments || 0) + 1 }
          }
        }
      };
    });
  };

  const deleteAttachment = async (taskId, attachmentId) => {
    await apiDelete(`/attachments/${attachmentId}`);
    setData(prev => {
      const task = prev.tasks[taskId];
      if (!task.attachments) return prev;
      const newAttachments = task.attachments.filter(a => a.id !== attachmentId);
      return {
        ...prev,
        tasks: {
          ...prev.tasks,
          [taskId]: {
            ...task,
            attachments: newAttachments,
            metrics: { ...task.metrics, attachments: newAttachments.length }
          }
        }
      };
    });
  };

  const handleFileSelect = async (files, taskId) => {
    if (!files || !files.length) return;
    const fileArray = Array.from(files).filter(file => file.type.startsWith('image/'));
    for (const file of fileArray) {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${getApiBase()}/tasks/${taskId}/attachments`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: formData
      });
      if (!res.ok) continue;
      const attachment = await res.json();
      setData(prev => {
        const task = prev.tasks[taskId];
        return {
          ...prev,
          tasks: {
            ...prev.tasks,
            [taskId]: {
              ...task,
              attachments: [...(task.attachments || []), attachment],
              metrics: { ...task.metrics, attachments: (task.metrics.attachments || 0) + 1 }
            }
          }
        };
      });
    }
  };

  const refetch = useCallback(async (filters = {}) => {
    if (!workspaceId) return;

    setIsSearching(true);
    setError(null);

    try {
      const boardData = await apiGetBoard(workspaceId, filters);
      if (!cancelledRef.current) {
        setData(boardData || { tasks: {}, columns: {}, columnOrder: [] });
      }
    } catch (err) {
      if (!cancelledRef.current) {
        setError(err.message || 'Failed to fetch board');
      }
    } finally {
      if (!cancelledRef.current) {
        setIsSearching(false);
      }
    }
  }, [workspaceId]);

  const searchBoard = useCallback((searchQuery, filters = {}) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      refetch({ ...filters, search: searchQuery || undefined });
    }, 300);
  }, [refetch]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    return () => { cancelledRef.current = true; };
  }, [workspaceId]);

  return {
    data, loading, error, isSearching, refetch, searchBoard,
    allTags, getColumnForTask, onDragEnd,
    createTask, addColumn, deleteColumn, clearColumn, renameColumn,
    deleteTask, updateTask, moveTask,
    addComment, addAttachment, handleFileSelect,
    addChecklist, addChecklistItem, toggleChecklistItem, updateChecklistItemCount, deleteChecklist, deleteChecklistItem,
    deleteAttachment,
    updateWorkspaceLabels,
  };
}

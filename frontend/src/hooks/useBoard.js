import { useState, useMemo, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { initialData } from '../constants.js';

export function useBoard(workspaceId) {
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem(`jokel-board-${workspaceId}`);
    if (saved) return JSON.parse(saved);
    
    // For trust-and-safety we load our dummy data. For new workspaces, create empty columns.
    if (workspaceId === 'trust-and-safety') {
      return initialData;
    }
    
    return {
      tasks: {},
      columns: {
        'col-1': { id: 'col-1', title: 'To Do', taskIds: [] },
        'col-2': { id: 'col-2', title: 'In Progress', taskIds: [] },
        'col-3': { id: 'col-3', title: 'Done', taskIds: [] },
      },
      columnOrder: ['col-1', 'col-2', 'col-3']
    };
  });

  useEffect(() => {
    localStorage.setItem(`jokel-board-${workspaceId}`, JSON.stringify(data));
  }, [data, workspaceId]);

  const allTags = useMemo(() => {
    const tags = new Set();
    Object.values(data.tasks).forEach(t => t.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags);
  }, [data.tasks]);

  const getColumnForTask = useCallback((taskId) => {
    for (const colId of data.columnOrder) {
      if (data.columns[colId].taskIds.includes(taskId)) return data.columns[colId];
    }
    return null;
  }, [data]);

  const onDragEnd = useCallback((result, isFiltered) => {
    if (isFiltered) return;
    const { destination, source, draggableId, type } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // Column reorder
    if (type === 'COLUMN') {
      const newColumnOrder = Array.from(data.columnOrder);
      newColumnOrder.splice(source.index, 1);
      newColumnOrder.splice(destination.index, 0, data.columnOrder[source.index]);
      setData(prev => ({ ...prev, columnOrder: newColumnOrder }));
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
  }, [data.columns, data.columnOrder]);

  const createTask = (columnId, { title, priority, tags, description, dueDate, assigneeId, assigneeName, assigneeImg }) => {
    const newTaskId = uuidv4();
    const parsedTags = typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : (tags || []);
    const newTask = {
      id: newTaskId,
      title,
      priority,
      tags: parsedTags,
      metrics: { comments: 0, attachments: 0 },
      code: `SKY-${Math.floor(1000 + Math.random() * 9000)}`,
      description: description || '',
      assigneeId: assigneeId || null,
      assigneeImg: assigneeImg || null,
      assigneeName: assigneeName || null,
      comments: [],
      attachments: [],
      checklists: [],
      dueDate: dueDate || null
    };
    const column = data.columns[columnId];
    setData(prev => ({
      ...prev,
      tasks: { ...prev.tasks, [newTaskId]: newTask },
      columns: { ...prev.columns, [columnId]: { ...column, taskIds: [...column.taskIds, newTaskId] } }
    }));
    return newTaskId;
  };

  const addColumn = (title) => {
    const colId = `col-${uuidv4()}`;
    setData(prev => ({
      ...prev,
      columns: { ...prev.columns, [colId]: { id: colId, title: title.trim(), taskIds: [] } },
      columnOrder: [...prev.columnOrder, colId]
    }));
  };

  const deleteColumn = (colId) => {
    const col = data.columns[colId];
    const newTasks = { ...data.tasks };
    col.taskIds.forEach(tid => {
      const inOtherCol = Object.values(data.columns).some(c => c.id !== colId && c.taskIds.includes(tid));
      if (!inOtherCol) delete newTasks[tid];
    });
    const newColumns = { ...data.columns };
    delete newColumns[colId];
    setData(prev => ({
      ...prev,
      tasks: newTasks,
      columns: newColumns,
      columnOrder: prev.columnOrder.filter(id => id !== colId)
    }));
  };

  const clearColumn = (colId) => {
    const col = data.columns[colId];
    const newTasks = { ...data.tasks };
    col.taskIds.forEach(tid => {
      const inOtherCol = Object.values(data.columns).some(c => c.id !== colId && c.taskIds.includes(tid));
      if (!inOtherCol) delete newTasks[tid];
    });
    setData(prev => ({
      ...prev,
      tasks: newTasks,
      columns: { ...prev.columns, [colId]: { ...col, taskIds: [] } }
    }));
  };

  const renameColumn = (colId, title) => {
    if (!title.trim()) return;
    setData(prev => ({
      ...prev,
      columns: { ...prev.columns, [colId]: { ...prev.columns[colId], title: title.trim() } }
    }));
  };

  const deleteTask = (taskId) => {
    const newTasks = { ...data.tasks };
    delete newTasks[taskId];
    const newColumns = { ...data.columns };
    Object.keys(newColumns).forEach(cid => {
      newColumns[cid] = { ...newColumns[cid], taskIds: newColumns[cid].taskIds.filter(tid => tid !== taskId) };
    });
    setData(prev => ({ ...prev, tasks: newTasks, columns: newColumns }));
  };

  const updateTask = (taskId, updates) => {
    setData(prev => ({
      ...prev,
      tasks: { ...prev.tasks, [taskId]: { ...prev.tasks[taskId], ...updates } }
    }));
  };

  const moveTask = (taskId, targetColumnId) => {
    if (!data.tasks[taskId] || !data.columns[targetColumnId]) return;

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

  const addComment = (taskId, text) => {
    if (!text.trim()) return;
    const comment = {
      id: `c-${uuidv4()}`,
      text: text.trim(),
      author: 'Chatgpt_niy',
      avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Felix',
      time: 'Just now'
    };
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

  const addChecklist = (taskId, title) => {
    const checklist = { id: `cl-${uuidv4()}`, title, items: [] };
    setData(prev => ({
      ...prev,
      tasks: {
        ...prev.tasks,
        [taskId]: { ...prev.tasks[taskId], checklists: [...(prev.tasks[taskId].checklists || []), checklist] }
      }
    }));
  };

  const addChecklistItem = (taskId, checklistId, text) => {
    const item = { id: `ci-${uuidv4()}`, text, done: false };
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

  const toggleChecklistItem = (taskId, checklistId, itemId) => {
    setData(prev => ({
      ...prev,
      tasks: {
        ...prev.tasks,
        [taskId]: {
          ...prev.tasks[taskId],
          checklists: prev.tasks[taskId].checklists.map(cl =>
            cl.id === checklistId
              ? { ...cl, items: cl.items.map(item => item.id === itemId ? { ...item, done: !item.done } : item) }
              : cl
          )
        }
      }
    }));
  };

  const deleteChecklist = (taskId, checklistId) => {
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

  const deleteAttachment = (taskId, attachmentId) => {
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

  const handleFileSelect = (files, taskId) => {
    if (!files || !files.length) return;
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        addAttachment(taskId, {
          id: `a-${uuidv4()}`,
          type: 'image',
          url: e.target.result,
          name: file.name
        });
      };
      reader.readAsDataURL(file);
    });
  };

  return {
    data,
    allTags,
    getColumnForTask,
    onDragEnd,
    createTask,
    addColumn,
    deleteColumn,
    clearColumn,
    renameColumn,
    deleteTask,
    updateTask,
    moveTask,
    addComment,
    addAttachment,
    handleFileSelect,
    addChecklist,
    addChecklistItem,
    toggleChecklistItem,
    deleteChecklist,
    deleteAttachment,
  };
}

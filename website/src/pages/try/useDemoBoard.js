import { useCallback, useState } from 'react';
import { DEMO_BOARD } from './mockData.js';

export function matchesDemoTaskSearch(task, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  return (
    task.title?.toLowerCase().includes(q) ||
    task.code?.toLowerCase().includes(q) ||
    task.assigneeName?.toLowerCase().includes(q) ||
    (task.tags || []).some((tag) => tag.toLowerCase().includes(q))
  );
}

/**
 * Local-only board state for the marketing /try preview.
 * Mirrors frontend useBoard.onDragEnd task moves (no column reorder, no API).
 */
export function useDemoBoard() {
  const [data, setData] = useState(() => structuredClone(DEMO_BOARD));
  const [collapsedColumns, setCollapsedColumns] = useState(() => new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const onToggleCollapse = useCallback((columnId) => {
    setCollapsedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnId)) next.delete(columnId);
      else next.add(columnId);
      return next;
    });
  }, []);

  const onDragEnd = useCallback((result) => {
    if (searchQuery.trim()) return;

    const { destination, source, draggableId, type } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }
    if (type === 'COLUMN') return;

    const start = data.columns[source.droppableId];
    const finish = data.columns[destination.droppableId];
    if (!start || !finish) return;

    if (start === finish) {
      const newTaskIds = Array.from(start.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, draggableId);
      const newColumn = { ...start, taskIds: newTaskIds };
      setData((prev) => ({
        ...prev,
        columns: { ...prev.columns, [newColumn.id]: newColumn },
      }));
      return;
    }

    const startTaskIds = Array.from(start.taskIds);
    startTaskIds.splice(source.index, 1);
    const newStart = { ...start, taskIds: startTaskIds };

    const finishTaskIds = Array.from(finish.taskIds);
    finishTaskIds.splice(destination.index, 0, draggableId);
    const newFinish = { ...finish, taskIds: finishTaskIds };

    setData((prev) => ({
      ...prev,
      columns: {
        ...prev.columns,
        [newStart.id]: newStart,
        [newFinish.id]: newFinish,
      },
    }));
  }, [data.columns, searchQuery]);

  const columns = data.columnOrder.map((id) => data.columns[id]);

  return {
    data,
    columns,
    onDragEnd,
    collapsedColumns,
    onToggleCollapse,
    searchQuery,
    setSearchQuery,
  };
}

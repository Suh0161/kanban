export const BUCKET_LABELS = {
  all: 'All open',
  grooming: 'Needs grooming',
  ready: 'Ready',
  sprint: 'Sprint draft',
  overdue: 'Overdue',
  unscheduled: 'Unscheduled',
};

export function isReady(task) {
  return Boolean(task.dueDate && task.assigneeImg && task.columnTitle !== 'Inbox');
}

export function needsGrooming(task) {
  return task.columnTitle === 'Inbox' || !task.dueDate || !task.assigneeImg;
}

export function isOverdue(task) {
  if (!task.dueDate) return false;
  const due = new Date(task.dueDate);
  due.setHours(23, 59, 59, 999);
  return due < new Date();
}

import { useEffect } from 'react';

const SHORTCUTS_ENABLED = true; // can be made configurable later

export default function useKeyboardShortcuts({
  // Board actions
  onCreateTask,
  onSearchFocus,
  // Task actions (requires a selected/focused task)
  selectedTask,
  onOpenTask,
  onCloseTask,
  onChangePriority,
  onDeleteTask,
  onMoveTask,
  // View navigation
  onNextView,
  onPrevView,
  // State checks
  isModalOpen,
  isComposerOpen,
  activeView,
}) {
  useEffect(() => {
    if (!SHORTCUTS_ENABLED) return;

    function handleKeyDown(e) {
      // Don't trigger shortcuts when typing in input/textarea/contenteditable
      const tag = e.target.tagName.toLowerCase();
      const isEditing = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;
      const isComposing = e.isComposing;
      if (isEditing || isComposing) return;

      // Don't trigger when a modal is open (unless it's the escape handler)
      if (isModalOpen && e.key !== 'Escape') return;

      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      // --- Global shortcuts ---

      // N — New task (create in first/current column)
      if (key === 'n' && !ctrl && !shift && activeView === 'boards') {
        e.preventDefault();
        onCreateTask?.();
      }

      // Ctrl+K — Command palette search (workspace-wide)
      if (ctrl && key === 'k') {
        e.preventDefault();
        onSearchFocus?.();
      }

      // / — Quick search while on the board canvas
      if (key === '/' && !ctrl && activeView === 'boards') {
        e.preventDefault();
        onSearchFocus?.();
      }

      // Escape — Close modal / close composer / deselect
      if (key === 'escape') {
        if (isModalOpen) {
          e.preventDefault();
          onCloseTask?.();
        } else if (selectedTask) {
          e.preventDefault();
          // Deselect (clear selected task)
          onCloseTask?.();
        }
      }

      // --- View navigation ---
      // Ctrl+[ and Ctrl+] — Previous/next view
      if (ctrl && key === '[') {
        e.preventDefault();
        onPrevView?.();
      }
      if (ctrl && key === ']') {
        e.preventDefault();
        onNextView?.();
      }

      // --- Task-specific shortcuts (only when a task is selected) ---

      if (selectedTask) {
        // Enter or Space — Open task details
        if ((key === 'enter' || key === ' ') && !isModalOpen) {
          e.preventDefault();
          onOpenTask?.(selectedTask);
        }

        // 1-4 — Set priority
        if (key === '1' && !ctrl) {
          e.preventDefault();
          onChangePriority?.(selectedTask.id, 'Critical');
        }
        if (key === '2' && !ctrl) {
          e.preventDefault();
          onChangePriority?.(selectedTask.id, 'High');
        }
        if (key === '3' && !ctrl) {
          e.preventDefault();
          onChangePriority?.(selectedTask.id, 'Medium');
        }
        if (key === '4' && !ctrl) {
          e.preventDefault();
          onChangePriority?.(selectedTask.id, 'Low');
        }

        // Delete / Backspace — Delete selected task (with confirmation later)
        if (key === 'delete' && !ctrl) {
          e.preventDefault();
          // Only if not in an input
          if (!isEditing) {
            onDeleteTask?.(selectedTask.id);
          }
        }

        // M — Move task menu (could be implemented later)
        // For now, skip
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedTask,
    isModalOpen,
    isComposerOpen,
    activeView,
    onCreateTask,
    onSearchFocus,
    onOpenTask,
    onCloseTask,
    onChangePriority,
    onDeleteTask,
    onMoveTask,
    onNextView,
    onPrevView,
  ]);

  return null; // No UI — this is a behavior-only hook
}

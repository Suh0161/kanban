/**
 * Get-started checklist that pins to the top of the board on first run.
 *
 * Each step's "done" state is derived from board data (so the user can't
 * un-complete a step by undoing the action) — except `didDrag`, which
 * we record via a workspace-scoped localStorage flag because there's no
 * persistent signal for "the user has dragged a card before".
 *
 * Visibility:
 *  - First time per workspace per browser, until dismissed.
 *  - The dismiss button records the state so it stays hidden afterwards.
 *  - Returning users (who already have tasks/labels/members) see only the
 *    steps still incomplete; if everything is done on first load, the
 *    card never shows.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  CircleDashed,
  GripHorizontal,
  Plus,
  Tag,
  UserPlus,
  Calendar,
  X,
} from 'lucide-react';
import {
  loadQuickStartState,
  saveQuickStartState,
  subscribeQuickStart,
} from './quickStartStorage.js';
import { Tooltip } from '../ui';
import './css/quickstart.css';

export default function QuickStartCard({
  workspaceId,
  workspaceName,
  tasks = {},
  labels = [],
  memberCount = 1,
  myRole = 'member',
  onCreateTask,
  onOpenLabels,
  onOpenMembers,
}) {
  // Track state alongside the workspaceId so switching workspaces re-reads
  // the storage at render time without needing a setState-in-effect.
  const [snapshot, setSnapshot] = useState(() => ({
    workspaceId,
    state: loadQuickStartState(workspaceId),
  }));
  if (snapshot.workspaceId !== workspaceId) {
    setSnapshot({ workspaceId, state: loadQuickStartState(workspaceId) });
  }
  const state = snapshot.state;

  // Subscribe so writes from elsewhere (e.g. `recordQuickStartDrag` in the
  // board's drag handler) push an immediate re-render — no refresh needed.
  useEffect(() => {
    return subscribeQuickStart(workspaceId, (next) => {
      setSnapshot({ workspaceId, state: next });
    });
  }, [workspaceId]);

  const taskCount = useMemo(() => Object.keys(tasks || {}).length, [tasks]);
  const hasDueOrAssignee = useMemo(() => {
    return Object.values(tasks || {}).some((t) => t?.dueDate || t?.assigneeId);
  }, [tasks]);
  const labelCount = labels.length;

  const canManage = myRole === 'owner' || myRole === 'admin';

  // Build the step list. Each item declares whether it applies to the
  // current role — we filter members-only actions out for plain members.
  const allSteps = [
    {
      id: 'create',
      icon: Plus,
      label: 'Create your first task',
      hint: 'Click the + button on any column.',
      done: taskCount > 0,
      action: onCreateTask,
      visibleFor: 'edit',
    },
    {
      id: 'drag',
      icon: GripHorizontal,
      label: 'Move a card to another column',
      hint: 'Drag any card across the board.',
      done: state.didDrag,
      visibleFor: 'edit',
    },
    {
      id: 'plan',
      icon: Calendar,
      label: 'Add a due date or assignee',
      hint: 'Open a card and fill in the sidebar.',
      done: hasDueOrAssignee,
      visibleFor: 'edit',
    },
    {
      id: 'labels',
      icon: Tag,
      label: 'Customize a label',
      hint: 'Settings → Labels.',
      done: labelCount > 0,
      action: onOpenLabels,
      visibleFor: 'manage',
    },
    {
      id: 'invite',
      icon: UserPlus,
      label: 'Invite a teammate',
      hint: 'Settings → Members.',
      done: memberCount > 1,
      action: onOpenMembers,
      visibleFor: 'manage',
    },
  ];

  const steps = allSteps.filter((s) => {
    if (s.visibleFor === 'manage' && !canManage) return false;
    return true;
  });

  const total = steps.length;
  const completed = steps.filter((s) => s.done).length;
  const pct = total === 0 ? 100 : Math.round((completed / total) * 100);
  const allDone = completed === total && total > 0;

  // Don't show at all when:
  //  - the user dismissed it explicitly, or
  //  - they came in already complete (e.g. invited to an active workspace).
  if (state.dismissed) return null;
  if (allDone) return null;

  const handleDismiss = () => {
    const nextState = { ...state, dismissed: true };
    setSnapshot({ workspaceId, state: nextState });
    saveQuickStartState(workspaceId, nextState);
  };

  const handleToggleCollapse = () => {
    const nextState = { ...state, collapsed: !state.collapsed };
    setSnapshot({ workspaceId, state: nextState });
    saveQuickStartState(workspaceId, nextState);
  };

  return (
    <section
      className={`quickstart-card ${state.collapsed ? 'is-collapsed' : ''}`}
      aria-label="Get started checklist"
    >
      <header className="quickstart-header">
        <div className="quickstart-title-row">
          <span className="quickstart-kicker">Getting started</span>
          <h3 className="quickstart-title">
            Set up <span className="quickstart-workspace">{workspaceName || 'your workspace'}</span>
          </h3>
        </div>

        <div className="quickstart-progress" aria-hidden="true">
          <div className="quickstart-progress-track">
            <div className="quickstart-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="quickstart-progress-label">
            {completed} of {total} done
          </span>
        </div>

        <div className="quickstart-actions">
          <Tooltip content={state.collapsed ? 'Expand' : 'Collapse'}>
            <button
              type="button"
              className="quickstart-icon-btn"
              onClick={handleToggleCollapse}
              aria-label={state.collapsed ? 'Expand' : 'Collapse'}
            >
              {state.collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          </Tooltip>
          <Tooltip content="Dismiss">
            <button
              type="button"
              className="quickstart-icon-btn"
              onClick={handleDismiss}
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </Tooltip>
        </div>
      </header>

      {!state.collapsed && (
        <ol className="quickstart-list">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <li key={step.id} className={`quickstart-step ${step.done ? 'is-done' : ''}`}>
                <span className="quickstart-status" aria-hidden="true">
                  {step.done ? <Check size={13} /> : <CircleDashed size={13} />}
                </span>
                <span className="quickstart-step-icon" aria-hidden="true">
                  <Icon size={14} />
                </span>
                <div className="quickstart-step-text">
                  <span className="quickstart-step-label">{step.label}</span>
                  <span className="quickstart-step-hint">{step.hint}</span>
                </div>
                {!step.done && step.action ? (
                  <button
                    type="button"
                    className="quickstart-step-cta"
                    onClick={step.action}
                  >
                    Start
                  </button>
                ) : (
                  <span className="quickstart-step-spacer" />
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

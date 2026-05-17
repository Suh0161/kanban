/**
 * Single source of truth for webhook events the UI can subscribe to.
 *
 * The `slug` is what the backend dispatches (`task.created`, etc.), the
 * `label` is shown in the form. Storing the slug — not the label — is
 * what makes the dispatcher actually find a matching subscriber, which
 * was the bug before this list existed.
 */

export const WEBHOOK_EVENTS = [
  { slug: 'task.created',     label: 'Task created' },
  { slug: 'task.updated',     label: 'Task updated' },
  { slug: 'task.moved',       label: 'Task moved' },
  { slug: 'task.deleted',     label: 'Task deleted' },
  { slug: 'task.archived',    label: 'Task archived' },
  { slug: 'task.restored',    label: 'Task restored' },
  { slug: 'column.created',   label: 'Column created' },
  { slug: 'column.deleted',   label: 'Column deleted' },
  { slug: 'column.archived',  label: 'Column archived' },
  { slug: 'column.restored',  label: 'Column restored' },
  { slug: 'comment.added',    label: 'Comment added' },
  { slug: 'checklist.created',label: 'Checklist created' },
  { slug: 'checklist.deleted',label: 'Checklist deleted' },
];

export const WEBHOOK_EVENT_SLUGS = WEBHOOK_EVENTS.map((e) => e.slug);

const SLUG_TO_LABEL = Object.fromEntries(WEBHOOK_EVENTS.map((e) => [e.slug, e.label]));

export function eventLabel(slug) {
  return SLUG_TO_LABEL[slug] || slug;
}

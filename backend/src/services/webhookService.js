import crypto from 'crypto';
import db from '../db.js';

export function dispatchWebhook(workspaceId, event, payload) {
  try {
    const webhooks = db.prepare(`
      SELECT * FROM webhooks
      WHERE workspace_id = ? AND active = 1 AND events LIKE ?
    `).all(workspaceId, `%${event}%`);

    if (webhooks.length === 0) return;

    const body = JSON.stringify({
      event,
      workspace_id: workspaceId,
      timestamp: new Date().toISOString(),
      data: payload,
    });

    for (const wh of webhooks) {
      if (!wh.events.split(',').map(e => e.trim()).includes(event)) continue;

      const signature = crypto
        .createHmac('sha256', wh.secret)
        .update(body)
        .digest('hex');

      fetch(wh.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Jokel-Event': event,
          'X-Jokel-Signature': signature,
          'X-Jokel-Delivery': crypto.randomUUID(),
        },
        body,
      }).catch(() => {});
    }
  } catch {
    // Webhook dispatch should never crash the main request
  }
}

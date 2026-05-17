import crypto from 'crypto';
import { lookup } from 'dns/promises';
import { request as httpRequest } from 'http';
import { request as httpsRequest } from 'https';
import { isIP } from 'net';
import db from '../db.js';
import { IS_DEV } from '../config.js';

const PRIVATE_V4_RANGES = [
  // CIDR-style checks via prefix; we only need hostile-network ranges.
  /^10\./,                              // 10.0.0.0/8
  /^127\./,                             // loopback
  /^169\.254\./,                        // link-local (incl. AWS IMDS!)
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,     // 172.16.0.0/12
  /^192\.168\./,                        // 192.168.0.0/16
  /^0\./,                               // 0.0.0.0/8
  /^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\./, // 100.64.0.0/10 CGNAT
];

function isPrivateOrLoopbackIp(ip) {
  if (!ip) return true;
  if (ip === '::1' || ip.toLowerCase() === 'localhost') return true;
  // IPv6 unique local / link-local / loopback
  if (ip.startsWith('fc') || ip.startsWith('fd')) return true;
  if (ip.toLowerCase().startsWith('fe80:')) return true;
  if (ip.startsWith('::ffff:')) {
    return PRIVATE_V4_RANGES.some((re) => re.test(ip.replace('::ffff:', '')));
  }
  return PRIVATE_V4_RANGES.some((re) => re.test(ip));
}

/**
 * SSRF guard: resolve the URL's hostname and refuse if it lands on the
 * loopback/private-network space. Returns a pinned target when safe.
 */
async function resolveSafeTarget(targetUrl) {
  let parsed;
  try { parsed = new URL(targetUrl); } catch { return { reason: 'invalid url' }; }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return { reason: 'protocol not allowed' };
  if (!IS_DEV && parsed.protocol !== 'https:') return { reason: 'https required' };

  const host = parsed.hostname;
  // Direct IP literal
  if (isIP(host)) {
    if (isPrivateOrLoopbackIp(host)) return { reason: 'private ip' };
    return { parsed, address: host, family: isIP(host) };
  }
  if (host === 'localhost') return { reason: 'localhost' };
  // DNS lookup — don't follow CNAMEs, just resolve A/AAAA
  try {
    const addrs = await lookup(host, { all: true });
    if (addrs.length === 0) return { reason: 'dns lookup failed' };
    for (const a of addrs) {
      if (isPrivateOrLoopbackIp(a.address)) return { reason: 'resolves to private ip' };
    }
    return { parsed, address: addrs[0].address, family: addrs[0].family };
  } catch {
    return { reason: 'dns lookup failed' };
  }
}

function postToResolvedTarget(target, headers, body) {
  const client = target.parsed.protocol === 'https:' ? httpsRequest : httpRequest;
  const options = {
    protocol: target.parsed.protocol,
    hostname: target.parsed.hostname,
    port: target.parsed.port || undefined,
    path: `${target.parsed.pathname}${target.parsed.search}`,
    method: 'POST',
    headers,
    lookup: (_hostname, _options, cb) => cb(null, target.address, target.family),
  };

  return new Promise((resolve) => {
    const req = client(options, (res) => {
      res.resume();
      res.on('end', resolve);
    });
    req.setTimeout(5000, () => req.destroy());
    req.on('error', resolve);
    req.write(body);
    req.end();
  });
}

export async function dispatchWebhook(workspaceId, event, payload) {
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

      // SSRF check on every dispatch. Hosts can rebind, so cache nothing.
      const target = await resolveSafeTarget(wh.url);
      if (target.reason) {
        console.warn(`[webhook] refusing dispatch to ${wh.url}: ${target.reason}`);
        continue;
      }

      const signature = crypto
        .createHmac('sha256', wh.secret)
        .update(body)
        .digest('hex');

      postToResolvedTarget(
        target,
        {
          'Content-Type': 'application/json',
          'X-Elevate-Event': event,
          'X-Elevate-Signature': signature,
          'X-Elevate-Delivery': crypto.randomUUID(),
          'User-Agent': 'Elevate-Webhook/1.0',
        },
        body
      );
    }
  } catch {
    // Webhook dispatch should never crash the main request
  }
}


/**
 * Dispatch a single webhook (used by the manual test endpoint). Same SSRF
 * guard and timeout as `dispatchWebhook`. Returns true on attempt, false
 * if blocked. Never throws.
 */
export async function dispatchSingleWebhook({ url, secret, event = 'ping', payload }) {
  const target = await resolveSafeTarget(url);
  if (target.reason) {
    console.warn(`[webhook] refusing dispatch to ${url}: ${target.reason}`);
    return { ok: false, reason: target.reason };
  }
  const body = JSON.stringify(
    payload ?? {
      event,
      timestamp: new Date().toISOString(),
    }
  );
  const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');

  await postToResolvedTarget(
    target,
    {
      'Content-Type': 'application/json',
      'X-Elevate-Event': event,
      'X-Elevate-Signature': signature,
      'X-Elevate-Delivery': crypto.randomUUID(),
      'User-Agent': 'Elevate-Webhook/1.0',
    },
    body
  );
  return { ok: true };
}

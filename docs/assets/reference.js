/* ============================================================
   Jokel API Reference — custom OpenAPI renderer
   No external deps. Reads /api/spec, builds a sidebar + per-op
   cards using the same look as the rest of the docs.
   ============================================================ */

(() => {
  const SPEC_URL = '/api/spec';
  const METHOD_ORDER = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];

  let spec = null;

  // ---------- Helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, attrs = {}, ...children) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children) {
      if (c == null || c === false) continue;
      if (Array.isArray(c)) c.forEach((x) => x != null && node.append(x));
      else node.append(c.nodeType ? c : String(c));
    }
    return node;
  };

  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);

  const slugify = (s) =>
    String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const opId = (method, path) => `op-${method}-${slugify(path)}`;
  const tagId = (tag) => `tag-${slugify(tag)}`;

  // ---------- $ref resolver ----------
  function resolveRef(node, depth = 0) {
    if (!node || typeof node !== 'object' || depth > 10) return node;
    if (node.$ref) {
      const path = node.$ref.replace(/^#\//, '').split('/');
      let target = spec;
      for (const p of path) target = target?.[p];
      return resolveRef(target, depth + 1);
    }
    return node;
  }

  // ---------- Example builder from schema ----------
  function buildExample(schema, depth = 0) {
    schema = resolveRef(schema);
    if (!schema || depth > 6) return null;
    if (schema.example !== undefined) return schema.example;
    if (schema.default !== undefined) return schema.default;
    if (schema.enum) return schema.enum[0];

    if (schema.oneOf) return buildExample(schema.oneOf[0], depth + 1);
    if (schema.anyOf) return buildExample(schema.anyOf[0], depth + 1);
    if (schema.allOf) {
      const merged = { type: 'object', properties: {} };
      for (const s of schema.allOf) {
        const r = resolveRef(s);
        if (r.properties) Object.assign(merged.properties, r.properties);
      }
      return buildExample(merged, depth + 1);
    }

    switch (schema.type) {
      case 'string':
        if (schema.format === 'date-time') return '2026-05-16T10:30:00.000Z';
        if (schema.format === 'date') return '2026-05-16';
        if (schema.format === 'email') return 'user@example.com';
        if (schema.format === 'uri' || schema.format === 'url') return 'https://example.com';
        if (schema.format === 'uuid') return '00000000-0000-0000-0000-000000000000';
        return 'string';
      case 'integer':
      case 'number':
        return 0;
      case 'boolean':
        return false;
      case 'array':
        return [buildExample(schema.items, depth + 1)].filter((x) => x !== null);
      case 'object':
      default: {
        const out = {};
        const props = schema.properties || {};
        for (const [k, v] of Object.entries(props)) {
          out[k] = buildExample(v, depth + 1);
        }
        return out;
      }
    }
  }

  // ---------- JSON pretty-printer with token classes ----------
  function highlightJson(value) {
    const json = JSON.stringify(value, null, 2);
    if (!json) return '';
    return json
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/("(?:\\.|[^"\\])*")(\s*:)/g, '<span class="tk-key">$1</span>$2')
      .replace(/:\s*("(?:\\.|[^"\\])*")/g, (m, str) => ': <span class="tk-str">' + str + '</span>')
      .replace(/:\s*(true|false|null)/g, ': <span class="tk-kw">$1</span>')
      .replace(/:\s*(-?\d+(?:\.\d+)?)/g, ': <span class="tk-num">$1</span>')
      .replace(/([\[\]{},])/g, '<span class="tk-pun">$1</span>');
  }

  // ---------- Schema tree renderer ----------
  function renderSchema(schema, opts = {}) {
    schema = resolveRef(schema);
    if (!schema) return el('div', { class: 'schema-empty' }, 'No schema');

    // Compose oneOf / anyOf / allOf
    if (schema.oneOf || schema.anyOf) {
      const variants = schema.oneOf || schema.anyOf;
      const label = schema.oneOf ? 'one of' : 'any of';
      return el(
        'div',
        { class: 'schema-variants' },
        el('div', { class: 'schema-variant-label' }, label),
        ...variants.map((v) => renderSchema(v, opts))
      );
    }
    if (schema.allOf) {
      const merged = { type: 'object', properties: {}, required: [] };
      for (const s of schema.allOf) {
        const r = resolveRef(s);
        if (r.properties) Object.assign(merged.properties, r.properties);
        if (r.required) merged.required.push(...r.required);
      }
      return renderSchema(merged, opts);
    }

    const t = schema.type || (schema.properties ? 'object' : null);

    // Object
    if (t === 'object' || schema.properties) {
      const props = schema.properties || {};
      const required = new Set(schema.required || []);
      const rows = Object.entries(props).map(([name, prop]) => {
        const r = resolveRef(prop);
        const typeStr = formatType(r);
        return el(
          'div',
          { class: 'prop-row' },
          el(
            'div',
            { class: 'prop-row-head' },
            el('code', { class: 'prop-name' }, name),
            el('span', { class: 'prop-type' }, typeStr),
            required.has(name) && el('span', { class: 'prop-required' }, 'required'),
            r.deprecated && el('span', { class: 'prop-badge' }, 'deprecated')
          ),
          r.description && el('div', { class: 'prop-desc' }, r.description),
          r.enum && el(
            'div',
            { class: 'prop-enum' },
            'Allowed: ',
            ...r.enum.map((v, i) => [
              i > 0 && ', ',
              el('code', {}, JSON.stringify(v))
            ]).flat()
          ),
          (r.type === 'object' || r.properties) && renderNestedSchema(r),
          r.type === 'array' && r.items && renderArrayItems(r.items)
        );
      });
      return rows.length ? el('div', { class: 'schema-props' }, ...rows) : el('div', { class: 'schema-empty' }, 'object');
    }

    // Array at top-level
    if (t === 'array') {
      return el(
        'div',
        { class: 'schema-array' },
        el('div', { class: 'schema-array-label' }, 'Array of'),
        renderSchema(schema.items, opts)
      );
    }

    // Primitive
    return el('div', { class: 'schema-primitive' }, formatType(schema));
  }

  function renderNestedSchema(schema) {
    if (!schema.properties) return null;
    const wrap = el('details', { class: 'prop-nested' });
    wrap.append(el('summary', {}, 'Properties'));
    wrap.append(renderSchema(schema));
    return wrap;
  }

  function renderArrayItems(items) {
    const r = resolveRef(items);
    if (!r.properties) return null;
    const wrap = el('details', { class: 'prop-nested' });
    wrap.append(el('summary', {}, 'Item shape'));
    wrap.append(renderSchema(r));
    return wrap;
  }

  function formatType(schema) {
    if (!schema) return 'any';
    if (schema.$ref) return schema.$ref.split('/').pop();
    if (schema.oneOf) return 'oneOf';
    if (schema.anyOf) return 'anyOf';
    if (schema.allOf) return 'object';
    if (schema.type === 'array') {
      const inner = resolveRef(schema.items);
      return `array<${formatType(inner)}>`;
    }
    if (schema.format) return `${schema.type} (${schema.format})`;
    return schema.type || 'any';
  }

  // ---------- Operation card ----------
  function renderOperation(method, path, op, baseUrl) {
    const id = opId(method, path);
    const card = el('section', { class: 'op-card', id });

    // Header
    const head = el(
      'header',
      { class: 'op-head' },
      op.summary && el('h3', { class: 'op-summary' }, op.summary),
      el(
        'div',
        { class: 'op-head-row' },
        el('span', { class: `method method-${method}` }, method),
        el('code', { class: 'op-path' }, path)
      ),
      op.description && el('p', { class: 'op-desc' }, op.description)
    );

    // Two-column body
    const body = el('div', { class: 'op-body' });
    const left = el('div', { class: 'op-left' });
    const right = el('div', { class: 'op-right' });

    left.append(head);

    // --- LEFT: parameters, request body, responses ---

    // Auth
    if (op.security && op.security.length === 0) {
      left.append(el('div', { class: 'op-section' }, el('h4', {}, 'Authentication'), el('p', { class: 'op-muted' }, 'Public endpoint, no auth required.')));
    } else if (op.security || spec.security) {
      const reqs = op.security || spec.security || [];
      const names = reqs.flatMap((r) => Object.keys(r));
      const schemes = (spec.components && spec.components.securitySchemes) || {};
      const items = [...new Set(names)].map((n) => {
        const s = schemes[n];
        if (!s) return el('li', {}, n);
        if (s.type === 'http' && s.scheme === 'bearer') return el('li', {}, el('code', {}, 'Authorization'), ' header — Bearer ', s.bearerFormat || 'token');
        if (s.type === 'apiKey') return el('li', {}, el('code', {}, s.name), ` ${s.in} — API key`);
        return el('li', {}, `${n} (${s.type})`);
      });
      left.append(el('div', { class: 'op-section' }, el('h4', {}, 'Authentication'), el('ul', { class: 'op-auth' }, ...items)));
    }

    // Parameters
    const params = (op.parameters || []).map(resolveRef);
    const grouped = { path: [], query: [], header: [], cookie: [] };
    params.forEach((p) => grouped[p.in]?.push(p));

    for (const [where, list] of Object.entries(grouped)) {
      if (!list.length) continue;
      left.append(
        el(
          'div',
          { class: 'op-section' },
          el('h4', {}, where[0].toUpperCase() + where.slice(1) + ' parameters'),
          el(
            'div',
            { class: 'param-list' },
            ...list.map((p) =>
              el(
                'div',
                { class: 'prop-row' },
                el(
                  'div',
                  { class: 'prop-row-head' },
                  el('code', { class: 'prop-name' }, p.name),
                  el('span', { class: 'prop-type' }, formatType(p.schema || {})),
                  p.required && el('span', { class: 'prop-required' }, 'required')
                ),
                p.description && el('div', { class: 'prop-desc' }, p.description),
                p.schema && p.schema.enum && el(
                  'div',
                  { class: 'prop-enum' },
                  'Allowed: ',
                  ...p.schema.enum.map((v, i) => [i > 0 && ', ', el('code', {}, JSON.stringify(v))]).flat()
                )
              )
            )
          )
        )
      );
    }

    // Request body
    const reqBody = op.requestBody && resolveRef(op.requestBody);
    if (reqBody && reqBody.content) {
      const json = reqBody.content['application/json'];
      const form = reqBody.content['multipart/form-data'] || reqBody.content['application/x-www-form-urlencoded'];
      const media = json || form;
      if (media && media.schema) {
        left.append(
          el(
            'div',
            { class: 'op-section' },
            el(
              'h4',
              {},
              'Request body',
              reqBody.required && el('span', { class: 'prop-required', style: 'margin-left:8px' }, 'required')
            ),
            reqBody.description && el('p', { class: 'op-muted' }, reqBody.description),
            renderSchema(media.schema)
          )
        );
      }
    }

    // Responses
    if (op.responses) {
      const tabs = el('div', { class: 'response-tabs' });
      const panels = el('div', { class: 'response-panels' });
      const codes = Object.keys(op.responses).sort();

      codes.forEach((code, i) => {
        const resp = resolveRef(op.responses[code]);
        const isOk = String(code).startsWith('2');
        const isErr = String(code).startsWith('4') || String(code).startsWith('5');

        const tab = el(
          'button',
          {
            type: 'button',
            class: 'response-tab' + (i === 0 ? ' active' : ''),
            onclick: (e) => {
              tabs.querySelectorAll('.response-tab').forEach((t) => t.classList.remove('active'));
              e.currentTarget.classList.add('active');
              panels.querySelectorAll('.response-panel').forEach((p) => p.classList.remove('active'));
              $(`#panel-${id}-${code}`, panels).classList.add('active');
            }
          },
          el('span', { class: `status-pill ${isOk ? 'status-ok' : isErr ? 'status-err' : 'status-other'}` }, code),
          el('span', { class: 'response-tab-desc' }, resp.description || '')
        );
        tabs.append(tab);

        const json = resp.content && resp.content['application/json'];
        const panel = el(
          'div',
          {
            class: 'response-panel' + (i === 0 ? ' active' : ''),
            id: `panel-${id}-${code}`
          },
          json && json.schema ? renderSchema(json.schema) : el('p', { class: 'op-muted' }, 'No response body.')
        );
        panels.append(panel);
      });

      left.append(el('div', { class: 'op-section' }, el('h4', {}, 'Responses'), tabs, panels));
    }

    // --- RIGHT: example request & response ---

    // Build curl
    const curl = buildCurl(method, path, op, baseUrl, params);
    right.append(
      el(
        'div',
        { class: 'op-example' },
        renderCodeBlock(curl, 'shell', null, 'Example Request')
      )
    );

    // Example response (first 2xx with body)
    const resp200 = op.responses && (op.responses['200'] || op.responses['201'] || op.responses['default']);
    if (resp200) {
      const r = resolveRef(resp200);
      const json = r.content && r.content['application/json'];
      if (json && json.schema) {
        const example = json.example !== undefined ? json.example : buildExample(json.schema);
        right.append(
          el(
            'div',
            { class: 'op-example' },
            renderCodeBlock(
              JSON.stringify(example, null, 2),
              'json',
              highlightJson(example),
              'Response ' + (Object.keys(op.responses).find((c) => /^2/.test(c)) || '200')
            )
          )
        );
      }
    }

    body.append(left, right);
    card.append(body);
    return card;
  }

  function buildCurl(method, path, op, baseUrl, params) {
    const lines = [];
    let url = baseUrl + path;

    // Substitute path params with placeholders
    params.filter((p) => p.in === 'path').forEach((p) => {
      url = url.replace(`{${p.name}}`, `{${p.name}}`);
    });

    // Append query params
    const queryParams = params.filter((p) => p.in === 'query' && p.required);
    if (queryParams.length) {
      url += '?' + queryParams.map((p) => `${p.name}={${p.name}}`).join('&');
    }

    const m = method.toUpperCase();
    if (m === 'GET') {
      lines.push(`curl '${url}' \\`);
    } else {
      lines.push(`curl -X ${m} '${url}' \\`);
    }

    // Auth header
    const security = op.security || spec.security || [];
    const schemes = (spec.components && spec.components.securitySchemes) || {};
    const usedScheme = security[0] && Object.keys(security[0])[0];
    const s = schemes[usedScheme];
    if (s) {
      if (s.type === 'http' && s.scheme === 'bearer') {
        lines.push(`  --header 'Authorization: Bearer YOUR_TOKEN' \\`);
      } else if (s.type === 'apiKey' && s.in === 'header') {
        lines.push(`  --header '${s.name}: jokel_your_key_here' \\`);
      }
    }

    // Required headers
    params.filter((p) => p.in === 'header' && p.required).forEach((p) => {
      lines.push(`  --header '${p.name}: <${p.name}>' \\`);
    });

    // Body
    const reqBody = op.requestBody && resolveRef(op.requestBody);
    if (reqBody && reqBody.content) {
      const json = reqBody.content['application/json'];
      if (json && json.schema) {
        const example = json.example !== undefined ? json.example : buildExample(json.schema);
        lines.push(`  --header 'Content-Type: application/json' \\`);
        lines.push(`  --data '${JSON.stringify(example)}'`);
      } else if (reqBody.content['multipart/form-data']) {
        lines.push(`  --form 'file=@/path/to/file'`);
      }
    } else {
      // Strip trailing backslash-space from last line
      const last = lines[lines.length - 1];
      if (last.endsWith(' \\')) lines[lines.length - 1] = last.slice(0, -2);
    }

    return lines.join('\n');
  }

  function renderCodeBlock(text, lang, highlightedHtml, title) {
    const code = el('code', highlightedHtml ? { html: highlightedHtml } : {}, highlightedHtml ? null : text);
    const block = el(
      'div',
      { class: 'code' },
      el(
        'div',
        { class: 'code-head' },
        el('div', { class: 'code-head-left' }, el('span', { class: 'code-lang' }, title || lang)),
        el(
          'button',
          { class: 'copy-btn', type: 'button' },
          el('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', html: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>' }),
          'Copy'
        )
      ),
      el('pre', {}, code)
    );
    if (highlightedHtml) code.dataset.text = text;
    return block;
  }

  // ---------- Sidebar ----------
  function buildSidebar(grouped) {
    const nav = $('#ref-nav');
    nav.innerHTML = '';

    grouped.forEach(({ tag, ops }) => {
      const group = el('details', { class: 'ref-group' });
      const head = el('summary', { class: 'ref-group-head' });
      head.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <svg viewBox="0 0 24 24" class="ref-group-icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          <span class="ref-group-name">${tag.name}</span>
        </div>
        <span class="ref-group-count">${ops.length}</span>
      `;
      group.append(head);

      const list = el('ul', { class: 'ref-op-list' });
      ops.forEach(({ method, path, op }) => {
        const li = el(
          'li',
          {},
          el(
            'a',
            {
              class: 'ref-op-link',
              href: '#' + opId(method, path),
              'data-op-id': opId(method, path)
            },
            el('span', { class: `ref-op-method method method-${method}` }, method),
            el('span', { class: 'ref-op-path', title: path }, op.summary || path)
          )
        );
        list.append(li);
      });
      group.append(list);
      nav.append(group);
    });
  }

  // ---------- Filter ----------
  function applyFilter(query) {
    const q = query.trim().toLowerCase();
    document.querySelectorAll('.ref-group').forEach((group) => {
      let groupHasMatch = false;
      group.querySelectorAll('.ref-op-link').forEach((link) => {
        const text = link.textContent.toLowerCase();
        const match = !q || text.includes(q);
        link.parentElement.style.display = match ? '' : 'none';
        if (match) groupHasMatch = true;
      });
      group.style.display = groupHasMatch ? '' : 'none';
      if (groupHasMatch && q) group.open = true;
    });
  }

  // ---------- Scroll-spy ----------
  function setupScrollspy() {
    const links = document.querySelectorAll('.ref-op-link[data-op-id]');
    const targets = [...links].map((a) => ({
      link: a,
      el: document.getElementById(a.dataset.opId)
    })).filter((x) => x.el);

    if (!targets.length) return;

    const setActive = (id) => {
      links.forEach((l) => l.classList.toggle('active', l.dataset.opId === id));
      
      const active = document.querySelector('.ref-op-link.active');
      if (active) {
        const activeDetails = active.closest('details.ref-group');
        
        // Close all other groups and open the active one
        document.querySelectorAll('details.ref-group').forEach(details => {
          if (details === activeDetails) {
            if (!details.open) details.open = true;
          } else {
            details.open = false;
          }
        });
        
        active.scrollIntoView({ block: 'nearest' });
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 }
    );

    targets.forEach((t) => observer.observe(t.el));
  }

  // ---------- Main render ----------
  function render() {
    const baseUrl = (spec.servers && spec.servers[0] && spec.servers[0].url) || '';
    const tags = spec.tags || [];

    // Group operations by tag, preserving spec tag order
    const tagMap = new Map();
    tags.forEach((t) => tagMap.set(t.name, { tag: t, ops: [] }));

    Object.entries(spec.paths || {}).forEach(([path, methods]) => {
      METHOD_ORDER.forEach((method) => {
        const op = methods[method];
        if (!op) return;
        const opTags = op.tags && op.tags.length ? op.tags : ['Untagged'];
        opTags.forEach((tn) => {
          if (!tagMap.has(tn)) tagMap.set(tn, { tag: { name: tn, description: '' }, ops: [] });
          tagMap.get(tn).ops.push({ method, path, op });
        });
      });
    });

    const grouped = [...tagMap.values()].filter((g) => g.ops.length);

    // Sidebar
    buildSidebar(grouped);

    // Content
    const content = $('#ref-content');
    content.innerHTML = '';

    // Intro
    const info = spec.info || {};
    content.append(
      el(
        'header',
        { class: 'ref-header' },
        el('div', { class: 'kicker' }, 'API Reference'),
        el('h1', { class: 'page-title' }, info.title || 'API'),
        info.description && el('p', { class: 'page-lede' }, info.description),
        el(
          'div',
          { class: 'ref-meta' },
          el('div', { class: 'ref-meta-item' }, el('span', { class: 'ref-meta-label' }, 'Base URL'), el('span', { class: 'ref-meta-value' }, baseUrl)),
          el('div', { class: 'ref-meta-item' }, el('span', { class: 'ref-meta-label' }, 'Version'), el('span', { class: 'ref-meta-value' }, info.version || '1.0')),
          el('div', { class: 'ref-meta-item' }, el('span', { class: 'ref-meta-label' }, 'Format'), el('span', { class: 'ref-meta-value' }, 'application/json'))
        )
      )
    );

    // Each tag group
    grouped.forEach(({ tag, ops }) => {
      const tagInner = el(
        'div',
        { class: 'ref-tag-inner' },
        el('h2', { class: 'ref-tag-title' }, tag.name),
        tag.description && el('p', { class: 'ref-tag-desc' }, tag.description)
      );
      content.append(
        el('section', { class: 'ref-tag-section', id: tagId(tag.name) }, tagInner)
      );

      ops.forEach(({ method, path, op }) => {
        content.append(renderOperation(method, path, op, baseUrl));
      });
    });

    setupScrollspy();
  }

  // ---------- Boot ----------
  fetch(SPEC_URL)
    .then((r) => {
      if (!r.ok) throw new Error('Spec fetch failed: ' + r.status);
      return r.json();
    })
    .then((data) => {
      spec = data;
      render();
    })
    .catch((err) => {
      $('#ref-content').innerHTML = `<div class="callout callout-warn"><div class="callout-body"><strong>Failed to load API spec.</strong>${escapeHtml(err.message)}</div></div>`;
      $('#ref-nav').innerHTML = '';
    });

  // Search filter
  document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'ref-search') applyFilter(e.target.value);
  });

  // Override copy button to use the original (un-highlighted) text when present
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.copy-btn');
    if (!btn) return;
    const block = btn.closest('.code');
    const code = block && block.querySelector('pre code');
    if (code && code.dataset.text) {
      // Pre-empt docs.js: copy the raw text instead of innerText (which preserves entities ok but not always)
      navigator.clipboard.writeText(code.dataset.text).catch(() => {});
    }
  }, true);
})();

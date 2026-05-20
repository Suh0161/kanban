/* ============================================================
   Elevate API Reference — custom OpenAPI renderer
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
  function renderOperation(method, path, op, displayBaseUrl, tryItBaseUrl) {
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
    const curl = buildCurl(method, path, op, displayBaseUrl, params);
    right.append(
      el(
        'div',
        { class: 'op-example' },
        renderCodeBlock(curl, 'shell', null, 'Example Request')
      )
    );

    // Try It panel — actually hits the live API
    right.append(buildTryItPanel(method, path, op, tryItBaseUrl, params));

    body.append(left, right);
    card.append(body);
    return card;
  }

  // ---------- Try It panel ----------
  // Persists the bearer token in localStorage so the same value carries
  // across operations (most users will paste it once and try multiple
  // endpoints). Stored under a docs-specific key so it can't collide
  // with the app's own auth state.
  const TOKEN_KEY = 'elevate-docs-token';
  const getStoredToken = () => {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
  };
  const setStoredToken = (v) => {
    try {
      if (v) localStorage.setItem(TOKEN_KEY, v);
      else localStorage.removeItem(TOKEN_KEY);
    } catch { /* private mode */ }
  };

  function buildTryItPanel(method, path, op, baseUrl, params) {
    const panel = el('div', { class: 'tryit' });

    // ---- Auth scheme detection (used by both URL builder and send) ----
    const security = op.security || spec.security || [];
    const schemes = (spec.components && spec.components.securitySchemes) || {};
    const usedScheme = security[0] && Object.keys(security[0])[0];
    const secDef = schemes[usedScheme];
    const isPublic = op.security && op.security.length === 0;

    // ---- Param sets ----
    const pathParams = params.filter((p) => p.in === 'path');
    const queryParams = params.filter((p) => p.in === 'query');
    const headerParams = params.filter((p) => p.in === 'header');

    // ---- Auth row ----
    const authField = el('input', {
      type: 'password',
      class: 'tryit-kv-value',
      placeholder: secDef && secDef.type === 'http' ? 'Bearer token' : (secDef && secDef.name) || 'Token',
      value: getStoredToken(),
      autocomplete: 'off',
    });
    authField.addEventListener('input', (e) => setStoredToken(e.target.value));

    // ---- Param inputs ----
    const pathInputs = {};
    pathParams.forEach((p) => {
      pathInputs[p.name] = el('input', {
        type: 'text',
        class: 'tryit-kv-value',
        placeholder: formatType(p.schema || {}),
      });
    });
    const queryInputs = {};
    queryParams.forEach((p) => {
      queryInputs[p.name] = el('input', {
        type: 'text',
        class: 'tryit-kv-value',
        placeholder: formatType(p.schema || {}),
      });
    });
    const headerInputs = {};
    headerParams.forEach((p) => {
      headerInputs[p.name] = el('input', {
        type: 'text',
        class: 'tryit-kv-value',
        placeholder: '<value>',
      });
    });

    // ---- Body editor ----
    const reqBody = op.requestBody && resolveRef(op.requestBody);
    let bodyEditor = null;
    let bodyKind = null;
    let bodySection = null;
    if (reqBody && reqBody.content) {
      const json = reqBody.content['application/json'];
      if (json && json.schema) {
        bodyKind = 'json';
        const example = json.example !== undefined ? json.example : buildExample(json.schema);
        bodyEditor = el('textarea', {
          class: 'tryit-textarea',
          rows: '8',
          spellcheck: 'false',
        }, JSON.stringify(example, null, 2));
        bodySection = bodyEditor;
      } else if (reqBody.content['multipart/form-data']) {
        bodyKind = 'multipart';
        bodySection = el('p', { class: 'tryit-help' },
          'File uploads need a real form picker. Use the curl example above or build the multipart request from your client.');
      }
    }

    // ---- Top bar: method + URL + Send ----
    const urlInput = el('input', {
      type: 'text',
      class: 'tryit-url-input',
      spellcheck: 'false',
      autocomplete: 'off',
    });
    let urlEditedManually = false;
    urlInput.addEventListener('input', () => { urlEditedManually = true; });

    const buildUrl = () => {
      let url = baseUrl + path;
      Object.entries(pathInputs).forEach(([name, input]) => {
        const v = input.value.trim();
        if (v) url = url.replace(`{${name}}`, encodeURIComponent(v));
      });
      const qs = Object.entries(queryInputs)
        .map(([name, input]) => [name, input.value.trim()])
        .filter(([, v]) => v.length)
        .map(([name, v]) => `${encodeURIComponent(name)}=${encodeURIComponent(v)}`)
        .join('&');
      if (qs) url += '?' + qs;
      return url;
    };

    const syncUrl = () => {
      if (urlEditedManually) return;
      urlInput.value = buildUrl();
    };
    syncUrl();

    [...Object.values(pathInputs), ...Object.values(queryInputs)].forEach((input) =>
      input.addEventListener('input', syncUrl)
    );

    const sendBtn = el(
      'button',
      { type: 'button', class: 'tryit-send' },
      'Send'
    );

    const responseHost = el('div', { class: 'tryit-response' });
    renderResponseEmpty(responseHost);

    sendBtn.addEventListener('click', () =>
      sendRequest({
        method,
        urlOverride: urlEditedManually ? urlInput.value.trim() : buildUrl(),
        pathInputs,
        headerInputs,
        authField,
        secDef,
        bodyEditor,
        bodyKind,
        sendBtn,
        responseHost,
      })
    );

    panel.append(
      el(
        'div',
        { class: 'tryit-bar' },
        el('span', { class: `tryit-method method method-${method}` }, method),
        urlInput,
        sendBtn
      )
    );

    // ---- Sections (collapsible) ----
    const sections = el('div', { class: 'tryit-sections' });

    if (!isPublic && secDef) {
      sections.append(
        renderTryItSection({
          title: 'Authentication',
          required: true,
          count: authField.value ? 1 : 0,
          rows: [renderKvRow({ key: secDef.type === 'http' ? 'Bearer Token' : secDef.name, valueEl: authField, locked: true })],
        })
      );
      authField.addEventListener('input', () => updateSectionCount(sections, 'Authentication', authField.value ? 1 : 0));
    }

    if (pathParams.length) {
      sections.append(
        renderTryItSection({
          title: 'Path Variables',
          required: pathParams.some((p) => p.required),
          count: pathParams.length,
          alwaysOpen: true,
          rows: pathParams.map((p) =>
            renderKvRow({
              key: p.name,
              valueEl: pathInputs[p.name],
              required: p.required,
              hint: p.description,
              locked: true,
            })
          ),
        })
      );
    }

    if (queryParams.length) {
      sections.append(
        renderTryItSection({
          title: 'Query Parameters',
          required: queryParams.some((p) => p.required),
          count: queryParams.length,
          rows: queryParams.map((p) =>
            renderKvRow({
              key: p.name,
              valueEl: queryInputs[p.name],
              required: p.required,
              hint: p.description,
              locked: true,
            })
          ),
        })
      );
    }

    if (headerParams.length) {
      sections.append(
        renderTryItSection({
          title: 'Headers',
          count: headerParams.length,
          rows: headerParams.map((p) =>
            renderKvRow({
              key: p.name,
              valueEl: headerInputs[p.name],
              required: p.required,
              hint: p.description,
              locked: true,
            })
          ),
        })
      );
    }

    if (bodySection) {
      sections.append(
        renderTryItSection({
          title: bodyKind === 'json' ? 'Body (JSON)' : 'Body',
          required: !!(reqBody && reqBody.required),
          count: 0,
          alwaysOpen: true,
          customBody: bodySection,
        })
      );
    }

    panel.append(sections);
    panel.append(
      el(
        'div',
        { class: 'tryit-response-wrap' },
        el(
          'div',
          { class: 'tryit-response-bar' },
          el('span', { class: 'tryit-response-title' }, 'Response')
        ),
        responseHost
      )
    );

    return panel;
  }

  // Renders a single collapsible section with a header (title, optional
  // required pill, and a count badge) plus a body of key/value rows or a
  // custom element (e.g. textarea for the request body).
  function renderTryItSection({ title, required = false, count = 0, alwaysOpen = false, rows, customBody }) {
    const det = el('details', { class: 'tryit-section', 'data-section-title': title });
    if (alwaysOpen || (rows && rows.length) || customBody) det.open = true;

    const summary = el(
      'summary',
      { class: 'tryit-section-head' },
      el('span', { class: 'tryit-section-caret', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>' }),
      el('span', { class: 'tryit-section-title' }, title),
      required && el('span', { class: 'tryit-section-required' }, 'Required'),
      count > 0 && el('span', { class: 'tryit-section-count' }, String(count))
    );
    det.append(summary);

    if (customBody) {
      det.append(el('div', { class: 'tryit-section-body tryit-section-body-custom' }, customBody));
    } else if (rows && rows.length) {
      det.append(el('div', { class: 'tryit-section-body' }, ...rows));
    }
    return det;
  }

  function updateSectionCount(root, title, n) {
    const det = root.querySelector(`.tryit-section[data-section-title="${title}"]`);
    if (!det) return;
    const summary = det.querySelector('.tryit-section-head');
    if (!summary) return;
    let badge = summary.querySelector('.tryit-section-count');
    if (n > 0) {
      if (!badge) {
        badge = el('span', { class: 'tryit-section-count' }, String(n));
        summary.append(badge);
      } else {
        badge.textContent = String(n);
      }
    } else if (badge) {
      badge.remove();
    }
  }

  // A two-column key/value row used inside sections. The key column is
  // either a label (locked, e.g. an OpenAPI param) or a free input.
  function renderKvRow({ key, valueEl, required, hint, locked }) {
    const row = el('div', { class: 'tryit-kv' });
    const keyCell = locked
      ? el(
        'div',
        { class: 'tryit-kv-key tryit-kv-key-locked' },
        el('code', {}, key),
        required && el('span', { class: 'tryit-kv-required', title: 'Required' }, '*')
      )
      : el('input', { type: 'text', class: 'tryit-kv-key', placeholder: 'Key', value: key || '' });
    row.append(keyCell, valueEl);
    if (hint) row.append(el('div', { class: 'tryit-kv-hint' }, hint));
    return row;
  }

  function renderResponseEmpty(host) {
    host.innerHTML = '';
    host.classList.add('tryit-response-empty');
    host.append(
      el('div', { class: 'tryit-response-placeholder' },
        el('svg', {
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': '1.5',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          html: '<path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4 20-7Z"/>',
        }),
        el('span', {}, 'Click Send to try this request')
      )
    );
  }

  async function sendRequest(ctx) {
    const {
      method,
      urlOverride,
      pathInputs,
      headerInputs,
      authField, secDef,
      bodyEditor, bodyKind,
      sendBtn, responseHost,
    } = ctx;

    // Validate required path params actually have values, otherwise the
    // URL still contains {literal} braces and the server will 404.
    for (const [name, input] of Object.entries(pathInputs)) {
      const v = input.value.trim();
      if (!v) {
        showError(responseHost, `Missing path parameter: {${name}}`);
        return;
      }
    }

    let url = urlOverride;
    if (url.includes('{')) {
      // The user manually edited the URL but left a placeholder in it.
      showError(responseHost, 'URL still contains an unresolved {placeholder}.');
      return;
    }

    const headers = {};
    Object.entries(headerInputs).forEach(([name, input]) => {
      const v = input.value.trim();
      if (v) headers[name] = v;
    });

    // Auth
    const tok = authField && authField.value.trim();
    if (tok && secDef) {
      if (secDef.type === 'http' && secDef.scheme === 'bearer') {
        headers['Authorization'] = 'Bearer ' + tok;
      } else if (secDef.type === 'apiKey' && secDef.in === 'header') {
        headers[secDef.name] = tok;
      } else if (secDef.type === 'apiKey' && secDef.in === 'query') {
        url += (url.includes('?') ? '&' : '?') + encodeURIComponent(secDef.name) + '=' + encodeURIComponent(tok);
      }
    }

    let body = undefined;
    if (bodyKind === 'json' && bodyEditor) {
      const text = bodyEditor.value.trim();
      if (text) {
        try {
          // Re-serialize so we know the JSON parses; protects against the
          // server returning an opaque 400 when the user typed bad JSON.
          body = JSON.stringify(JSON.parse(text));
          headers['Content-Type'] = 'application/json';
        } catch (err) {
          showError(responseHost, 'Invalid JSON in body: ' + err.message);
          return;
        }
      }
    }

    sendBtn.disabled = true;
    sendBtn.classList.add('is-loading');
    responseHost.classList.remove('tryit-response-empty');
    responseHost.innerHTML = '<div class="tryit-pending">Sending request…</div>';

    const start = performance.now();
    try {
      const res = await fetch(url, {
        method: method.toUpperCase(),
        headers,
        body: body !== undefined ? body : undefined,
        // Same-origin: the docs are served by the API, so this is fine.
        credentials: 'omit',
      });
      const elapsed = Math.round(performance.now() - start);

      const ct = res.headers.get('content-type') || '';
      let bodyText = await res.text();
      let parsedJson = null;
      if (ct.includes('application/json')) {
        try { parsedJson = JSON.parse(bodyText); } catch { /* fall through to raw */ }
      }

      renderResponse(responseHost, {
        status: res.status,
        statusText: res.statusText,
        elapsed,
        headers: collectHeaders(res),
        bodyText,
        parsedJson,
      });
    } catch (err) {
      // Most likely network error or CORS. Surface it; don't pretend it
      // was a 5xx from the API.
      showError(responseHost, 'Request failed: ' + (err.message || String(err)));
    } finally {
      sendBtn.disabled = false;
      sendBtn.classList.remove('is-loading');
    }
  }

  function collectHeaders(res) {
    const out = [];
    res.headers.forEach((v, k) => out.push([k, v]));
    return out;
  }

  function renderResponse(host, { status, statusText, elapsed, headers, bodyText, parsedJson }) {
    const cls = status >= 200 && status < 300 ? 'status-ok' : status >= 400 ? 'status-err' : 'status-other';
    host.classList.remove('tryit-response-empty');
    host.innerHTML = '';
    host.append(
      el(
        'div',
        { class: 'tryit-response-head' },
        el('span', { class: 'status-pill ' + cls }, String(status)),
        el('span', { class: 'tryit-response-status' }, statusText || ''),
        el('span', { class: 'tryit-response-meta' }, `${elapsed} ms`)
      )
    );

    // Body
    if (parsedJson !== null) {
      host.append(renderCodeBlock(JSON.stringify(parsedJson, null, 2), 'json', highlightJson(parsedJson), 'Response body'));
    } else if (bodyText) {
      host.append(renderCodeBlock(bodyText, 'text', null, 'Response body'));
    } else {
      host.append(el('p', { class: 'tryit-help' }, 'Empty response body.'));
    }

    // Headers (collapsed by default)
    if (headers.length) {
      const det = el('details', { class: 'tryit-headers' });
      det.append(el('summary', {}, `Response headers (${headers.length})`));
      det.append(
        el(
          'div',
          { class: 'tryit-headers-list' },
          ...headers.map(([k, v]) =>
            el('div', { class: 'tryit-header-row' },
              el('code', { class: 'tryit-header-key' }, k),
              el('code', { class: 'tryit-header-val' }, v)
            )
          )
        )
      );
      host.append(det);
    }
  }

  function showError(host, msg) {
    host.classList.remove('tryit-response-empty');
    host.innerHTML = '';
    host.append(
      el(
        'div',
        { class: 'tryit-error' },
        el('strong', {}, 'Error'),
        el('span', {}, msg)
      )
    );
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
        lines.push(`  --header '${s.name}: Elevate_your_key_here' \\`);
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
    const urls = window.ElevateDocsUrls || {};
    const displayBaseUrl =
      urls.CANONICAL_API_BASE ||
      (urls.resolveDisplayBaseUrl && urls.resolveDisplayBaseUrl(spec)) ||
      'https://app.arcnvd.com/api/v1';
    const tryItBaseUrl =
      (urls.resolveTryItBaseUrl && urls.resolveTryItBaseUrl(spec)) ||
      displayBaseUrl;
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
          el('div', { class: 'ref-meta-item' }, el('span', { class: 'ref-meta-label' }, 'Base URL'), el('span', { class: 'ref-meta-value' }, displayBaseUrl)),
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
        content.append(renderOperation(method, path, op, displayBaseUrl, tryItBaseUrl));
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

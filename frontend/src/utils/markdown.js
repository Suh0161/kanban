import { Marked, Renderer } from 'marked';

const HTML_ESCAPE_CHARS = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const SAFE_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);
const SAFE_IMAGE_PROTOCOLS = new Set(['http:', 'https:']);
const URL_PARSE_BASE = 'https://elevate.local';

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (ch) => HTML_ESCAPE_CHARS[ch]);
}

function hasControlCharacter(value) {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code <= 31 || code === 127) return true;
  }
  return false;
}

function normalizeSafeUrl(value, allowedProtocols) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw || hasControlCharacter(raw)) return null;

  let parsed;
  try {
    parsed = new URL(raw, URL_PARSE_BASE);
  } catch {
    return null;
  }

  if (!allowedProtocols.has(parsed.protocol)) return null;

  try {
    return encodeURI(raw).replace(/%25/g, '%');
  } catch {
    return null;
  }
}

const renderer = new Renderer();

renderer.html = function html({ text }) {
  return escapeHtml(text);
};

renderer.link = function link({ href, title, tokens }) {
  const text = this.parser.parseInline(tokens);
  const safeHref = normalizeSafeUrl(href, SAFE_LINK_PROTOCOLS);
  if (!safeHref) return text;

  let out = `<a href="${escapeHtml(safeHref)}"`;
  if (title) out += ` title="${escapeHtml(title)}"`;
  out += ' rel="noopener noreferrer">';
  out += `${text}</a>`;
  return out;
};

renderer.image = function image({ href, title, text, tokens }) {
  const alt = tokens ? this.parser.parseInline(tokens, this.parser.textRenderer) : text;
  const safeHref = normalizeSafeUrl(href, SAFE_IMAGE_PROTOCOLS);
  if (!safeHref) return escapeHtml(alt);

  let out = `<img src="${escapeHtml(safeHref)}" alt="${escapeHtml(alt)}"`;
  if (title) out += ` title="${escapeHtml(title)}"`;
  out += '>';
  return out;
};

const safeMarked = new Marked({
  breaks: true,
  gfm: true,
  renderer,
});

export function renderSafeMarkdown(markdown) {
  if (!markdown) return '';
  return safeMarked.parse(markdown);
}

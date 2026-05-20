import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { DOCS_URL } from './constants.js';

const SNIPPETS = {
  curl: {
    label: 'cURL',
    code: `curl -X POST "$API/board/cards" \\
  -H "Authorization: Bearer el_key_…" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Ship billing webhooks","columnId":"in_progress"}'`,
  },
  node: {
    label: 'Node',
    code: `const res = await fetch(\`\${API}/board/cards\`, {
  method: 'POST',
  headers: { Authorization: \`Bearer \${key}\` },
  body: JSON.stringify({ title: 'Ship billing webhooks' }),
});`,
  },
};

export default function ApiSandbox() {
  const [tab, setTab] = useState('curl');
  const [copied, setCopied] = useState(false);
  const active = SNIPPETS[tab];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(active.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <section className="home-api section" aria-labelledby="home-api-heading">
      <div className="container home-api-layout">
        <div className="home-api-copy">
          <p className="home-section-eyebrow font-pixel-sm">
            <span lang="ja" className="home-section-kana" aria-hidden="true">
              開発
            </span>
            Developer API
          </p>
          <h2 id="home-api-heading" className="home-section-title">
            Automate the board from your pipeline.
          </h2>
          <p className="home-section-lead">
            REST endpoints mirror the UI. Keys hashed at rest; webhooks signed with
            SSRF guards. OpenAPI regenerates when routes change.
          </p>
          <ul className="home-api-tags">
            <li className="pixel-border">Scoped keys</li>
            <li className="pixel-border">Signed webhooks</li>
            <li className="pixel-border">Live OpenAPI</li>
          </ul>
          <a
            href={DOCS_URL}
            className="btn btn-outline btn-pixel"
            target="_blank"
            rel="noopener noreferrer"
          >
            Browse API docs
          </a>
        </div>

        <div className="home-api-terminal pixel-border pixel-shadow">
          <div className="home-api-terminal-bar">
            <div className="home-api-tabs" role="tablist" aria-label="Code samples">
              {Object.entries(SNIPPETS).map(([key, { label }]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  className={`home-api-tab font-pixel-sm${tab === key ? ' is-active' : ''}`}
                  onClick={() => {
                    setTab(key);
                    setCopied(false);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="home-api-copy-btn pixel-border"
              onClick={handleCopy}
              aria-label="Copy snippet"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span className="font-pixel-sm">{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="home-api-code">
            <code>{active.code}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}

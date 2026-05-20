import { useState } from 'react';

const HERO_SRC = '/hero-illustration.png';

/** Monochrome pixel kanban — no brand gradients */
function HeroIllustrationFallback() {
  return (
    <div className="home-hero-fallback pixel-border" aria-hidden="true">
      <svg
        className="home-hero-fallback-svg pixel-art"
        viewBox="0 0 480 360"
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="crispEdges"
      >
        <rect width="480" height="360" fill="var(--bg-app)" />
        <rect x="24" y="32" width="432" height="296" fill="var(--bg-card)" stroke="var(--border-strong)" strokeWidth="2" />
        <rect x="40" y="48" width="120" height="8" fill="var(--text-muted)" opacity="0.35" />
        <rect x="40" y="64" width="72" height="4" fill="var(--border)" />
        {[0, 1, 2].map((i) => {
          const x = 40 + i * 136;
          return (
            <g key={i}>
              <rect
                x={x}
                y="88"
                width="120"
                height="224"
                fill="var(--bg-elevated)"
                stroke="var(--border)"
                strokeWidth="1"
              />
              <rect x={x + 8} y="100" width="40" height="4" fill="var(--text-tertiary)" opacity="0.6" />
              <rect
                x={x + 8}
                y="116"
                width="104"
                height="40"
                fill="var(--bg-card)"
                stroke="var(--border-strong)"
                strokeWidth="1"
              />
              <rect
                x={x + 8}
                y="164"
                width="104"
                height="32"
                fill="var(--bg-card)"
                stroke="var(--border)"
                strokeWidth="1"
              />
              {i === 1 && (
                <>
                  <rect
                    x={x + 8}
                    y="204"
                    width="104"
                    height="28"
                    fill="var(--text-primary)"
                    opacity="0.12"
                    stroke="var(--border-strong)"
                    strokeWidth="2"
                  />
                  <rect x={x + 16} y="212" width="56" height="4" fill="var(--text-primary)" opacity="0.5" />
                  <rect x={x + 16} y="220" width="40" height="4" fill="var(--text-muted)" opacity="0.4" />
                </>
              )}
              {i === 2 && (
                <rect x={x + 8} y="248" width="48" height="48" fill="var(--bg-card)" stroke="var(--border)" strokeWidth="1" />
              )}
            </g>
          );
        })}
        <rect x="40" y="328" width="8" height="8" fill="var(--text-primary)" opacity="0.25" />
        <rect x="432" y="24" width="8" height="8" fill="var(--text-primary)" opacity="0.15" />
      </svg>
    </div>
  );
}

export default function HeroIllustration() {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <HeroIllustrationFallback />;
  }

  return (
    <img
      src={HERO_SRC}
      alt=""
      className="home-hero-illustration pixel-art pixel-border pixel-shadow"
      width={640}
      height={480}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

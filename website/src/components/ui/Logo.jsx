/**
 * Brand assets from /public/.
 * - wordmark: full logo (elevate-v1.svg) for navbar, footer, hero
 * - icon: small E mark (elevate.svg) for app chrome / favicon contexts
 */

const ICON_SRC = '/elevate.svg';
const WORDMARK_SRC = '/elevate-v1.svg';
const ICON_ASPECT = 135.8 / 150;
const WORDMARK_ASPECT = 172 / 18.5;

export default function Logo({
  variant = 'icon',
  size = 18,
  className = '',
  title = 'Elevate',
}) {
  const isWordmark = variant === 'wordmark';
  const src = isWordmark ? WORDMARK_SRC : ICON_SRC;
  const width = isWordmark
    ? Math.round(size * WORDMARK_ASPECT)
    : size;
  const height = isWordmark
    ? size
    : Math.round(size * ICON_ASPECT);

  return (
    <img
      src={src}
      alt=""
      width={width}
      height={height}
      className={className}
      role="img"
      aria-label={title}
      decoding="async"
    />
  );
}

/**
 * Elevate brand assets from /public.
 * - `mark` — icon (`elevate.svg`), sized via `size` (width px).
 * - `wordmark` — full logotype (`elevate-v1.svg`), sized in CSS (`.brand-logo--wordmark`).
 */

const MARK_SRC = '/elevate.svg';
const WORDMARK_SRC = '/elevate-v1.svg';
const MARK_ASPECT = 135.8 / 150;

export default function Logo({ size = 18, variant = 'mark', className = '', title = 'Elevate' }) {
  if (variant === 'wordmark') {
    const merged = ['brand-logo', 'brand-logo--wordmark', className].filter(Boolean).join(' ');
    return (
      <img
        src={WORDMARK_SRC}
        alt=""
        className={merged}
        role="img"
        aria-label={title}
        decoding="async"
      />
    );
  }

  const merged = ['brand-logo', className].filter(Boolean).join(' ');
  return (
    <img
      src={MARK_SRC}
      alt=""
      width={size}
      height={Math.round(size * MARK_ASPECT)}
      className={merged}
      role="img"
      aria-label={title}
      decoding="async"
    />
  );
}

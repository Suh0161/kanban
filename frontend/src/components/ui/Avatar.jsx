/**
 * Single avatar primitive.
 *
 * Why this exists: Google's `lh3.googleusercontent.com` URLs reject
 * cross-origin requests that include a Referer header, so without
 * `referrerPolicy="no-referrer"` the image silently 403s and we fall
 * back to a single-letter placeholder. We also need a consistent
 * onError → dicebear fallback so a deleted profile image doesn't leave
 * a broken-image icon.
 *
 * Pass any extra `<img>` props through `rest` (className, title, etc.).
 */

import { useState } from 'react';

function dicebear(seed) {
  return `https://api.dicebear.com/7.x/notionists-neutral/png?seed=${encodeURIComponent(seed || 'user')}`;
}

export default function Avatar({
  src,
  alt = '',
  name,
  seed,
  size,
  className = 'avatar',
  ...rest
}) {
  const fallback = dicebear(seed || name || alt || 'user');
  const initial = src && /^https?:|^\/|^data:|^blob:/.test(src) ? src : fallback;
  const [current, setCurrent] = useState(initial);

  const style = size ? { width: size, height: size, ...rest.style } : rest.style;

  return (
    <img
      {...rest}
      style={style}
      className={className}
      src={current}
      alt={alt || name || ''}
      // Critical for Google avatars — without this they 403 on hotlink.
      referrerPolicy="no-referrer"
      onError={(e) => {
        if (current !== fallback) {
          setCurrent(fallback);
        }
        rest.onError?.(e);
      }}
    />
  );
}

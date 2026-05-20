import { createContext, useContext } from 'react';

export const TryDragBoundsContext = createContext(null);

export function useTryDragBounds() {
  return useContext(TryDragBoundsContext);
}

/** Keep hello-pangea fixed-position drags inside the product frame. */
export function clampDragStyle(style, boundsEl, dragEl) {
  if (!style || !boundsEl) return style;

  const top = Number.parseFloat(style.top);
  const left = Number.parseFloat(style.left);
  if (!Number.isFinite(top) || !Number.isFinite(left)) return style;

  const bounds = boundsEl.getBoundingClientRect();
  const width =
    Number.parseFloat(style.width) ||
    dragEl?.getBoundingClientRect().width ||
    dragEl?.offsetWidth ||
    260;
  const height =
    Number.parseFloat(style.height) ||
    dragEl?.getBoundingClientRect().height ||
    dragEl?.offsetHeight ||
    96;

  // Shell uses transform so fixed drags are shell-relative; rbd emits viewport coords.
  const relTop = top - bounds.top;
  const relLeft = left - bounds.left;
  const maxTop = Math.max(0, bounds.height - height);
  const maxLeft = Math.max(0, bounds.width - width);

  return {
    ...style,
    top: Math.min(Math.max(relTop, 0), maxTop),
    left: Math.min(Math.max(relLeft, 0), maxLeft),
    zIndex: 1000,
  };
}

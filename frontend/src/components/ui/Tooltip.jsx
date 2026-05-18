import { useCallback, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const GAP = 10;
const VIEWPORT_PADDING = 8;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function choosePlacement(rect, preferred, size) {
  if (preferred === 'top' && rect.top < size.height + GAP + VIEWPORT_PADDING) return 'bottom';
  if (preferred === 'bottom' && window.innerHeight - rect.bottom < size.height + GAP + VIEWPORT_PADDING) return 'top';
  if (preferred === 'right' && window.innerWidth - rect.right < size.width + GAP + VIEWPORT_PADDING) return 'left';
  if (preferred === 'left' && rect.left < size.width + GAP + VIEWPORT_PADDING) return 'right';
  return preferred;
}

function getCoordinates(rect, preferredPosition, align, size) {
  const position = choosePlacement(rect, preferredPosition, size);
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const maxX = window.innerWidth - size.width - VIEWPORT_PADDING;
  const maxY = window.innerHeight - size.height - VIEWPORT_PADDING;

  if (position === 'right') {
    const x = clamp(rect.right + GAP, VIEWPORT_PADDING, maxX);
    const y = clamp(centerY - size.height / 2, VIEWPORT_PADDING, maxY);
    return {
      position,
      x,
      y,
      arrowY: clamp(centerY - y, 12, size.height - 12),
    };
  }

  if (position === 'left') {
    const x = clamp(rect.left - GAP - size.width, VIEWPORT_PADDING, maxX);
    const y = clamp(centerY - size.height / 2, VIEWPORT_PADDING, maxY);
    return {
      position,
      x,
      y,
      arrowY: clamp(centerY - y, 12, size.height - 12),
    };
  }

  const alignedX = align === 'start'
    ? rect.left
    : align === 'end'
      ? rect.right
      : centerX;
  const x = clamp(alignedX - (align === 'end' ? size.width : align === 'start' ? 0 : size.width / 2), VIEWPORT_PADDING, maxX);
  const y = clamp(
    position === 'bottom' ? rect.bottom + GAP : rect.top - GAP - size.height,
    VIEWPORT_PADDING,
    maxY,
  );

  return {
    position,
    x,
    y,
    arrowX: clamp(centerX - x, 12, size.width - 12),
  };
}

export default function Tooltip({
  content,
  children,
  position = 'top',
  align = 'center',
  className = '',
}) {
  const id = useId();
  const triggerRef = useRef(null);
  const bubbleRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [rect, setRect] = useState(null);
  const [coords, setCoords] = useState(null);

  const updateRect = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setRect(rect);
  }, []);

  const showTooltip = () => {
    updateRect();
    setVisible(true);
  };

  const hideTooltip = () => {
    setVisible(false);
    setCoords(null);
  };

  useLayoutEffect(() => {
    if (!visible || !rect || !bubbleRef.current) return;
    const bubbleRect = bubbleRef.current.getBoundingClientRect();
    setCoords(getCoordinates(rect, position, align, {
      width: bubbleRect.width,
      height: bubbleRect.height,
    }));
  }, [align, content, position, rect, visible]);

  useLayoutEffect(() => {
    if (!visible) return undefined;
    const handleViewportChange = () => updateRect();
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [updateRect, visible]);

  if (!content) return children;

  const classes = [
    'tooltip-trigger',
    className,
  ].filter(Boolean).join(' ');

  return (
    <>
      <span
        ref={triggerRef}
        className={classes}
        aria-describedby={visible ? id : undefined}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        {children}
      </span>
      {visible && createPortal(
        <span
          ref={bubbleRef}
          id={id}
          role="tooltip"
          className={`tooltip-bubble tooltip-bubble-${coords?.position || position}`}
          style={{
            left: coords?.x ?? 0,
            top: coords?.y ?? 0,
            visibility: coords ? 'visible' : 'hidden',
            '--tooltip-arrow-x': coords?.arrowX ? `${coords.arrowX}px` : undefined,
            '--tooltip-arrow-y': coords?.arrowY ? `${coords.arrowY}px` : undefined,
          }}
        >
          {content}
        </span>,
        document.body,
      )}
    </>
  );
}

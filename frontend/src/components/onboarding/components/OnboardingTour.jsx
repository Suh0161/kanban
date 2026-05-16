import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { X } from 'lucide-react';
import { TourActions, TourProgress } from './index.js';
import '../css/onboarding.css';

const PADDING = 8;
const FALLBACK_SIZE = { width: 360, height: 210 };

function computeTooltipPosition(rect, placement, tooltipSize, align = 'center') {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
  const margin = 16;
  const gap = 12;

  if (placement === 'center') {
    return {
      top: (vh - tooltipSize.height) / 2,
      left: (vw - tooltipSize.width) / 2,
    };
  }

  const centeredTop = rect.top + rect.height / 2 - tooltipSize.height / 2;
  const centeredLeft = rect.left + rect.width / 2 - tooltipSize.width / 2;

  let top = rect.bottom + gap;
  let left = centeredLeft;

  if (placement === 'top') {
    top = rect.top - gap - tooltipSize.height;
    if (align === 'start') left = rect.left;
    if (align === 'end') left = rect.right - tooltipSize.width;
  } else if (placement === 'right') {
    top = centeredTop;
    left = rect.right + gap;
    if (align === 'start') top = rect.top;
    if (align === 'end') top = rect.bottom - tooltipSize.height;
  } else if (placement === 'left') {
    top = centeredTop;
    left = rect.left - gap - tooltipSize.width;
    if (align === 'start') top = rect.top;
    if (align === 'end') top = rect.bottom - tooltipSize.height;
  } else if (placement === 'bottom') {
    if (align === 'start') left = rect.left;
    if (align === 'end') left = rect.right - tooltipSize.width;
  }

  left = Math.max(margin, Math.min(left, vw - tooltipSize.width - margin));
  top = Math.max(margin, Math.min(top, vh - tooltipSize.height - margin));

  if (placement === 'bottom' && top + tooltipSize.height > vh - margin) {
    top = rect.top - gap - tooltipSize.height;
  }
  if (placement === 'top' && top < margin) {
    top = rect.bottom + gap;
  }

  return { top, left };
}

export default function OnboardingTour({
  open,
  steps,
  onDismiss,
  onFinish,
  onStepChange,
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlight, setSpotlight] = useState({
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    visible: false,
  });
  const [tooltipPos, setTooltipPos] = useState({ top: 100, left: 100 });
  const tooltipRef = useRef(null);

  const step = steps[stepIndex];
  const isLast = stepIndex >= steps.length - 1;

  const measureAndPlace = useCallback(() => {
    if (!open || !step) return;

    const el = step.targetSelector ? document.querySelector(step.targetSelector) : null;
    if (!el) {
      setSpotlight(prev => ({ ...prev, visible: false }));
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const tt = tooltipRef.current?.getBoundingClientRect();
      const tw = tt?.width ?? FALLBACK_SIZE.width;
      const th = tt?.height ?? FALLBACK_SIZE.height;
      setTooltipPos(
        computeTooltipPosition({ top: 0, left: 0, bottom: vh, right: vw, width: vw, height: vh }, 'center', {
          width: tw,
          height: th,
        }),
      );
      return;
    }

    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });

    const rect = el.getBoundingClientRect();
    const pad = step.pad ?? PADDING;

    setSpotlight({
      top: Math.max(0, rect.top - pad),
      left: Math.max(0, rect.left - pad),
      width: rect.width + pad * 2,
      height: rect.height + pad * 2,
      visible: true,
    });

    const tooltipEl = tooltipRef.current;
    const updateTooltipPos = () => {
      if (!tooltipEl) return;
      const ttRect = tooltipEl.getBoundingClientRect();
      const pos = computeTooltipPosition(rect, step.placement || 'bottom', {
        width: ttRect.width,
        height: ttRect.height,
      }, step.align);
      setTooltipPos(pos);
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(updateTooltipPos);
    });
  }, [open, step]);

  useLayoutEffect(() => {
    if (!open || !step) return undefined;

    if (onStepChange) {
      flushSync(() => {
        onStepChange(step, stepIndex);
      });
    }

    let cancelled = false;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) measureAndPlace();
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [open, step, stepIndex, onStepChange, measureAndPlace]);

  useEffect(() => {
    if (!open) return undefined;

    const onResize = () => measureAndPlace();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onDismiss?.();
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, measureAndPlace, onDismiss]);

  const handleSkip = () => {
    onDismiss?.();
  };

  const handleBack = () => {
    setStepIndex(i => Math.max(0, i - 1));
  };

  const handleNext = () => {
    if (isLast) {
      onFinish?.();
      return;
    }
    setStepIndex(i => i + 1);
  };

  if (!open || !step || typeof document === 'undefined') {
    return null;
  }

  const meta = `Step ${stepIndex + 1} of ${steps.length}`;

  return createPortal(
    <div className="onboarding-root is-blocking" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="onboarding-backdrop" aria-hidden />
      <div
        className={`onboarding-spotlight ${spotlight.visible ? 'is-visible' : ''}`}
        style={{
          top: spotlight.top,
          left: spotlight.left,
          width: spotlight.width,
          height: spotlight.height,
        }}
      />
      <div
        ref={tooltipRef}
        className="onboarding-tooltip"
        style={{ top: tooltipPos.top, left: tooltipPos.left }}
      >
        <div className="onboarding-tooltip-topline">
          <span>{meta}</span>
          <button type="button" className="onboarding-close-btn" onClick={handleSkip} aria-label="Skip tour">
            <X size={15} />
          </button>
        </div>
        <TourProgress current={stepIndex + 1} total={steps.length} />
        <h2 id="onboarding-title" className="onboarding-tooltip-title">{step.title}</h2>
        <p className="onboarding-tooltip-body">{step.body}</p>
        <TourActions
          canGoBack={stepIndex > 0}
          isLast={isLast}
          onBack={handleBack}
          onSkip={handleSkip}
          onNext={handleNext}
        />
      </div>
    </div>,
    document.body,
  );
}

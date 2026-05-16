import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

export default function TourActions({ canGoBack, isLast, onBack, onSkip, onNext }) {
  return (
    <div className="onboarding-tooltip-actions">
      <button type="button" className="onboarding-link-btn" onClick={onSkip}>
        Skip
      </button>
      <div>
        {canGoBack && (
          <button type="button" className="onboarding-ghost-btn" onClick={onBack} aria-label="Previous step">
            <ArrowLeft size={14} />
            Back
          </button>
        )}
        <button type="button" className="onboarding-primary-btn" onClick={onNext}>
          {isLast ? <Check size={14} /> : <ArrowRight size={14} />}
          {isLast ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  );
}

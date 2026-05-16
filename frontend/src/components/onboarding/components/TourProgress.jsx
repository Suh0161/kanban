export default function TourProgress({ current, total }) {
  return (
    <div
      className="onboarding-progress"
      style={{ '--onboarding-step-count': total }}
      aria-label={`Step ${current} of ${total}`}
    >
      {Array.from({ length: total }, (_, index) => (
        <span key={index} className={index + 1 <= current ? 'active' : ''} />
      ))}
    </div>
  );
}

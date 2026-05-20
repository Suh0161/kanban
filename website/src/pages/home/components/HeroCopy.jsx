import { useEffect, useState } from 'react';

const ROTATE_EVERY_MS = 4000;
const FADE_MS = 480;

const HERO_LINES = [
  {
    phrase: 'honest board.',
    deck: 'Plan in the open. Everyone sees the same board, not a shadow spreadsheet.',
  },
  {
    phrase: 'clear backlog.',
    deck: 'Groom, prioritize, and ship without losing context between tabs.',
  },
  {
    phrase: 'focused team.',
    deck: 'Roles that match reality from login to lane: owners, viewers, admins.',
  },
  {
    phrase: 'single plan.',
    deck: 'Kanban, backlog, and API docs that stay in sync when you ship.',
  },
];

export default function HeroCopy() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [motionOk, setMotionOk] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setMotionOk(!mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (!motionOk) return undefined;

    const tick = window.setInterval(() => {
      setVisible(false);
    }, ROTATE_EVERY_MS);

    return () => window.clearInterval(tick);
  }, [motionOk]);

  useEffect(() => {
    if (visible) return undefined;

    const swap = window.setTimeout(() => {
      setIndex((i) => (i + 1) % HERO_LINES.length);
      setVisible(true);
    }, FADE_MS);

    return () => window.clearTimeout(swap);
  }, [visible]);

  const { phrase, deck } = HERO_LINES[index];
  const stateClass = visible ? 'is-visible' : 'is-exiting';

  return (
    <>
      <h1 id="home-hero-heading" className="home-hero-title animate-fade-in-up delay-100">
        <span className="home-hero-title-prefix">Ship work from one</span>
        <span className="home-hero-rotate-wrap" aria-live="polite">
          <span className={`home-hero-rotate-word ${stateClass}`}>{phrase}</span>
        </span>
      </h1>

      <p className="home-hero-deck animate-fade-in-up delay-200">
        <span className={`home-hero-deck-line ${stateClass}`}>{deck}</span>
      </p>
    </>
  );
}

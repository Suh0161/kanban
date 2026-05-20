import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, LayoutGrid } from 'lucide-react';
import Logo from '../../../components/ui/Logo.jsx';
import { TRY_PATH } from '../../../config/nav.js';
import { DOCS_URL, LOGIN_URL } from './constants.js';
import HeroCopy from './HeroCopy.jsx';
import HeroIllustration from './HeroIllustration.jsx';

export default function Hero() {
  return (
    <section className="home-hero pixel-tile-bg" aria-labelledby="home-hero-heading">
      <div className="container home-hero-grid">
        <div className="home-hero-copy">
          <header className="home-hero-brand animate-fade-in-up">
            <Logo variant="wordmark" size={18} className="home-hero-logo logo-wordmark" />
            <div className="home-hero-meta">
              <span className="home-hero-kana" lang="ja" aria-hidden="true">
                昇
              </span>
              <p className="home-hero-eyebrow font-pixel-sm">Planning workspace</p>
            </div>
          </header>

          <HeroCopy />

          <div className="home-hero-cta animate-fade-in-up delay-300">
            <a href={LOGIN_URL} className="btn btn-primary btn-lg btn-pixel">
              Open workspace
              <ArrowRight size={16} aria-hidden="true" />
            </a>
            <Link to={TRY_PATH} className="btn btn-outline btn-lg btn-pixel">
              <LayoutGrid size={16} aria-hidden="true" />
              Try the board
            </Link>
            <a
              href={DOCS_URL}
              className="btn btn-outline btn-lg btn-pixel"
              target="_blank"
              rel="noopener noreferrer"
            >
              <BookOpen size={16} aria-hidden="true" />
              API docs
            </a>
          </div>
        </div>

        <div className="home-hero-visual">
          <HeroIllustration />
        </div>
      </div>
    </section>
  );
}

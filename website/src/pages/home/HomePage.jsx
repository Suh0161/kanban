import {
  Hero,
  Features,
  HowItWorks,
  ApiSandbox,
  CTA,
} from './components/index.js';
import './home.css';

export default function HomePage() {
  return (
    <main className="home-page">
      <Hero />
      <div className="home-sections">
        <Features />
        <HowItWorks />
        <ApiSandbox />
        <CTA />
      </div>
    </main>
  );
}

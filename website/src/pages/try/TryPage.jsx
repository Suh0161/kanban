import { ArrowRight, ExternalLink } from 'lucide-react';
import { DemoBoard, TryProductFrame } from './components/index.js';
import { useDemoBoard } from './useDemoBoard.js';
import { APP_URL, LOGIN_URL } from '../../config/urls.js';
import './css/try.css';

function TryInteractiveDemo() {
  const {
    data,
    onDragEnd,
    collapsedColumns,
    onToggleCollapse,
    searchQuery,
    setSearchQuery,
  } = useDemoBoard();

  return (
    <TryProductFrame searchQuery={searchQuery} onSearchChange={setSearchQuery}>
      <DemoBoard
        data={data}
        columnOrder={data.columnOrder}
        onDragEnd={onDragEnd}
        collapsedColumns={collapsedColumns}
        onToggleCollapse={onToggleCollapse}
        searchQuery={searchQuery}
      />
    </TryProductFrame>
  );
}

export default function TryPage() {
  return (
    <main className="try-page secondary-page">
      <div className="secondary-page__pattern" aria-hidden="true" />

      <div className="container try-container">
        <header className="secondary-header try-hero is-centered">
          <p className="secondary-eyebrow">Preview</p>
          <h1 className="secondary-title">Try Elevate</h1>
          <p className="secondary-lead">
            A live Kanban board — explore columns, cards, and drag-and-drop.
          </p>
        </header>

        <section className="try-demo" aria-label="Interactive board preview">
          <p className="try-preview-notice" role="status">
            Preview only — sign up to save your work
          </p>

          <TryInteractiveDemo />

          <p className="try-caption">
            Drag cards between columns — nothing is saved
          </p>
        </section>

        <div className="try-cta-row">
          <a href={LOGIN_URL} className="btn btn-primary btn-pixel">
            Get started
            <ArrowRight size={16} aria-hidden="true" />
          </a>
          <a
            href={APP_URL}
            className="btn btn-outline btn-pixel"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open full app
            <ExternalLink size={16} aria-hidden="true" />
          </a>
        </div>
      </div>
    </main>
  );
}

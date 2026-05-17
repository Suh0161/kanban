import { Component } from 'react';
import { ServerErrorPage } from '../views/error';

/**
 * Top-level safety net. When a render throws, we mount the styled 500
 * page instead of letting React unmount the tree — same look as a real
 * server-side 500. Resetting `hasError` lets the caller pass an
 * `onRetry` to re-mount the children.
 *
 * For inline fetch failures use `ErrorState` from `views/error` rather
 * than wrapping every request in a boundary.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      const err = this.state.error;
      // Stack only in dev — production should never leak it.
      const details =
        import.meta.env.DEV && err?.stack ? err.stack : null;

      return (
        <ServerErrorPage
          message={err?.message || undefined}
          details={details}
          requestId={err?.requestId}
          primary={{
            label: 'Try again',
            onClick: this.reset,
          }}
        />
      );
    }

    return this.props.children;
  }
}

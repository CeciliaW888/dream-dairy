import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback" role="alert">
          <h2 className="serif-text error-title">Something went wrong</h2>
          <p className="sans-text error-desc">
            {this.props.fallbackMessage || 'The 3D scene encountered an error. Try refreshing the page.'}
          </p>
          <button className="btn" onClick={() => window.location.reload()}>
            Refresh
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

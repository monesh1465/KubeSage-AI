import { Component } from "react";
import { FiAlertTriangle } from "react-icons/fi";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center p-6">
          <div className="max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-8 text-center">
            <FiAlertTriangle className="mx-auto h-8 w-8 text-[var(--color-warning)]" />
            <h2 className="mt-4 text-lg font-semibold text-[var(--color-text)]">
              Something went wrong
            </h2>
            <p className="mt-2 text-sm text-[var(--color-secondary)]">
              An unexpected error occurred. Refresh the page or try again later.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

import { FiRefreshCw } from "react-icons/fi";

function RetryButton({ onClick, loading = false, label = "Retry" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg)] disabled:opacity-50"
    >
      <FiRefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
      {label}
    </button>
  );
}

export default RetryButton;

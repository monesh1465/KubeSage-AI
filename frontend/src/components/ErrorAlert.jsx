import { FiAlertCircle } from "react-icons/fi";
import RetryButton from "./RetryButton";

function ErrorAlert({ message, onRetry, className = "" }) {
  if (!message) return null;

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-4 py-3 text-sm text-[var(--color-danger)] ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-2">
        <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{message}</span>
      </div>
      {onRetry && <RetryButton onClick={onRetry} />}
    </div>
  );
}

export default ErrorAlert;

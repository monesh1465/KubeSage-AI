import { isHealthyStatus, isWarningStatus } from "../utils/status";

function StatusBadge({ status, size = "sm" }) {
  const value = status || "unknown";
  const lower = value.toLowerCase();

  let className = "bg-[var(--color-secondary)]/15 text-[var(--color-secondary)]";

  if (isHealthyStatus(lower) || lower === "running" || lower === "active" || lower === "normal") {
    className = "bg-[var(--color-success)]/15 text-[var(--color-success)]";
  } else if (isWarningStatus(lower) || lower === "pending") {
    className = "bg-[var(--color-warning)]/15 text-[var(--color-warning)]";
  } else if (lower === "failed" || lower === "error" || lower === "high") {
    className = "bg-[var(--color-danger)]/15 text-[var(--color-danger)]";
  }

  const sizeClass = size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-xs";

  return (
    <span className={`inline-flex rounded-full font-medium capitalize ${sizeClass} ${className}`}>
      {value}
    </span>
  );
}

export default StatusBadge;

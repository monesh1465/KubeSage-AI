import { isHealthyStatus, isWarningStatus } from "../utils/status";

function StatusBadge({ status, size = "sm" }) {
  const value = status || "unknown";
  const lower = value.toLowerCase();
  const labelMap = {
    failed: "Disconnected",
    disconnected: "Disconnected",
    pending: "Connecting",
    connecting: "Connecting",
  };
  const label = labelMap[lower] || value;

  let className = "bg-[var(--color-secondary)]/15 text-[var(--color-secondary)]";

  if (isHealthyStatus(lower) || lower === "running" || lower === "active" || lower === "normal") {
    className = "bg-[var(--color-success)]/15 text-[var(--color-success)]";
  } else if (isWarningStatus(lower) || lower === "warning") {
    className = "bg-[var(--color-warning)]/15 text-[var(--color-warning)]";
  } else if (
    lower === "failed" ||
    lower === "disconnected" ||
    lower === "error" ||
    lower === "high" ||
    lower === "critical"
  ) {
    className = "bg-[var(--color-danger)]/15 text-[var(--color-danger)]";
  } else if (lower === "info") {
    className = "bg-[var(--color-primary)]/15 text-[var(--color-primary)]";
  }

  const sizeClass = size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-xs";

  return (
    <span className={`inline-flex rounded-full font-medium capitalize ${sizeClass} ${className}`}>
      {label}
    </span>
  );
}

export default StatusBadge;

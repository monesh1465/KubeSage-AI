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

  let dotColor = "bg-[var(--color-secondary)]";
  let badgeColor = "bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-secondary)]";

  if (isHealthyStatus(lower) || lower === "running" || lower === "active" || lower === "normal") {
    dotColor = "bg-[var(--color-success)] animate-pulse";
    badgeColor = "bg-[var(--color-success)]/10 border-[var(--color-success)]/20 text-[var(--color-success)]";
  } else if (isWarningStatus(lower) || lower === "warning") {
    dotColor = "bg-[var(--color-warning)] animate-pulse";
    badgeColor = "bg-[var(--color-warning)]/10 border-[var(--color-warning)]/20 text-[var(--color-warning)]";
  } else if (
    lower === "failed" ||
    lower === "disconnected" ||
    lower === "error" ||
    lower === "high" ||
    lower === "critical"
  ) {
    dotColor = "bg-[var(--color-danger)] animate-pulse";
    badgeColor = "bg-[var(--color-danger)]/10 border-[var(--color-danger)]/20 text-[var(--color-danger)]";
  } else if (lower === "info" || lower === "connected") {
    dotColor = "bg-[var(--color-primary)]";
    badgeColor = "bg-[var(--color-primary)]/10 border-[var(--color-primary)]/20 text-[var(--color-primary)]";
  }

  const sizeClass = size === "md" ? "px-2.5 py-1 text-[11px]" : "px-2 py-0.5 text-[10px]";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-semibold capitalize ${sizeClass} ${badgeColor}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      {label}
    </span>
  );
}

export default StatusBadge;

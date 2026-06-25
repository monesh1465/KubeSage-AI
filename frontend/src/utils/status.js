export function normalizeStatus(status) {
  return (status || "").toLowerCase();
}

export function isHealthyStatus(status) {
  const value = normalizeStatus(status);
  return value === "healthy" || value === "connected" || value === "ready";
}

export function isWarningStatus(status) {
  const value = normalizeStatus(status);
  return (
    value === "warning" ||
    value === "failed" ||
    value === "notready" ||
    value === "connecting" ||
    value === "pending"
  );
}

export function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

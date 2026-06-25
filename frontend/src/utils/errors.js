export function getApiErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  const detail = error?.response?.data?.detail;

  const normalizedClusterApiMessage =
    "Cluster connection lost. The Kubernetes API server is unreachable. Restart the cluster or upload an updated kubeconfig if needed.";

  if (typeof detail === "string") {
    if (
      detail.includes("HTTPSConnectionPool") ||
      detail.includes("Max retries exceeded") ||
      detail.includes("Failed to establish a new connection") ||
      detail.includes("Connection refused")
    ) {
      return normalizedClusterApiMessage;
    }

    if (detail.length > 240) {
      return `${detail.slice(0, 240)}...`;
    }

    return detail;
  }

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg || item.message || String(item)).join(", ");
  }

  if (error?.message === "Network Error") {
    return normalizedClusterApiMessage; 
  }

  if (error?.code === "ERR_NETWORK") {
    return normalizedClusterApiMessage;
  }

  return fallback;
}

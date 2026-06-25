export function getApiErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  const detail = error?.response?.data?.detail;

  const normalizedClusterApiMessage =
    "Unable to connect to the Kubernetes API server. Verify the cluster is running and kubeconfig server address is reachable.";

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
    return "Unable to reach the server. Check that the backend is running.";
  }

  if (error?.code === "ERR_NETWORK") {
    return "Network error. Please check your connection and try again.";
  }

  return fallback;
}

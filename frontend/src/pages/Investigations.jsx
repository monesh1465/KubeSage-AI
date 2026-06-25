import { Link } from "react-router-dom";
import { FiSearch, FiServer } from "react-icons/fi";
import EmptyState from "../components/EmptyState";
import ErrorAlert from "../components/ErrorAlert";
import PageHeader from "../components/PageHeader";
import PageSkeleton from "../components/PageSkeleton";
import StatusBadge from "../components/StatusBadge";
import { useClusters } from "../context/ClusterContext";

function Investigations() {
  const { clusters, loading, error, refreshClusters } = useClusters();
  const connectedClusters = clusters.filter((c) => c.status === "connected");
  const pendingClusters = clusters.length - connectedClusters.length;

  if (loading && clusters.length === 0) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Investigations"
        description="Select a connected cluster to run a rule-based health investigation"
      />

      <ErrorAlert message={error} onRetry={refreshClusters} />

      {connectedClusters.length === 0 ? (
        <EmptyState
          icon={FiServer}
          title="No connected clusters"
          description="Connect a cluster and upload a kubeconfig to run investigations."
          action={
            <Link
              to="/clusters"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
            >
              Manage clusters
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {connectedClusters.map((cluster) => (
            <div
              key={cluster.id}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-[var(--color-text)]">
                    {cluster.name}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--color-secondary)]">
                    {cluster.description || "No description"}
                  </p>
                </div>
                <StatusBadge status="connected" />
              </div>
              <div className="mt-4">
                <Link
                  to={`/clusters/${cluster.id}/investigate`}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  <FiSearch className="h-4 w-4" />
                  Run Investigation
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {pendingClusters > 0 && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-5 py-4 text-sm text-[var(--color-secondary)]">
          {pendingClusters} cluster(s) still need kubeconfig upload.{" "}
          <Link to="/clusters" className="text-[var(--color-primary)] hover:underline">
            Complete setup
          </Link>
        </div>
      )}
    </div>
  );
}

export default Investigations;

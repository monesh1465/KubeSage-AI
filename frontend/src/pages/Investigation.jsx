import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FiArrowLeft, FiRefreshCw } from "react-icons/fi";
import DataTable from "../components/DataTable";
import ErrorAlert from "../components/ErrorAlert";
import EmptyState from "../components/EmptyState";
import PageSkeleton from "../components/PageSkeleton";
import StatusBadge from "../components/StatusBadge";
import LoadingSpinner from "../components/LoadingSpinner";
import { useClusters } from "../context/ClusterContext";
import { useToast } from "../context/ToastContext";
import { runInvestigation } from "../services/investigationService";
import { getApiErrorMessage } from "../utils/errors";
import { isHealthyStatus } from "../utils/status";

const autoInvestigatedClusters = new Set();

function Investigation() {
  const { id } = useParams();
  const toast = useToast();
  const { getClusterById, refreshClusters, loading: clustersLoading } = useClusters();
  const cluster = getClusterById(id);

  const [result, setResult] = useState(null);
  const [investigating, setInvestigating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    refreshClusters().catch(() => {});
  }, [id, refreshClusters]);

  const handleInvestigate = useCallback(
    async (showToast = true) => {
      if (cluster?.status !== "connected") {
        setError("Cluster must be connected before running an investigation.");
        return;
      }

      setInvestigating(true);
      setError("");

      try {
        const data = await runInvestigation(id);
        setResult(data);
        if (showToast) {
          toast.success("Investigation completed successfully.");
        }
      } catch (err) {
        const message = getApiErrorMessage(
          err,
          "Investigation failed. Ensure the cluster API server is reachable."
        );
        setError(message);
        toast.error(message);
      } finally {
        setInvestigating(false);
      }
    },
    [cluster?.status, id, toast]
  );

  useEffect(() => {
    setResult(null);
    setError("");
    autoInvestigatedClusters.delete(id);
  }, [id]);

  useEffect(() => {
    if (cluster?.status === "connected" && !autoInvestigatedClusters.has(id)) {
      autoInvestigatedClusters.add(id);
      handleInvestigate(false);
    }
  }, [cluster?.status, id, handleInvestigate]);

  if (clustersLoading && !cluster) {
    return <PageSkeleton />;
  }

  const issueColumns = [
    {
      key: "severity",
      label: "Severity",
      render: (row) => <StatusBadge status={row.severity} />,
    },
    { key: "resource", label: "Resource" },
    { key: "namespace", label: "Namespace" },
    { key: "type", label: "Issue Type" },
    { key: "recommendation", label: "Recommendation" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to={`/clusters/${id}`}
            className="mb-2 inline-flex items-center gap-1 text-sm text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
          >
            <FiArrowLeft className="h-4 w-4" />
            Back to cluster
          </Link>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            Investigation — {cluster?.name || "Cluster"}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-secondary)]">
            Rule-based analysis of cluster health and issues
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleInvestigate(true)}
          disabled={investigating || cluster?.status !== "connected"}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          <FiRefreshCw className={`h-4 w-4 ${investigating ? "animate-spin" : ""}`} />
          {investigating ? "Investigating..." : "Re-run Investigation"}
        </button>
      </div>

      <ErrorAlert message={error} onRetry={() => handleInvestigate(true)} />

      {cluster?.status !== "connected" && (
        <EmptyState
          title="Cluster not connected"
          description="Upload a valid kubeconfig and verify connectivity before investigating."
          action={
            <Link to="/clusters" className="text-sm text-[var(--color-primary)] hover:underline">
              Manage clusters
            </Link>
          }
        />
      )}

      {investigating && !result && cluster?.status === "connected" && (
        <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-[var(--color-secondary)]">Analyzing cluster resources...</p>
        </div>
      )}

      {result && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-5">
              <p className="text-sm text-[var(--color-secondary)]">Cluster Status</p>
              <p
                className={`mt-2 text-xl font-semibold capitalize ${
                  isHealthyStatus(result.cluster_status)
                    ? "text-[var(--color-success)]"
                    : "text-[var(--color-warning)]"
                }`}
              >
                {result.cluster_status}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-5">
              <p className="text-sm text-[var(--color-secondary)]">Investigation Summary</p>
              <p className="mt-2 text-sm text-[var(--color-text)]">{result.summary}</p>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
            <div className="border-b border-[var(--color-border)] px-5 py-3.5">
              <h2 className="font-semibold text-[var(--color-text)]">
                Issues ({result.issues?.length || 0})
              </h2>
            </div>
            <DataTable
              columns={issueColumns}
              rows={result.issues || []}
              emptyMessage="No issues detected. Cluster appears healthy."
              searchable
            />
          </div>

          <Link
            to={`/clusters/${id}/history`}
            className="inline-block text-sm text-[var(--color-primary)] hover:underline"
          >
            View investigation history
          </Link>
        </>
      )}
    </div>
  );
}

export default Investigation;

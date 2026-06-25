import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiSearch,
  FiDatabase,
} from "react-icons/fi";
import ErrorAlert from "../components/ErrorAlert";
import EmptyState from "../components/EmptyState";
import PageSkeleton from "../components/PageSkeleton";
import StatusBadge from "../components/StatusBadge";
import LoadingSpinner from "../components/LoadingSpinner";
import IssueCard from "../components/IssueCard";
import { useClusters } from "../context/ClusterContext";
import { useToast } from "../context/ToastContext";
import { runInvestigation } from "../services/investigationService";
import { getApiErrorMessage } from "../utils/errors";
import { formatDateTime, isHealthyStatus } from "../utils/status";
import {
  groupIssues,
  countIssuesBySeverity,
  getMostCommonIssue,
  getMostAffectedNamespace,
  getIssuePriority,
  resolveIssueCommands,
} from "../utils/issueInsights";

const INVESTIGATION_STEPS = [
  "Running investigation...",
  "Analyzing nodes...",
  "Analyzing pods...",
  "Checking events...",
  "Generating report...",
];

function formatDuration(seconds) {
  if (seconds == null || Number.isNaN(Number(seconds))) {
    return "Completed";
  }

  const value = Number(seconds);
  if (value < 1) {
    return `${Math.round(value * 1000)} ms`;
  }

  const totalSeconds = Math.round(value);
  if (totalSeconds < 60) {
    return `${totalSeconds} sec`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes} min ${remainingSeconds} sec`;
}

function Investigation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { getClusterById, refreshClusters, loading: clustersLoading } = useClusters();
  const cluster = getClusterById(id);

  const [result, setResult] = useState(null);
  const [investigating, setInvestigating] = useState(false);
  const [error, setError] = useState("");
  const [hasAutoRun, setHasAutoRun] = useState(false);

  useEffect(() => {
    refreshClusters().catch(() => {});
  }, [id, refreshClusters]);

  // Reset state when cluster changes
  useEffect(() => {
    setResult(null);
    setError("");
    setHasAutoRun(false);
  }, [id]);

  const handleInvestigate = useCallback(
    async (showToast = true) => {
      if (investigating) {
        return;
      }

      if (cluster?.status !== "connected") {
        setError("Cluster must be connected before running an investigation.");
        return;
      }

      setInvestigating(true);
      setError("");

      try {
        const data = await runInvestigation(id);
        setResult(data);
        await refreshClusters();
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
        await refreshClusters();
      } finally {
        setInvestigating(false);
      }
    },
    [cluster?.status, id, investigating, refreshClusters, toast]
  );

  // Auto-run investigation on mount when cluster is connected
  useEffect(() => {
    if (!clustersLoading && cluster?.status === "connected" && !hasAutoRun && !investigating && !result) {
      setHasAutoRun(true);
      handleInvestigate(false);
    }
  }, [clustersLoading, cluster?.status, hasAutoRun, investigating, result, handleInvestigate]);

  if (clustersLoading && !cluster) {
    return <PageSkeleton />;
  }

  if (!cluster) {
    return (
      <EmptyState
        icon={FiDatabase}
        title="Cluster not found"
        description="This cluster may have been removed or you don't have access."
        action={
          <Link to="/clusters" className="text-xs font-semibold text-[var(--color-primary)] hover:underline">
            Back to clusters
          </Link>
        }
      />
    );
  }

  const groupedIssues = groupIssues(result?.issues || []);
  const issueCounts = countIssuesBySeverity(result?.issues || []);
  const issuePriority = getIssuePriority(result?.issues || []);
  const mostCommonIssue = getMostCommonIssue(result?.issues || []);
  const mostAffectedNamespace = getMostAffectedNamespace(result?.issues || []);
  const allCommands = Array.from(
    new Set(groupedIssues.flatMap((issue) => resolveIssueCommands(issue)))
  );
  const affectedResources = Array.from(
    new Set(groupedIssues.flatMap((issue) => issue.resources || [issue.resource]))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-sm">
        <div>
          <Link
            to={`/clusters/${id}`}
            className="mb-2.5 inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
          >
            <FiArrowLeft className="h-3.5 w-3.5" />
            Back to cluster
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
            Investigation — {cluster?.name || "Cluster"}
          </h1>
          <p className="mt-1 text-xs text-[var(--color-secondary)]">
            Automated, rule-based diagnostic analysis of cluster components and logs
          </p>
          {(result?.cluster_status || investigating) && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-[var(--color-secondary)]">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-2.5 py-1">
                Status: <StatusBadge status={result?.cluster_status || "connecting"} />
              </span>
              {result?.duration_seconds != null && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-2.5 py-1 font-semibold text-[var(--color-text)]">
                  Duration: {formatDuration(result.duration_seconds)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Manual run button */}
        {cluster.status === "connected" && !investigating && (
          <button
            type="button"
            onClick={() => handleInvestigate(true)}
            disabled={investigating}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <FiSearch className="h-3.5 w-3.5" />
            {result ? "Re-run Investigation" : "Run Investigation"}
          </button>
        )}
      </div>

      <ErrorAlert message={error} onRetry={() => handleInvestigate(true)} />

      {/* Cluster not connected state */}
      {cluster?.status !== "connected" && (
        <EmptyState
          title="Cluster not connected"
          description="Upload a valid kubeconfig and verify connectivity before investigating."
          action={
            <Link to="/clusters" className="text-xs font-semibold text-[var(--color-primary)] hover:underline">
              Manage clusters
            </Link>
          }
        />
      )}

      {/* Investigation in progress */}
      {investigating && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <LoadingSpinner size="lg" />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-[var(--color-text)]">
                Analyzing cluster health...
              </h2>
              <p className="mt-1 text-xs text-[var(--color-secondary)]">
                Diagnosing active nodes, checking resource namespaces, and polling events.
              </p>
              <div className="mt-5 space-y-2 max-w-md">
                {INVESTIGATION_STEPS.map((step, index) => (
                  <div
                    key={step}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${
                      index === 0
                        ? "border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 text-[var(--color-primary)]"
                        : "border-[var(--color-border)] bg-[var(--color-bg)]/50 text-[var(--color-secondary)]"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${index === 0 ? "bg-[var(--color-primary)] animate-pulse" : "bg-[var(--color-secondary)]/50"}`} />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Investigation results */}
      {result && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">Cluster Health</p>
              <p
                className={`mt-2 text-lg font-bold capitalize ${
                  result.cluster_status === "Critical"
                    ? "text-[var(--color-danger)]"
                    : isHealthyStatus(result.cluster_status)
                      ? "text-[var(--color-success)]"
                      : "text-[var(--color-warning)]"
                }`}
              >
                {result.cluster_status}
              </p>
            </div>
            
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-sm lg:col-span-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">Summary Report</p>
              <p className="mt-2 text-xs leading-relaxed font-semibold text-[var(--color-text)]">{result.summary}</p>
              <div className="mt-3.5 grid gap-x-4 gap-y-2 grid-cols-2 border-t border-[var(--color-border)]/50 pt-3 text-[11px] text-[var(--color-secondary)]">
                <p>Critical: <span className="font-semibold text-[var(--color-text)]">{issueCounts.critical + issueCounts.high}</span></p>
                <p>Warning: <span className="font-semibold text-[var(--color-text)]">{issueCounts.medium}</span></p>
                <p>Resources Affected: <span className="font-semibold text-[var(--color-text)]">{affectedResources.length}</span></p>
                <p>Issue Types: <span className="font-semibold text-[var(--color-text)]">{groupedIssues.length}</span></p>
                <p className="col-span-2 mt-1 truncate">Most Common: <span className="font-semibold text-[var(--color-text)]">{mostCommonIssue ? `${mostCommonIssue.type} (${mostCommonIssue.count})` : "None"}</span></p>
                <p className="col-span-2 truncate">Most Affected Namespace: <span className="font-semibold text-[var(--color-text)]">{mostAffectedNamespace || "None"}</span></p>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">Issue Split</p>
              <div className="mt-3.5 flex flex-col gap-1.5 text-[10px] font-semibold">
                <span className="flex justify-between items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1.5 text-[var(--color-text)]">
                  <span>Total Issues</span>
                  <span>{issueCounts.total}</span>
                </span>
                <span className="flex justify-between items-center rounded-lg border border-[var(--color-danger)]/15 bg-[var(--color-danger)]/8 px-2.5 py-1.5 text-[var(--color-danger)]">
                  <span>Critical</span>
                  <span>{issueCounts.critical + issueCounts.high}</span>
                </span>
                <span className="flex justify-between items-center rounded-lg border border-[var(--color-warning)]/15 bg-[var(--color-warning)]/8 px-2.5 py-1.5 text-[var(--color-warning)]">
                  <span>Medium</span>
                  <span>{issueCounts.medium}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
            <div className="border-b border-[var(--color-border)] px-5 py-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xs font-bold text-[var(--color-text)]">
                  {issueCounts.total} Issues Detected
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(allCommands.join("\n")).catch(() => {});
                    toast.success("All commands copied to clipboard.");
                  }}
                  disabled={allCommands.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-[10px] font-bold text-[var(--color-text)] hover:bg-[var(--color-bg)] disabled:opacity-50"
                >
                  Copy All Commands
                </button>
              </div>
            </div>
            {groupedIssues.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={FiCheckCircle}
                  title="No issues detected"
                  description="Your cluster configuration is operating normally."
                />
              </div>
            ) : (
              <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
                {groupedIssues.map((issue) => (
                  <IssueCard
                    key={`${issue.type}-${issue.namespace}-${issue.resource}`}
                    issue={issue}
                    onCopyCommands={(commands) => {
                      const text = commands.join("\n");
                      navigator.clipboard?.writeText(text).catch(() => {});
                      toast.success("Commands copied to clipboard.");
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="pt-2">
            <Link
              to={`/clusters/${id}/history`}
              state={{ autoExpandLatest: true }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)] hover:underline"
            >
              View investigation history
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default Investigation;

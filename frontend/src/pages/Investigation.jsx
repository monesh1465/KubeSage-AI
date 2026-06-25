import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiCheckCircle } from "react-icons/fi";
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
  const autoRunRef = useRef(false);

  const [result, setResult] = useState(null);
  const [investigating, setInvestigating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    refreshClusters().catch(() => {});
  }, [id, refreshClusters]);

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
        navigate(`/clusters/${id}/history`, {
          state: { autoExpandLatest: true },
        });
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
    [cluster?.status, id, investigating, navigate, refreshClusters, toast]
  );

  useEffect(() => {
    setResult(null);
    setError("");
    autoRunRef.current = false;
  }, [id]);

  useEffect(() => {
    if (cluster?.status === "connected" && !autoRunRef.current && !investigating && !result) {
      autoRunRef.current = true;
      handleInvestigate(false);
    }
  }, [cluster?.status, handleInvestigate, investigating, result]);

  if (clustersLoading && !cluster) {
    return <PageSkeleton />;
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)] md:p-5">
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
          {(result?.cluster_status || investigating) && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--color-secondary)]">
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2.5 py-1">
                Status: <StatusBadge status={result?.cluster_status || "connecting"} />
              </span>
              {result?.duration_seconds != null && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2.5 py-1">
                  Completed in {formatDuration(result.duration_seconds)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <ErrorAlert message={error} onRetry={() => handleInvestigate(true)} />

      {investigating && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-start gap-4">
            <LoadingSpinner size="lg" />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-[var(--color-text)]">
                Running investigation...
              </h2>
              <p className="mt-1 text-sm text-[var(--color-secondary)]">
                The report is being generated automatically.
              </p>
              <div className="mt-4 space-y-2 text-sm text-[var(--color-text)]">
                {INVESTIGATION_STEPS.map((step, index) => (
                  <div
                    key={step}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                      index === 0
                        ? "border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5"
                        : "border-[var(--color-border)] bg-[var(--color-bg)]"
                    }`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]" />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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

      {result && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
              <p className="text-sm text-[var(--color-secondary)]">Cluster Status</p>
              <p
                className={`mt-2 text-xl font-semibold capitalize ${
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
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
              <p className="text-sm text-[var(--color-secondary)]">Investigation Summary</p>
              <p className="mt-2 text-sm text-[var(--color-text)]">{result.summary}</p>
              <div className="mt-3 grid gap-2 text-sm text-[var(--color-secondary)]">
                <p>
                  Critical Issues: {issueCounts.critical + issueCounts.high}
                </p>
                <p>Warning Issues: {issueCounts.medium}</p>
                <p>Affected Resources: {affectedResources.length}</p>
                <p>Issue Types: {groupedIssues.length}</p>
                <p>
                  Most Common Issue: {mostCommonIssue ? `${mostCommonIssue.type} (${mostCommonIssue.count})` : "None"}
                </p>
                <p>Most Affected Namespace: {mostAffectedNamespace}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
              <p className="text-sm text-[var(--color-secondary)]">Issue Breakdown</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
                <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1 text-[var(--color-text)]">
                  {issueCounts.total} Issues
                </span>
                <span className="rounded-full border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-1 text-[var(--color-danger)]">
                  {issueCounts.critical + issueCounts.high} Critical
                </span>
                <span className="rounded-full border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-3 py-1 text-[var(--color-warning)]">
                  {issueCounts.medium} Medium
                </span>
                <span className="rounded-full border border-[var(--color-secondary)]/30 bg-[var(--color-secondary)]/10 px-3 py-1 text-[var(--color-secondary)]">
                  {issueCounts.info} Info
                </span>
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
              <p className="text-sm text-[var(--color-secondary)]">Duration</p>
              <p className="mt-2 text-xl font-semibold text-[var(--color-text)]">
                {formatDuration(result.duration_seconds)}
              </p>
              <p className="mt-2 text-sm text-[var(--color-secondary)]">
                Completed at {formatDateTime(result.completed_at)}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]">
            <div className="border-b border-[var(--color-border)] px-5 py-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold text-[var(--color-text)]">
                  {issueCounts.total} Issues · {issueCounts.high + issueCounts.critical} Critical · {issueCounts.medium} Warning · {issueCounts.info} Info
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(allCommands.join("\n")).catch(() => {});
                    toast.success("All commands copied to clipboard.");
                  }}
                  disabled={allCommands.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-bg)] disabled:opacity-50"
                >
                  Copy All Commands
                </button>
              </div>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-[var(--color-secondary)]">
                {issuePriority === "Healthy"
                  ? "Healthy"
                  : `${issuePriority} cluster state detected.`}
              </p>
            </div>
            {groupedIssues.length === 0 ? (
              <div className="px-5 pb-5">
                <EmptyState
                  icon={FiCheckCircle}
                  title="No issues detected"
                  description="Your cluster is operating normally."
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

          <Link
            to={`/clusters/${id}/history`}
            state={{ autoExpandLatest: true }}
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

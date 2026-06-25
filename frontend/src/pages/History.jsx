import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FiChevronDown, FiChevronUp, FiSearch, FiClock } from "react-icons/fi";
import EmptyState from "../components/EmptyState";
import ErrorAlert from "../components/ErrorAlert";
import IssueCard from "../components/IssueCard";
import PageHeader from "../components/PageHeader";
import PageSkeleton from "../components/PageSkeleton";
import StatusBadge from "../components/StatusBadge";
import LoadingSpinner from "../components/LoadingSpinner";
import { useClusters } from "../context/ClusterContext";
import { getInvestigationHistory } from "../services/investigationService";
import { parseIssues } from "../utils/parseIssues";
import { formatDateTime } from "../utils/status";
import { getApiErrorMessage } from "../utils/errors";

const PAGE_SIZE = 10;

function HistoryContent({ clusterId, clusterName }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const fetchHistory = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getInvestigationHistory(clusterId);
      setHistory(data);
      setPage(1);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load investigation history."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clusterId) {
      fetchHistory();
    }
  }, [clusterId]);

  const paginatedHistory = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return history.slice(start, start + PAGE_SIZE);
  }, [history, page]);

  const totalPages = Math.max(1, Math.ceil(history.length / PAGE_SIZE));

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <ErrorAlert message={error} onRetry={fetchHistory} />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <EmptyState
        icon={FiClock}
        title="No investigation history"
        description={`No investigations have been recorded for ${clusterName} yet.`}
        action={
          <Link
            to={`/clusters/${clusterId}/investigate`}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
          >
            <FiSearch className="h-4 w-4" />
            Run Investigation
          </Link>
        }
      />
    );
  }

  return (
    <>
      <div className="divide-y divide-[var(--color-border)]">
        {paginatedHistory.map((item) => {
          const issues = parseIssues(item.issues);
          const isExpanded = expandedId === item.id;

          return (
            <div key={item.id}>
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                className="flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left hover:bg-[var(--color-bg)]/50"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text)]">
                    {formatDateTime(item.created_at)}
                  </p>
                  <p className="mt-1 truncate text-sm text-[var(--color-secondary)]">
                    {item.summary}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <StatusBadge status={item.status} />
                  <span className="text-xs text-[var(--color-secondary)]">
                    {issues.length} issues
                  </span>
                  {isExpanded ? (
                    <FiChevronUp className="h-4 w-4 text-[var(--color-secondary)]" />
                  ) : (
                    <FiChevronDown className="h-4 w-4 text-[var(--color-secondary)]" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-[var(--color-border)] bg-[var(--color-bg)]/30 px-5 py-4">
                  {issues.length === 0 ? (
                    <p className="text-sm text-[var(--color-secondary)]">No issues recorded.</p>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {issues.map((issue, idx) => (
                        <IssueCard key={`${item.id}-${idx}`} issue={issue} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {history.length > PAGE_SIZE && (
        <div className="flex items-center justify-between border-t border-[var(--color-border)] px-5 py-3">
          <p className="text-xs text-[var(--color-secondary)]">
            Page {page} of {totalPages} ({history.length} total)
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-md border border-[var(--color-border)] px-3 py-1 text-xs disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-[var(--color-border)] px-3 py-1 text-xs disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function History() {
  const { id: routeClusterId } = useParams();
  const { clusters, loading } = useClusters();
  const [selectedClusterId, setSelectedClusterId] = useState(routeClusterId || "");

  useEffect(() => {
    if (routeClusterId) {
      setSelectedClusterId(routeClusterId);
    } else if (clusters.length > 0 && !selectedClusterId) {
      setSelectedClusterId(String(clusters[0].id));
    }
  }, [routeClusterId, clusters, selectedClusterId]);

  const selectedCluster = clusters.find((c) => c.id === Number(selectedClusterId));

  if (loading && clusters.length === 0) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Investigation History"
        description="Review past investigations and issue details"
        actions={
          clusters.length > 0 && (
            <select
              value={selectedClusterId}
              onChange={(e) => setSelectedClusterId(e.target.value)}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
            >
              {clusters.map((cluster) => (
                <option key={cluster.id} value={cluster.id}>
                  {cluster.name}
                </option>
              ))}
            </select>
          )
        }
      />

      {clusters.length === 0 ? (
        <EmptyState
          icon={FiClock}
          title="No clusters available"
          description="Add a cluster before viewing investigation history."
          action={
            <Link to="/clusters" className="text-sm text-[var(--color-primary)] hover:underline">
              Add a cluster
            </Link>
          }
        />
      ) : (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3.5">
            <h2 className="font-semibold text-[var(--color-text)]">{selectedCluster?.name}</h2>
            <Link
              to={`/clusters/${selectedClusterId}/investigate`}
              className="inline-flex items-center gap-1.5 text-sm text-[var(--color-primary)] hover:underline"
            >
              <FiSearch className="h-4 w-4" />
              Run new investigation
            </Link>
          </div>
          {selectedClusterId && (
            <HistoryContent
              clusterId={selectedClusterId}
              clusterName={selectedCluster?.name}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default History;

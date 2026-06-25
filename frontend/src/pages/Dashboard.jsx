import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  FiServer,
  FiCheckCircle,
  FiAlertTriangle,
  FiSearch,
  FiPlus,
  FiArrowRight,
  FiRefreshCw,
} from "react-icons/fi";
import StatCard from "../components/StatCard";
import PageHeader from "../components/PageHeader";
import ErrorAlert from "../components/ErrorAlert";
import PageSkeleton from "../components/PageSkeleton";
import StatusBadge from "../components/StatusBadge";
import { useClusters } from "../context/ClusterContext";
import { getInvestigationHistory } from "../services/investigationService";
import { parseIssues } from "../utils/parseIssues";
import { formatDateTime } from "../utils/status";
import { getApiErrorMessage } from "../utils/errors";

function Dashboard() {
  const { clusters, stats, loading, error, refreshClusters } = useClusters();
  const [recentInvestigations, setRecentInvestigations] = useState([]);
  const [totalInvestigations, setTotalInvestigations] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");

  const loadHistory = useCallback(async (clusterList) => {
    if (clusterList.length === 0) {
      setRecentInvestigations([]);
      setTotalInvestigations(0);
      setHistoryLoading(false);
      return;
    }

    setHistoryLoading(true);
    setHistoryError("");

    try {
      const historyResults = await Promise.all(
        clusterList.map(async (cluster) => {
          try {
            const history = await getInvestigationHistory(cluster.id);
            return history.map((item) => ({
              ...item,
              clusterName: cluster.name,
              clusterId: cluster.id,
              issueCount: parseIssues(item.issues).length,
            }));
          } catch {
            return [];
          }
        })
      );

      const allHistory = historyResults.flat();
      setTotalInvestigations(allHistory.length);
      setRecentInvestigations(
        allHistory
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 5)
      );
    } catch (err) {
      setHistoryError(getApiErrorMessage(err, "Failed to load investigation history."));
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      loadHistory(clusters);
    }
  }, [clusters, loading, loadHistory]);

  const handleRefresh = async () => {
    const data = await refreshClusters();
    await loadHistory(data);
  };

  if (loading && clusters.length === 0) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        description="Overview of your Kubernetes clusters and investigations"
        actions={
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading || historyLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg)] disabled:opacity-50"
          >
            <FiRefreshCw
              className={`h-4 w-4 ${loading || historyLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        }
      />

      <ErrorAlert message={error} onRetry={handleRefresh} />
      <ErrorAlert message={historyError} onRetry={() => loadHistory(clusters)} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Connected Clusters" value={stats.connected} icon={FiServer} />
        <StatCard
          title="Healthy Clusters"
          value={stats.connected}
          icon={FiCheckCircle}
          variant="success"
        />
        <StatCard
          title="Warning Clusters"
          value={stats.warning}
          icon={FiAlertTriangle}
          variant="warning"
        />
        <StatCard
          title="Total Investigations"
          value={totalInvestigations}
          icon={FiSearch}
          variant="default"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3.5">
            <h2 className="font-semibold text-[var(--color-text)]">Recent Investigations</h2>
            <Link to="/history" className="text-sm text-[var(--color-primary)] hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {historyLoading ? (
              <p className="px-5 py-8 text-center text-sm text-[var(--color-secondary)]">
                Loading investigations...
              </p>
            ) : recentInvestigations.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-[var(--color-secondary)]">
                No investigations yet. Run your first investigation from a cluster.
              </p>
            ) : (
              recentInvestigations.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 px-5 py-3.5"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--color-text)]">{item.clusterName}</p>
                    <p className="mt-1 truncate text-sm text-[var(--color-secondary)]">
                      {item.summary}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-secondary)]">
                      {formatDateTime(item.created_at)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <StatusBadge status={item.status} />
                    <p className="mt-1 text-xs text-[var(--color-secondary)]">
                      {item.issueCount} issues
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
            <div className="border-b border-[var(--color-border)] px-5 py-3.5">
              <h2 className="font-semibold text-[var(--color-text)]">Quick Actions</h2>
            </div>
            <div className="space-y-2 p-3">
              {[
                { to: "/clusters", icon: FiPlus, label: "Add Cluster" },
                { to: "/investigations", icon: FiSearch, label: "Run Investigation" },
                { to: "/assistant", icon: FiSearch, label: "AI Assistant" },
              ].map(({ to, icon: Icon, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg)]"
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-[var(--color-primary)]" />
                    {label}
                  </span>
                  <FiArrowRight className="h-4 w-4 text-[var(--color-secondary)]" />
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
            <div className="border-b border-[var(--color-border)] px-5 py-3.5">
              <h2 className="font-semibold text-[var(--color-text)]">Cluster Overview</h2>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {clusters.length === 0 ? (
                <p className="px-5 py-6 text-center text-sm text-[var(--color-secondary)]">
                  No clusters connected yet.
                </p>
              ) : (
                clusters.slice(0, 5).map((cluster) => (
                  <Link
                    key={cluster.id}
                    to={`/clusters/${cluster.id}`}
                    className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-[var(--color-bg)]"
                  >
                    <span className="truncate text-sm font-medium text-[var(--color-text)]">
                      {cluster.name}
                    </span>
                    <StatusBadge status={cluster.status} />
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

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
  FiLayers,
  FiBox,
} from "react-icons/fi";
import StatCard from "../components/StatCard";
import PageHeader from "../components/PageHeader";
import ErrorAlert from "../components/ErrorAlert";
import PageSkeleton from "../components/PageSkeleton";
import StatusBadge from "../components/StatusBadge";
import { useClusters } from "../context/ClusterContext";
import { getInvestigationHistory } from "../services/investigationService";
import { getNodes, getPods, getNamespaces } from "../services/clusterService";
import { parseIssues } from "../utils/parseIssues";
import { formatDateTime } from "../utils/status";
import { getApiErrorMessage } from "../utils/errors";

function getLatestInvestigationState(cluster) {
  const value = (cluster.latest_investigation_status || cluster.status || "").toLowerCase();

  if (value === "critical") return "Critical";
  if (value === "warning") return "Warning";
  if (value === "healthy") return "Healthy";
  return "Unknown";
}

function Dashboard() {
  const { clusters, loading, error, refreshClusters } = useClusters();
  const [recentInvestigations, setRecentInvestigations] = useState([]);
  const [totalInvestigations, setTotalInvestigations] = useState(0);
  const [resourceStats, setResourceStats] = useState({
    nodes: 0,
    pods: 0,
    failedPods: 0,
    namespaces: 0,
  });
  const [historyLoading, setHistoryLoading] = useState(true);
  const [resourceLoading, setResourceLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");

  const loadResourceStats = useCallback(async (clusterList) => {
    const connectedClusters = clusterList.filter((cluster) => cluster.status === "connected");

    if (connectedClusters.length === 0) {
      setResourceStats({ nodes: 0, pods: 0, failedPods: 0, namespaces: 0 });
      setResourceLoading(false);
      return;
    }

    setResourceLoading(true);

    const summaries = await Promise.all(
      connectedClusters.map(async (cluster) => {
        try {
          const [nodes, pods, namespaces] = await Promise.all([
            getNodes(cluster.id),
            getPods(cluster.id),
            getNamespaces(cluster.id),
          ]);

          const failedPods = pods.filter((pod) => {
            const status = (pod.status || "").toLowerCase();
            return !["running", "succeeded", "completed", "healthy"].includes(status);
          }).length;

          return {
            nodes: nodes.length,
            pods: pods.length,
            failedPods,
            namespaces: namespaces.length,
          };
        } catch {
          return { nodes: 0, pods: 0, failedPods: 0, namespaces: 0 };
        }
      })
    );

    setResourceStats(
      summaries.reduce(
        (acc, item) => ({
          nodes: acc.nodes + item.nodes,
          pods: acc.pods + item.pods,
          failedPods: acc.failedPods + item.failedPods,
          namespaces: acc.namespaces + item.namespaces,
        }),
        { nodes: 0, pods: 0, failedPods: 0, namespaces: 0 }
      )
    );
    setResourceLoading(false);
  }, []);

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

  const refreshDashboard = useCallback(async () => {
    const data = await refreshClusters();
    await Promise.all([loadHistory(data), loadResourceStats(data)]);
  }, [loadHistory, loadResourceStats, refreshClusters]);

  useEffect(() => {
    if (!loading) {
      loadHistory(clusters);
      loadResourceStats(clusters);
    }
  }, [clusters, loading, loadHistory, loadResourceStats]);

  useEffect(() => {
    if (loading) {
      return undefined;
    }

    const interval = setInterval(() => {
      refreshDashboard().catch(() => {});
    }, 30000);

    return () => clearInterval(interval);
  }, [loading, refreshDashboard]);

  const handleRefresh = async () => {
    await refreshDashboard();
  };

  const healthyClusters = clusters.filter((cluster) => getLatestInvestigationState(cluster) === "Healthy").length;
  const warningClusters = clusters.filter((cluster) => getLatestInvestigationState(cluster) === "Warning").length;
  const criticalClusters = clusters.filter((cluster) => getLatestInvestigationState(cluster) === "Critical").length;

  if (loading && clusters.length === 0) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your connected Kubernetes clusters and active system metrics"
        actions={
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading || historyLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg)] disabled:opacity-50"
          >
            <FiRefreshCw
              className={`h-3.5 w-3.5 ${loading || historyLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        }
      />

      <ErrorAlert message={error} onRetry={handleRefresh} />
      <ErrorAlert message={historyError} onRetry={() => loadHistory(clusters)} />

      {/* Main Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Clusters"
          value={clusters.length}
          icon={FiServer}
          variant="default"
        />
        <StatCard title="Nodes Count" value={resourceLoading ? "..." : resourceStats.nodes} icon={FiLayers} />
        <StatCard title="Pods Count" value={resourceLoading ? "..." : resourceStats.pods} icon={FiBox} />
        <StatCard
          title="Investigations Run"
          value={totalInvestigations}
          icon={FiSearch}
          variant="default"
        />
      </div>

      {/* Detailed Status Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Healthy Clusters" value={healthyClusters} icon={FiCheckCircle} variant="success" />
        <StatCard title="Warning Clusters" value={warningClusters} icon={FiAlertTriangle} variant="warning" />
        <StatCard title="Critical Clusters" value={criticalClusters} icon={FiAlertTriangle} variant="danger" />
        <StatCard
          title="Failed Pods Alert"
          value={resourceLoading ? "..." : resourceStats.failedPods}
          icon={FiAlertTriangle}
          variant={resourceStats.failedPods > 0 ? "danger" : "success"}
        />
      </div>

      {/* Content Columns */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Investigations */}
        <div className="lg:col-span-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
            <h2 className="text-sm font-bold text-[var(--color-text)]">
              Recent Investigations
              <span className="ml-2 rounded bg-[var(--color-bg)] px-2 py-0.5 text-xs font-medium text-[var(--color-secondary)]">
                {totalInvestigations} total
              </span>
            </h2>
            <Link to="/history" className="text-xs font-semibold text-[var(--color-primary)] hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-[var(--color-border)]/65">
            {historyLoading ? (
              <p className="px-5 py-10 text-center text-xs text-[var(--color-secondary)]">
                Loading investigations...
              </p>
            ) : recentInvestigations.length === 0 ? (
              <p className="px-5 py-10 text-center text-xs text-[var(--color-secondary)]">
                No investigations yet. Run your first investigation from a cluster.
              </p>
            ) : (
              recentInvestigations.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-[var(--color-bg)]/35"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[var(--color-text)]">{item.clusterName}</p>
                    <p className="mt-1 truncate text-xs text-[var(--color-secondary)]">
                      {item.summary}
                    </p>
                    <p className="mt-1.5 text-[10px] text-[var(--color-secondary)]/80">
                      {formatDateTime(item.created_at)} · <span className="font-medium text-[var(--color-text)]">{item.issueCount} issues</span>
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <StatusBadge status={item.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sidebar Actions & Clusters Quick List */}
        <div className="space-y-6">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
            <div className="border-b border-[var(--color-border)] px-5 py-4">
              <h2 className="text-sm font-bold text-[var(--color-text)]">Quick Actions</h2>
            </div>
            <div className="space-y-2 p-4">
              {[
                { to: "/clusters", icon: FiPlus, label: "Add Cluster" },
                { to: "/investigations", icon: FiSearch, label: "Run Investigation" },
              ].map(({ to, icon: Icon, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-xs font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg)]"
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-[var(--color-primary)]" />
                    {label}
                  </span>
                  <FiArrowRight className="h-3.5 w-3.5 text-[var(--color-secondary)]" />
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
            <div className="border-b border-[var(--color-border)] px-5 py-4">
              <h2 className="text-sm font-bold text-[var(--color-text)]">Connected Clusters</h2>
            </div>
            <div className="divide-y divide-[var(--color-border)]/65">
              {clusters.length === 0 ? (
                <p className="px-5 py-6 text-center text-xs text-[var(--color-secondary)]">
                  No clusters connected yet.
                </p>
              ) : (
                clusters.slice(0, 5).map((cluster) => (
                  <Link
                    key={cluster.id}
                    to={`/clusters/${cluster.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-[var(--color-bg)]/35"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate text-xs font-semibold text-[var(--color-text)]">
                        <FiServer className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                        {cluster.name}
                      </p>
                      <p className="mt-1 text-[10px] text-[var(--color-secondary)]">
                        {getLatestInvestigationState(cluster)}
                        {cluster.latest_investigation_issue_count != null
                          ? ` • ${cluster.latest_investigation_issue_count} Issues`
                          : ""}
                      </p>
                    </div>
                    <StatusBadge
                      status={cluster.latest_investigation_status || cluster.status}
                    />
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

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
  FiZap,
  FiFileText,
  FiClock,
} from "react-icons/fi";
import StatCard from "../components/StatCard";
import PageHeader from "../components/PageHeader";
import ErrorAlert from "../components/ErrorAlert";
import PageSkeleton from "../components/PageSkeleton";
import StatusBadge from "../components/StatusBadge";
import { useClusters } from "../context/ClusterContext";
import { getAllInvestigations } from "../services/investigationService";
import { getNodes, getPods, getNamespaces } from "../services/clusterService";
import { parseIssues } from "../utils/parseIssues";
import { getApiErrorMessage } from "../utils/errors";

function getLatestInvestigationState(cluster) {
  const value = (cluster.latest_investigation_status || cluster.status || "").toLowerCase();
  if (value === "critical") return "Critical";
  if (value === "warning") return "Warning";
  if (value === "healthy") return "Healthy";
  return "Unknown";
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return "yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
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

  const [stats, setStats] = useState({
    healthyInvestigations: 0,
    criticalInvestigations: 0,
    aiReportsGenerated: 0,
    lastInvestigationId: "—",
    lastInvestigationTime: "",
  });

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

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError("");

    try {
      const allHistory = await getAllInvestigations();
      const mapped = allHistory.map((item) => ({
        ...item,
        clusterName: item.cluster_name,
        clusterId: item.cluster_id,
        issueCount: parseIssues(item.issues).length,
      }));

      // Already sorted by created_at desc from backend, but let's double check
      const sorted = [...mapped].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      const healthy = sorted.filter((inv) => inv.status?.toLowerCase() === "healthy").length;
      const critical = sorted.filter((inv) => inv.status?.toLowerCase() === "critical").length;
      const aiReports = sorted.filter((inv) => inv.has_ai_report).length;
      const latest = sorted[0];

      setTotalInvestigations(sorted.length);
      setRecentInvestigations(sorted.slice(0, 5));
      setStats({
        healthyInvestigations: healthy,
        criticalInvestigations: critical,
        aiReportsGenerated: aiReports,
        lastInvestigationId: latest ? `INV-${String(latest.id).padStart(5, "0")}` : "—",
        lastInvestigationTime: latest ? formatRelativeTime(latest.created_at) : "",
      });
    } catch (err) {
      setHistoryError(getApiErrorMessage(err, "Failed to load investigation history."));
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    const data = await refreshClusters();
    await Promise.all([loadHistory(), loadResourceStats(data)]);
  }, [loadHistory, loadResourceStats, refreshClusters]);

  useEffect(() => {
    if (!loading) {
      loadHistory();
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
      <ErrorAlert message={historyError} onRetry={loadHistory} />

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
        <StatCard
          title="Healthy Investigations"
          value={stats.healthyInvestigations}
          icon={FiCheckCircle}
          variant="success"
        />
        <StatCard
          title="Critical Investigations"
          value={stats.criticalInvestigations}
          icon={FiAlertTriangle}
          variant="danger"
        />
        <StatCard
          title="AI Reports Generated"
          value={stats.aiReportsGenerated}
          icon={FiZap}
          variant="default"
        />
        <StatCard
          title="Last Investigation"
          value={stats.lastInvestigationId}
          subtext={stats.lastInvestigationTime}
          icon={FiClock}
          variant="default"
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
            <Link to="/investigations" className="text-xs font-semibold text-[var(--color-primary)] hover:underline">
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
                <Link
                  key={item.id}
                  to={`/investigations/${item.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-[var(--color-bg)]/35 block"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-xs font-bold text-[var(--color-primary)]">
                      INV-{String(item.id).padStart(5, "0")}
                    </span>
                    <span className="text-xs font-semibold text-[var(--color-text)]">
                      {item.clusterName}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--color-secondary)]">
                    <span className="font-medium">
                      {item.issueCount} {item.issueCount === 1 ? "Issue" : "Issues"}
                    </span>
                    <span>•</span>
                    <span>{formatRelativeTime(item.created_at)}</span>
                  </div>
                </Link>
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
                { to: "/clusters", icon: FiSearch, label: "Run Investigation" },
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

import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  FiRefreshCw,
  FiSearch,
  FiArrowLeft,
  FiDatabase,
  FiUpload,
  FiCloudOff,
  FiLayers,
  FiServer,
} from "react-icons/fi";
import DataTable from "../components/DataTable";
import ErrorAlert from "../components/ErrorAlert";
import EmptyState from "../components/EmptyState";
import PageSkeleton from "../components/PageSkeleton";
import StatusBadge from "../components/StatusBadge";
import TableSkeleton from "../components/TableSkeleton";
import { useClusters } from "../context/ClusterContext";
import { useToast } from "../context/ToastContext";
import {
  getNodes,
  getPods,
  getNamespaces,
  getEvents,
  getDeployments,
} from "../services/clusterService";
import { getApiErrorMessage } from "../utils/errors";

const tabs = [
  { key: "nodes", label: "Nodes", icon: FiServer },
  { key: "pods", label: "Pods", icon: FiSearch },
  { key: "namespaces", label: "Namespaces", icon: FiDatabase },
  { key: "deployments", label: "Deployments", icon: FiLayers },
  { key: "events", label: "Events", icon: FiCloudOff },
];

function ClusterDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { getClusterById, refreshClusters, loading: clustersLoading } = useClusters();
  const cluster = getClusterById(id);

  const [activeTab, setActiveTab] = useState("nodes");
  const [resources, setResources] = useState({
    nodes: [],
    pods: [],
    namespaces: [],
    deployments: [],
    events: [],
  });
  const [loadedTabs, setLoadedTabs] = useState({});
  const [tabLoading, setTabLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchTabData = useCallback(
    async (tab, showToast = false) => {
      if (cluster?.status !== "connected") return;

      setTabLoading(true);
      setError("");

      try {
        let data = [];
        if (tab === "nodes") data = await getNodes(id);
        if (tab === "pods") data = await getPods(id);
        if (tab === "namespaces") data = await getNamespaces(id);
        if (tab === "deployments") data = await getDeployments(id);
        if (tab === "events") data = await getEvents(id);

        setResources((prev) => ({ ...prev, [tab]: data }));
        setLoadedTabs((prev) => ({ ...prev, [tab]: true }));
        await refreshClusters();
        if (showToast) toast.success(`${tab} refreshed.`);
      } catch (err) {
        const message = getApiErrorMessage(
          err,
          `Failed to load ${tab}. Ensure the cluster API is reachable.`
        );
        setError(message);
        await refreshClusters();
        if (showToast) toast.error(message);
      } finally {
        setTabLoading(false);
      }
    },
    [cluster?.status, id, refreshClusters, toast]
  );

  useEffect(() => {
    refreshClusters().catch(() => {});
  }, [id, refreshClusters]);

  useEffect(() => {
    if (cluster?.status === "connected" && !loadedTabs[activeTab]) {
      fetchTabData(activeTab);
    }
  }, [cluster?.status, activeTab, loadedTabs, fetchTabData]);

  const handleRefresh = () => fetchTabData(activeTab, true);

  const handleRefreshAll = async () => {
    setLoadedTabs({});
    await refreshClusters();
    await fetchTabData(activeTab, true);
  };

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

  const tableConfig = {
    nodes: {
      columns: [
        { key: "name", label: "Name" },
        {
          key: "status",
          label: "Status",
          render: (row) => <StatusBadge status={row.status} />,
        },
        { key: "version", label: "Version" },
      ],
      rows: resources.nodes,
      emptyMessage: "No nodes found",
    },
    pods: {
      columns: [
        { key: "name", label: "Name" },
        { key: "namespace", label: "Namespace" },
        {
          key: "status",
          label: "Status",
          render: (row) => <StatusBadge status={row.status} />,
        },
      ],
      rows: resources.pods,
      emptyMessage: "No pods found",
    },
    namespaces: {
      columns: [
        { key: "name", label: "Name" },
        {
          key: "status",
          label: "Status",
          render: (row) => <StatusBadge status={row.status} />,
        },
      ],
      rows: resources.namespaces,
      emptyMessage: "No namespaces found",
    },
    deployments: {
      columns: [
        { key: "name", label: "Name" },
        { key: "namespace", label: "Namespace" },
        { key: "desired", label: "Desired" },
        { key: "available", label: "Available" },
        {
          key: "status",
          label: "Status",
          render: (row) => <StatusBadge status={row.status} />,
        },
      ],
      rows: resources.deployments,
      emptyMessage: "No deployments found",
    },
    events: {
      columns: [
        { key: "namespace", label: "Namespace" },
        { key: "type", label: "Type" },
        { key: "reason", label: "Reason" },
        { key: "message", label: "Message" },
      ],
      rows: resources.events,
      emptyMessage: "No events found",
      searchable: true,
    },
  };

  const currentTable = tableConfig[activeTab];
  const resourceLabel = activeTab;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to="/clusters"
            className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
          >
            <FiArrowLeft className="h-3.5 w-3.5" />
            Back to clusters
          </Link>
          <div className="flex items-center gap-2">
            <FiServer className="h-5 w-5 text-[var(--color-primary)]" />
            <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">{cluster.name}</h1>
          </div>
          <p className="mt-1 text-xs text-[var(--color-secondary)]">
            {cluster.description || "No description provided"}
          </p>
          <div className="mt-2.5">
            <StatusBadge status={cluster.status} size="sm" />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleRefreshAll}
            disabled={tabLoading || cluster.status !== "connected"}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg)] disabled:opacity-50"
          >
            <FiRefreshCw className={`h-3.5 w-3.5 ${tabLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            to={`/clusters/${id}/investigate`}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90 ${
              cluster.status === "connected"
                ? "bg-[var(--color-primary)]"
                : "pointer-events-none bg-[var(--color-secondary)] opacity-50"
            }`}
          >
            <FiSearch className="h-3.5 w-3.5" />
            Investigate
          </Link>
        </div>
      </div>

      <ErrorAlert message={error} onRetry={handleRefresh} />

      {cluster.status !== "connected" ? (
        <EmptyState
          icon={FiUpload}
          title="Kubeconfig required"
          description="Upload a kubeconfig file from the Clusters page to view resources."
          action={
            <Link
              to="/clusters"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-bold text-white"
            >
              Go to Clusters
            </Link>
          }
        />
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
          <div className="flex overflow-x-auto border-b border-[var(--color-border)]">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`relative shrink-0 px-4 py-3 text-xs font-bold transition-colors ${
                  activeTab === tab.key
                    ? "text-[var(--color-primary)] after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:bg-[var(--color-primary)] after:content-['']"
                    : "text-[var(--color-secondary)] hover:text-[var(--color-text)]"
                }`}
              >
                <span className="mr-1.5 inline-flex align-middle">
                  <tab.icon className="h-3.5 w-3.5" />
                </span>
                {tab.label}
              </button>
            ))}
          </div>

          {tabLoading && !loadedTabs[activeTab] ? (
            <TableSkeleton rows={6} columns={currentTable.columns.length} />
          ) : error ? (
            <EmptyState
              icon={FiCloudOff}
              title="Unable to reach cluster"
              description={`Unable to retrieve ${resourceLabel}. The Kubernetes API server is unavailable. Retry or re-upload kubeconfig.`}
            />
          ) : (
            <DataTable
              columns={currentTable.columns}
              rows={currentTable.rows}
              emptyMessage={currentTable.emptyMessage}
              searchable={currentTable.searchable !== false}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default ClusterDetails;

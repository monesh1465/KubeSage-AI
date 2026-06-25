import { useState } from "react";
import { FiPlus, FiX, FiServer } from "react-icons/fi";
import ClusterCard from "../components/ClusterCard";
import PageHeader from "../components/PageHeader";
import ErrorAlert from "../components/ErrorAlert";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";
import PageSkeleton from "../components/PageSkeleton";
import { useClusters } from "../context/ClusterContext";
import { useToast } from "../context/ToastContext";
import { createCluster, uploadKubeconfig } from "../services/clusterService";
import { getApiErrorMessage } from "../utils/errors";

function Clusters() {
  const { clusters, loading, error, refreshClusters } = useClusters();
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState({ name: "", description: "" });

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setFormError("");

    try {
      await createCluster(formData);
      setFormData({ name: "", description: "" });
      setShowModal(false);
      await refreshClusters();
      toast.success("Cluster created successfully.");
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Failed to create cluster."));
    } finally {
      setCreating(false);
    }
  };

  const handleUploadKubeconfig = async (clusterId, file) => {
    setUploadingId(clusterId);
    try {
      const result = await uploadKubeconfig(clusterId, file);
      await refreshClusters();
      if (result.status === "connected") {
        toast.success("Kubeconfig uploaded. Cluster connected.");
      } else {
        toast.warning("Kubeconfig uploaded but connection test failed.");
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to upload kubeconfig."));
    } finally {
      setUploadingId(null);
    }
  };

  if (loading && clusters.length === 0) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clusters"
        description="Manage your Kubernetes cluster connections"
        actions={
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <FiPlus className="h-4 w-4" />
            Add Cluster
          </button>
        }
      />

      <ErrorAlert message={error} onRetry={refreshClusters} />

      {clusters.length === 0 ? (
        <EmptyState
          icon={FiServer}
          title="No clusters registered yet"
          description="Create a cluster and upload a kubeconfig to get started."
          action={
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
            >
              <FiPlus className="h-4 w-4" />
              Add Your First Cluster
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {clusters.map((cluster) => (
            <ClusterCard
              key={cluster.id}
              cluster={cluster}
              uploading={uploadingId === cluster.id}
              onUploadKubeconfig={handleUploadKubeconfig}
            />
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--color-text)]">Create Cluster</h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-[var(--color-secondary)] hover:bg-[var(--color-bg)]"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            {formError && <ErrorAlert message={formError} className="mb-4" />}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                  Cluster Name
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                  placeholder="production-eks"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                  placeholder="AWS EKS production cluster"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={creating}
                  className="flex-1 rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg)] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex flex-1 items-center justify-center rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                >
                  {creating ? <LoadingSpinner size="sm" /> : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Clusters;

import { Link } from "react-router-dom";
import { FiSearch, FiEye, FiUpload, FiTrash2, FiServer } from "react-icons/fi";
import StatusBadge from "./StatusBadge";
import LoadingSpinner from "./LoadingSpinner";

function ClusterCard({
  cluster,
  onUploadKubeconfig,
  onRemoveCluster,
  uploading = false,
  removing = false,
}) {
  const isConnected = cluster.status === "connected";

  return (
    <div className="group flex flex-col justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-sm transition-all duration-200 hover:border-[var(--color-primary)]/40 hover:shadow-md">
      <div>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 truncate text-sm font-bold text-[var(--color-text)]">
              <FiServer className="h-4 w-4 text-[var(--color-primary)]" />
              {cluster.name}
            </h3>
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[var(--color-secondary)]">
              {cluster.description || "No description provided"}
            </p>
          </div>
          <StatusBadge status={cluster.status} size="sm" />
        </div>
      </div>

      <div className="mt-5 border-t border-[var(--color-border)]/65 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/clusters/${cluster.id}`}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg)]"
          >
            <FiEye className="h-3.5 w-3.5" />
            View
          </Link>
          <Link
            to={`/clusters/${cluster.id}/investigate`}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 ${
              isConnected
                ? "bg-[var(--color-primary)]"
                : "pointer-events-none bg-[var(--color-secondary)] opacity-50"
            }`}
          >
            <FiSearch className="h-3.5 w-3.5" />
            Investigate
          </Link>
          <label
            className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border border-dashed border-[var(--color-border)] px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              uploading
                ? "pointer-events-none text-[var(--color-secondary)]"
                : "text-[var(--color-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            }`}
          >
            {uploading ? (
              <>
                <LoadingSpinner size="sm" />
                Uploading...
              </>
            ) : (
              <>
                <FiUpload className="h-3.5 w-3.5" />
                Upload Config
              </>
            )}
            <input
              type="file"
              accept=".yaml,.yml"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUploadKubeconfig(cluster.id, file);
                e.target.value = "";
              }}
            />
          </label>
          <button
            type="button"
            disabled={removing || uploading}
            onClick={() => onRemoveCluster(cluster)}
            className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-[var(--color-danger)] transition-colors hover:bg-[var(--color-danger)]/8 disabled:opacity-50"
            title="Remove Cluster"
          >
            <FiTrash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ClusterCard;

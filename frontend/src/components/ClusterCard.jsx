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
  const isDisconnected = cluster.status === "failed" || cluster.status === "disconnected";

  return (
    <div className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(0,0,0,0.16)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 truncate text-lg font-bold text-[var(--color-text)]">
            <FiServer className="h-4.5 w-4.5 text-[var(--color-primary)]" />
            {cluster.name}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-[var(--color-secondary)]">
            {cluster.description || "No description provided"}
          </p>
        </div>
        <StatusBadge status={cluster.status} size="md" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {isConnected && (
          <span className="rounded-md bg-[var(--color-success)]/10 px-2 py-1 text-xs font-medium text-[var(--color-success)]">
            Connected
          </span>
        )}
        {isDisconnected && (
          <span className="rounded-md bg-[var(--color-danger)]/10 px-2 py-1 text-xs font-medium text-[var(--color-danger)]">
            Disconnected
          </span>
        )}
        {!isConnected && !isDisconnected && (
          <span className="rounded-md bg-[var(--color-warning)]/10 px-2 py-1 text-xs font-medium text-[var(--color-warning)]">
            Connecting
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          to={`/clusters/${cluster.id}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg)] hover:shadow-sm"
        >
          <FiEye className="h-4 w-4" />
          View
        </Link>
        <Link
          to={`/clusters/${cluster.id}/investigate`}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 ${
            isConnected
              ? "bg-[var(--color-primary)]"
              : "pointer-events-none bg-[var(--color-secondary)] opacity-50"
          }`}
        >
          <FiSearch className="h-4 w-4" />
          Investigate
        </Link>
        <label
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-[var(--color-border)] px-3 py-2 text-sm transition-colors ${
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
              <FiUpload className="h-4 w-4" />
              Upload Kubeconfig
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
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-danger)]/35 px-3 py-2 text-sm text-[var(--color-danger)] transition-colors hover:bg-[var(--color-danger)]/10 disabled:opacity-50"
        >
          <FiTrash2 className="h-4 w-4" />
          {removing ? "Removing..." : "Remove"}
        </button>
      </div>
    </div>
  );
}

export default ClusterCard;

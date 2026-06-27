import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  FiSearch,
  FiFilter,
  FiClock,
  FiRefreshCw,
  FiZap,
  FiFileText,
  FiChevronDown,
  FiX,
} from "react-icons/fi";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import ErrorAlert from "../components/ErrorAlert";
import PageSkeleton from "../components/PageSkeleton";
import { getAllInvestigations } from "../services/investigationService";
import { generateAIAnalysis } from "../services/aiService";
import { getApiErrorMessage } from "../utils/errors";
import { parseIssues } from "../utils/parseIssues";
import { useToast } from "../context/ToastContext";

function padId(id) {
  return `INV-${String(id).padStart(5, "0")}`;
}

function formatRelativeDate(dateStr) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 0) return "Today";
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatDuration(seconds) {
  if (seconds == null) return "—";
  if (seconds < 1) return `${Math.round(seconds * 1000)}ms`;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

const STATUS_OPTIONS = ["All", "Healthy", "Warning", "Critical"];

function Investigations() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const preselectedCluster = searchParams.get("cluster") || "";

  const [investigations, setInvestigations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(preselectedCluster);
  const [statusFilter, setStatusFilter] = useState("All");
  const [generatingId, setGeneratingId] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAllInvestigations();
      setInvestigations(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load investigations."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerate = async (investigationId) => {
    setGeneratingId(investigationId);
    try {
      await generateAIAnalysis(investigationId);
      navigate(`/investigations/${investigationId}/ai`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to generate AI report."));
      setGeneratingId(null);
    }
  };

  const filtered = investigations.filter((inv) => {
    const matchesSearch =
      !search ||
      inv.cluster_name?.toLowerCase().includes(search.toLowerCase()) ||
      String(inv.id).includes(search) ||
      padId(inv.id).toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "All" ||
      inv.status?.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Investigations"
        description="Diagnostic run history across all connected clusters"
        actions={
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg)] disabled:opacity-50"
          >
            <FiRefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      <ErrorAlert message={error} onRetry={loadData} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative min-w-[220px] flex-1">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-secondary)]" />
          <input
            type="text"
            placeholder="Search by Investigation ID or Cluster..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] py-1.5 pl-8 pr-3 text-xs text-[var(--color-text)] placeholder-[var(--color-secondary)] outline-none focus:border-[var(--color-primary)]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] hover:text-[var(--color-text)]"
            >
              <FiX className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Status filter */}
        <div className="relative">
          <FiFilter className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--color-secondary)]" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] py-1.5 pl-7 pr-7 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <FiChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--color-secondary)]" />
        </div>

        <span className="ml-auto text-[11px] text-[var(--color-secondary)]">
          {filtered.length} of {investigations.length} results
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-xs font-semibold text-[var(--color-secondary)]">No investigations found.</p>
            <p className="mt-1 text-[11px] text-[var(--color-secondary)] opacity-60">
              Run a cluster investigation to see results here.
            </p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/60">
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">ID</th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">Cluster</th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">Status</th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">Issues</th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">Created</th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">Duration</th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">AI Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]/60">
              {filtered.map((inv) => (
                <tr
                  key={inv.id}
                  className="group transition-colors hover:bg-[var(--color-bg)]/40"
                >
                  {/* ID */}
                  <td className="px-5 py-3.5">
                    <Link
                      to={`/investigations/${inv.id}`}
                      className="font-mono text-[11px] font-bold text-[var(--color-primary)] hover:underline"
                    >
                      {padId(inv.id)}
                    </Link>
                  </td>

                  {/* Cluster */}
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-semibold text-[var(--color-text)]">
                      {inv.cluster_name}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-3.5">
                    <StatusBadge status={inv.status} />
                  </td>

                  {/* Issues */}
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-mono text-[var(--color-text)] bg-[var(--color-bg)] px-2 py-0.5 rounded border border-[var(--color-border)]">
                      {parseIssues(inv.issues).length}
                    </span>
                  </td>

                  {/* Created */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-secondary)]">
                      <FiClock className="h-3 w-3 shrink-0" />
                      <span>{formatRelativeDate(inv.created_at)}</span>
                    </div>
                  </td>

                  {/* Duration */}
                  <td className="px-5 py-3.5">
                    <span className="text-[11px] text-[var(--color-secondary)]">
                      {formatDuration(inv.duration_seconds)}
                    </span>
                  </td>

                  {/* AI Report */}
                  <td className="px-5 py-3.5">
                    {inv.has_ai_report ? (
                      <Link
                        to={`/investigations/${inv.id}/ai`}
                        className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/8"
                      >
                        <FiFileText className="h-3 w-3" />
                        View AI Report
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled={generatingId === inv.id}
                        onClick={() => handleGenerate(inv.id)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-[var(--color-border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-secondary)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-50"
                      >
                        {generatingId === inv.id ? (
                          <>
                            <FiRefreshCw className="h-3 w-3 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <FiZap className="h-3 w-3" />
                            Generate AI Report
                          </>
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Investigations;

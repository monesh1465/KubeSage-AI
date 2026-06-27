import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiDownload,
  FiFilter,
  FiSearch,
  FiAlertTriangle,
  FiCheckCircle,
  FiXCircle,
} from "react-icons/fi";
import EmptyState from "../components/EmptyState";
import ErrorAlert from "../components/ErrorAlert";
import IssueCard from "../components/IssueCard";
import PageHeader from "../components/PageHeader";
import PageSkeleton from "../components/PageSkeleton";
import StatusBadge from "../components/StatusBadge";
import StatCard from "../components/StatCard";
import LoadingSpinner from "../components/LoadingSpinner";
import { useClusters } from "../context/ClusterContext";
import { getInvestigationHistory } from "../services/investigationService";
import { parseIssues } from "../utils/parseIssues";
import { formatDateTime, normalizeStatus } from "../utils/status";
import { getApiErrorMessage } from "../utils/errors";
import {
  groupIssues,
  getMostCommonIssue,
  getMostAffectedNamespace,
  getIssuePriority,
  normalizeResourceName,
} from "../utils/issueInsights";

const PAGE_SIZE = 8;
const TIME_WINDOWS = [
  { value: "all", label: "All Time" },
  { value: "24h", label: "Last 24 Hours" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last Month" },
];
const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "Healthy", label: "Healthy" },
  { value: "Warning", label: "Warning" },
  { value: "Critical", label: "Critical" },
];
const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "issues", label: "Most Issues" },
  { value: "critical", label: "Critical First" },
];

function getInvestigationDisplayId(id) {
  return `INV-${String(id).padStart(6, "0")}`;
}

function formatDuration(item) {
  if (item.duration_seconds != null && !Number.isNaN(Number(item.duration_seconds))) {
    const value = Number(item.duration_seconds);
    if (value < 1) return `${Math.round(value * 1000)} ms`;
    if (value < 60) return `${Math.round(value)} sec`;
    const minutes = Math.floor(value / 60);
    const seconds = Math.round(value % 60);
    return `${minutes} min ${seconds} sec`;
  }

  return "Not tracked";
}

function toCsvValue(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function buildExportRows(history, selectedClusterName) {
  return history.map((item) => {
    const issues = parseIssues(item.issues);
    return {
      investigation_id: getInvestigationDisplayId(item.id),
      cluster: selectedClusterName,
      status: item.status,
      summary: item.summary,
      issue_count: issues.length,
      created_at: formatDateTime(item.created_at),
      duration: formatDuration(item),
    };
  });
}

function HistoryContent({ clusterId, clusterName }) {
  const location = useLocation();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [timeWindow, setTimeWindow] = useState("7d");
  const [statusFilter, setStatusFilter] = useState("all");
  const [issueTypeFilter, setIssueTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [referenceTime, setReferenceTime] = useState(() => Date.now());
  const autoExpandLatestRef = useRef(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getInvestigationHistory(clusterId);
      setHistory(data);
      setReferenceTime(Date.now());
      setPage(1);
      if (location.state?.autoExpandLatest && !autoExpandLatestRef.current && data.length > 0) {
        autoExpandLatestRef.current = true;
        setExpandedId(data[0].id);
      } else {
        setExpandedId(null);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load investigation history."));
    } finally {
      setLoading(false);
    }
  }, [clusterId, location.state]);

  useEffect(() => {
    if (clusterId) {
      fetchHistory();
    }
  }, [clusterId, fetchHistory]);

  const filteredHistory = useMemo(() => {
    const windowMs =
      timeWindow === "24h"
        ? 24 * 60 * 60 * 1000
        : timeWindow === "7d"
          ? 7 * 24 * 60 * 60 * 1000
          : timeWindow === "30d"
            ? 30 * 24 * 60 * 60 * 1000
            : null;

    return history.filter((item) => {
      const issues = parseIssues(item.issues);
      const createdAt = new Date(item.created_at).getTime();
      const summaryText = `${item.summary} ${item.status} ${formatDateTime(item.created_at)} ${issues
        .map((issue) => `${issue.type} ${issue.namespace} ${issue.severity} ${normalizeResourceName(issue.resource)}`)
        .join(" ")}`.toLowerCase();

      // Search match
      const matchesSearch = !search.trim() || summaryText.includes(search.toLowerCase());

      // Time range filter
      const matchesTime = !windowMs || referenceTime - createdAt <= windowMs;

      // Status match
      const itemStatus = normalizeStatus(getIssuePriority(issues));
      const matchesStatus = statusFilter === "all" || itemStatus === normalizeStatus(statusFilter);

      // Issue type match
      const matchesIssueType =
        issueTypeFilter === "all" || issues.some((issue) => issue.type === issueTypeFilter);

      return matchesSearch && matchesTime && matchesStatus && matchesIssueType;
    });
  }, [history, search, timeWindow, statusFilter, issueTypeFilter, referenceTime]);

  const uniqueIssueTypes = useMemo(() => {
    const types = new Set();
    history.forEach((item) => {
      parseIssues(item.issues).forEach((issue) => {
        if (issue.type) types.add(issue.type);
      });
    });
    return Array.from(types).sort();
  }, [history]);

  const sortedHistory = useMemo(() => {
    return [...filteredHistory].sort((a, b) => {
      const issuesA = parseIssues(a.issues);
      const issuesB = parseIssues(b.issues);

      if (sortBy === "newest") {
        return new Date(b.created_at) - new Date(a.created_at);
      }
      if (sortBy === "oldest") {
        return new Date(a.created_at) - new Date(b.created_at);
      }
      if (sortBy === "issues") {
        return issuesB.length - issuesA.length;
      }
      if (sortBy === "critical") {
        const severityScore = (issues) =>
          issues.reduce((acc, issue) => {
            const sev = (issue.severity || "").toLowerCase();
            if (sev === "critical" || sev === "high") return acc + 10;
            if (sev === "medium") return acc + 3;
            return acc + 1;
          }, 0);
        return severityScore(issuesB) - severityScore(issuesA);
      }
      return 0;
    });
  }, [filteredHistory, sortBy]);

  const stats = useMemo(() => {
    let healthy = 0;
    let warning = 0;
    let critical = 0;
    let totalIssues = 0;

    filteredHistory.forEach((item) => {
      const issues = parseIssues(item.issues);
      const label = getIssuePriority(issues);
      totalIssues += issues.length;

      if (label === "Healthy") healthy++;
      else if (label === "Warning") warning++;
      else if (label === "Critical") critical++;
    });

    return {
      total: filteredHistory.length,
      healthy,
      warning,
      critical,
      totalIssues,
    };
  }, [filteredHistory]);



  const totalPages = Math.ceil(sortedHistory.length / PAGE_SIZE);
  const paginatedHistory = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedHistory.slice(start, start + PAGE_SIZE);
  }, [sortedHistory, page]);

  const handleExport = (format) => {
    const rows = buildExportRows(sortedHistory, clusterName);
    let blob;

    if (format === "json") {
      blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    } else {
      const headers = ["Investigation ID", "Cluster", "Status", "Summary", "Issues Count", "Created At", "Duration"];
      const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
          [
            toCsvValue(row.investigation_id),
            toCsvValue(row.cluster),
            toCsvValue(row.status),
            toCsvValue(row.summary),
            row.issue_count,
            toCsvValue(row.created_at),
            toCsvValue(row.duration),
          ].join(",")
        ),
      ].join("\n");
      blob = new Blob([csvContent], { type: "text/csv" });
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kubesage-history-${clusterName.toLowerCase()}-${Date.now()}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    setExpandedId(null);
  };



  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (error) {
    return <ErrorAlert message={error} onRetry={fetchHistory} className="m-5" />;
  }

  if (history.length === 0) {
    return (
      <EmptyState
        icon={FiClock}
        title="No investigations found"
        description="Run an investigation to start logging history for this cluster."
        action={
          <Link
            to={`/clusters/${clusterId}/investigate`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
          >
            <FiSearch className="h-3.5 w-3.5" />
            Run Investigation
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-5 px-0 pb-2">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Investigations" value={stats.total} icon={FiClock} />
        <StatCard title="Healthy Reports" value={stats.healthy} icon={FiCheckCircle} variant="success" />
        <StatCard title="Warning Reports" value={stats.warning} icon={FiAlertTriangle} variant="warning" />
        <StatCard title="Critical Reports" value={stats.critical} icon={FiXCircle} variant="danger" />
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-xs font-bold text-[var(--color-text)]">Search & Filters</h3>
            <p className="text-[10px] text-[var(--color-secondary)]">
              Filter by issue type, namespace, summary, or date window.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleExport("json")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-bg)]"
            >
              <FiDownload className="h-3.5 w-3.5" />
              Export JSON
            </button>
            <button
              type="button"
              onClick={() => handleExport("csv")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-bg)]"
            >
              <FiDownload className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1.5fr_0.7fr_0.7fr]">
          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-secondary)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search history..."
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] py-1.5 pl-8.5 pr-3 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          <div className="relative">
            <FiFilter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-secondary)]" />
            <select
              value={timeWindow}
              onChange={(e) => setTimeWindow(e.target.value)}
              className="w-full appearance-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] py-1.5 pl-8.5 pr-3 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
            >
              {TIME_WINDOWS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <FiFilter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-secondary)]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full appearance-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] py-1.5 pl-8.5 pr-3 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
            >
              {STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr]">
          <div className="relative">
            <FiFilter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-secondary)]" />
            <select
              value={issueTypeFilter}
              onChange={(e) => setIssueTypeFilter(e.target.value)}
              className="w-full appearance-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] py-1.5 pl-8.5 pr-3 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
            >
              <option value="all">All Issue Types</option>
              {uniqueIssueTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="relative">
            <FiFilter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-secondary)]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full appearance-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] py-1.5 pl-8.5 pr-3 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  Sort by {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3.5 shadow-sm">
        <div>
          <p className="text-xs font-bold text-[var(--color-text)]">Timeline Results</p>
          <p className="text-[10px] text-[var(--color-secondary)]">
            {sortedHistory.length} result(s) · {stats.totalIssues} total issue(s)
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] text-[var(--color-secondary)] font-semibold">
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" /> Healthy
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-warning)] animate-pulse" /> Warning
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-danger)] animate-pulse" /> Critical
          </span>
        </div>
      </div>

      {filteredHistory.length === 0 ? (
        <EmptyState
          icon={FiSearch}
          title="No investigations match your filters"
          description="Try widening the time range or clearing the search term."
        />
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
          <div className="divide-y divide-[var(--color-border)]/65">
            {paginatedHistory.map((item) => {
              const issues = parseIssues(item.issues);
              const groupedIssues = groupIssues(issues);
              const isExpanded = expandedId === item.id;
              const issueCount = issues.length;
              const label = getIssuePriority(issues);
              const icon =
                label === "Healthy"
                  ? FiCheckCircle
                  : label === "Critical"
                    ? FiXCircle
                    : FiAlertTriangle;
              const Icon = icon;

              return (
                <div key={item.id} className="group">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="flex w-full flex-col gap-4 px-4 py-4 text-left transition-colors hover:bg-[var(--color-bg)]/25 md:flex-row md:items-center md:justify-between md:px-5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded bg-[var(--color-bg)] px-2 py-0.5 text-[9px] font-bold tracking-wide text-[var(--color-secondary)] border border-[var(--color-border)]">
                          {getInvestigationDisplayId(item.id)}
                        </span>
                        <StatusBadge status={item.status} />
                        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-secondary)]">
                          <Icon className="h-3 w-3" />
                          {label}
                        </span>
                      </div>

                      <p className="text-xs font-bold text-[var(--color-text)]">
                        {formatDateTime(item.created_at)}
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-secondary)] leading-relaxed">
                        {item.summary}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-[var(--color-secondary)]/80 font-medium">
                        <span>Duration: {formatDuration(item)}</span>
                        <span>{issueCount} issue(s)</span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3 self-start md:self-center">
                      <div className="text-right">
                        <p className="text-xs font-bold text-[var(--color-text)]">
                          {issueCount === 0 ? "0 issues" : `${issueCount} issue${issueCount > 1 ? "s" : ""}`}
                        </p>
                        <p className="text-[10px] text-[var(--color-secondary)]">
                          {label === "Healthy" ? "No action needed" : "Review details"}
                        </p>
                      </div>
                      {isExpanded ? (
                        <FiChevronUp className="h-4.5 w-4.5 text-[var(--color-secondary)]" />
                      ) : (
                        <FiChevronDown className="h-4.5 w-4.5 text-[var(--color-secondary)]" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-[var(--color-border)] bg-[var(--color-bg)]/20 px-4 py-4 md:px-5">
                      {issues.length === 0 ? (
                        <EmptyState
                          icon={FiCheckCircle}
                          title="No issues detected"
                          description="Your cluster is operating normally."
                        />
                      ) : (
                        <div className="space-y-4">
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-[var(--color-secondary)] font-semibold">
                            <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1">
                              {getMostAffectedNamespace(issues)} namespace most affected
                            </span>
                            <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1">
                              Recommendation included
                            </span>
                          </div>
                          
                          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm">
                            <h4 className="text-xs font-bold text-[var(--color-text)]">Summary Analysis</h4>
                            <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold">
                              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1 text-[var(--color-text)]">
                                {issues.length} Issues
                              </span>
                              <span className="rounded-full border border-[var(--color-danger)]/25 bg-[var(--color-danger)]/8 px-2.5 py-1 text-[var(--color-danger)]">
                                {issues.filter((issue) => (issue.severity || "").toLowerCase() === "high" || (issue.severity || "").toLowerCase() === "critical").length} Critical
                              </span>
                              <span className="rounded-full border border-[var(--color-warning)]/25 bg-[var(--color-warning)]/8 px-2.5 py-1 text-[var(--color-warning)]">
                                {issues.filter((issue) => (issue.severity || "").toLowerCase() === "medium").length} Medium
                              </span>
                            </div>
                            <div className="mt-3.5 space-y-1 text-xs text-[var(--color-secondary)] leading-relaxed">
                              <p>
                                Most Common Issue: <span className="font-semibold text-[var(--color-text)]">{getMostCommonIssue(issues)?.type || "None"}</span>
                              </p>
                              <p>
                                Most Affected Namespace: <span className="font-semibold text-[var(--color-text)]">{getMostAffectedNamespace(issues)}</span>
                              </p>
                            </div>
                          </div>
                          
                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {groupedIssues.map((issue) => (
                              <IssueCard
                                key={`${item.id}-${issue.type}-${issue.namespace}`}
                                issue={issue}
                                onCopyCommands={(commands) => {
                                  navigator.clipboard?.writeText(commands.join("\n")).catch(() => {});
                                }}
                              />
                            ))}
                          </div>
                          
                          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm text-xs text-[var(--color-secondary)] space-y-1 leading-relaxed">
                            <h4 className="font-bold text-[var(--color-text)]">Diagnostic Info</h4>
                            <p>Completed: {formatDateTime(item.created_at)}</p>
                            <p>Duration: {formatDuration(item)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredHistory.length > PAGE_SIZE && (
            <div className="flex flex-col gap-3 border-t border-[var(--color-border)] px-4 py-3 md:flex-row md:items-center md:justify-between md:px-5">
              <p className="text-[10px] text-[var(--color-secondary)] font-semibold">
                Page {page} of {totalPages} ({filteredHistory.length} total)
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => handlePageChange(page - 1)}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-bg)] disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page === totalPages}
                  onClick={() => handlePageChange(page + 1)}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-bg)] disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
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
    <div className="space-y-6">
      <PageHeader
        title="Investigation History"
        description="Review past health logs, export reports, and inspect historical diagnostic telemetry"
        actions={
          clusters.length > 0 && (
            <select
              value={selectedClusterId}
              onChange={(e) => setSelectedClusterId(e.target.value)}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
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
            <Link to="/clusters" className="text-xs font-bold text-[var(--color-primary)] hover:underline">
              Add a cluster
            </Link>
          }
        />
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-5 py-4.5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-sm font-bold text-[var(--color-text)]">{selectedCluster?.name}</h2>
              <p className="text-xs text-[var(--color-secondary)]">
                Historical log timeline of all investigations run for this cluster
              </p>
            </div>
            <Link
              to={`/clusters/${selectedClusterId}/investigate`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
            >
              <FiSearch className="h-3.5 w-3.5" />
              Run new investigation
            </Link>
          </div>
          {selectedClusterId && (
            <div className="p-5">
              <HistoryContent clusterId={selectedClusterId} clusterName={selectedCluster?.name} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default History;

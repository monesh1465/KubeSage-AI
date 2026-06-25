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
  countIssuesBySeverity,
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
      const grouped = groupIssues(issues);
      const createdAt = new Date(item.created_at).getTime();
      const summaryText = `${item.summary} ${item.status} ${formatDateTime(item.created_at)} ${issues
        .map((issue) => `${issue.type} ${issue.namespace} ${issue.severity} ${normalizeResourceName(issue.resource)}`)
        .join(" ")}`.toLowerCase();

      const matchesSearch =
        !search.trim() || summaryText.includes(search.trim().toLowerCase());

      const matchesTime =
        !windowMs || (Number.isFinite(createdAt) && referenceTime - createdAt <= windowMs);

      const issueCount = issues.length;
      const derivedStatus =
        item.status === "Healthy"
          ? "Healthy"
          : item.status === "Warning"
            ? "Warning"
            : issueCount >= 3
              ? "Critical"
              : issueCount > 0
                ? "Warning"
                : "Healthy";

      const matchesStatus =
        statusFilter === "all" || normalizeStatus(derivedStatus) === normalizeStatus(statusFilter);

      const matchesIssueType =
        issueTypeFilter === "all" || grouped.some((issue) => issue.type === issueTypeFilter);

      return matchesSearch && matchesTime && matchesStatus && matchesIssueType;
    });
  }, [history, issueTypeFilter, referenceTime, search, statusFilter, timeWindow]);

  const sortedHistory = useMemo(() => {
    const items = [...filteredHistory];
    items.sort((a, b) => {
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      const aIssues = parseIssues(a.issues).length;
      const bIssues = parseIssues(b.issues).length;
      const aCritical = parseIssues(a.issues).some((issue) => (issue.severity || "").toLowerCase() === "high");
      const bCritical = parseIssues(b.issues).some((issue) => (issue.severity || "").toLowerCase() === "high");

      if (sortBy === "oldest") return aTime - bTime;
      if (sortBy === "issues") return bIssues - aIssues || bTime - aTime;
      if (sortBy === "critical") return Number(bCritical) - Number(aCritical) || bTime - aTime;
      return bTime - aTime;
    });
    return items;
  }, [filteredHistory, sortBy]);

  const paginatedHistory = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedHistory.slice(start, start + PAGE_SIZE);
  }, [page, sortedHistory]);

  const totalPages = Math.max(1, Math.ceil(sortedHistory.length / PAGE_SIZE));

  const stats = useMemo(() => {
    const items = filteredHistory;
    const severity = items.flatMap((item) => parseIssues(item.issues));
    const severityCounts = countIssuesBySeverity(severity);
    const healthy = items.filter((item) => parseIssues(item.issues).length === 0).length;
    const warning = items.filter((item) => {
      const issues = parseIssues(item.issues);
      return issues.length > 0 && issues.length < 3;
    }).length;
    const critical = items.filter((item) => parseIssues(item.issues).length >= 3).length;
    const totalIssues = severity.length;

    return { total: items.length, healthy, warning, critical, totalIssues, severityCounts };
  }, [filteredHistory]);

  const uniqueIssueTypes = useMemo(() => {
    const types = new Set();
    filteredHistory.forEach((item) => {
      parseIssues(item.issues).forEach((issue) => types.add(issue.type));
    });
    return Array.from(types).sort();
  }, [filteredHistory]);

  const selectedClusterIssues = useMemo(
    () => filteredHistory.flatMap((item) => parseIssues(item.issues)),
    [filteredHistory]
  );

  const mostCommonIssue = getMostCommonIssue(selectedClusterIssues);
  const mostAffectedNamespace = getMostAffectedNamespace(selectedClusterIssues);

  const handleExport = (format) => {
    const exportRows = buildExportRows(sortedHistory, clusterName);
    const fileBase = `${clusterName || "investigations"}-history`;

    if (format === "json") {
      const blob = new Blob([JSON.stringify(exportRows, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${fileBase}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      return;
    }

    const headers = [
      "investigation_id",
      "cluster",
      "status",
      "summary",
      "issue_count",
      "created_at",
      "duration",
    ];
    const csv = [
      headers.join(","),
      ...exportRows.map((row) =>
        headers.map((header) => toCsvValue(row[header])).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${fileBase}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

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
    <div className="space-y-5 px-0 pb-2">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Investigations" value={stats.total} icon={FiClock} />
        <StatCard title="Healthy" value={stats.healthy} icon={FiCheckCircle} variant="success" />
        <StatCard title="Warning" value={stats.warning} icon={FiAlertTriangle} variant="warning" />
        <StatCard title="Critical" value={stats.critical} icon={FiXCircle} variant="danger" />
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)] md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text)]">Search & Filters</h3>
            <p className="text-sm text-[var(--color-secondary)]">
              Filter by issue type, namespace, summary, or date.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleExport("json")}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg)]"
            >
              <FiDownload className="h-4 w-4" />
              Export JSON
            </button>
            <button
              type="button"
              onClick={() => handleExport("csv")}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg)]"
            >
              <FiDownload className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1.5fr_0.7fr_0.7fr]">
          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-secondary)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search investigations..."
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] py-2.5 pl-9 pr-3 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          <div className="relative">
            <FiFilter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-secondary)]" />
            <select
              value={timeWindow}
              onChange={(e) => setTimeWindow(e.target.value)}
              className="w-full appearance-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] py-2.5 pl-9 pr-3 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
            >
              {TIME_WINDOWS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <FiFilter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-secondary)]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full appearance-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] py-2.5 pl-9 pr-3 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
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
            <FiFilter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-secondary)]" />
            <select
              value={issueTypeFilter}
              onChange={(e) => setIssueTypeFilter(e.target.value)}
              className="w-full appearance-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] py-2.5 pl-9 pr-3 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
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
            <FiFilter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-secondary)]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full appearance-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] py-2.5 pl-9 pr-3 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
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

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 shadow-[var(--shadow-card)]">
        <div>
          <p className="text-sm font-medium text-[var(--color-text)]">Investigation Timeline</p>
          <p className="text-xs text-[var(--color-secondary)]">
            {sortedHistory.length} result(s) after filters · {stats.totalIssues} total issue(s)
          </p>
          <p className="mt-1 text-xs text-[var(--color-secondary)]">
            Most affected namespace: {mostAffectedNamespace}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-[var(--color-secondary)]">
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-[var(--color-success)]" /> Healthy
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-[var(--color-warning)]" /> Warning
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-[var(--color-danger)]" /> Critical
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
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]">
          <div className="divide-y divide-[var(--color-border)]">
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
                    className="flex w-full flex-col gap-4 px-4 py-4 text-left transition-colors hover:bg-[var(--color-bg)]/50 md:flex-row md:items-center md:justify-between md:px-5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1 text-[11px] font-semibold tracking-wide text-[var(--color-secondary)]">
                          {getInvestigationDisplayId(item.id)}
                        </span>
                        <StatusBadge status={item.status} />
                        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-secondary)]">
                          <Icon className="h-3.5 w-3.5" />
                          {label}
                        </span>
                      </div>

                      <p className="text-sm font-semibold text-[var(--color-text)]">
                        {formatDateTime(item.created_at)}
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-secondary)]">
                        {item.summary}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--color-secondary)]">
                        <span>{formatDuration(item)}</span>
                        <span>{issueCount} issue(s)</span>
                        {mostCommonIssue && item === sortedHistory[0] && (
                          <span>
                            Most Common: {mostCommonIssue.type} ({mostCommonIssue.count})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3 self-start md:self-center">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[var(--color-text)]">
                          {issueCount === 0 ? "0 issues" : `${issueCount} issue${issueCount > 1 ? "s" : ""}`}
                        </p>
                        <p className="text-xs text-[var(--color-secondary)]">
                          {label === "Healthy" ? "No action needed" : "Review details"}
                        </p>
                      </div>
                      {isExpanded ? (
                        <FiChevronUp className="h-5 w-5 text-[var(--color-secondary)]" />
                      ) : (
                        <FiChevronDown className="h-5 w-5 text-[var(--color-secondary)]" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-[var(--color-border)] bg-[var(--color-bg)]/30 px-4 py-4 md:px-5">
                      {issues.length === 0 ? (
                        <EmptyState
                          icon={FiCheckCircle}
                          title="No issues detected"
                          description="Your cluster is operating normally."
                        />
                      ) : (
                        <div className="space-y-4">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-secondary)]">
                            <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1">
                              {getMostAffectedNamespace(issues)} namespace most affected
                            </span>
                            <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1">
                              Severity highlighted
                            </span>
                            <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1">
                              Recommendation included
                            </span>
                          </div>
                          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                            <h4 className="text-sm font-semibold text-[var(--color-text)]">Summary</h4>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
                              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1 text-[var(--color-text)]">
                                {issues.length} Issues
                              </span>
                              <span className="rounded-full border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-1 text-[var(--color-danger)]">
                                {issues.filter((issue) => (issue.severity || "").toLowerCase() === "high" || (issue.severity || "").toLowerCase() === "critical").length} Critical
                              </span>
                              <span className="rounded-full border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-3 py-1 text-[var(--color-warning)]">
                                {issues.filter((issue) => (issue.severity || "").toLowerCase() === "medium").length} Medium
                              </span>
                            </div>
                            <div className="mt-3 text-sm text-[var(--color-secondary)]">
                              <p>
                                Most Common Issue: {getMostCommonIssue(issues)?.type || "None"}
                              </p>
                              <p>Most Affected Namespace: {getMostAffectedNamespace(issues)}</p>
                            </div>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
                          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                            <h4 className="text-sm font-semibold text-[var(--color-text)]">Issue timeline</h4>
                            <p className="mt-1 text-sm text-[var(--color-secondary)]">
                              {formatDateTime(item.created_at)}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--color-secondary)]">
                              {groupedIssues.slice(0, 4).map((issue) => (
                                <span
                                  key={`${item.id}-${issue.type}-${issue.namespace}`}
                                  className="rounded-full border border-[var(--color-border)] px-2.5 py-1"
                                >
                                  {issue.type} ({issue.count})
                                </span>
                              ))}
                            </div>
                            <p className="mt-3 text-xs text-[var(--color-secondary)]">
                              Duration: {formatDuration(item)}
                            </p>
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
              <p className="text-xs text-[var(--color-secondary)]">
                Page {page} of {totalPages} ({filteredHistory.length} total)
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
    <div className="space-y-5">
      <PageHeader
        title="Investigation History"
        description="Review past investigations, filter results, and expand issue details"
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
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]">
          <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5">
            <div>
              <h2 className="font-semibold text-[var(--color-text)]">{selectedCluster?.name}</h2>
              <p className="text-sm text-[var(--color-secondary)]">
                  Timeline of all investigations for this cluster
              </p>
            </div>
            <Link
              to={`/clusters/${selectedClusterId}/investigate`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              <FiSearch className="h-4 w-4" />
              Run new investigation
            </Link>
          </div>
          {selectedClusterId && (
            <HistoryContent clusterId={selectedClusterId} clusterName={selectedCluster?.name} />
          )}
        </div>
      )}
    </div>
  );
}

export default History;

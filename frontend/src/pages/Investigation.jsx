import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiDatabase,
  FiFileText,
  FiZap,
  FiRefreshCw,
  FiCheckCircle,
  FiAlertTriangle,
  FiAlertCircle,
  FiCopy,
  FiCheck,
} from "react-icons/fi";
import PageSkeleton from "../components/PageSkeleton";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";
import { getInvestigationById } from "../services/investigationService";
import { getLatestAIAnalysis, generateAIAnalysis } from "../services/aiService";
import { getApiErrorMessage } from "../utils/errors";
import { parseIssues } from "../utils/parseIssues";
import { useToast } from "../context/ToastContext";

// ── Helpers ──────────────────────────────────────────────────────────────── //

function formatDateTime(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function formatTimeOnly(dateStr) {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    return date.toLocaleTimeString(undefined, {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "";
  }
}

function formatDuration(seconds) {
  if (seconds == null) return "—";
  if (seconds < 1) return `${Math.round(seconds * 1000)} ms`;
  if (seconds < 60) return `${seconds.toFixed(2)} s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

const SEVERITY_META = {
  High: {
    icon: FiAlertCircle,
    textClass: "text-[var(--color-danger)]",
    bgClass: "bg-[var(--color-danger)]/8 border-[var(--color-danger)]/20",
  },
  Medium: {
    icon: FiAlertTriangle,
    textClass: "text-amber-400",
    bgClass: "bg-amber-400/8 border-amber-400/20",
  },
  Low: {
    icon: FiCheckCircle,
    textClass: "text-[var(--color-success)]",
    bgClass: "bg-[var(--color-success)]/8 border-[var(--color-success)]/20",
  },
};

function SeverityIcon({ severity }) {
  const meta = SEVERITY_META[severity] || SEVERITY_META.Low;
  const Icon = meta.icon;
  return <Icon className={`h-3.5 w-3.5 shrink-0 ${meta.textClass}`} />;
}

function resolveIssueCommands(issue) {
  const commands = [];
  const type = issue.type?.toLowerCase() ?? "";
  const ns = issue.namespace !== "-" ? `-n ${issue.namespace}` : "-A";
  const resource = issue.resource ?? "";

  if (type.includes("pending") || type.includes("crashloop") || type.includes("oom") || type.includes("imagepull")) {
    commands.push(`kubectl describe pod ${resource} ${ns}`);
    commands.push(`kubectl logs ${resource} ${ns} --previous`);
  }
  if (type.includes("notready")) {
    commands.push(`kubectl describe node ${resource}`);
    commands.push(`kubectl get events --field-selector involvedObject.name=${resource}`);
  }
  if (type.includes("replicamismatch")) {
    commands.push(`kubectl rollout status deployment/${resource} ${ns}`);
    commands.push(`kubectl describe deployment ${resource} ${ns}`);
  }
  if (type.includes("failedscheduling")) {
    commands.push(`kubectl get events ${ns} --field-selector reason=FailedScheduling`);
  }
  if (type.includes("failedmount")) {
    commands.push(`kubectl describe pod ${resource} ${ns}`);
    commands.push(`kubectl get pvc ${ns}`);
  }
  if (commands.length === 0) {
    commands.push(`kubectl get pods ${ns}`);
    commands.push(`kubectl get events ${ns}`);
  }
  return commands;
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 rounded p-1 text-[var(--color-secondary)] transition-colors hover:text-[var(--color-text)]"
      title="Copy command"
    >
      {copied ? <FiCheck className="h-3 w-3 text-[var(--color-success)]" /> : <FiCopy className="h-3 w-3" />}
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────── //

function Investigation() {
  const { investigationId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [result, setResult] = useState(null);
  const [loadingInvestigation, setLoadingInvestigation] = useState(true);
  const [investigationError, setInvestigationError] = useState("");
  const [hasAIReport, setHasAIReport] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [copiedAllCmds, setCopiedAllCmds] = useState(false);

  // Load investigation
  useEffect(() => {
    if (!investigationId) return;
    let cancelled = false;
    setLoadingInvestigation(true);
    setInvestigationError("");
    setResult(null);
    setHasAIReport(false);
    setAiAnalysis(null);

    getInvestigationById(investigationId)
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setInvestigationError(getApiErrorMessage(err, "Failed to load investigation."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingInvestigation(false);
      });

    return () => { cancelled = true; };
  }, [investigationId]);

  // Check if AI report exists and store it
  useEffect(() => {
    if (!result?.id) return;
    let cancelled = false;
    getLatestAIAnalysis(result.id)
      .then((analysis) => {
        if (!cancelled) {
          setAiAnalysis(analysis);
          setHasAIReport(!!analysis);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [result?.id]);

  const handleGenerateAI = async () => {
    setGeneratingAI(true);
    try {
      await generateAIAnalysis(result.id);
      navigate(`/investigations/${result.id}/ai`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to generate AI analysis."));
      setGeneratingAI(false);
    }
  };

  // ── Render states ─────────────────────────────────────────────────────── //

  if (loadingInvestigation) return <PageSkeleton />;

  if (investigationError) {
    return (
      <EmptyState
        icon={FiDatabase}
        title="Investigation not found"
        description={investigationError}
        action={
          <Link to="/investigations" className="text-xs font-semibold text-[var(--color-primary)] hover:underline">
            Back to Investigations
          </Link>
        }
      />
    );
  }

  if (!result) {
    return (
      <EmptyState
        icon={FiDatabase}
        title="Investigation not found"
        description="This investigation may have been removed or you don't have access."
        action={
          <Link to="/investigations" className="text-xs font-semibold text-[var(--color-primary)] hover:underline">
            Back to Investigations
          </Link>
        }
      />
    );
  }

  const issues = parseIssues(result.issues);
  const highCount = issues.filter((i) => i.severity === "High").length;
  const mediumCount = issues.filter((i) => i.severity === "Medium").length;
  const lowCount = issues.filter((i) => i.severity === "Low").length;

  const namespaces = Array.from(new Set(issues.map((i) => i.namespace).filter((ns) => ns && ns !== "-")));
  const affectedNamespace = namespaces.length > 0 ? namespaces.join(", ") : "None";

  const counts = issues.reduce((acc, issue) => {
    acc[issue.type] = (acc[issue.type] || 0) + 1;
    return acc;
  }, {});
  let mostCommon = "None";
  let maxCount = 0;
  for (const [type, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = type;
    }
  }

  // Deduplicated diagnostic commands
  const allCommands = Array.from(
    new Set(issues.flatMap((issue) => resolveIssueCommands(issue)))
  );

  const handleCopyAllCommands = () => {
    if (allCommands.length > 0) {
      navigator.clipboard?.writeText(allCommands.join("\n")).catch(() => {});
      setCopiedAllCmds(true);
      setTimeout(() => setCopiedAllCmds(false), 2000);
    }
  };

  // Group issues by type for findings
  const groupedIssues = issues.reduce((acc, issue) => {
    const key = issue.type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(issue);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {/* Breadcrumb Navigation */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--color-secondary)]">
        <Link to="/investigations" className="hover:text-[var(--color-primary)]">
          Investigations
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text)]">INV-{String(result.id).padStart(5, "0")}</span>
      </div>

      {/* Top Information Cards in a single row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Cluster", value: result.cluster_name || "minikube" },
          { label: "Investigation ID", value: `INV-${String(result.id).padStart(5, "0")}` },
          { label: "Status", value: <StatusBadge status={result.cluster_status} /> },
          { label: "Executed On", value: formatDateTime(result.started_at || result.completed_at) },
          { label: "Duration", value: formatDuration(result.duration_seconds) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3.5 flex flex-col justify-between min-h-[68px] shadow-sm">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-secondary)]">{label}</span>
            <span className="text-xs font-bold text-[var(--color-text)] mt-1.5 truncate">{value}</span>
          </div>
        ))}
      </div>

      {/* Summary Card */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-sm space-y-4">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-secondary)]">
          Investigation Summary
        </h2>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 py-2 border-y border-[var(--color-border)]/40 text-xs">
          <div>
            <p className="text-[10px] text-[var(--color-secondary)] uppercase tracking-wider font-semibold">Issues Detected</p>
            <p className="text-sm font-bold text-[var(--color-text)] mt-1">{issues.length}</p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--color-secondary)] uppercase tracking-wider font-semibold">Affected Namespace</p>
            <p className="text-sm font-bold text-[var(--color-text)] mt-1 truncate" title={affectedNamespace}>{affectedNamespace}</p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--color-secondary)] uppercase tracking-wider font-semibold">Most Common Issue</p>
            <p className="text-sm font-bold text-[var(--color-text)] mt-1 truncate" title={mostCommon}>{mostCommon}</p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--color-secondary)] uppercase tracking-wider font-semibold">High Severity</p>
            <p className="text-sm font-bold text-[var(--color-danger)] mt-1">{highCount}</p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--color-secondary)] uppercase tracking-wider font-semibold">Medium Severity</p>
            <p className="text-sm font-bold text-amber-400 mt-1">{mediumCount}</p>
          </div>
        </div>

        {/* Severity chips */}
        <div className="flex flex-wrap gap-2 pt-1">
          {highCount > 0 && (
            <span className="flex items-center gap-1.5 rounded-full border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/8 px-2.5 py-0.5 text-[10px] font-bold text-[var(--color-danger)]">
              <FiAlertCircle className="h-3 w-3" />
              {highCount} High
            </span>
          )}
          {mediumCount > 0 && (
            <span className="flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/8 px-2.5 py-0.5 text-[10px] font-bold text-amber-400">
              <FiAlertTriangle className="h-3 w-3" />
              {mediumCount} Medium
            </span>
          )}
          {lowCount > 0 && (
            <span className="flex items-center gap-1.5 rounded-full border border-[var(--color-success)]/30 bg-[var(--color-success)]/8 px-2.5 py-0.5 text-[10px] font-bold text-[var(--color-success)]">
              <FiCheckCircle className="h-3 w-3" />
              {lowCount} Low
            </span>
          )}
          {issues.length === 0 && (
            <span className="flex items-center gap-1.5 rounded-full border border-[var(--color-success)]/30 bg-[var(--color-success)]/8 px-2.5 py-0.5 text-[10px] font-bold text-[var(--color-success)]">
              <FiCheckCircle className="h-3 w-3" />
              No issues detected
            </span>
          )}
        </div>
      </div>

      {/* Findings */}
      {issues.length > 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm overflow-hidden">
          <div className="border-b border-[var(--color-border)] px-5 py-3.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-secondary)]">
              Findings — {issues.length} issue{issues.length !== 1 ? "s" : ""} detected
            </p>
          </div>
          <div className="divide-y divide-[var(--color-border)]/60">
            {Object.entries(groupedIssues).map(([type, typeIssues]) => {
              const count = typeIssues.length;
              return (
                <div key={type} className="px-5 py-4">
                  <div className="mb-2 flex items-center gap-2">
                    <SeverityIcon severity={typeIssues[0]?.severity || "Low"} />
                    <span className="text-xs font-bold text-[var(--color-text)]">
                      {type} ({count})
                    </span>
                  </div>
                  <div className="space-y-1.5 pl-5">
                    {typeIssues.map((issue, i) => (
                      <div key={i} className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--color-secondary)]">
                        <span>
                          <span className="font-semibold text-[var(--color-text)]">{issue.resource}</span>
                          {issue.namespace && issue.namespace !== "-" && (
                            <span className="ml-1 rounded bg-[var(--color-bg)] px-1 py-0.5 font-mono text-[10px] border border-[var(--color-border)]">
                              {issue.namespace}
                            </span>
                          )}
                        </span>
                        <span className="text-[var(--color-secondary)]/60">·</span>
                        <span>{issue.recommendation}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Diagnostic Commands */}
      {allCommands.length > 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm overflow-hidden">
          <div className="border-b border-[var(--color-border)] px-5 py-3.5 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-secondary)]">
              Recommended Diagnostic Commands
            </p>
            <button
              type="button"
              onClick={handleCopyAllCommands}
              className="inline-flex items-center gap-1.5 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--color-secondary)] transition-colors hover:text-[var(--color-text)]"
            >
              {copiedAllCmds ? <FiCheck className="h-3 w-3 text-[var(--color-success)]" /> : <FiCopy className="h-3 w-3" />}
              {copiedAllCmds ? "Commands Copied" : "Copy All Commands"}
            </button>
          </div>
          <div className="divide-y divide-[var(--color-border)]/40">
            {allCommands.map((cmd, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-5 py-2.5">
                <code className="font-mono text-[11px] text-[var(--color-text)]">{cmd}</code>
                <CopyButton text={cmd} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Analysis Status Card */}
      {hasAIReport ? (
        <div className="rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/4 p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-secondary)]">
                AI Analysis Available
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-xs">
                <div>
                  <p className="text-[10px] text-[var(--color-secondary)] uppercase tracking-wider font-semibold">Generated At</p>
                  <p className="text-xs font-bold text-[var(--color-text)] mt-1.5">
                    {formatDateTime(aiAnalysis?.generated_at || aiAnalysis?.created_at)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--color-secondary)] uppercase tracking-wider font-semibold">Model</p>
                  <p className="text-xs font-mono font-bold text-[var(--color-text)] mt-1.5">
                    {aiAnalysis?.model || "gemma4:31b-cloud"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--color-secondary)] uppercase tracking-wider font-semibold">Tokens</p>
                  <p className="text-xs font-bold text-[var(--color-text)] mt-1.5">
                    {aiAnalysis ? (aiAnalysis.prompt_tokens ?? 0) + (aiAnalysis.completion_tokens ?? 0) : "—"}
                  </p>
                </div>
              </div>
            </div>
            <Link
              to={`/investigations/${result.id}/ai`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3.5 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
            >
              <FiFileText className="h-3.5 w-3.5" />
              View AI Report
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-secondary)]">
                AI Analysis Status
              </p>
              <p className="mt-1.5 text-xs text-[var(--color-secondary)]">
                No AI report has been generated for this investigation run.
              </p>
            </div>
            <button
              type="button"
              onClick={handleGenerateAI}
              disabled={generatingAI}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3.5 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {generatingAI ? (
                <>
                  <FiRefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FiZap className="h-3.5 w-3.5" />
                  Generate AI Analysis
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Timeline Card */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-sm space-y-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-secondary)]">
          Timeline
        </p>
        <div className="relative pl-6 border-l-2 border-[var(--color-border)] ml-3 space-y-5 py-1">
          {/* Node 1: Started */}
          <div className="relative">
            <div className="absolute -left-[31px] top-0.5 bg-[var(--color-primary)] h-2.5 w-2.5 rounded-full border-2 border-[var(--color-card)] ring-4 ring-[var(--color-primary)]/10" />
            <div className="flex items-center gap-3 text-xs">
              <span className="font-mono font-bold text-[var(--color-secondary)]">
                {formatTimeOnly(result.started_at || result.completed_at || result.created_at)}
              </span>
              <span className="font-semibold text-[var(--color-text)]">Investigation Started</span>
            </div>
          </div>

          {/* Node 2: Rule Engine Completed */}
          <div className="relative">
            <div className="absolute -left-[31px] top-0.5 bg-[var(--color-success)] h-2.5 w-2.5 rounded-full border-2 border-[var(--color-card)] ring-4 ring-[var(--color-success)]/10" />
            <div className="flex items-center gap-3 text-xs">
              <span className="font-mono font-bold text-[var(--color-secondary)]">
                {formatTimeOnly(result.completed_at || result.started_at || result.created_at)}
              </span>
              <span className="font-semibold text-[var(--color-text)]">Rule Engine Completed</span>
            </div>
          </div>

          {/* Node 3: AI Analysis Generated */}
          {hasAIReport && aiAnalysis && (
            <div className="relative">
              <div className="absolute -left-[31px] top-0.5 bg-amber-400 h-2.5 w-2.5 rounded-full border-2 border-[var(--color-card)] ring-4 ring-amber-400/10" />
              <div className="flex items-center gap-3 text-xs">
                <span className="font-mono font-bold text-[var(--color-secondary)]">
                  {formatTimeOnly(aiAnalysis.generated_at || aiAnalysis.created_at)}
                </span>
                <span className="font-semibold text-[var(--color-text)]">AI Analysis Generated</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Investigation;

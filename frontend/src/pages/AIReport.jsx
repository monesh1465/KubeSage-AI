import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FiArrowLeft,
  FiCopy,
  FiCheck,
  FiServer,
  FiClock,
  FiActivity,
  FiCpu,
  FiTerminal,
} from "react-icons/fi";
import PageSkeleton from "../components/PageSkeleton";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";
import { getLatestAIAnalysis } from "../services/aiService";
import { getInvestigationById } from "../services/investigationService";
import { getApiErrorMessage } from "../utils/errors";
import { parseIssues } from "../utils/parseIssues";

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

function formatDuration(seconds) {
  if (seconds == null) return "—";
  if (seconds < 1) return `${Math.round(seconds * 1000)} ms`;
  if (seconds < 60) return `${Number(seconds).toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

function padId(id) {
  return `INV-${String(id).padStart(5, "0")}`;
}

function extractCommands(markdown) {
  if (!markdown) return "";
  const regex = /```(?:bash|sh|kubectl)?\n([\s\S]*?)```/g;
  const commands = [];
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    const lines = match[1].split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("#"));
    commands.push(...lines);
  }
  return commands.join("\n");
}

// ── Section color map (mirrors AI prompt headings) ─────────────────────── //
const SECTION_COLORS = {
  "executive summary": { bar: "#3b82f6", label: "#93c5fd", bg: "rgba(59, 130, 246, 0.06)" },
  "findings": { bar: "#8b5cf6", label: "#c4b5fd", bg: "rgba(139, 92, 246, 0.06)" },
  "impact assessment": { bar: "#ef4444", label: "#fca5a5", bg: "rgba(239, 68, 68, 0.06)" },
  "recommendations": { bar: "#10b981", label: "#6ee7b7", bg: "rgba(16, 185, 129, 0.06)" },
  "optional verification commands": { bar: "#fbbf24", label: "#fde68a", bg: "rgba(251, 191, 36, 0.06)" },
  "recommended diagnostic commands": { bar: "#f97316", label: "#fdba74", bg: "rgba(249, 115, 22, 0.06)" },
};

function getSectionStyle(text) {
  const key = (text ?? "").toLowerCase().trim();
  for (const [name, style] of Object.entries(SECTION_COLORS)) {
    if (key.includes(name)) return style;
  }
  return null;
}

// ── Custom Markdown components ─────────────────────────────────────────── //
const markdownComponents = {
  h3: ({ children }) => {
    const text = typeof children === "string" ? children : String(children ?? "");
    const style = getSectionStyle(text);
    if (style) {
      return (
        <div
          style={{
            borderLeft: `3px solid ${style.bar}`,
            background: style.bg,
            borderRadius: "0 8px 8px 0",
            padding: "8px 16px",
            marginTop: "24px",
            marginBottom: "12px",
          }}
        >
          <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: style.label }}>
            {text}
          </span>
        </div>
      );
    }
    return (
      <h3 style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--color-secondary)", marginTop: "18px", marginBottom: "6px" }}>
        {children}
      </h3>
    );
  },

  h4: ({ children }) => (
    <h4 style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-secondary)", opacity: 0.7, marginTop: "14px", marginBottom: "4px" }}>
      {children}
    </h4>
  ),

  p: ({ children }) => (
    <p style={{ fontSize: "13px", lineHeight: "1.75", color: "var(--color-text)", marginBottom: "10px" }}>
      {children}
    </p>
  ),

  strong: ({ children }) => (
    <strong style={{ fontWeight: 600, color: "var(--color-text)" }}>{children}</strong>
  ),

  pre: ({ children }) => (
    <pre style={{
      background: "var(--color-bg)",
      border: "1px solid var(--color-border)",
      borderRadius: "8px",
      padding: "12px 16px",
      overflowX: "auto",
      fontSize: "12px",
      lineHeight: "1.65",
      margin: "10px 0 14px",
      fontFamily: "ui-monospace, SFMono-Regular, monospace",
    }}>
      {children}
    </pre>
  ),

  code: ({ inline, children }) =>
    inline ? (
      <code style={{
        background: "var(--color-bg)",
        border: "1px solid var(--color-border)",
        borderRadius: "4px",
        padding: "2px 6px",
        fontSize: "11.5px",
        fontFamily: "ui-monospace, SFMono-Regular, monospace",
        color: "var(--color-primary)",
      }}>
        {children}
      </code>
    ) : (
      <code style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: "12px", color: "#e2e8f0" }}>
        {children}
      </code>
    ),

  ul: ({ children }) => (
    <ul style={{ paddingLeft: "18px", margin: "6px 0 12px", listStyleType: "disc" }}>{children}</ul>
  ),

  ol: ({ children }) => (
    <ol style={{ paddingLeft: "18px", margin: "6px 0 12px", listStyleType: "decimal" }}>{children}</ol>
  ),

  li: ({ children }) => (
    <li style={{ fontSize: "13px", lineHeight: "1.75", color: "var(--color-text)", marginBottom: "4px" }}>{children}</li>
  ),

  hr: () => null,
};

// ── Main component ─────────────────────────────────────────────────────── //

function AIReport() {
  const { investigationId } = useParams();

  const [analysis, setAnalysis] = useState(null);
  const [investigation, setInvestigation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedCmds, setCopiedCmds] = useState(false);

  useEffect(() => {
    if (!investigationId) return;
    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([
      getLatestAIAnalysis(investigationId),
      getInvestigationById(investigationId),
    ])
      .then(([ai, inv]) => {
        if (!cancelled) {
          setAnalysis(ai);
          setInvestigation(inv);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getApiErrorMessage(err, "Failed to load AI report."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [investigationId]);

  const handleCopy = () => {
    if (analysis?.analysis) {
      navigator.clipboard?.writeText(analysis.analysis).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyCommands = () => {
    if (analysis?.analysis) {
      const cmds = extractCommands(analysis.analysis);
      if (cmds) {
        navigator.clipboard?.writeText(cmds).catch(() => {});
        setCopiedCmds(true);
        setTimeout(() => setCopiedCmds(false), 2000);
      }
    }
  };

  if (loading) return <PageSkeleton />;

  if (error) {
    return (
      <EmptyState
        icon={FiActivity}
        title="Failed to load AI report"
        description={error}
        action={
          <Link to={`/investigations/${investigationId}`} className="text-xs font-semibold text-[var(--color-primary)] hover:underline">
            Back to Investigation
          </Link>
        }
      />
    );
  }

  if (!analysis) {
    return (
      <EmptyState
        icon={FiActivity}
        title="No AI report found"
        description="No AI analysis has been generated for this investigation yet."
        action={
          <Link to={`/investigations/${investigationId}`} className="text-xs font-semibold text-[var(--color-primary)] hover:underline">
            Go to Investigation to generate one
          </Link>
        }
      />
    );
  }

  // Parse findings for compact cards
  const issues = parseIssues(investigation?.issues);
  const groupedIssues = issues.reduce((acc, issue) => {
    const key = issue.type || "Unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const totalTokens = (analysis.prompt_tokens ?? 0) + (analysis.completion_tokens ?? 0);
  const hasCommands = extractCommands(analysis.analysis).length > 0;

  return (
    <div className="space-y-5">
      {/* Breadcrumb / Navigation */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--color-secondary)]">
        <Link to="/investigations" className="hover:text-[var(--color-primary)]">
          Investigations
        </Link>
        <span>/</span>
        <Link to={`/investigations/${investigationId}`} className="hover:text-[var(--color-primary)]">
          {padId(investigationId)}
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text)]">AI Report</span>
      </div>

      {/* Header */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-secondary)]">
              KubeSage AI Analysis
            </p>
            <h1 className="mt-1 text-lg font-bold text-[var(--color-text)]">
              AI Analysis Report
            </h1>
            <p className="text-xs text-[var(--color-secondary)] mt-0.5">
              Model: {analysis.model || "gemma4:31b-cloud"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-secondary)] transition-colors hover:text-[var(--color-text)] hover:bg-[var(--color-bg)]"
          >
            {copied ? <FiCheck className="h-3.5 w-3.5 text-[var(--color-success)]" /> : <FiCopy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy Report"}
          </button>
        </div>

        {/* Metadata grid - Equal columns in a single row */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {
              icon: FiTerminal,
              label: "Investigation",
              value: padId(investigationId),
            },
            {
              icon: FiServer,
              label: "Cluster",
              value: investigation?.cluster_name || "minikube",
            },
            {
              icon: FiActivity,
              label: "Status",
              value: <StatusBadge status={investigation?.cluster_status} />,
            },
          ].map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="flex flex-col gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/60 px-3 py-2.5"
            >
              <div className="flex items-center gap-1.5">
                <Icon className="h-3 w-3 text-[var(--color-secondary)]" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-secondary)]">{label}</span>
              </div>
              <div className="text-[11px] font-semibold text-[var(--color-text)]">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Findings Section - Compact Issue Cards */}
      {issues.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-secondary)]">
            Findings
          </p>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {Object.entries(groupedIssues).map(([type, count]) => (
              <div
                key={type}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-sm"
              >
                <p className="text-xs font-bold text-[var(--color-text)] truncate" title={type}>
                  {type}
                </p>
                <p className="mt-1 text-[11px] text-[var(--color-secondary)]">
                  {count} occurrence{count !== 1 ? "s" : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Report Content */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm overflow-hidden">
        <div className="border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FiTerminal className="h-3.5 w-3.5 text-[var(--color-primary)]" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-secondary)]">
              Report Content
            </p>
          </div>
          {hasCommands && (
            <button
              type="button"
              onClick={handleCopyCommands}
              className="inline-flex items-center gap-1.5 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs font-semibold text-[var(--color-secondary)] transition-colors hover:text-[var(--color-text)]"
            >
              {copiedCmds ? <FiCheck className="h-3 w-3 text-[var(--color-success)]" /> : <FiCopy className="h-3 w-3" />}
              {copiedCmds ? "Commands Copied" : "Copy All Commands"}
            </button>
          )}
        </div>
        <div className="px-6 py-5">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {analysis.analysis}
          </ReactMarkdown>
        </div>
      </div>

      {/* AI Metadata Section - 4 simplified cards */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-secondary)]">
          AI Metadata
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: "Model",
              value: analysis.model || "gemma4:31b-cloud",
            },
            {
              label: "Tokens",
              value: totalTokens ? `${totalTokens}` : "—",
            },
            {
              label: "Generation Time",
              value: formatDuration(analysis.duration_seconds),
            },
            {
              label: "Generated At",
              value: formatDateTime(analysis.generated_at || analysis.created_at),
            },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex flex-col gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2.5 shadow-sm"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-secondary)]">
                {label}
              </span>
              <span className="text-[11px] font-semibold text-[var(--color-text)] font-mono">
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="flex items-center justify-between pt-2">
        <Link
          to={`/investigations/${investigationId}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
        >
          <FiArrowLeft className="h-3.5 w-3.5" />
          Back to Investigation
        </Link>
        <Link
          to="/investigations"
          className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
        >
          All Investigations
        </Link>
      </div>
    </div>
  );
}

export default AIReport;

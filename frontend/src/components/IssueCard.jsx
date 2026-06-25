import { FiCopy } from "react-icons/fi";
import StatusBadge from "./StatusBadge";
import { normalizeResourceName, resolveIssueCommands } from "../utils/issueInsights";

function IssueCard({ issue, onCopyCommands }) {
  const severity = (issue.severity || "info").toLowerCase();
  const borderClass =
    severity === "critical" || severity === "high"
      ? "border-[var(--color-danger)]/40"
      : severity === "medium"
        ? "border-[var(--color-warning)]/50"
        : "border-[var(--color-border)]";
  const resources = (issue.resources && issue.resources.length > 0 ? issue.resources : [issue.resource])
    .map((resource) => normalizeResourceName(resource))
    .filter(Boolean);
  const commands = issue.renderedCommands || resolveIssueCommands(issue);

  return (
    <div className={`rounded-xl border bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)] ${borderClass}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={issue.severity} />
        <span className="text-xs text-[var(--color-secondary)]">{issue.namespace}</span>
        {issue.count > 1 && (
          <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-secondary)]">
            {issue.count}x
          </span>
        )}
      </div>
      <h4 className="font-semibold text-[var(--color-text)]">
        {issue.type}
        {issue.count > 1 ? ` (${issue.count})` : ""}
      </h4>
      <p className="mt-1 text-sm text-[var(--color-secondary)]">
        Resource: {normalizeResourceName(issue.resource)}
      </p>
      {resources.length > 1 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-secondary)]">
            Affected Resources
          </p>
          <ul className="mt-2 space-y-1 text-sm text-[var(--color-text)]">
            {resources.map((resource) => (
              <li
                key={resource}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5"
              >
                {resource}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-3 space-y-3 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-secondary)]">
            Root Cause
          </p>
          <p className="mt-1 text-[var(--color-text)]">{issue.rootCause}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-secondary)]">
            Recommendation
          </p>
          <p className="mt-1 text-[var(--color-text)]">{issue.recommendation}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-secondary)]">
            Suggested Commands
          </p>
          <div className="mt-2 space-y-2">
            {commands.map((command) => (
              <code
                key={command}
                className="block rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs text-[var(--color-text)]"
              >
                {command}
              </code>
            ))}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onCopyCommands?.(commands)}
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-bg)]"
      >
        <FiCopy className="h-3.5 w-3.5" />
        Copy Commands
      </button>
    </div>
  );
}

export default IssueCard;

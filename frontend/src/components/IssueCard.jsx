import { FiCopy } from "react-icons/fi";
import StatusBadge from "./StatusBadge";
import { normalizeResourceName, resolveIssueCommands } from "../utils/issueInsights";

function IssueCard({ issue, onCopyCommands }) {
  const severity = (issue.severity || "info").toLowerCase();
  
  // Clean indicator border classes
  const borderLeftClass =
    severity === "critical" || severity === "high"
      ? "border-l-4 border-l-[var(--color-danger)]"
      : severity === "medium"
        ? "border-l-4 border-l-[var(--color-warning)]"
        : "border-l-4 border-l-[var(--color-primary)]";

  const resources = (issue.resources && issue.resources.length > 0 ? issue.resources : [issue.resource])
    .map((resource) => normalizeResourceName(resource))
    .filter(Boolean);
  const commands = issue.renderedCommands || resolveIssueCommands(issue);

  return (
    <div className={`flex flex-col justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-sm transition-all duration-150 hover:shadow-md ${borderLeftClass}`}>
      <div>
        <div className="mb-3.5 flex flex-wrap items-center gap-2">
          <StatusBadge status={issue.severity} />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-secondary)]">
            {issue.namespace || "global"}
          </span>
          {issue.count > 1 && (
            <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-0.5 text-[9px] font-bold text-[var(--color-secondary)]">
              {issue.count}x
            </span>
          )}
        </div>
        
        <h4 className="text-sm font-bold leading-tight text-[var(--color-text)]">
          {issue.type}
          {issue.count > 1 ? ` (${issue.count})` : ""}
        </h4>
        <p className="mt-1.5 text-xs text-[var(--color-secondary)]">
          Resource: <span className="font-semibold text-[var(--color-text)]">{normalizeResourceName(issue.resource)}</span>
        </p>

        {resources.length > 1 && (
          <div className="mt-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">
              Affected Resources
            </p>
            <ul className="mt-2 space-y-1">
              {resources.map((resource) => (
                <li
                  key={resource}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text)]"
                >
                  {resource}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 space-y-3.5 text-xs">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">
              Root Cause
            </p>
            <p className="mt-1 leading-relaxed text-[var(--color-text)]">{issue.rootCause}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">
              Recommendation
            </p>
            <p className="mt-1 leading-relaxed text-[var(--color-text)]">{issue.recommendation}</p>
          </div>
          
          {commands && commands.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">
                Suggested Commands
              </p>
              <div className="mt-2 space-y-1.5">
                {commands.map((command) => (
                  <code
                    key={command}
                    className="block overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 font-mono text-[10px] text-[var(--color-text)]"
                  >
                    {command}
                  </code>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 border-t border-[var(--color-border)]/50 pt-3">
        <button
          type="button"
          onClick={() => onCopyCommands?.(commands)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg)]"
        >
          <FiCopy className="h-3.5 w-3.5" />
          Copy Commands
        </button>
      </div>
    </div>
  );
}

export default IssueCard;

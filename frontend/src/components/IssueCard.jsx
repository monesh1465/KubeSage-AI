import StatusBadge from "./StatusBadge";

function IssueCard({ issue }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={issue.severity} />
        <span className="text-xs text-[var(--color-secondary)]">{issue.namespace}</span>
      </div>
      <h4 className="font-medium text-[var(--color-text)]">{issue.type}</h4>
      <p className="mt-1 text-sm text-[var(--color-secondary)]">
        Resource: {issue.resource}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-[var(--color-text)]">
        {issue.recommendation}
      </p>
    </div>
  );
}

export default IssueCard;

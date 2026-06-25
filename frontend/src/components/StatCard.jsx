function StatCard({ title, value, icon: Icon, variant = "default" }) {
  const variantStyles = {
    default: "text-[var(--color-primary)]",
    success: "text-[var(--color-success)]",
    warning: "text-[var(--color-warning)]",
    danger: "text-[var(--color-danger)]",
  };

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[var(--color-secondary)]">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--color-text)]">
            {value}
          </p>
        </div>
        {Icon && (
          <div
            className={`rounded-lg bg-[var(--color-bg)] p-2.5 ${variantStyles[variant]}`}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}

export default StatCard;

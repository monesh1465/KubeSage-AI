function StatCard({ title, value, icon: Icon, variant = "default" }) {
  const variantStyles = {
    default: "text-[var(--color-primary)] bg-[var(--color-primary)]/8",
    success: "text-[var(--color-success)] bg-[var(--color-success)]/8",
    warning: "text-[var(--color-warning)] bg-[var(--color-warning)]/8",
    danger: "text-[var(--color-danger)] bg-[var(--color-danger)]/8",
  };

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-[var(--color-primary)]/20">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-secondary)]">
            {title}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--color-text)]">
            {value}
          </p>
        </div>
        {Icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${variantStyles[variant]}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}

export default StatCard;

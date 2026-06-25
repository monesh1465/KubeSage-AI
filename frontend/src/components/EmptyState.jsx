function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-card)] px-6 py-12 text-center">
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--color-bg)]">
          <Icon className="h-6 w-6 text-[var(--color-secondary)]" />
        </div>
      )}
      <h3 className="text-base font-semibold text-[var(--color-text)]">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm text-[var(--color-secondary)]">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export default EmptyState;

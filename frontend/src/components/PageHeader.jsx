function PageHeader({ title, description, actions }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]/90 p-4 shadow-[var(--shadow-card)] backdrop-blur-sm transition-shadow hover:shadow-[0_16px_40px_rgba(0,0,0,0.12)] md:p-5">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-[var(--color-text)] md:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-[var(--color-secondary)]">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export default PageHeader;

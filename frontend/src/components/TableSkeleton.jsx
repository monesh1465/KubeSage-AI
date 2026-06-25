function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="animate-pulse overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg)] px-5 py-3">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, index) => (
            <div key={index} className="h-3 flex-1 rounded bg-[var(--color-border)]" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-4 px-5 py-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={colIndex} className="h-3 flex-1 rounded bg-[var(--color-border)]" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default TableSkeleton;

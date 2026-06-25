function LoadingCard({ lines = 3 }) {
  return (
    <div className="animate-pulse rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-5">
      <div className="mb-4 h-4 w-1/3 rounded bg-[var(--color-border)]" />
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="mb-2 h-3 rounded bg-[var(--color-border)]"
          style={{ width: `${100 - index * 15}%` }}
        />
      ))}
    </div>
  );
}

export default LoadingCard;

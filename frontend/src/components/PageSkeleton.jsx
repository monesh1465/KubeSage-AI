import LoadingCard from "./LoadingCard";

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse space-y-2">
        <div className="h-8 w-48 rounded bg-[var(--color-border)]" />
        <div className="h-4 w-72 rounded bg-[var(--color-border)]" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <LoadingCard key={index} lines={2} />
        ))}
      </div>
      <LoadingCard lines={6} />
    </div>
  );
}

export default PageSkeleton;

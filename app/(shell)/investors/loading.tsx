import { Skeleton } from "@/components/ui/skeleton";

export default function InvestorsLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 pb-16 pt-8 md:px-6">
      <div className="flex flex-col gap-4 border-b border-border/60 pb-8 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-10 w-56 rounded-lg" />
          <Skeleton className="h-4 w-full max-w-xl rounded-lg" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="space-y-2 rounded-xl border border-border/80 bg-card p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

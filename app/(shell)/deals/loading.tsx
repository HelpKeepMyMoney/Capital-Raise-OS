import { Skeleton } from "@/components/ui/skeleton";

export default function DealsLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 pb-16 pt-8 md:px-6">
      <div className="flex flex-col gap-4 border-b border-border/60 pb-8 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-10 w-48 rounded-lg" />
          <Skeleton className="h-4 w-full max-w-xl rounded-lg" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
      </div>
      <div className="grid gap-5">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

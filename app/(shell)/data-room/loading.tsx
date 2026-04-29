import { Skeleton } from "@/components/ui/skeleton";

export default function DataRoomLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 pb-16 pt-8 md:px-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-64 rounded-lg" />
        <Skeleton className="h-4 w-full max-w-2xl rounded-lg" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="min-h-[420px] rounded-2xl" />
      </div>
    </div>
  );
}

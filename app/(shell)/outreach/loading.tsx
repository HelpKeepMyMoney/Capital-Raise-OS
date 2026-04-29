import { Skeleton } from "@/components/ui/skeleton";

export default function OutreachLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 pb-16 pt-8 md:px-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-40 rounded-lg" />
        <Skeleton className="h-4 w-full max-w-md rounded-lg" />
      </div>
      <Skeleton className="h-96 w-full rounded-2xl" />
    </div>
  );
}

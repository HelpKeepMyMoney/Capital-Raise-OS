import { Skeleton } from "@/components/ui/skeleton";

export default function PortalLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 pb-16 pt-8 md:px-6">
      <Skeleton className="h-9 w-56 rounded-lg" />
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}

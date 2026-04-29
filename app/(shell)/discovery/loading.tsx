import { Skeleton } from "@/components/ui/skeleton";

export default function DiscoveryLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 pb-16 pt-8 md:px-6">
      <Skeleton className="h-10 w-48 rounded-lg" />
      <Skeleton className="h-[480px] w-full rounded-2xl" />
    </div>
  );
}

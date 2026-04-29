import Link from "next/link";
import { BarChart3, Plus, Upload } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DealRoomHeader(props: { canManage: boolean }) {
  return (
    <div className="flex flex-col gap-6 border-b border-border/60 pb-8 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl space-y-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Deal Room
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground">
          Launch offerings, manage investor interest, and close capital faster.
        </p>
      </div>
      {props.canManage ? (
        <div className="flex flex-wrap gap-2">
          <Link href="/deals/new" className={cn(buttonVariants(), "rounded-xl shadow-sm")}>
            <Plus className="mr-2 size-4" />
            New offering
          </Link>
          <Link
            href="/investors"
            className={cn(buttonVariants({ variant: "outline" }), "rounded-xl")}
          >
            <Upload className="mr-2 size-4" />
            Import investors
          </Link>
          <Link
            href="/analytics"
            className={cn(buttonVariants({ variant: "secondary" }), "rounded-xl")}
          >
            <BarChart3 className="mr-2 size-4" />
            View analytics
          </Link>
        </div>
      ) : null}
    </div>
  );
}

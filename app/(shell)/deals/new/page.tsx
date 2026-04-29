import Link from "next/link";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { getMembership } from "@/lib/firestore/queries";
import { NewDealForm } from "@/components/new-deal-form";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function NewDealPage() {
  const ctx = await requireOrgSession();
  if (!ctx) redirect("/login");
  const m = await getMembership(ctx.orgId, ctx.user.uid);
  if (!m || !canEditOrgData(m.role)) {
    redirect("/deals");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-2">
        <Link href="/deals" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit px-0")}>
          ← Back to deal room
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">New offering</h1>
        <p className="text-sm text-foreground/85">
          Create a raise record your team can share with investors.
        </p>
      </div>
      <NewDealForm />
    </div>
  );
}

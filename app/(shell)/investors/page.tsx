import { requireOrgSession } from "@/lib/auth/session";
import { listInvestors } from "@/lib/firestore/queries";
import { InvestorsBoard } from "@/components/investors-board";
import { redirect } from "next/navigation";

export default async function InvestorsPage() {
  const ctx = await requireOrgSession();
  if (!ctx) redirect("/login");
  const investors = await listInvestors(ctx.orgId);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Investor CRM</h1>
        <p className="mt-1 text-muted-foreground">
          Pipeline intelligence with Kanban and spreadsheet views.
        </p>
      </div>
      <InvestorsBoard initial={investors} />
    </div>
  );
}

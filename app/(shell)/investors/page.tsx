import { redirectInvestorGuestsFromRaiseTools } from "@/lib/auth/guest-routes";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import {
  getMembership,
  listDeals,
  listInvestors,
  listOrganizationMembers,
} from "@/lib/firestore/queries";
import { PipelineStageSchema, type PipelineStage } from "@/lib/firestore/types";
import { InvestorsBoard, type MainTab } from "@/components/investors-board";
import { Suspense } from "react";
import { redirect } from "next/navigation";

export default async function InvestorsPage(props: {
  searchParams: Promise<{ archived?: string; stage?: string; filter?: string; tab?: string }>;
}) {
  const ctx = await requireOrgSession();
  if (!ctx) redirect("/login");

  const sp = await props.searchParams;
  const includeArchived = sp.archived === "1";

  const [investors, membership, members, deals] = await Promise.all([
    listInvestors(ctx.orgId, { includeArchived }),
    getMembership(ctx.orgId, ctx.user.uid),
    listOrganizationMembers(ctx.orgId),
    listDeals(ctx.orgId),
  ]);
  redirectInvestorGuestsFromRaiseTools(membership?.role);
  const canManage = membership != null && canEditOrgData(membership.role);

  const stageParsed = sp.stage ? PipelineStageSchema.safeParse(sp.stage) : null;
  const urlStage: PipelineStage | undefined = stageParsed?.success ? stageParsed.data : undefined;

  const tabRaw = sp.tab;
  const initialTab: MainTab =
    tabRaw === "table"
      ? "table"
      : tabRaw === "map"
        ? "map"
        : tabRaw === "list"
          ? "list"
          : tabRaw === "calendar"
            ? "calendar"
            : "board";

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/35 pb-16 md:rounded-3xl md:border md:border-border/40 md:bg-muted/25">
      <div className="mx-auto max-w-[1720px] px-3 py-8 md:px-8 md:py-10">
        <Suspense
          fallback={
            <div className="rounded-2xl border border-dashed border-border/80 bg-card/60 p-12 text-center text-sm text-muted-foreground backdrop-blur-sm">
              Loading CRM…
            </div>
          }
        >
          <InvestorsBoard
            initial={investors}
            members={members}
            deals={deals.map((d) => ({ id: d.id, name: d.name }))}
            canManage={canManage}
            showArchived={includeArchived}
            urlStage={urlStage}
            urlFilter={sp.filter}
            initialTab={initialTab}
          />
        </Suspense>
      </div>
    </div>
  );
}


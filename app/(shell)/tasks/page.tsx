import { redirectInvestorGuestsFromRaiseTools } from "@/lib/auth/guest-routes";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { getMembership, listClosedTasks, listOpenTasks } from "@/lib/firestore/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TasksPanel } from "@/components/tasks-panel";
import { redirect } from "next/navigation";

export default async function TasksPage(props: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const ctx = await requireOrgSession();
  if (!ctx) redirect("/login");

  const sp = await props.searchParams;
  const view = sp.filter === "closed" ? "closed" : "open";

  const [tasks, membership] = await Promise.all([
    view === "closed" ? listClosedTasks(ctx.orgId) : listOpenTasks(ctx.orgId),
    getMembership(ctx.orgId, ctx.user.uid),
  ]);
  redirectInvestorGuestsFromRaiseTools(membership?.role);
  const canManage = membership != null && canEditOrgData(membership.role);

  const rows = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    dueAt: t.dueAt,
    status: t.status,
    linkedInvestorId: t.linkedInvestorId,
    isInvestorFollowUp: t.isInvestorFollowUp,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Tasks & automations</h1>
        <p className="mt-1 text-foreground/85">
          Follow-ups, meeting tasks, and scheduled playbooks powered by Cloud Functions.
        </p>
      </div>

      <TasksPanel tasks={rows} canManage={canManage} view={view} />

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Scheduled automations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 font-sans text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Weekly fundraising digest</span> — when Firebase
            Functions are deployed, the <code className="text-xs">weeklyFundraisingDigest</code> schedule
            runs every Monday at 09:00 and queues a &quot;Weekly fundraising report&quot; task per
            organization (see <code className="text-xs">functions/src/index.ts</code>).
          </p>
          <p>
            Local <code className="text-xs">next dev</code> does not execute Cloud Scheduler; deploy functions
            to Firebase for that job to run in production.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

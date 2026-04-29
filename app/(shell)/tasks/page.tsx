import { redirectInvestorGuestsFromRaiseTools } from "@/lib/auth/guest-routes";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { getMembership, listClosedTasks, listOpenTasks } from "@/lib/firestore/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TasksPanel } from "@/components/tasks-panel";
import { redirect } from "next/navigation";

export default async function TasksPage(props: {
  searchParams: Promise<{ filter?: string; due?: string }>;
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

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  let filtered = tasks;
  if (view === "open" && sp.due === "today") {
    filtered = tasks.filter(
      (t) => t.dueAt != null && t.dueAt >= start.getTime() && t.dueAt <= end.getTime(),
    );
  } else if (view === "open" && sp.due === "overdue") {
    filtered = tasks.filter((t) => t.dueAt != null && t.dueAt < start.getTime());
  }

  const rows = filtered.map((t) => ({
    id: t.id,
    title: t.title,
    dueAt: t.dueAt,
    status: t.status,
    linkedInvestorId: t.linkedInvestorId,
    isInvestorFollowUp: t.isInvestorFollowUp,
    taskType: t.taskType,
    taskPriority: t.taskPriority,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">Tasks</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Follow-ups, closing checklists, and workflow-generated actions across your raise.
        </p>
      </div>

      <TasksPanel tasks={rows} canManage={canManage} view={view} />

      <Card className="rounded-2xl border-border/80 shadow-md">
        <CardHeader>
          <CardTitle className="font-heading text-base">Automations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Expressing interest on a deal creates a <strong>follow-up</strong> task due in three days for
            the sponsor team. Additional workflow hooks can extend this pattern.
          </p>
          <p>
            Weekly digests and scheduler jobs run when Firebase Functions are deployed (see{" "}
            <code className="text-xs">functions/src/index.ts</code>).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

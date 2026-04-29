import { redirectInvestorGuestsFromRaiseTools } from "@/lib/auth/guest-routes";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import {
  getMembership,
  listClosedTasks,
  listDataRoomsForOrganization,
  listDeals,
  listInvestors,
  listOpenTasks,
  listOrganizationMembers,
  listUpcomingMeetings,
} from "@/lib/firestore/queries";
import { TasksWorkflowClient } from "@/components/tasks/tasks-workflow-client";
import { redirect } from "next/navigation";
import { computeTaskMetrics } from "@/lib/tasks/metrics";
import { buildSmartSuggestions } from "@/lib/tasks/smart-suggestions";

export default async function TasksPage() {
  const ctx = await requireOrgSession();
  if (!ctx) redirect("/login");

  const [
    openTasks,
    closedTasks,
    membership,
    members,
    deals,
    investors,
    dataRooms,
    meetings,
  ] = await Promise.all([
    listOpenTasks(ctx.orgId),
    listClosedTasks(ctx.orgId),
    getMembership(ctx.orgId, ctx.user.uid),
    listOrganizationMembers(ctx.orgId),
    listDeals(ctx.orgId),
    listInvestors(ctx.orgId, { limit: 400 }),
    listDataRoomsForOrganization(ctx.orgId),
    listUpcomingMeetings(ctx.orgId, undefined, 40),
  ]);

  redirectInvestorGuestsFromRaiseTools(membership?.role);
  const canManage = membership != null && canEditOrgData(membership.role);

  const metrics = computeTaskMetrics(openTasks, closedTasks);
  const suggestions = buildSmartSuggestions({
    tasks: [...openTasks, ...closedTasks],
    investors,
    meetings,
  });

  const metricsCapped = openTasks.length >= 80 || closedTasks.length >= 80;

  const investorOptions = investors.map((inv) => ({
    id: inv.id,
    name:
      inv.name?.trim() ||
      [inv.firstName, inv.lastName].filter(Boolean).join(" ") ||
      "Investor",
  }));

  const dealOptions = deals.map((d) => ({
    id: d.id,
    name: d.name || "Deal",
  }));

  const dataRoomOptions = dataRooms.filter((r) => !r.archived).map((r) => ({
    id: r.id,
    name: r.name || "Data room",
  }));

  return (
    <TasksWorkflowClient
      openTasks={openTasks}
      closedTasks={closedTasks}
      members={members}
      investorOptions={investorOptions}
      dealOptions={dealOptions}
      dataRoomOptions={dataRoomOptions}
      meetings={meetings}
      suggestions={suggestions}
      metrics={metrics}
      metricsCapped={metricsCapped}
      currentUserId={ctx.user.uid}
      canManage={canManage}
    />
  );
}

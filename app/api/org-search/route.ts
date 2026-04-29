import { NextRequest, NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/auth/session";
import { listDeals, listInvestors, listOpenTasks } from "@/lib/firestore/queries";

export async function GET(req: NextRequest) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  if (!q.length) {
    return NextResponse.json({
      investors: [] as { id: string; name: string }[],
      deals: [] as { id: string; name: string }[],
      tasks: [] as { id: string; title: string }[],
    });
  }

  const [investors, deals, tasks] = await Promise.all([
    listInvestors(ctx.orgId, { limit: 200 }),
    listDeals(ctx.orgId),
    listOpenTasks(ctx.orgId, 60),
  ]);

  const m = (s: string | undefined) => (s ?? "").toLowerCase().includes(q);

  const investorsOut = investors
    .filter((i) => m(i.name) || m(i.email) || m(i.firm))
    .slice(0, 8)
    .map((i) => ({ id: i.id, name: i.name }));

  const dealsOut = deals
    .filter((d) => m(d.name))
    .slice(0, 8)
    .map((d) => ({ id: d.id, name: d.name }));

  const tasksOut = tasks
    .filter((t) => t.status === "open" && m(t.title))
    .slice(0, 8)
    .map((t) => ({ id: t.id, title: t.title }));

  return NextResponse.json({
    investors: investorsOut,
    deals: dealsOut,
    tasks: tasksOut,
  });
}

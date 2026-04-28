import { requireOrgSession } from "@/lib/auth/session";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { redirect } from "next/navigation";
import { format } from "date-fns";

export default async function TasksPage() {
  const ctx = await requireOrgSession();
  if (!ctx) redirect("/login");
  const db = getAdminFirestore();
  const snap = await db
    .collection(col.tasks)
    .where("organizationId", "==", ctx.orgId)
    .orderBy("dueAt", "asc")
    .limit(80)
    .get();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Tasks & automations</h1>
        <p className="mt-1 text-muted-foreground">
          Follow-ups, meeting tasks, and scheduled playbooks powered by Cloud Functions.
        </p>
      </div>
      <Card className="border-white/10 bg-card/60 backdrop-blur-md">
        <CardHeader>
          <CardTitle>Open tasks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {snap.docs.map((doc) => {
            const t = doc.data() as { title?: string; dueAt?: number; status?: string };
            return (
              <div
                key={doc.id}
                className="flex items-start gap-3 rounded-lg border border-white/10 p-3"
              >
                <Checkbox checked={t.status === "done"} disabled />
                <div>
                  <p className="font-medium">{t.title}</p>
                  {t.dueAt ? (
                    <p className="text-xs text-muted-foreground">
                      Due {format(t.dueAt, "MMM d, yyyy")}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
          {snap.empty ? <p className="text-sm text-muted-foreground">No tasks yet.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}

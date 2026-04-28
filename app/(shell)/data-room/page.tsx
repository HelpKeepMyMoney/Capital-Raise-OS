import { requireOrgSession } from "@/lib/auth/session";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { redirect } from "next/navigation";

export default async function DataRoomPage() {
  const ctx = await requireOrgSession();
  if (!ctx) redirect("/login");
  const db = getAdminFirestore();
  const rooms = await db
    .collection(col.dataRooms)
    .where("organizationId", "==", ctx.orgId)
    .limit(20)
    .get();
  const docs = await db
    .collection(col.documents)
    .where("organizationId", "==", ctx.orgId)
    .limit(50)
    .get();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Data room</h1>
        <p className="mt-1 text-muted-foreground">
          Secure investor portal with NDA gates, permissions, and view analytics.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-white/10 bg-card/60 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-base">Rooms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {rooms.empty ? (
              <p className="text-muted-foreground">Create a room and upload documents via Firebase Storage.</p>
            ) : (
              rooms.docs.map((d) => {
                const x = d.data() as { name?: string; ndaRequired?: boolean };
                return (
                  <div key={d.id} className="flex items-center justify-between rounded-lg border border-white/10 p-3">
                    <span>{x.name ?? d.id}</span>
                    {x.ndaRequired ? <Badge>NDA</Badge> : <Badge variant="secondary">Open</Badge>}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-card/60 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-base">Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {docs.empty ? (
              <p className="text-muted-foreground">
                Files live under <code className="text-xs">orgs/{`{orgId}`}/...</code> with signed URLs from the API.
              </p>
            ) : (
              docs.docs.map((d) => {
                const x = d.data() as { name?: string; kind?: string; viewCount?: number };
                return (
                  <div key={d.id} className="flex justify-between rounded-lg border border-white/10 p-3">
                    <div>
                      <p className="font-medium">{x.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{x.kind}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{x.viewCount ?? 0} views</span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

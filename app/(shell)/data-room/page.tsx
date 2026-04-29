import { filterDataRoomsForMember, filterDocumentsForMember } from "@/lib/auth/investor-access";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { getMembership } from "@/lib/firestore/queries";
import { DataRoomClient } from "@/components/data-room-client";
import { redirect } from "next/navigation";

export default async function DataRoomPage() {
  const ctx = await requireOrgSession();
  if (!ctx) redirect("/login");
  const membership = await getMembership(ctx.orgId, ctx.user.uid);
  const canManage = membership != null && canEditOrgData(membership.role);

  const db = getAdminFirestore();
  const [roomsSnap, docsSnap] = await Promise.all([
    db.collection(col.dataRooms).where("organizationId", "==", ctx.orgId).limit(20).get(),
    db.collection(col.documents).where("organizationId", "==", ctx.orgId).limit(50).get(),
  ]);

  let rooms = roomsSnap.docs.map((d) => {
    const x = d.data() as { name?: string; ndaRequired?: boolean };
    return {
      id: d.id,
      name: x.name ?? d.id,
      ndaRequired: Boolean(x.ndaRequired),
    };
  });

  let documents = docsSnap.docs.map((d) => {
    const x = d.data() as {
      name?: string;
      kind?: string;
      dataRoomId?: string;
      viewCount?: number;
    };
    return {
      id: d.id,
      name: x.name ?? d.id,
      kind: x.kind ?? "other",
      dataRoomId: x.dataRoomId ?? "",
      viewCount: x.viewCount,
    };
  });

  rooms = filterDataRoomsForMember(rooms, membership);
  documents = filterDocumentsForMember(documents, membership);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Data room</h1>
        <p className="mt-1 text-foreground/85">
          Secure investor portal with NDA gates, permissions, and view analytics.
        </p>
      </div>
      <DataRoomClient rooms={rooms} documents={documents} canManage={canManage} />
    </div>
  );
}

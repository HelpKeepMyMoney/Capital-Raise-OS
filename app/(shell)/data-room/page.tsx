import { filterDataRoomsForMember, filterDocumentsForMember } from "@/lib/auth/investor-access";
import { canEditOrgData } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { DataRoomShell } from "@/components/data-room/data-room-shell";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { computeDataRoomMetrics } from "@/lib/data-room/metrics";
import type { InviteRow } from "@/lib/data-room/server-queries";
import {
  listDataRoomActivityFeed,
  listInvestorInvitationsForOrganization,
} from "@/lib/data-room/server-queries";
import type { SerializedDataRoom } from "@/components/data-room/types";
import type { SerializedRoomDocument } from "@/components/data-room/types";
import { col } from "@/lib/firestore/paths";
import type { Deal, RoomDocument as RoomDocType } from "@/lib/firestore/types";
import { listDeals, getDeal, getMembership } from "@/lib/firestore/queries";
import { redirect } from "next/navigation";

export default async function DataRoomPage() {
  const ctx = await requireOrgSession();
  if (!ctx) redirect("/login");
  const membership = await getMembership(ctx.orgId, ctx.user.uid);
  const canManage = membership != null && canEditOrgData(membership.role);

  const db = getAdminFirestore();
  const [roomsSnap, docsSnap] = await Promise.all([
    db.collection(col.dataRooms).where("organizationId", "==", ctx.orgId).limit(120).get(),
    db.collection(col.documents).where("organizationId", "==", ctx.orgId).limit(500).get(),
  ]);

  const [metrics, invitationsOrEmpty, activityPreviewOrEmpty] = await Promise.all([
    computeDataRoomMetrics(ctx.orgId),
    canManage ? listInvestorInvitationsForOrganization(ctx.orgId, 120) : Promise.resolve([] as InviteRow[]),
    canManage ? listDataRoomActivityFeed(ctx.orgId, 50) : Promise.resolve([]),
  ]);

  let roomsRaw: SerializedDataRoom[] = roomsSnap.docs.map((d) => {
    const x = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      name: typeof x.name === "string" ? x.name : d.id,
      dealId: typeof x.dealId === "string" ? x.dealId : undefined,
      ndaRequired: Boolean(x.ndaRequired),
      description: typeof x.description === "string" ? x.description : undefined,
      visibility: x.visibility === "invite_only" || x.visibility === "open" ? x.visibility : undefined,
      archived: Boolean(x.archived),
      ndaTemplateRef:
        typeof x.ndaTemplateRef === "string" ? x.ndaTemplateRef : x.ndaTemplateRef === null ? null : undefined,
      downloadAllowed: x.downloadAllowed === undefined ? undefined : Boolean(x.downloadAllowed),
      watermarkDocs: x.watermarkDocs === undefined ? undefined : Boolean(x.watermarkDocs),
      expiresAt: typeof x.expiresAt === "number" ? x.expiresAt : undefined,
      requireLogin: x.requireLogin === undefined ? undefined : Boolean(x.requireLogin),
      welcomeMessage: typeof x.welcomeMessage === "string" ? x.welcomeMessage : undefined,
      createdAt: typeof x.createdAt === "number" ? x.createdAt : undefined,
      updatedAt: typeof x.updatedAt === "number" ? x.updatedAt : undefined,
    };
  });

  const rooms = filterDataRoomsForMember(roomsRaw, membership);

  let documents: SerializedRoomDocument[] = docsSnap.docs.map((d) => {
    const x = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      name: typeof x.name === "string" ? x.name : d.id,
      kind: (typeof x.kind === "string" ? x.kind : "other") as RoomDocType["kind"],
      dataRoomId: typeof x.dataRoomId === "string" ? x.dataRoomId : "",
      viewCount: typeof x.viewCount === "number" ? x.viewCount : undefined,
      lastViewedAt: typeof x.lastViewedAt === "number" ? x.lastViewedAt : undefined,
      sizeBytes: typeof x.sizeBytes === "number" ? x.sizeBytes : undefined,
      mimeType: typeof x.mimeType === "string" ? x.mimeType : undefined,
      createdByUid: typeof x.createdByUid === "string" ? x.createdByUid : undefined,
      version: typeof x.version === "number" ? x.version : 1,
      accessLevel:
        x.accessLevel === "invited" || x.accessLevel === "internal" || x.accessLevel === "vip"
          ? x.accessLevel
          : undefined,
      createdAt: typeof x.createdAt === "number" ? x.createdAt : undefined,
    };
  });

  documents = filterDocumentsForMember(documents, membership);

  const dealsList = await listDeals(ctx.orgId);

  const dealIdsNeeded = [...new Set(rooms.map((r) => r.dealId).filter(Boolean))] as string[];
  const roomDealMap: Record<string, Deal | null> = {};
  for (const did of dealIdsNeeded) {
    roomDealMap[did] = await getDeal(ctx.orgId, did);
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 pb-12 pt-6 md:px-6 lg:px-8">
      <DataRoomShell
        rooms={rooms}
        documents={documents}
        deals={dealsList.map((d) => ({
          id: d.id,
          name: d.name,
          targetRaise: d.targetRaise,
          minimumInvestment: d.minimumInvestment,
          closeDate: d.closeDate,
          status: d.status,
        }))}
        roomDealMap={roomDealMap}
        metrics={metrics}
        invitations={invitationsOrEmpty}
        activityPreview={activityPreviewOrEmpty}
        canManage={canManage}
      />
    </div>
  );
}

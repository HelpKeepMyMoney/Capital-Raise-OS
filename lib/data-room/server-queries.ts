import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import type { EsignEnvelope, InvestorInvitation } from "@/lib/firestore/types";

export type InviteRow = Pick<
  InvestorInvitation,
  | "id"
  | "scope"
  | "dealIds"
  | "dataRoomIds"
  | "email"
  | "expiresAt"
  | "createdAt"
  | "revokedAt"
  | "acceptedAt"
  | "message"
  | "linkedInvestorId"
> & {
  ndaSignedAt?: number;
  ndaEnvelopeId?: string;
};

export async function listInvestorInvitationsForOrganization(orgId: string, limit = 100): Promise<InviteRow[]> {
  const db = getAdminFirestore();
  const [snap, envSnap] = await Promise.all([
    db
      .collection(col.investorInvitations)
      .where("organizationId", "==", orgId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get(),
    db.collection(col.esignEnvelopes).where("organizationId", "==", orgId).limit(500).get(),
  ]);

  const latestNdaByRoomAndEmail = new Map<string, { envelopeId: string; signedAt: number }>();
  for (const d of envSnap.docs) {
    const env = d.data() as Omit<EsignEnvelope, "id">;
    if (env.context.kind !== "data_room_nda") continue;
    if (env.status !== "completed") continue;
    const email = env.investorEmailNorm?.trim().toLowerCase();
    const roomId = env.context.dataRoomId?.trim();
    if (!email || !roomId) continue;
    const key = `${roomId}::${email}`;
    const signedAt = env.updatedAt ?? env.lastEventAt ?? env.createdAt ?? 0;
    const prev = latestNdaByRoomAndEmail.get(key);
    if (!prev || signedAt > prev.signedAt) {
      latestNdaByRoomAndEmail.set(key, { envelopeId: d.id, signedAt });
    }
  }

  return snap.docs.map((d) => {
    const row = d.data() as Omit<InvestorInvitation, "id">;
    const emailNorm = row.email?.trim().toLowerCase() ?? "";
    const roomIds = row.dataRoomIds ?? [];
    let ndaSignedAt: number | undefined;
    let ndaEnvelopeId: string | undefined;
    for (const roomId of roomIds) {
      const hit = latestNdaByRoomAndEmail.get(`${roomId}::${emailNorm}`);
      if (hit && (ndaSignedAt == null || hit.signedAt > ndaSignedAt)) {
        ndaSignedAt = hit.signedAt;
        ndaEnvelopeId = hit.envelopeId;
      }
    }

    return {
      id: d.id,
      scope: row.scope,
      dealIds: row.dealIds ?? [],
      dataRoomIds: roomIds,
      email: row.email,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      revokedAt: row.revokedAt,
      acceptedAt: row.acceptedAt,
      message: row.message,
      linkedInvestorId: typeof row.linkedInvestorId === "string" ? row.linkedInvestorId : undefined,
      ndaSignedAt,
      ndaEnvelopeId,
    };
  });
}

const DATA_ROOM_ACTIONS = new Set([
  "data_room.signed_url",
  "data_room.upload",
  "data_room.document_delete",
  "data_room.document_update",
  "data_room.create",
  "data_room.update",
]);

export type ActivityFeedItemDTO = {
  id: string;
  action: string;
  summary: string;
  createdAt: number;
};

function summarizeActivity(action: string, resource: string): string {
  switch (action) {
    case "data_room.signed_url":
      return "Document opened (signed URL)";
    case "data_room.upload":
      return "File uploaded";
    case "data_room.document_delete":
      return "Document removed";
    case "data_room.document_update":
      return "Document updated";
    case "data_room.create":
      return "Data room created";
    case "data_room.update":
      return "Room settings updated";
    default:
      return resource || action;
  }
}

/** Recent data-room audit events for sponsor Activity tab (Admin SDK). */
export async function listDataRoomActivityFeed(orgId: string, limit = 40): Promise<ActivityFeedItemDTO[]> {
  const db = getAdminFirestore();
  const since = Date.now() - 60 * 86400000;
  const snap = await db
    .collection(col.auditLogs)
    .where("organizationId", "==", orgId)
    .where("createdAt", ">=", since)
    .orderBy("createdAt", "desc")
    .limit(220)
    .get();

  const items: ActivityFeedItemDTO[] = [];
  for (const d of snap.docs) {
    const row = d.data() as { action?: string; resource?: string; createdAt?: number };
    const action = row.action ?? "";
    if (!DATA_ROOM_ACTIONS.has(action)) continue;
    items.push({
      id: d.id,
      action,
      summary: summarizeActivity(action, row.resource ?? ""),
      createdAt: row.createdAt ?? 0,
    });
    if (items.length >= limit) break;
  }
  return items;
}

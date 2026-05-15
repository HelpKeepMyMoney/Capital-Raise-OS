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
  | "acceptedUserId"
> & {
  ndaSignedAt?: number;
  ndaEnvelopeId?: string;
  /** In-flight room NDA (not completed). */
  ndaOpenEnvelopeId?: string;
  ndaOpenNextSigner?: "sponsor" | "investor";
  /** Latest guest “Request NDA” timestamp for this invite’s accepted user + room scope. */
  ndaRequestedAt?: number;
  /** Active signing links from the in-flight envelope (if still stored on the doc). */
  ndaOpenSponsorSigningUrl?: string | null;
  ndaOpenInvestorSigningUrl?: string | null;
};

export async function listInvestorInvitationsForOrganization(orgId: string, limit = 100): Promise<InviteRow[]> {
  const db = getAdminFirestore();
  const [snap, envSnap, reqSnap] = await Promise.all([
    db
      .collection(col.investorInvitations)
      .where("organizationId", "==", orgId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get(),
    db.collection(col.esignEnvelopes).where("organizationId", "==", orgId).limit(500).get(),
    db.collection(col.roomNdaInvestorRequests).where("organizationId", "==", orgId).limit(300).get(),
  ]);

  const latestNdaByRoomAndEmail = new Map<string, { envelopeId: string; signedAt: number }>();
  const openNdaByRoomAndEmail = new Map<
    string,
    {
      envelopeId: string;
      nextSignerRole: "sponsor" | "investor" | undefined;
      updatedAt: number;
      sponsorSigningUrl: string | null;
      investorSigningUrl: string | null;
    }
  >();

  for (const d of envSnap.docs) {
    const env = d.data() as Omit<EsignEnvelope, "id">;
    if (env.context.kind !== "data_room_nda") continue;
    const email = env.investorEmailNorm?.trim().toLowerCase();
    const roomId = env.context.dataRoomId?.trim();
    if (!email || !roomId) continue;
    const key = `${roomId}::${email}`;
    const updatedAt = env.updatedAt ?? env.lastEventAt ?? env.createdAt ?? 0;

    if (env.status === "completed") {
      const signedAt = env.updatedAt ?? env.lastEventAt ?? env.createdAt ?? 0;
      const prev = latestNdaByRoomAndEmail.get(key);
      if (!prev || signedAt > prev.signedAt) {
        latestNdaByRoomAndEmail.set(key, { envelopeId: d.id, signedAt });
      }
      continue;
    }

    if (env.status === "declined" || env.status === "error") continue;

    const next = env.nextSignerRole === "sponsor" || env.nextSignerRole === "investor" ? env.nextSignerRole : undefined;
    const sponsorSigningUrl =
      typeof env.sponsorSigningUrl === "string" && env.sponsorSigningUrl.trim().length > 0
        ? env.sponsorSigningUrl.trim()
        : null;
    const investorSigningUrl =
      typeof env.investorSigningUrl === "string" && env.investorSigningUrl.trim().length > 0
        ? env.investorSigningUrl.trim()
        : null;
    const prevOpen = openNdaByRoomAndEmail.get(key);
    if (!prevOpen || updatedAt > prevOpen.updatedAt) {
      openNdaByRoomAndEmail.set(key, {
        envelopeId: d.id,
        nextSignerRole: next,
        updatedAt,
        sponsorSigningUrl,
        investorSigningUrl,
      });
    }
  }

  const requestAtByUidRoom = new Map<string, number>();
  for (const d of reqSnap.docs) {
    const x = d.data() as { investorUid?: string; roomId?: string; lastRequestedAt?: unknown };
    const uid = typeof x.investorUid === "string" ? x.investorUid : "";
    const rid = typeof x.roomId === "string" ? x.roomId : "";
    const ts = x.lastRequestedAt;
    if (!uid || !rid || typeof ts !== "number") continue;
    const k = `${uid}::${rid}`;
    const prev = requestAtByUidRoom.get(k);
    if (!prev || ts > prev) requestAtByUidRoom.set(k, ts);
  }

  return snap.docs.map((d) => {
    const row = d.data() as Omit<InvestorInvitation, "id">;
    const emailNorm = row.email?.trim().toLowerCase() ?? "";
    const roomIds = row.dataRoomIds ?? [];
    let ndaSignedAt: number | undefined;
    let ndaEnvelopeId: string | undefined;
    let ndaOpenEnvelopeId: string | undefined;
    let ndaOpenNextSigner: "sponsor" | "investor" | undefined;
    let ndaOpenSponsorSigningUrl: string | null | undefined;
    let ndaOpenInvestorSigningUrl: string | null | undefined;
    let ndaRequestedAt: number | undefined;
    const acceptedUid = typeof row.acceptedUserId === "string" ? row.acceptedUserId : undefined;

    let bestOpen:
      | {
          envelopeId: string;
          nextSignerRole: "sponsor" | "investor" | undefined;
          updatedAt: number;
          sponsorSigningUrl: string | null;
          investorSigningUrl: string | null;
        }
      | undefined;

    for (const roomId of roomIds) {
      const hit = latestNdaByRoomAndEmail.get(`${roomId}::${emailNorm}`);
      if (hit && (ndaSignedAt == null || hit.signedAt > ndaSignedAt)) {
        ndaSignedAt = hit.signedAt;
        ndaEnvelopeId = hit.envelopeId;
      }
      const open = openNdaByRoomAndEmail.get(`${roomId}::${emailNorm}`);
      if (open && (!bestOpen || open.updatedAt > bestOpen.updatedAt)) {
        bestOpen = open;
      }
      if (acceptedUid) {
        const rq = requestAtByUidRoom.get(`${acceptedUid}::${roomId}`);
        if (rq != null && (ndaRequestedAt == null || rq > ndaRequestedAt)) {
          ndaRequestedAt = rq;
        }
      }
    }
    if (bestOpen) {
      ndaOpenEnvelopeId = bestOpen.envelopeId;
      ndaOpenNextSigner = bestOpen.nextSignerRole;
      ndaOpenSponsorSigningUrl = bestOpen.sponsorSigningUrl;
      ndaOpenInvestorSigningUrl = bestOpen.investorSigningUrl;
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
      acceptedUserId: acceptedUid,
      ndaSignedAt,
      ndaEnvelopeId,
      ndaOpenEnvelopeId,
      ndaOpenNextSigner,
      ndaOpenSponsorSigningUrl,
      ndaOpenInvestorSigningUrl,
      ndaRequestedAt,
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

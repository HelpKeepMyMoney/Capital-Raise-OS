import type { Firestore } from "firebase-admin/firestore";
import { col } from "@/lib/firestore/paths";
import type { EsignEnvelope, SigningRequestStatus } from "@/lib/firestore/types";

export type RoomNdaEnvelopeListItem = {
  id: string;
  investorEmail: string;
  investorName: string | null;
  status: SigningRequestStatus;
  nextSignerRole: "sponsor" | "investor" | null;
  sponsorSigningUrl: string | null;
  investorSigningUrl: string | null;
  createdAt: number;
  updatedAt: number;
  createdByUid: string;
};

/** Staff-only: all native data-room NDA envelopes for a single room (org-scoped scan). */
export async function listDataRoomNdaEnvelopesForRoom(
  db: Firestore,
  organizationId: string,
  roomId: string,
): Promise<RoomNdaEnvelopeListItem[]> {
  const rid = roomId.trim();
  if (!rid) return [];

  const snap = await db
    .collection(col.esignEnvelopes)
    .where("organizationId", "==", organizationId)
    .limit(500)
    .get();

  const out: RoomNdaEnvelopeListItem[] = [];

  for (const d of snap.docs) {
    const env = d.data() as Omit<EsignEnvelope, "id">;
    if (env.context.kind !== "data_room_nda") continue;
    const docRoom = typeof env.context.dataRoomId === "string" ? env.context.dataRoomId.trim() : "";
    if (docRoom !== rid) continue;

    const email = (env.investorEmailNorm ?? env.investorEmail)?.trim().toLowerCase() ?? "";
    const sponsorSigningUrl =
      typeof env.sponsorSigningUrl === "string" && env.sponsorSigningUrl.trim().length > 0
        ? env.sponsorSigningUrl.trim()
        : null;
    const investorSigningUrl =
      typeof env.investorSigningUrl === "string" && env.investorSigningUrl.trim().length > 0
        ? env.investorSigningUrl.trim()
        : null;

    const next: "sponsor" | "investor" | null =
      env.nextSignerRole === "sponsor" || env.nextSignerRole === "investor" ? env.nextSignerRole : null;

    out.push({
      id: d.id,
      investorEmail: email || "(unknown)",
      investorName: typeof env.investorName === "string" && env.investorName.trim() ? env.investorName.trim() : null,
      status: env.status,
      nextSignerRole: next,
      sponsorSigningUrl,
      investorSigningUrl,
      createdAt: env.createdAt ?? 0,
      updatedAt: env.updatedAt ?? env.lastEventAt ?? env.createdAt ?? 0,
      createdByUid: typeof env.createdByUid === "string" ? env.createdByUid : "",
    });
  }

  out.sort((a, b) => b.createdAt - a.createdAt);
  return out;
}

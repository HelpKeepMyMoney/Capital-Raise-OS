import type { Firestore } from "firebase-admin/firestore";
import { col } from "@/lib/firestore/paths";
import type { EsignEnvelope } from "@/lib/firestore/types";

/** Lowercase trim for matching MNDA request `investorEmail`. */
export function normalizeInvestorEmailForNda(email: string | undefined | null): string {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

/**
 * Room IDs where this investor has a completed native e-sign NDA for the org, or legacy MNDA row.
 */
export async function listInvestorCompletedNdaRoomIds(
  db: Firestore,
  organizationId: string,
  investorEmailNorm: string,
): Promise<Set<string>> {
  const out = new Set<string>();
  if (!investorEmailNorm) return out;

  const legacy = await db
    .collection(col.mndaSigningRequests)
    .where("organizationId", "==", organizationId)
    .where("investorEmail", "==", investorEmailNorm)
    .where("status", "==", "completed")
    .limit(200)
    .get();

  for (const d of legacy.docs) {
    const dataRoomId = d.data()?.dataRoomId;
    if (typeof dataRoomId === "string" && dataRoomId.length > 0) out.add(dataRoomId);
  }

  const snap = await db
    .collection(col.esignEnvelopes)
    .where("organizationId", "==", organizationId)
    .where("investorEmailNorm", "==", investorEmailNorm)
    .limit(300)
    .get();

  for (const d of snap.docs) {
    const x = d.data() as EsignEnvelope;
    if (x.context.kind !== "data_room_nda") continue;
    if (typeof x.context.dataRoomId !== "string" || x.context.dataRoomId.length === 0) continue;
    if (x.status === "completed") {
      out.add(x.context.dataRoomId);
      continue;
    }
    if (typeof x.investorSignedAt === "number" && x.investorSignedAt > 0) {
      out.add(x.context.dataRoomId);
    }
  }
  return out;
}

export type InvestorNdaCompletion = {
  envelopeId: string;
  signedAt: number;
};

/** Latest completed native NDA envelope per room for this investor email. */
export async function listInvestorLatestCompletedNdaByRoom(
  db: Firestore,
  organizationId: string,
  investorEmailNorm: string,
): Promise<Map<string, InvestorNdaCompletion>> {
  const out = new Map<string, InvestorNdaCompletion>();
  if (!investorEmailNorm) return out;

  const snap = await db
    .collection(col.esignEnvelopes)
    .where("organizationId", "==", organizationId)
    .where("investorEmailNorm", "==", investorEmailNorm)
    .where("status", "==", "completed")
    .limit(300)
    .get();

  for (const d of snap.docs) {
    const x = d.data() as EsignEnvelope;
    if (x.context.kind !== "data_room_nda") continue;
    const roomId = x.context.dataRoomId;
    if (typeof roomId !== "string" || roomId.length === 0) continue;
    if (!x.finalPdfStoragePath?.trim()) continue;
    const signedAt = x.updatedAt ?? x.lastEventAt ?? x.createdAt ?? 0;
    const prev = out.get(roomId);
    if (!prev || signedAt > prev.signedAt) {
      out.set(roomId, { envelopeId: d.id, signedAt });
    }
  }
  return out;
}

/** In-flight native data-room NDA for this investor email (not yet completed). */
export type InvestorRoomNdaPendingState =
  | { kind: "sign_now"; signingUrl: string }
  | { kind: "await_sponsor"; /** Present when the investor has signed and the sponsor is next. */ investorStepCompletedAt?: number }
  | { kind: "no_actionable_envelope" };

/**
 * For each room id, resolve whether this investor may open `/sign?token=…` now, is waiting on the sponsor,
 * or has no matching incomplete envelope (e.g. sponsor has not created one yet).
 */
export async function resolveInvestorPendingDataRoomNdaForRooms(
  db: Firestore,
  organizationId: string,
  investorEmailNorm: string,
  roomIds: string[],
): Promise<Map<string, InvestorRoomNdaPendingState>> {
  const out = new Map<string, InvestorRoomNdaPendingState>();
  if (!investorEmailNorm || roomIds.length === 0) {
    for (const id of roomIds) out.set(id, { kind: "no_actionable_envelope" });
    return out;
  }

  const roomSet = new Set(roomIds);
  const snap = await db
    .collection(col.esignEnvelopes)
    .where("organizationId", "==", organizationId)
    .where("investorEmailNorm", "==", investorEmailNorm)
    .limit(300)
    .get();

  type Best = { env: EsignEnvelope; updatedAt: number };
  const bestByRoom = new Map<string, Best>();

  for (const d of snap.docs) {
    const env = { id: d.id, ...(d.data() as Omit<EsignEnvelope, "id">) } as EsignEnvelope;
    if (env.context.kind !== "data_room_nda") continue;
    const roomId = env.context.dataRoomId;
    if (typeof roomId !== "string" || !roomSet.has(roomId)) continue;
    if (env.status === "completed") continue;
    const updatedAt = env.updatedAt ?? env.lastEventAt ?? env.createdAt ?? 0;
    const prev = bestByRoom.get(roomId);
    if (!prev || updatedAt > prev.updatedAt) {
      bestByRoom.set(roomId, { env, updatedAt });
    }
  }

  for (const id of roomIds) {
    const best = bestByRoom.get(id);
    if (!best) {
      out.set(id, { kind: "no_actionable_envelope" });
      continue;
    }
    const env = best.env;
    if (env.nextSignerRole === "investor") {
      const url = typeof env.investorSigningUrl === "string" ? env.investorSigningUrl.trim() : "";
      if (url) {
        out.set(id, { kind: "sign_now", signingUrl: url });
        continue;
      }
    }
    if (env.nextSignerRole === "sponsor") {
      const investorStepCompletedAt =
        typeof env.investorSignedAt === "number" && env.investorSignedAt > 0 ? env.investorSignedAt : undefined;
      out.set(id, { kind: "await_sponsor", investorStepCompletedAt });
      continue;
    }
    out.set(id, { kind: "no_actionable_envelope" });
  }
  return out;
}

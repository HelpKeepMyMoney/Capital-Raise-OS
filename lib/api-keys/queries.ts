import { randomUUID } from "crypto";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import type { OrgApiKey } from "@/lib/firestore/types";
import {
  generateOrgApiKeySecret,
  hashOrgApiKey,
  orgApiKeyDisplayPrefix,
  safeCompareKeyHash,
} from "@/lib/api-keys/token";

export type OrgApiKeyListRow = Pick<
  OrgApiKey,
  "id" | "name" | "prefix" | "createdAt" | "createdByUid" | "revokedAt" | "lastUsedAt"
>;

export async function listOrgApiKeys(orgId: string): Promise<OrgApiKeyListRow[]> {
  const db = getAdminFirestore();
  const snap = await db
    .collection(col.orgApiKeys)
    .where("organizationId", "==", orgId)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();
  return snap.docs.map((d) => {
    const x = d.data() as Omit<OrgApiKey, "id">;
    return {
      id: d.id,
      name: x.name,
      prefix: x.prefix,
      createdAt: x.createdAt,
      createdByUid: x.createdByUid,
      revokedAt: x.revokedAt,
      lastUsedAt: x.lastUsedAt,
    };
  });
}

export async function createOrgApiKey(input: {
  organizationId: string;
  name: string;
  createdByUid: string;
}): Promise<{ key: OrgApiKeyListRow; secret: string }> {
  const name = input.name.trim();
  if (!name) throw new Error("Name is required");

  const secret = generateOrgApiKeySecret();
  const id = randomUUID();
  const now = Date.now();
  const row: OrgApiKey = {
    id,
    organizationId: input.organizationId,
    name,
    prefix: orgApiKeyDisplayPrefix(secret),
    keyHash: hashOrgApiKey(secret),
    createdByUid: input.createdByUid,
    createdAt: now,
  };

  const db = getAdminFirestore();
  await db.collection(col.orgApiKeys).doc(id).set(row);

  return {
    secret,
    key: {
      id,
      name,
      prefix: row.prefix,
      createdAt: now,
      createdByUid: input.createdByUid,
    },
  };
}

export async function revokeOrgApiKey(orgId: string, keyId: string): Promise<boolean> {
  const db = getAdminFirestore();
  const ref = db.collection(col.orgApiKeys).doc(keyId);
  const snap = await ref.get();
  if (!snap.exists) return false;
  const data = snap.data() as OrgApiKey;
  if (data.organizationId !== orgId) return false;
  if (data.revokedAt) return true;
  await ref.update({ revokedAt: Date.now() });
  return true;
}

export type ResolvedOrgApiKey = {
  keyId: string;
  organizationId: string;
};

/** Resolve Bearer / X-API-Key to org context. Returns null when missing or invalid. */
export async function resolveOrgApiKeyFromSecret(rawSecret: string): Promise<ResolvedOrgApiKey | null> {
  const trimmed = rawSecret.trim();
  if (!trimmed) return null;

  const candidateHash = hashOrgApiKey(trimmed);
  const db = getAdminFirestore();

  // Keys are looked up by prefix to limit scan; prefix is first 16 chars of raw secret.
  const prefix = orgApiKeyDisplayPrefix(trimmed);
  const snap = await db
    .collection(col.orgApiKeys)
    .where("prefix", "==", prefix)
    .limit(20)
    .get();

  for (const d of snap.docs) {
    const row = d.data() as OrgApiKey;
    if (row.revokedAt) continue;
    if (!safeCompareKeyHash(row.keyHash, candidateHash)) continue;
    await d.ref.update({ lastUsedAt: Date.now() }).catch(() => undefined);
    return { keyId: d.id, organizationId: row.organizationId };
  }

  // Fallback: legacy rows without revokedAt field — scan by hash only (slow path).
  const hashSnap = await db.collection(col.orgApiKeys).where("keyHash", "==", candidateHash).limit(5).get();
  for (const d of hashSnap.docs) {
    const row = d.data() as OrgApiKey;
    if (row.revokedAt) continue;
    if (!safeCompareKeyHash(row.keyHash, candidateHash)) continue;
    await d.ref.update({ lastUsedAt: Date.now() }).catch(() => undefined);
    return { keyId: d.id, organizationId: row.organizationId };
  }

  return null;
}

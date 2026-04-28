import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { randomUUID } from "crypto";

export async function writeAuditLog(input: {
  organizationId: string;
  actorId: string;
  action: string;
  resource: string;
  payload?: Record<string, unknown>;
}) {
  const db = getAdminFirestore();
  const id = randomUUID();
  await db.collection(col.auditLogs).doc(id).set({
    id,
    organizationId: input.organizationId,
    actorId: input.actorId,
    action: input.action,
    resource: input.resource,
    payload: input.payload ?? {},
    createdAt: Date.now(),
  });
}

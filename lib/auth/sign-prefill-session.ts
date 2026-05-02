import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";
import { canEditOrgData } from "@/lib/auth/rbac";
import { userHasStaffAccessToOrg } from "@/lib/auth/org-staff-access";
import { getAdminAuth } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import type { EsignEnvelope, EsignSignerRole } from "@/lib/firestore/types";
import type { Firestore } from "firebase-admin/firestore";

/**
 * UID for enriching user.* merge fields on GET sign-session when cookies match the envelope step.
 */
export async function resolvePrefillSessionUid(
  req: NextRequest,
  env: EsignEnvelope,
  role: EsignSignerRole,
): Promise<string | null> {
  const raw = req.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const dec = await getAdminAuth().verifySessionCookie(raw, true);
    const uid = dec.uid;
    const sessionEmail = dec.email?.trim().toLowerCase() ?? "";
    const ctx = env.context;

    if (role === "lp") {
      if (ctx.kind !== "deal_subscription") return null;
      return uid === ctx.userId ? uid : null;
    }

    if (role === "sponsor" && ctx.kind === "deal_subscription") {
      return (await userHasStaffAccessToOrg(uid, env.organizationId)) ? uid : null;
    }

    if (role === "sponsor") {
      const norm = env.sponsorEmailNorm?.trim().toLowerCase();
      if (norm && sessionEmail && sessionEmail === norm) return uid;
      return null;
    }

    if (role === "investor") {
      const norm = env.investorEmailNorm?.trim().toLowerCase();
      if (norm && sessionEmail && sessionEmail === norm) return uid;
      return null;
    }

    return null;
  } catch {
    return null;
  }
}

export async function findUserUidByEmailNorm(db: Firestore, emailNorm: string): Promise<string | null> {
  const norm = emailNorm.trim().toLowerCase();
  if (!norm) return null;
  const q = await db.collection(col.users).where("email", "==", norm).limit(1).get();
  const d = q.docs[0];
  return d?.id ?? null;
}

import type { Firestore } from "firebase-admin/firestore";
import { findUserUidByEmailNorm } from "@/lib/auth/sign-prefill-session";
import { fieldsForRole } from "@/lib/esign/field-validate";
import { loadTemplateForSigning } from "@/lib/esign/envelope-service";
import type {
  EsignEnvelope,
  EsignSignerRole,
  EsignTemplateField,
  Organization,
  UserDoc,
} from "@/lib/firestore/types";
import { getOrganization, getUserDoc } from "@/lib/firestore/queries";

function trimMap(entries: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(entries)) {
    const t = v.trim();
    if (t) out[k] = t;
  }
  return out;
}

export function buildOrgMergeFlat(org: Organization): Record<string, string> {
  const c = org.contact ?? {};
  const cp = c.contactPerson ?? {};
  return trimMap({
    "org.legalName": c.legalName ?? org.name ?? "",
    "org.street1": c.street1 ?? "",
    "org.street2": c.street2 ?? "",
    "org.city": c.city ?? "",
    "org.region": c.region ?? "",
    "org.postalCode": c.postalCode ?? "",
    "org.country": c.country ?? "",
    "org.phone": c.phone ?? "",
    "org.contact.name": cp.name ?? "",
    "org.contact.title": cp.title ?? "",
    "org.contact.email": cp.email ?? "",
    "org.contact.phone": cp.phone ?? "",
  });
}

export function buildUserMergeFlat(doc: UserDoc): Record<string, string> {
  return trimMap({
    "user.displayName": doc.displayName ?? "",
    "user.email": doc.email ?? "",
    "user.phone": doc.phone ?? "",
    "user.title": doc.title ?? "",
    "user.street1": doc.street1 ?? "",
    "user.street2": doc.street2 ?? "",
    "user.city": doc.city ?? "",
    "user.region": doc.region ?? "",
    "user.postalCode": doc.postalCode ?? "",
    "user.country": doc.country ?? "",
  });
}

export function mergePrefillWithClientForDefs(
  defs: EsignTemplateField[],
  serverPrefill: Record<string, string>,
  clientValues: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = { ...serverPrefill };
  for (const f of defs) {
    if (f.fieldType === "signature") continue;
    const raw = clientValues[f.id];
    if (raw != null && String(raw).trim() !== "") {
      out[f.id] = String(raw).trim();
    }
  }
  return out;
}

async function resolveUserUidForPrefill(
  db: Firestore,
  env: EsignEnvelope,
  role: EsignSignerRole,
  prefillSessionUid: string | null | undefined,
): Promise<string | null> {
  const ctx = env.context;
  if (role === "lp") {
    return ctx.kind === "deal_subscription" ? ctx.userId : null;
  }
  if (role === "sponsor") {
    if (ctx.kind === "deal_subscription") {
      return prefillSessionUid ?? null;
    }
    if (prefillSessionUid) return prefillSessionUid;
    if (env.sponsorEmailNorm) {
      return findUserUidByEmailNorm(db, env.sponsorEmailNorm);
    }
    return null;
  }
  if (role === "investor") {
    if (prefillSessionUid) return prefillSessionUid;
    if (env.investorEmailNorm) {
      return findUserUidByEmailNorm(db, env.investorEmailNorm);
    }
    return null;
  }
  return null;
}

function mergeKeyCandidatesForField(f: EsignTemplateField): string[] {
  const label = typeof f.label === "string" ? f.label.trim() : "";
  const tryKeys = [label, f.id].filter((k) => k.length > 0);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of tryKeys) {
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

function defUsesInvestorMergeKey(d: EsignTemplateField): boolean {
  return (
    d.id === "investor.name" ||
    d.id === "investor.email" ||
    d.label?.trim() === "investor.name" ||
    d.label?.trim() === "investor.email"
  );
}

function defUsesUserMergePrefix(d: EsignTemplateField): boolean {
  return d.id.startsWith("user.") || Boolean(d.label?.trim().startsWith("user."));
}

export async function buildSignFieldPrefill(
  db: Firestore,
  env: EsignEnvelope,
  role: EsignSignerRole,
  opts?: { prefillSessionUid?: string | null },
): Promise<Record<string, string>> {
  const prefillSessionUid = opts?.prefillSessionUid ?? null;

  const template = await loadTemplateForSigning(db, env.organizationId, env.signableTemplateId);
  if (!template) return {};

  const defs = fieldsForRole(template.esignFields, role).filter((f) => f.fieldType !== "signature");

  const mergeSource: Record<string, string> = {};

  const org = await getOrganization(env.organizationId);
  if (org) Object.assign(mergeSource, buildOrgMergeFlat(org));

  Object.assign(
    mergeSource,
    trimMap({
      "investor.name": env.investorName ?? "",
      "investor.email": env.investorEmail ?? env.investorEmailNorm ?? "",
    }),
  );

  const wantsUserKeys = defs.some(defUsesUserMergePrefix);
  const lpNeedsProfile =
    role === "lp" && env.context.kind === "deal_subscription" && defs.some(defUsesInvestorMergeKey);

  let profileDoc: (UserDoc & { id: string }) | null = null;
  if (wantsUserKeys || lpNeedsProfile) {
    const uid = await resolveUserUidForPrefill(db, env, role, prefillSessionUid);
    if (uid) profileDoc = await getUserDoc(uid);
  }

  if (profileDoc) {
    Object.assign(mergeSource, buildUserMergeFlat(profileDoc));
    if (role === "lp" && env.context.kind === "deal_subscription") {
      Object.assign(
        mergeSource,
        trimMap({
          "investor.name": env.investorName ?? profileDoc.displayName ?? "",
          "investor.email": env.investorEmail ?? env.investorEmailNorm ?? profileDoc.email ?? "",
        }),
      );
    }
  }

  const flat: Record<string, string> = {};
  for (const f of defs) {
    for (const k of mergeKeyCandidatesForField(f)) {
      const v = mergeSource[k];
      if (v != null && String(v).trim() !== "") {
        flat[f.id] = String(v).trim();
        break;
      }
    }
  }

  return flat;
}

import { randomUUID } from "crypto";
import { getAdminBucket } from "@/lib/firebase/admin";
import { col, dealCommitmentDocId, signingRequestDocId } from "@/lib/firestore/paths";
import type {
  DataRoom,
  EsignEnvelope,
  EsignEnvelopeContext,
  EsignSignerRole,
  SignableTemplate,
  SigningRequestStatus,
} from "@/lib/firestore/types";
import { mintEsignToken } from "@/lib/esign/tokens";
import { finalizePdfWithSignature } from "@/lib/esign/native/pdf";
import { buildSignFieldPrefill, mergePrefillWithClientForDefs } from "@/lib/esign/sign-prefill";
import { fieldsForRole, hasAssigneeFields, validateFieldPayload } from "@/lib/esign/field-validate";
import type { Firestore } from "firebase-admin/firestore";

const TOKEN_TTL_SEC = 14 * 24 * 3600;

function appBaseUrl(): string {
  const u = process.env.NEXT_PUBLIC_APP_URL?.trim()?.replace(/\/$/, "");
  return u && u.length > 0 ? u : "http://localhost:3000";
}

function signingUrlFromToken(token: string): string {
  return `${appBaseUrl()}/sign?token=${encodeURIComponent(token)}`;
}

export function envelopeWorkingPath(orgId: string, envelopeId: string) {
  return `orgs/${orgId}/esign/envelopes/${envelopeId}/working.pdf`;
}

export function envelopeFinalPath(orgId: string, envelopeId: string) {
  return `orgs/${orgId}/esign/envelopes/${envelopeId}/final.pdf`;
}

async function copyTemplatePdfToWorking(
  bucket: ReturnType<typeof getAdminBucket>,
  templatePath: string,
  workingPath: string,
): Promise<void> {
  const tmp = await bucket.file(templatePath).download();
  await bucket.file(workingPath).save(tmp[0], {
    contentType: "application/pdf",
    resumable: false,
  });
}

async function getTemplateRow(
  db: Firestore,
  orgId: string,
  templateId: string,
): Promise<SignableTemplate | null> {
  const snap = await db.collection(col.signableTemplates).doc(templateId).get();
  if (!snap.exists) return null;
  const t = snap.data() as SignableTemplate;
  if (t.organizationId !== orgId) return null;
  return { ...t, id: snap.id };
}

/** Active templates only — new envelopes and subscription flows must use this. */
export async function loadTemplate(
  db: Firestore,
  orgId: string,
  templateId: string,
): Promise<SignableTemplate | null> {
  const t = await getTemplateRow(db, orgId, templateId);
  if (!t || t.archived) return null;
  return t;
}

/** Includes archived rows so in-flight sign sessions still resolve field definitions. */
export async function loadTemplateForSigning(
  db: Firestore,
  orgId: string,
  templateId: string,
): Promise<SignableTemplate | null> {
  return getTemplateRow(db, orgId, templateId);
}

export async function readPdfBytes(
  bucket: ReturnType<typeof getAdminBucket>,
  storagePath: string,
): Promise<Uint8Array> {
  const [buf] = await bucket.file(storagePath).download();
  return new Uint8Array(buf);
}

export async function writePdfBytes(
  bucket: ReturnType<typeof getAdminBucket>,
  storagePath: string,
  bytes: Uint8Array,
): Promise<void> {
  await bucket.file(storagePath).save(Buffer.from(bytes), {
    contentType: "application/pdf",
    resumable: false,
  });
}

function newExp(): number {
  return Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC;
}

/** Firestore rejects `undefined` in document data (nested objects included). */
function stripUndefinedDeep(value: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    if (v === undefined) continue;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      out[k] = stripUndefinedDeep(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function roleForNext(
  template: SignableTemplate,
  kind: "data_room_nda" | "deal_subscription" | "ad_hoc",
): EsignSignerRole {
  if (kind === "deal_subscription") {
    return hasAssigneeFields(template.esignFields, "sponsor") ? "sponsor" : "lp";
  }
  return hasAssigneeFields(template.esignFields, "sponsor") ? "sponsor" : "investor";
}

export async function createNdaEnvelope(params: {
  db: Firestore;
  organizationId: string;
  room: DataRoom;
  template: SignableTemplate;
  createdByUid: string;
  sponsorEmailNorm: string;
  investorEmail: string;
  investorName: string;
}): Promise<{ envelope: EsignEnvelope; sponsorUrl: string | null; investorUrl: string | null }> {
  const { db, organizationId, room, template, createdByUid, investorEmail, investorName, sponsorEmailNorm } =
    params;
  const id = randomUUID();
  const now = Date.now();
  const bucket = getAdminBucket();
  const workingPath = envelopeWorkingPath(organizationId, id);
  await copyTemplatePdfToWorking(bucket, template.storagePath, workingPath);

  const next = roleForNext(template, "data_room_nda");
  const ctx: EsignEnvelopeContext = { kind: "data_room_nda", dataRoomId: room.id };
  const investorEmailNorm = investorEmail.trim().toLowerCase();

  let sponsorSigningUrl: string | undefined;
  let investorSigningUrl: string | undefined;
  const exp = newExp();
  if (next === "sponsor") {
    const tok = mintEsignToken({ e: id, r: "sponsor", exp });
    sponsorSigningUrl = signingUrlFromToken(tok);
  } else {
    const tok = mintEsignToken({ e: id, r: "investor", exp });
    investorSigningUrl = signingUrlFromToken(tok);
  }

  const row: Omit<EsignEnvelope, "id"> & Record<string, unknown> = {
    organizationId,
    signableTemplateId: template.id,
    context: ctx,
    status: "sent" satisfies SigningRequestStatus,
    createdByUid,
    investorEmail: investorEmailNorm,
    investorEmailNorm,
    investorName,
    workingPdfStoragePath: workingPath,
    nextSignerRole: next,
    sponsorSigningUrl,
    investorSigningUrl,
    sponsorEmailNorm: sponsorEmailNorm.trim().toLowerCase(),
    createdAt: now,
    updatedAt: now,
  };

  await db.collection(col.esignEnvelopes).doc(id).set(stripUndefinedDeep(row as Record<string, unknown>));

  return {
    envelope: { id, ...(row as Omit<EsignEnvelope, "id">) },
    sponsorUrl: sponsorSigningUrl ?? null,
    investorUrl: investorSigningUrl ?? null,
  };
}

export async function createSubscriptionEnvelope(params: {
  db: Firestore;
  organizationId: string;
  dealId: string;
  userId: string;
  template: SignableTemplate;
}): Promise<{
  envelope: EsignEnvelope;
  signingUrl: string | null;
  awaitingSponsorPrep: boolean;
}> {
  const { db, organizationId, dealId, userId, template } = params;
  const docId = signingRequestDocId(organizationId, dealId, userId);
  const now = Date.now();
  const bucket = getAdminBucket();
  const workingPath = envelopeWorkingPath(organizationId, docId);
  await copyTemplatePdfToWorking(bucket, template.storagePath, workingPath);

  const next = roleForNext(template, "deal_subscription");
  const ctx: EsignEnvelopeContext = { kind: "deal_subscription", dealId, userId };
  const exp = newExp();

  let sponsorSigningUrl: string | undefined;
  let lpSigningUrl: string | undefined;
  let awaitingSponsorPrep = false;

  if (next === "sponsor") {
    const tok = mintEsignToken({ e: docId, r: "sponsor", exp });
    sponsorSigningUrl = signingUrlFromToken(tok);
    awaitingSponsorPrep = true;
  } else {
    const tok = mintEsignToken({ e: docId, r: "lp", exp });
    lpSigningUrl = signingUrlFromToken(tok);
  }

  const row: Omit<EsignEnvelope, "id"> & Record<string, unknown> = {
    organizationId,
    signableTemplateId: template.id,
    context: ctx,
    status: "sent" satisfies SigningRequestStatus,
    createdByUid: userId,
    workingPdfStoragePath: workingPath,
    nextSignerRole: next,
    sponsorSigningUrl,
    lpSigningUrl,
    subscriptionPrepComplete: next === "lp",
    createdAt: now,
    updatedAt: now,
  };

  await db.collection(col.esignEnvelopes).doc(docId).set(stripUndefinedDeep(row as Record<string, unknown>));

  return {
    envelope: { id: docId, ...(row as Omit<EsignEnvelope, "id">) },
    signingUrl: lpSigningUrl ?? null,
    awaitingSponsorPrep,
  };
}

export async function createAdhocEnvelope(params: {
  db: Firestore;
  organizationId: string;
  template: SignableTemplate;
  createdByUid: string;
  sponsorEmailNorm: string;
  investorEmail: string;
  investorName: string;
  label?: string;
}): Promise<{ envelope: EsignEnvelope; sponsorUrl: string | null; investorUrl: string | null }> {
  const { db, organizationId, template, createdByUid, investorEmail, investorName, label, sponsorEmailNorm } =
    params;
  const id = randomUUID();
  const now = Date.now();
  const bucket = getAdminBucket();
  const workingPath = envelopeWorkingPath(organizationId, id);
  await copyTemplatePdfToWorking(bucket, template.storagePath, workingPath);

  const next = roleForNext(template, "ad_hoc");
  const ctx: EsignEnvelopeContext = label?.trim()
    ? { kind: "ad_hoc", label: label.trim() }
    : { kind: "ad_hoc" };
  const investorEmailNorm = investorEmail.trim().toLowerCase();

  const exp = newExp();
  let sponsorSigningUrl: string | undefined;
  let investorSigningUrl: string | undefined;
  if (next === "sponsor") {
    sponsorSigningUrl = signingUrlFromToken(mintEsignToken({ e: id, r: "sponsor", exp }));
  } else {
    investorSigningUrl = signingUrlFromToken(mintEsignToken({ e: id, r: "investor", exp }));
  }

  const row: Omit<EsignEnvelope, "id"> & Record<string, unknown> = {
    organizationId,
    signableTemplateId: template.id,
    context: ctx,
    status: "sent" satisfies SigningRequestStatus,
    createdByUid,
    investorEmail: investorEmailNorm,
    investorEmailNorm,
    investorName,
    workingPdfStoragePath: workingPath,
    nextSignerRole: next,
    sponsorSigningUrl,
    investorSigningUrl,
    sponsorEmailNorm: sponsorEmailNorm.trim().toLowerCase(),
    createdAt: now,
    updatedAt: now,
  };

  await db.collection(col.esignEnvelopes).doc(id).set(stripUndefinedDeep(row as Record<string, unknown>));

  return {
    envelope: { id, ...(row as Omit<EsignEnvelope, "id">) },
    sponsorUrl: sponsorSigningUrl ?? null,
    investorUrl: investorSigningUrl ?? null,
  };
}

type CompleteSignerInput = {
  db: Firestore;
  envelopeId: string;
  role: EsignSignerRole;
  fieldValues: Record<string, string>;
  signaturePngBase64: string;
  consent: boolean;
  signerName: string;
  signerEmail: string;
  /** Session UID when authenticated signer identity matches sign-complete rules (LP / subscription sponsor / matched email). */
  prefillSessionUid?: string | null;
};

export async function completeSignerStep(input: CompleteSignerInput): Promise<
  | { ok: true; completed: boolean; nextUrl?: string }
  | { ok: false; error: string; status?: number }
> {
  if (!input.consent) {
    return { ok: false, error: "Consent required", status: 400 };
  }
  const ref = input.db.collection(col.esignEnvelopes).doc(input.envelopeId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, error: "Envelope not found", status: 404 };
  const env = { id: snap.id, ...(snap.data() as Omit<EsignEnvelope, "id">) };
  if (env.nextSignerRole !== input.role) {
    return { ok: false, error: "Wrong signing step for this link", status: 409 };
  }
  if (env.status === "completed") {
    return { ok: false, error: "Already completed", status: 409 };
  }

  const template = await loadTemplateForSigning(input.db, env.organizationId, env.signableTemplateId);
  if (!template) return { ok: false, error: "Template missing", status: 500 };

  let png: Uint8Array;
  try {
    const b64 = input.signaturePngBase64.replace(/^data:image\/png;base64,/, "");
    png = new Uint8Array(Buffer.from(b64, "base64"));
  } catch {
    return { ok: false, error: "Invalid signature image", status: 400 };
  }

  const defs = fieldsForRole(template.esignFields, input.role);
  const serverPrefill = await buildSignFieldPrefill(input.db, env, input.role, {
    prefillSessionUid: input.prefillSessionUid,
  });
  const mergedValues = mergePrefillWithClientForDefs(defs, serverPrefill, input.fieldValues);
  const val = validateFieldPayload(defs, mergedValues);
  if (!val.ok) return { ok: false, error: val.error, status: 400 };

  const bucket = getAdminBucket();
  const workingPath = env.workingPdfStoragePath;
  if (!workingPath) return { ok: false, error: "No working PDF", status: 500 };

  const pdfBytes = await readPdfBytes(bucket, workingPath);
  const assigneeFilter =
    input.role === "lp" ? "investor" : input.role === "investor" ? "investor" : "sponsor";
  const outBytes = await finalizePdfWithSignature(pdfBytes, template.esignFields, val.normalized, {
    onlyAssignee: assigneeFilter,
    signerName: input.signerName,
    signerEmail: input.signerEmail,
    signaturePngBytes: png,
  });
  await writePdfBytes(bucket, workingPath, outBytes);

  const now = Date.now();
  const ctx = env.context;

  /** advance */
  if (ctx.kind === "deal_subscription") {
    if (input.role === "sponsor") {
      const lpTok = mintEsignToken({ e: env.id, r: "lp", exp: newExp() });
      const lpSigningUrl = signingUrlFromToken(lpTok);
      await ref.set(
        {
          nextSignerRole: "lp" as const,
          subscriptionPrepComplete: true,
          lpSigningUrl,
          sponsorSigningUrl: null,
          status: "sent" as const,
          updatedAt: now,
          lastEventAt: now,
        },
        { merge: true },
      );
      return { ok: true, completed: false, nextUrl: lpSigningUrl };
    }
    /** lp finished */
    const finalPath = envelopeFinalPath(env.organizationId, env.id);
    await writePdfBytes(bucket, finalPath, outBytes);
    await ref.set(
      {
        status: "completed" as const,
        nextSignerRole: null,
        finalPdfStoragePath: finalPath,
        lpSigningUrl: null,
        updatedAt: now,
        lastEventAt: now,
      },
      { merge: true },
    );
    await input.db
      .collection(col.dealCommitments)
      .doc(dealCommitmentDocId(env.organizationId, ctx.dealId, ctx.userId))
      .set({ docStatus: "complete", updatedAt: now }, { merge: true });
    return { ok: true, completed: true };
  }

  /** MNDA + ad_hoc two-party */
  if (input.role === "sponsor") {
    const invTok = mintEsignToken({ e: env.id, r: "investor", exp: newExp() });
    const investorSigningUrl = signingUrlFromToken(invTok);
    await ref.set(
      {
        nextSignerRole: "investor" as const,
        investorSigningUrl,
        sponsorSigningUrl: null,
        status: "sent" as const,
        updatedAt: now,
        lastEventAt: now,
      },
      { merge: true },
    );
    return { ok: true, completed: false, nextUrl: investorSigningUrl };
  }

  /** investor completes */
  const finalPath = envelopeFinalPath(env.organizationId, env.id);
  await writePdfBytes(bucket, finalPath, outBytes);
  await ref.set(
    {
      status: "completed" as const,
      nextSignerRole: null,
      finalPdfStoragePath: finalPath,
      investorSigningUrl: null,
      updatedAt: now,
      lastEventAt: now,
    },
    { merge: true },
  );
  return { ok: true, completed: true };
}

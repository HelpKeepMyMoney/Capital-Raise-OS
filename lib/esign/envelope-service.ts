import { randomUUID } from "crypto";
import { getAdminBucket } from "@/lib/firebase/admin";
import { col, dealCommitmentDocId, questionnaireRequestDocId, signingRequestDocId } from "@/lib/firestore/paths";
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
  kind: "data_room_nda" | "deal_subscription" | "deal_questionnaire" | "ad_hoc",
): EsignSignerRole {
  if (kind === "deal_subscription" || kind === "deal_questionnaire") {
    return hasAssigneeFields(template.esignFields, "sponsor") ? "sponsor" : "lp";
  }
  return hasAssigneeFields(template.esignFields, "sponsor") ? "sponsor" : "investor";
}

/** Data-room mutual NDA: investor signs first when they have template fields (no sponsor-first gate). */
function firstSignerForDataRoomNda(template: SignableTemplate): "sponsor" | "investor" {
  if (hasAssigneeFields(template.esignFields, "investor")) return "investor";
  if (hasAssigneeFields(template.esignFields, "sponsor")) return "sponsor";
  return "investor";
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

  const next = firstSignerForDataRoomNda(template);
  const dataRoomNdaFirstSigner: "investor" | "sponsor" = next === "investor" ? "investor" : "sponsor";
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
    dataRoomNdaFirstSigner,
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

async function createDealLpPacketEnvelope(params: {
  db: Firestore;
  organizationId: string;
  dealId: string;
  userId: string;
  template: SignableTemplate;
  envelopeDocId: string;
  packetKind: "deal_subscription" | "deal_questionnaire";
}): Promise<{
  envelope: EsignEnvelope;
  signingUrl: string | null;
  awaitingSponsorPrep: boolean;
}> {
  const { db, organizationId, dealId, userId, template, envelopeDocId, packetKind } = params;
  const now = Date.now();
  const bucket = getAdminBucket();
  const workingPath = envelopeWorkingPath(organizationId, envelopeDocId);
  await copyTemplatePdfToWorking(bucket, template.storagePath, workingPath);

  const next = roleForNext(template, packetKind);
  const ctx: EsignEnvelopeContext =
    packetKind === "deal_subscription"
      ? { kind: "deal_subscription", dealId, userId }
      : { kind: "deal_questionnaire", dealId, userId };
  const exp = newExp();

  let sponsorSigningUrl: string | undefined;
  let lpSigningUrl: string | undefined;
  let awaitingSponsorPrep = false;

  if (next === "sponsor") {
    const tok = mintEsignToken({ e: envelopeDocId, r: "sponsor", exp });
    sponsorSigningUrl = signingUrlFromToken(tok);
    awaitingSponsorPrep = true;
  } else {
    const tok = mintEsignToken({ e: envelopeDocId, r: "lp", exp });
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

  await db.collection(col.esignEnvelopes).doc(envelopeDocId).set(stripUndefinedDeep(row as Record<string, unknown>));

  return {
    envelope: { id: envelopeDocId, ...(row as Omit<EsignEnvelope, "id">) },
    signingUrl: lpSigningUrl ?? null,
    awaitingSponsorPrep,
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
  const docId = signingRequestDocId(params.organizationId, params.dealId, params.userId);
  return createDealLpPacketEnvelope({ ...params, envelopeDocId: docId, packetKind: "deal_subscription" });
}

export async function createQuestionnaireEnvelope(params: {
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
  const docId = questionnaireRequestDocId(params.organizationId, params.dealId, params.userId);
  return createDealLpPacketEnvelope({ ...params, envelopeDocId: docId, packetKind: "deal_questionnaire" });
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

  /** advance — LP deal packets (subscription + investor questionnaire) */
  if (ctx.kind === "deal_subscription" || ctx.kind === "deal_questionnaire") {
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
    const commitRef = input.db
      .collection(col.dealCommitments)
      .doc(dealCommitmentDocId(env.organizationId, ctx.dealId, ctx.userId));
    if (ctx.kind === "deal_subscription") {
      await commitRef.set({ docStatus: "complete", updatedAt: now }, { merge: true });
    } else {
      await commitRef.set({ questionnaireDocStatus: "complete", updatedAt: now }, { merge: true });
    }
    return { ok: true, completed: true };
  }

  /** Native data-room mutual NDA — investor may sign first; unlock after investor step. */
  if (ctx.kind === "data_room_nda") {
    const spoFields = hasAssigneeFields(template.esignFields, "sponsor");
    const invFields = hasAssigneeFields(template.esignFields, "investor");
    const sponsorDone = typeof env.sponsorSignedAt === "number";
    const investorDone = typeof env.investorSignedAt === "number";

    const finalizeDataRoomNda = async () => {
      const finalPath = envelopeFinalPath(env.organizationId, env.id);
      await writePdfBytes(bucket, finalPath, outBytes);
      const merge: Record<string, unknown> = {
        status: "completed" as const,
        nextSignerRole: null,
        finalPdfStoragePath: finalPath,
        investorSigningUrl: null,
        sponsorSigningUrl: null,
        updatedAt: now,
        lastEventAt: now,
      };
      if (!investorDone) merge.investorSignedAt = now;
      if (!sponsorDone && spoFields) merge.sponsorSignedAt = now;
      await ref.set(merge, { merge: true });
    };

    const firstSigner = env.dataRoomNdaFirstSigner ?? "sponsor";

    if (input.role === "investor") {
      if (spoFields && typeof env.sponsorSignedAt !== "number" && firstSigner === "investor") {
        const sponsorTok = mintEsignToken({ e: env.id, r: "sponsor", exp: newExp() });
        const sponsorSigningUrl = signingUrlFromToken(sponsorTok);
        await ref.set(
          {
            nextSignerRole: "sponsor" as const,
            sponsorSigningUrl,
            investorSigningUrl: null,
            investorSignedAt: now,
            status: "sent" as const,
            updatedAt: now,
            lastEventAt: now,
          },
          { merge: true },
        );
        return { ok: true, completed: false, nextUrl: sponsorSigningUrl };
      }
      await finalizeDataRoomNda();
      return { ok: true, completed: true };
    }

    if (input.role === "sponsor") {
      if (invFields && !investorDone) {
        const invTok = mintEsignToken({ e: env.id, r: "investor", exp: newExp() });
        const investorSigningUrl = signingUrlFromToken(invTok);
        await ref.set(
          {
            nextSignerRole: "investor" as const,
            investorSigningUrl,
            sponsorSigningUrl: null,
            sponsorSignedAt: now,
            status: "sent" as const,
            updatedAt: now,
            lastEventAt: now,
          },
          { merge: true },
        );
        return { ok: true, completed: false, nextUrl: investorSigningUrl };
      }
      await finalizeDataRoomNda();
      return { ok: true, completed: true };
    }
  }

  /** ad_hoc two-party */
  if (ctx.kind === "ad_hoc") {
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

    const finalPath = envelopeFinalPath(env.organizationId, env.id);
    await writePdfBytes(bucket, finalPath, outBytes);
    await ref.set(
      {
        status: "completed" as const,
        nextSignerRole: null,
        finalPdfStoragePath: finalPath,
        investorSigningUrl: null,
        sponsorSigningUrl: null,
        updatedAt: now,
        lastEventAt: now,
      },
      { merge: true },
    );
    return { ok: true, completed: true };
  }

  return { ok: false, error: "Unsupported envelope signing flow", status: 500 };
}

import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import { verifyEsignToken } from "@/lib/esign/tokens";
import { col } from "@/lib/firestore/paths";
import type { EsignEnvelope } from "@/lib/firestore/types";
import { resolvePrefillSessionUid } from "@/lib/auth/sign-prefill-session";
import { loadTemplateForSigning } from "@/lib/esign/envelope-service";
import { buildSignFieldPrefill } from "@/lib/esign/sign-prefill";
import { fieldsForRole } from "@/lib/esign/field-validate";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim() ?? "";
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const payload = verifyEsignToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 });

  const db = getAdminFirestore();
  const snap = await db.collection(col.esignEnvelopes).doc(payload.e).get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const env = { id: snap.id, ...(snap.data() as Omit<EsignEnvelope, "id">) };
  if (env.nextSignerRole !== payload.r) {
    return NextResponse.json({ error: "This link is not active for the current signing step" }, { status: 409 });
  }
  if (env.status === "completed") {
    return NextResponse.json({ error: "Already completed" }, { status: 410 });
  }

  const template = await loadTemplateForSigning(db, env.organizationId, env.signableTemplateId);
  if (!template) return NextResponse.json({ error: "Template missing" }, { status: 500 });

  const fields = fieldsForRole(template.esignFields, payload.r).map((f) => ({
    id: f.id,
    label: f.label ?? f.id,
    fieldType: f.fieldType,
    required: f.required !== false,
    pageIndex: f.pageIndex,
    rectNorm: f.rectNorm,
  }));

  const prefillSessionUid = await resolvePrefillSessionUid(req, env, payload.r);
  const prefill = await buildSignFieldPrefill(db, env, payload.r, { prefillSessionUid });

  let sessionEmailHint: string | null = null;
  const rawSession = req.cookies.get(SESSION_COOKIE)?.value;
  if (rawSession) {
    try {
      const dec = await getAdminAuth().verifySessionCookie(rawSession, true);
      sessionEmailHint = dec.email?.trim().toLowerCase() ?? null;
    } catch {
      sessionEmailHint = null;
    }
  }

  return NextResponse.json({
    envelopeId: env.id,
    role: payload.r,
    templateName: template.name,
    fields,
    contextKind: env.context.kind,
    prefill,
    sessionEmailHint,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { ORG_COOKIE, SESSION_COOKIE } from "@/lib/constants";
import { canEditOrgData } from "@/lib/auth/rbac";
import { getAdminAuth } from "@/lib/firebase/admin";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import type { EsignEnvelope } from "@/lib/firestore/types";
import { verifyEsignToken } from "@/lib/esign/tokens";
import { completeSignerStep } from "@/lib/esign/envelope-service";
import { getMembership } from "@/lib/firestore/queries";

export async function POST(req: NextRequest) {
  const json = (await req.json()) as {
    token?: string;
    fieldValues?: Record<string, string>;
    signaturePngBase64?: string;
    consent?: boolean;
    signerEmail?: string;
    signerName?: string;
  };

  const token = typeof json.token === "string" ? json.token.trim() : "";
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const payload = verifyEsignToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 });

  const db = getAdminFirestore();
  const snap = await db.collection(col.esignEnvelopes).doc(payload.e).get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const env = { id: snap.id, ...(snap.data() as Omit<EsignEnvelope, "id">) };

  const rawCookie = req.cookies.get(SESSION_COOKIE)?.value;
  let sessionEmail: string | null = null;
  let sessionUid: string | null = null;
  if (rawCookie) {
    try {
      const dec = await getAdminAuth().verifySessionCookie(rawCookie, true);
      sessionEmail = dec.email?.trim().toLowerCase() ?? null;
      sessionUid = dec.uid;
    } catch {
      /* unsigned */
    }
  }

  const bodyEmail = typeof json.signerEmail === "string" ? json.signerEmail.trim().toLowerCase() : "";
  const bodyName = typeof json.signerName === "string" ? json.signerName.trim() : "";

  let signerEmail = "";
  let signerName = "";

  const ctx = env.context;

  if (payload.r === "lp") {
    if (ctx.kind !== "deal_subscription") {
      return NextResponse.json({ error: "Invalid envelope" }, { status: 400 });
    }
    if (!sessionUid || sessionUid !== ctx.userId) {
      return NextResponse.json(
        { error: "Sign in with the same investor account that requested subscription documents." },
        { status: 403 },
      );
    }
    if (!sessionEmail) {
      return NextResponse.json({ error: "Account email missing" }, { status: 400 });
    }
    signerEmail = sessionEmail;
    signerName = bodyName || sessionEmail.split("@")[0] || "Investor";
  } else if (payload.r === "sponsor" && ctx.kind === "deal_subscription") {
    if (!sessionUid) {
      return NextResponse.json({ error: "Sign in as a sponsor team member to complete this step." }, { status: 401 });
    }
    const orgCookie = req.cookies.get(ORG_COOKIE)?.value;
    if (!orgCookie || orgCookie !== env.organizationId) {
      return NextResponse.json({ error: "Switch to the correct organization and try again." }, { status: 403 });
    }
    const mem = await getMembership(env.organizationId, sessionUid);
    if (!mem || !canEditOrgData(mem.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!sessionEmail) return NextResponse.json({ error: "Account email missing" }, { status: 400 });
    signerEmail = sessionEmail;
    signerName = bodyName || sessionEmail.split("@")[0] || "Sponsor";
  } else if (payload.r === "sponsor") {
    const norm = env.sponsorEmailNorm?.trim().toLowerCase();
    const email = (sessionEmail ?? bodyEmail).trim().toLowerCase();
    if (!norm || !email || email !== norm) {
      return NextResponse.json(
        { error: "Email must match the sponsor who started this envelope." },
        { status: 403 },
      );
    }
    signerEmail = email;
    signerName = bodyName || email.split("@")[0] || "Sponsor";
  } else if (payload.r === "investor") {
    const norm = env.investorEmailNorm?.trim().toLowerCase();
    const email = (sessionEmail ?? bodyEmail).trim().toLowerCase();
    if (!norm || !email || email !== norm) {
      return NextResponse.json({ error: "Email must match the invited investor address." }, { status: 403 });
    }
    signerEmail = email;
    signerName = bodyName || email.split("@")[0] || "Investor";
  }

  const result = await completeSignerStep({
    db,
    envelopeId: payload.e,
    role: payload.r,
    fieldValues: json.fieldValues ?? {},
    signaturePngBase64: json.signaturePngBase64 ?? "",
    consent: Boolean(json.consent),
    signerName,
    signerEmail,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
  }

  return NextResponse.json({
    ok: true,
    completed: result.completed,
    nextUrl: result.nextUrl ?? null,
  });
}

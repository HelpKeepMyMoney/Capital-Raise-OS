import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";
import { userHasStaffAccessToOrg } from "@/lib/auth/org-staff-access";
import { getAdminAuth, getAdminBucket, getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import type { EsignEnvelope } from "@/lib/firestore/types";
import { verifyEsignToken } from "@/lib/esign/tokens";
import { completeSignerStep } from "@/lib/esign/envelope-service";
import { sendEsignCompletedEmails, sendEsignInvestorTurnEmail } from "@/lib/esign/envelope-notify";
import { getOrganization } from "@/lib/firestore/queries";
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
  let prefillSessionUid: string | null = null;

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
    prefillSessionUid = sessionUid;
  } else if (payload.r === "sponsor" && ctx.kind === "deal_subscription") {
    const orgId = env.organizationId;
    const auth = getAdminAuth();

    let resolvedUid: string | null = null;
    let resolvedEmail: string | null = null;

    if (sessionUid && sessionEmail) {
      if (await userHasStaffAccessToOrg(sessionUid, orgId)) {
        resolvedUid = sessionUid;
        resolvedEmail = sessionEmail;
      }
    }

    if (!resolvedUid) {
      const tryEmail = (bodyEmail || sessionEmail || "").trim().toLowerCase();
      if (!tryEmail) {
        return NextResponse.json(
          {
            error:
              "Enter the email on your CapitalOS sponsor account in the field above, or open this link in the same browser where you are logged in (Settings → ensure the correct workspace is selected).",
          },
          { status: 401 },
        );
      }
      let record: { uid: string } | null = null;
      try {
        const u = await auth.getUserByEmail(tryEmail);
        record = { uid: u.uid };
      } catch {
        record = null;
      }
      if (!record) {
        return NextResponse.json(
          { error: "No CapitalOS account found for that email. Use the address you sign in with." },
          { status: 403 },
        );
      }
      if (!(await userHasStaffAccessToOrg(record.uid, orgId))) {
        return NextResponse.json(
          {
            error:
              "Your account is not authorized for this organization in CapitalOS. Confirm you use your sponsor login email, or ask an admin to add you to this workspace with a sponsor role.",
          },
          { status: 403 },
        );
      }
      resolvedUid = record.uid;
      resolvedEmail = tryEmail;
    }

    signerEmail = resolvedEmail ?? "";
    signerName = bodyName || signerEmail.split("@")[0] || "Sponsor";
    prefillSessionUid = resolvedUid;
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
    if (sessionUid && sessionEmail && sessionEmail === norm) prefillSessionUid = sessionUid;
  } else if (payload.r === "investor") {
    const norm = env.investorEmailNorm?.trim().toLowerCase();
    const email = (sessionEmail ?? bodyEmail).trim().toLowerCase();
    if (!norm || !email || email !== norm) {
      return NextResponse.json({ error: "Email must match the invited investor address." }, { status: 403 });
    }
    signerEmail = email;
    signerName = bodyName || email.split("@")[0] || "Investor";
    if (sessionUid && sessionEmail && sessionEmail === norm) prefillSessionUid = sessionUid;
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
    prefillSessionUid,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
  }

  if (!result.completed && result.nextUrl && payload.r === "sponsor") {
    const ndaCtx = env.context;
    if (ndaCtx.kind === "data_room_nda" || ndaCtx.kind === "ad_hoc") {
      const to = env.investorEmailNorm?.trim() || env.investorEmail?.trim();
      if (to) {
        try {
          const org = await getOrganization(env.organizationId);
          await sendEsignInvestorTurnEmail({
            orgName: org?.name ?? "CapitalOS",
            investorEmail: to.toLowerCase(),
            investorName: env.investorName,
            signingUrl: result.nextUrl,
          });
        } catch (e) {
          console.error("[esign sign-complete investor turn email]", e);
        }
      }
    } else if (ndaCtx.kind === "deal_subscription") {
      try {
        const lpUser = await getAdminAuth().getUser(ndaCtx.userId);
        const to = lpUser.email?.trim().toLowerCase();
        if (to) {
          const org = await getOrganization(env.organizationId);
          await sendEsignInvestorTurnEmail({
            orgName: org?.name ?? "CapitalOS",
            investorEmail: to,
            investorName: lpUser.displayName ?? undefined,
            signingUrl: result.nextUrl,
          });
        }
      } catch (e) {
        console.error("[esign sign-complete subscription investor turn email]", e);
      }
    }
  }

  if (result.completed) {
    try {
      const latestSnap = await db.collection(col.esignEnvelopes).doc(env.id).get();
      const latest = latestSnap.exists ? ({ id: latestSnap.id, ...(latestSnap.data() as Omit<EsignEnvelope, "id">) }) : env;
      const finalPath = latest.finalPdfStoragePath?.trim();
      if (finalPath) {
        const bucket = getAdminBucket();
        const [buf] = await bucket.file(finalPath).download();
        const org = await getOrganization(env.organizationId);
        await sendEsignCompletedEmails({
          orgName: org?.name ?? "CapitalOS",
          sponsorEmail: latest.sponsorEmailNorm ?? null,
          investorEmail: latest.investorEmailNorm ?? latest.investorEmail ?? null,
          investorName: latest.investorName,
          pdfAttachmentName: `signed-${latest.id}.pdf`,
          pdfBytes: new Uint8Array(buf),
        });
      }
    } catch (e) {
      console.error("[esign sign-complete completed email]", e);
    }
  }

  return NextResponse.json({
    ok: true,
    completed: result.completed,
    nextUrl: result.nextUrl ?? null,
  });
}

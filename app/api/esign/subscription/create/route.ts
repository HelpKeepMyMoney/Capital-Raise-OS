import { NextRequest, NextResponse } from "next/server";
import { memberCanAccessDeal } from "@/lib/auth/investor-access";
import { isInvestorGuestRole } from "@/lib/auth/rbac";
import { requireOrgSession } from "@/lib/auth/session";
import { sendDealSubscriptionSponsorSigningEmail } from "@/lib/esign/envelope-notify";
import { resolveDealSubscriptionSponsorEmails } from "@/lib/esign/subscription-sponsor-emails";
import { createSubscriptionEnvelope, loadTemplate } from "@/lib/esign/envelope-service";
import { getAdminAuth, getAdminBucket, getAdminFirestore } from "@/lib/firebase/admin";
import { col, signingRequestDocId } from "@/lib/firestore/paths";
import { getDeal, getMembership, getOrganization } from "@/lib/firestore/queries";
import type { EsignEnvelope } from "@/lib/firestore/types";

export async function POST(req: NextRequest) {
  const ctx = await requireOrgSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await getMembership(ctx.orgId, ctx.user.uid);
  if (!m || !isInvestorGuestRole(m.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as { dealId?: string };
  const dealId = typeof body.dealId === "string" ? body.dealId.trim() : "";
  if (!dealId) return NextResponse.json({ error: "dealId required" }, { status: 400 });
  if (!memberCanAccessDeal(m, dealId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const org = await getOrganization(ctx.orgId);
  const templateId =
    typeof org?.subscriptionSignableTemplateId === "string"
      ? org.subscriptionSignableTemplateId.trim()
      : "";
  if (!templateId) {
    return NextResponse.json(
      {
        error: "Your sponsor has not configured a subscription document template yet.",
        mode: "stub",
      },
      { status: 400 },
    );
  }

  const db = getAdminFirestore();
  const template = await loadTemplate(db, ctx.orgId, templateId);
  if (!template) {
    return NextResponse.json({ error: "Subscription template not found" }, { status: 404 });
  }

  const bucket = getAdminBucket();
  const [exists] = await bucket.file(template.storagePath).exists();
  if (!exists) {
    return NextResponse.json({ error: "Subscription template PDF is not uploaded yet" }, { status: 503 });
  }

  const docId = signingRequestDocId(ctx.orgId, dealId, ctx.user.uid);
  const existingSnap = await db.collection(col.esignEnvelopes).doc(docId).get();
  if (existingSnap.exists) {
    const e = existingSnap.data() as EsignEnvelope;
    if (e.context.kind === "deal_subscription") {
      let signingUrl: string | null = null;
      if (e.nextSignerRole === "lp") signingUrl = e.lpSigningUrl ?? null;
      if (e.nextSignerRole === "sponsor") signingUrl = e.sponsorSigningUrl ?? null;

      let sponsorNotificationSent = false;
      if (e.nextSignerRole === "sponsor" && e.sponsorSigningUrl && org) {
        const sponsorEmails = await resolveDealSubscriptionSponsorEmails(org);
        const authUser = await getAdminAuth().getUser(ctx.user.uid);
        const investorLabel =
          authUser.displayName?.trim() || authUser.email?.trim() || "Investor";
        const dealRow = await getDeal(ctx.orgId, dealId);
        const dealName = dealRow?.name?.trim() || "Deal";
        await sendDealSubscriptionSponsorSigningEmail({
          orgName: org.name,
          sponsorEmails,
          sponsorSigningUrl: e.sponsorSigningUrl,
          dealName,
          investorLabel,
        });
        sponsorNotificationSent =
          sponsorEmails.length > 0 && Boolean(process.env.RESEND_API_KEY?.trim());
      }

      return NextResponse.json({
        ok: true,
        id: docId,
        nativeEnvelopeId: docId,
        signingUrl,
        sponsorSigningUrl: e.sponsorSigningUrl ?? null,
        awaitingSponsorPrep: e.nextSignerRole === "sponsor",
        sponsorNotificationSent,
        status: e.status,
      });
    }
  }

  try {
    const { envelope, signingUrl, awaitingSponsorPrep } = await createSubscriptionEnvelope({
      db,
      organizationId: ctx.orgId,
      dealId,
      userId: ctx.user.uid,
      template,
    });

    let sponsorNotificationSent = false;
    if (awaitingSponsorPrep && envelope.sponsorSigningUrl && org) {
      const sponsorEmails = await resolveDealSubscriptionSponsorEmails(org);
      const authUser = await getAdminAuth().getUser(ctx.user.uid);
      const investorLabel =
        authUser.displayName?.trim() || authUser.email?.trim() || "Investor";
      const dealRow = await getDeal(ctx.orgId, dealId);
      const dealName = dealRow?.name?.trim() || "Deal";
      await sendDealSubscriptionSponsorSigningEmail({
        orgName: org.name,
        sponsorEmails,
        sponsorSigningUrl: envelope.sponsorSigningUrl,
        dealName,
        investorLabel,
      });
      sponsorNotificationSent =
        sponsorEmails.length > 0 && Boolean(process.env.RESEND_API_KEY?.trim());
    }

    return NextResponse.json({
      ok: true,
      id: envelope.id,
      nativeEnvelopeId: envelope.id,
      signingUrl: signingUrl ?? null,
      sponsorSigningUrl: envelope.sponsorSigningUrl ?? null,
      awaitingSponsorPrep,
      sponsorNotificationSent,
      status: envelope.status,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not create envelope" },
      { status: 500 },
    );
  }
}

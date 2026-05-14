import { FieldValue } from "firebase-admin/firestore";
import type { Firestore } from "firebase-admin/firestore";
import type { Bucket } from "@google-cloud/storage";
import { sendEsignEnvelopeCreatedEmails } from "@/lib/esign/envelope-notify";
import { createNdaEnvelope, loadTemplate } from "@/lib/esign/envelope-service";
import { resolveDealSubscriptionSponsorEmails } from "@/lib/esign/subscription-sponsor-emails";
import { col } from "@/lib/firestore/paths";
import type { DataRoom, Investor } from "@/lib/firestore/types";
import { getInvestor, getOrganization, listInvestors } from "@/lib/firestore/queries";
import { investorDisplayName } from "@/lib/investors/display-name";

async function findInvestorForGuestRoomNda(
  db: Firestore,
  organizationId: string,
  roomId: string,
  dealId: string,
  guestEmailNorm: string,
  guestUid: string,
): Promise<Investor | null> {
  const snap = await db
    .collection(col.investorInvitations)
    .where("organizationId", "==", organizationId)
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  for (const d of snap.docs) {
    const row = d.data() as {
      acceptedUserId?: string;
      revokedAt?: number;
      email?: string;
      linkedInvestorId?: string;
      dataRoomIds?: string[];
      dealIds?: string[];
    };
    if (row.acceptedUserId !== guestUid) continue;
    if (row.revokedAt) continue;
    const invEmail = row.email?.trim().toLowerCase() ?? "";
    if (guestEmailNorm && invEmail && invEmail !== guestEmailNorm) continue;
    const inRoom = row.dataRoomIds?.includes(roomId) ?? false;
    const inDeal = row.dealIds?.includes(dealId) ?? false;
    if (!inRoom && !inDeal) continue;
    if (typeof row.linkedInvestorId === "string" && row.linkedInvestorId.trim()) {
      const inv = await getInvestor(organizationId, row.linkedInvestorId.trim());
      if (inv) {
        const crmEmail = inv.email?.trim().toLowerCase() ?? "";
        if (guestEmailNorm && crmEmail && crmEmail !== guestEmailNorm) continue;
        return inv;
      }
    }
  }

  const investors = await listInvestors(organizationId);
  const matches = investors.filter((i) => (i.email?.trim().toLowerCase() ?? "") === guestEmailNorm);
  if (matches.length === 0) return null;
  const prefersDeal = matches.find((i) => i.interestedDealIds?.includes(dealId));
  return prefersDeal ?? matches[0] ?? null;
}

async function ensureInvestorInterestedInDeal(db: Firestore, investorId: string, dealId: string): Promise<void> {
  await db.collection(col.investors).doc(investorId).set(
    {
      interestedDealIds: FieldValue.arrayUnion(dealId),
      updatedAt: Date.now(),
    },
    { merge: true },
  );
}

/**
 * Creates the native data-room NDA envelope as if the sponsor clicked “Create envelope”,
 * using the guest’s CapitalOS account email to resolve the CRM investor row.
 */
export async function createRoomNdaEnvelopeFromGuestSelfRequest(params: {
  db: Firestore;
  bucket: Bucket;
  organizationId: string;
  room: DataRoom;
  guestUid: string;
  guestEmailNorm: string;
}): Promise<
  | { ok: true; envelopeId: string; sponsorSigningUrl: string | null; investorSigningUrl: string | null }
  | { ok: false; error: string }
> {
  const { db, bucket, organizationId, room, guestUid, guestEmailNorm } = params;
  const dealId = typeof room.dealId === "string" ? room.dealId.trim() : "";
  if (!dealId) return { ok: false, error: "This room is not linked to a deal" };

  const templateId =
    typeof room.signableTemplateId === "string" && room.signableTemplateId.trim()
      ? room.signableTemplateId.trim()
      : null;
  if (!templateId) {
    return { ok: false, error: "The sponsor must pick an NDA template in room settings before you can sign" };
  }

  const org = await getOrganization(organizationId);
  const sponsorEmails = org ? await resolveDealSubscriptionSponsorEmails(org) : [];
  const sponsorEmail = sponsorEmails[0]?.trim().toLowerCase();
  if (!sponsorEmail) {
    return {
      ok: false,
      error: "No sponsor email is configured for this workspace — the issuer needs a team contact email on file",
    };
  }

  const investor = await findInvestorForGuestRoomNda(
    db,
    organizationId,
    room.id,
    dealId,
    guestEmailNorm,
    guestUid,
  );
  if (!investor) {
    return {
      ok: false,
      error:
        "No CRM investor matches your CapitalOS email. Ask the sponsor to add this email in Investor CRM (or link your invite to your CRM profile).",
    };
  }
  const invEmail = investor.email?.trim().toLowerCase() ?? "";
  if (!invEmail || invEmail !== guestEmailNorm) {
    return {
      ok: false,
      error: "Your CapitalOS login email must match the email on your investor CRM profile for this sponsor.",
    };
  }

  await ensureInvestorInterestedInDeal(db, investor.id, dealId);

  const template = await loadTemplate(db, organizationId, templateId);
  if (!template) return { ok: false, error: "NDA template was removed — ask the sponsor to pick a template again" };
  const [pdfOk] = await bucket.file(template.storagePath).exists();
  if (!pdfOk) return { ok: false, error: "NDA template PDF is missing in the template library" };

  const investorName = investorDisplayName(investor);
  const { envelope, sponsorUrl, investorUrl } = await createNdaEnvelope({
    db,
    organizationId,
    room,
    template,
    createdByUid: guestUid,
    sponsorEmailNorm: sponsorEmail,
    investorEmail: invEmail,
    investorName,
  });

  await sendEsignEnvelopeCreatedEmails({
    orgName: org?.name ?? "CapitalOS",
    sponsorEmail,
    investorEmail: invEmail,
    investorName,
    sponsorUrl,
    investorUrl,
    context: { kind: "data_room", roomName: room.name },
  });

  return {
    ok: true,
    envelopeId: envelope.id,
    sponsorSigningUrl: sponsorUrl,
    investorSigningUrl: investorUrl,
  };
}

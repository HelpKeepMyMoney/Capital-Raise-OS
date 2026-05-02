import { sendTransactionalEmail } from "@/lib/email/resend";
import { escapeHtmlForEmail, invitationsTransactionalFrom } from "@/lib/invitations/invite-email-shared";

export type EsignEnvelopeNotifyContext =
  | { kind: "data_room"; roomName: string }
  | { kind: "ad_hoc"; label?: string };

/** Send both parties an email when an envelope is created (Resend optional). */
export async function sendEsignEnvelopeCreatedEmails(args: {
  orgName: string;
  sponsorEmail: string;
  investorEmail: string;
  investorName: string;
  sponsorUrl: string | null;
  investorUrl: string | null;
  context: EsignEnvelopeNotifyContext;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;

  const from = invitationsTransactionalFrom();
  const { orgName, sponsorEmail, investorEmail, investorName, sponsorUrl, investorUrl, context } = args;

  const ctxBlock =
    context.kind === "data_room"
      ? `<p>Data room: <strong>${escapeHtmlForEmail(context.roomName)}</strong></p>`
      : context.label
        ? `<p>${escapeHtmlForEmail(context.label)}</p>`
        : "";

  const invLabel = escapeHtmlForEmail(investorName.trim() || investorEmail);
  const invMail = escapeHtmlForEmail(investorEmail);

  const roomOrDoc =
    context.kind === "data_room"
      ? escapeHtmlForEmail(context.roomName)
      : context.label
        ? escapeHtmlForEmail(context.label)
        : "this agreement";

  try {
    if (sponsorUrl) {
      await sendTransactionalEmail({
        from,
        to: sponsorEmail,
        subject: `Sign documents — ${orgName}`,
        html: `<p>Please complete your signature:</p><p><a href="${sponsorUrl}">Open signing page</a></p>${ctxBlock}<p style="font-size:13px;color:#666">Investor: ${invMail}</p>`,
      });
    } else {
      await sendTransactionalEmail({
        from,
        to: sponsorEmail,
        subject: `Signing request sent — ${orgName}`,
        html: `<p>Your signing request was created. <strong>${invMail}</strong> (${invLabel}) has been emailed a link to sign first.</p>${ctxBlock}`,
      });
    }
  } catch (e) {
    console.error("[esign envelope notify sponsor]", e);
  }

  try {
    if (investorUrl) {
      await sendTransactionalEmail({
        from,
        to: investorEmail,
        subject: `Documents to sign — ${orgName}`,
        html: `<p>Hi ${invLabel},</p><p>Please complete your signature:</p><p><a href="${investorUrl}">Open signing page</a></p>${ctxBlock}`,
      });
    } else {
      await sendTransactionalEmail({
        from,
        to: investorEmail,
        subject: `Signing started — ${orgName}`,
        html: `<p>Hi ${invLabel},</p><p><strong>${roomOrDoc}</strong> is being signed. The sponsor is signing first. You will receive another email with your personal signing link when it is your turn.</p>${ctxBlock}`,
      });
    }
  } catch (e) {
    console.error("[esign envelope notify investor]", e);
  }
}

/** Investor requested subscription docs — sponsor must sign first (deal subscription flow). */
export async function sendDealSubscriptionSponsorSigningEmail(args: {
  orgName: string;
  sponsorEmails: string[];
  sponsorSigningUrl: string;
  dealName: string;
  investorLabel: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY || args.sponsorEmails.length === 0) return;

  const from = invitationsTransactionalFrom();
  const deal = escapeHtmlForEmail(args.dealName.trim() || "Deal");
  const inv = escapeHtmlForEmail(args.investorLabel.trim() || "An investor");
  const org = escapeHtmlForEmail(args.orgName);

  const href = args.sponsorSigningUrl.replace(/"/g, "&quot;");

  try {
    await sendTransactionalEmail({
      from,
      to: args.sponsorEmails.length === 1 ? args.sponsorEmails[0]! : args.sponsorEmails,
      subject: `Subscription packet — your signature needed — ${args.orgName}`,
      html: `<p>An investor requested subscription documents on <strong>${deal}</strong> (${org}).</p>
<p><strong>${inv}</strong> is waiting while you complete the sponsor signing step first.</p>
<p>After you finish, they will receive an email with their personal signing link.</p>
<p><a href="${href}">Open sponsor signing page</a></p>
<p style="font-size:13px;color:#666">If the button does not work, paste this URL into your browser:<br/>${href}</p>`,
    });
  } catch (e) {
    console.error("[deal subscription sponsor kickoff email]", e);
  }
}

/** When the sponsor finishes and the investor’s signing link becomes active (NDA / ad hoc). */
export async function sendEsignInvestorTurnEmail(args: {
  orgName: string;
  investorEmail: string;
  investorName?: string;
  signingUrl: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;

  const from = invitationsTransactionalFrom();
  const label = escapeHtmlForEmail(args.investorName?.trim() || args.investorEmail);

  try {
    await sendTransactionalEmail({
      from,
      to: args.investorEmail.trim().toLowerCase(),
      subject: `Your turn to sign — ${args.orgName}`,
      html: `<p>Hi ${label},</p><p>It is now your turn to sign. Open the secure signing page:</p><p><a href="${args.signingUrl}">Open signing page</a></p>`,
    });
  } catch (e) {
    console.error("[esign envelope notify investor turn]", e);
  }
}

/** Sends the completed signed PDF (with certificate page) to both parties. */
export async function sendEsignCompletedEmails(args: {
  orgName: string;
  sponsorEmail?: string | null;
  investorEmail?: string | null;
  investorName?: string;
  pdfAttachmentName: string;
  pdfBytes: Uint8Array;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;

  const from = invitationsTransactionalFrom();
  const sponsor = args.sponsorEmail?.trim().toLowerCase() || "";
  const investor = args.investorEmail?.trim().toLowerCase() || "";
  const investorLabel = escapeHtmlForEmail(args.investorName?.trim() || investor || "Investor");
  if (!sponsor && !investor) return;

  const attachment = {
    filename: args.pdfAttachmentName,
    content: Buffer.from(args.pdfBytes),
  };

  if (sponsor) {
    try {
      await sendTransactionalEmail({
        from,
        to: sponsor,
        subject: `Completed signed document — ${args.orgName}`,
        html: `<p>The document is fully signed.</p><p>Attached is the final signed PDF, including the certificate page.</p>`,
        attachments: [attachment],
      });
    } catch (e) {
      console.error("[esign envelope notify completed sponsor]", e);
    }
  }

  if (investor && investor !== sponsor) {
    try {
      await sendTransactionalEmail({
        from,
        to: investor,
        subject: `Completed signed document — ${args.orgName}`,
        html: `<p>Hi ${investorLabel},</p><p>The document is fully signed.</p><p>Attached is the final signed PDF, including the certificate page.</p>`,
        attachments: [attachment],
      });
    } catch (e) {
      console.error("[esign envelope notify completed investor]", e);
    }
  }
}

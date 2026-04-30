import type { NextRequest } from "next/server";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { getAdminAuth } from "@/lib/firebase/admin";

export function requestOriginFromRequest(req: NextRequest): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  if (!host) return "http://localhost:3000";
  return `${proto}://${host}`;
}

export function resendFromAddress(): string {
  return (
    process.env.RESEND_FROM ??
    process.env.OUTREACH_FROM_EMAIL ??
    "CPIN <onboarding@resend.dev>"
  );
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const LOGIN_PATH = "/login";

export type PasswordSetEmailKind = "forgot" | "welcome";

/** Continue URL baked into Firebase action link — user lands here after completing password reset. */
export function passwordResetContinueUrl(originBase: string): string {
  return `${originBase.replace(/\/$/, "")}${LOGIN_PATH}`;
}

export async function generatePasswordSetLink(email: string, originBase: string): Promise<string> {
  const auth = getAdminAuth();
  const continueUrl = passwordResetContinueUrl(originBase);
  return auth.generatePasswordResetLink(email, {
    url: continueUrl,
    handleCodeInApp: false,
  });
}

function emailSubjectAndHtml(kind: PasswordSetEmailKind, safeHref: string): { subject: string; html: string } {
  if (kind === "welcome") {
    return {
      subject: "Set your CPIN account password",
      html: `
<p>Hi,</p>
<p>An administrator created a CPIN Capital Management account for this email address.</p>
<p><a href="${safeHref}" style="display:inline-block;margin:16px 0;padding:10px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Set your password</a></p>
<p>If the button doesn’t work, paste this link into your browser:</p>
<p style="word-break:break-all;font-size:13px;color:#444">${safeHref}</p>
<p>If you didn’t expect this account, contact your administrator or reply to ask for clarification.</p>
`,
    };
  }
  return {
    subject: "Reset your CPIN password",
    html: `
<p>Hi,</p>
<p>We received a request to reset the password for your CPIN Capital Management account.</p>
<p><a href="${safeHref}" style="display:inline-block;margin:16px 0;padding:10px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Reset password</a></p>
<p>If the button doesn’t work, paste this link into your browser:</p>
<p style="word-break:break-all;font-size:13px;color:#444">${safeHref}</p>
<p>If you didn’t request this, you can ignore this email.</p>
`,
  };
}

/** Sends password-set / reset email via Resend. Caller must verify RESEND_API_KEY is set when needed. */
export async function sendPasswordSetEmail(opts: {
  to: string;
  kind: PasswordSetEmailKind;
  linkHref: string;
}): Promise<void> {
  const safeHref = escapeHtml(opts.linkHref);
  const { subject, html } = emailSubjectAndHtml(opts.kind, safeHref);
  await sendTransactionalEmail({
    from: resendFromAddress(),
    to: opts.to,
    subject,
    html,
  });
}

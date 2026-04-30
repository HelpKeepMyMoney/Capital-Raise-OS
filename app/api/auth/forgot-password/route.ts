import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { getAdminAuth } from "@/lib/firebase/admin";

const BodySchema = z.object({
  email: z.string().trim().email(),
});

function requestOrigin(req: NextRequest): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  if (!host) return "http://localhost:3000";
  return `${proto}://${host}`;
}

function fromAddress(): string {
  return (
    process.env.RESEND_FROM ??
    process.env.OUTREACH_FROM_EMAIL ??
    "CPIN <onboarding@resend.dev>"
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: NextRequest) {
  let unknownBody: unknown;
  try {
    unknownBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(unknownBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const origin = requestOrigin(req);
  const continueUrl = `${origin}/login`;

  if (!process.env.RESEND_API_KEY?.trim()) {
    return NextResponse.json({ ok: true as const, useClientFirebase: true as const });
  }

  try {
    const auth = getAdminAuth();
    let link: string;
    try {
      link = await auth.generatePasswordResetLink(email, {
        url: continueUrl,
        handleCodeInApp: false,
      });
    } catch (err: unknown) {
      const code = typeof err === "object" && err !== null && "code" in err ? String((err as { code: string }).code) : "";
      if (code === "auth/user-not-found" || code === "auth/user-disabled") {
        return NextResponse.json({ ok: true as const });
      }
      throw err;
    }

    const safeHref = escapeHtml(link);
    await sendTransactionalEmail({
      from: fromAddress(),
      to: email,
      subject: "Reset your CPIN password",
      html: `
<p>Hi,</p>
<p>We received a request to reset the password for your CPIN Capital Management account.</p>
<p><a href="${safeHref}" style="display:inline-block;margin:16px 0;padding:10px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Reset password</a></p>
<p>If the button doesn’t work, paste this link into your browser:</p>
<p style="word-break:break-all;font-size:13px;color:#444">${safeHref}</p>
<p>If you didn’t request this, you can ignore this email.</p>
`,
    });

    return NextResponse.json({ ok: true as const });
  } catch (err) {
    console.error("[forgot-password]", err);
    return NextResponse.json(
      { error: "Could not send reset email right now. Try again shortly or contact support." },
      { status: 500 },
    );
  }
}

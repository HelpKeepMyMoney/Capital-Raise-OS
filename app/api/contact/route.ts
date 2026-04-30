import { createHash } from "crypto";
import { FieldValue, type Timestamp } from "firebase-admin/firestore";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { ContactFormSchema } from "@/lib/marketing/contact";

const CONTACT_NOTIFICATION_TO = "helpkeepmymoney@gmail.com";
const DUPLICATE_WINDOW_MS = 120_000;

function fromAddress(): string {
  return (
    process.env.RESEND_FROM ??
    process.env.OUTREACH_FROM_EMAIL ??
    "CPIN <onboarding@resend.dev>"
  );
}

function emailThrottleId(emailNormalized: string): string {
  return createHash("sha256").update(emailNormalized).digest("hex").slice(0, 64);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Generic success responses for spam paths — same shape avoids leaking honeypots */
function genericOk(): NextResponse {
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  let unknownBody: unknown;
  try {
    unknownBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ContactFormSchema.safeParse(unknownBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { name, email, company, raiseSize, message, website } = parsed.data;

  if ((website ?? "").trim() !== "") {
    return genericOk();
  }

  const now = Date.now();

  const emailNormalized = email.trim().toLowerCase();
  const throttleDocId = `email_${emailThrottleId(emailNormalized)}`;
  const db = getAdminFirestore();
  const throttleRef = db.collection("contact_form_throttle").doc(throttleDocId);
  const submissionRef = db.collection("contact_submissions").doc();

  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const ua = req.headers.get("user-agent")?.slice(0, 300) ?? "";
  const ipHash = forwardedFor
    ? createHash("sha256").update(forwardedFor).digest("hex").slice(0, 32)
    : "";

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(throttleRef);
      const prev = snap.data() as { lastSubmissionAt?: Timestamp } | undefined;
      if (snap.exists && prev?.lastSubmissionAt != null) {
        const delta = now - prev.lastSubmissionAt.toMillis();
        if (delta >= 0 && delta < DUPLICATE_WINDOW_MS) {
          throw new Error("duplicate");
        }
      }
      tx.set(throttleRef, {
        lastSubmissionAt: FieldValue.serverTimestamp(),
        emailDomain: emailNormalized.split("@")[1] ?? "",
      });
      tx.set(submissionRef, {
        name,
        email: emailNormalized,
        company: company?.trim() || null,
        raiseSize: raiseSize ?? null,
        message,
        createdAt: FieldValue.serverTimestamp(),
        source: "marketing",
        ua,
        ...(ipHash ? { ipHash } : {}),
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "duplicate") {
      return NextResponse.json({ error: "Please wait before submitting again." }, { status: 429 });
    }
    throw e;
  }

  const html = `
  <div style="font-family: ui-sans-serif, system-ui, sans-serif; line-height:1.6">
    <h2>New CPIN marketing contact</h2>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(emailNormalized)}</p>
    ${company?.trim() ? `<p><strong>Company:</strong> ${escapeHtml(company.trim())}</p>` : ""}
    ${raiseSize ? `<p><strong>Raise size:</strong> ${escapeHtml(raiseSize)}</p>` : ""}
    <hr />
    <pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(message)}</pre>
  </div>`;

  try {
    await sendTransactionalEmail({
      from: fromAddress(),
      to: CONTACT_NOTIFICATION_TO,
      subject: `CPIN contact — ${name.slice(0, 80)}`,
      replyTo: emailNormalized,
      html,
    });
  } catch (mailErr) {
    console.error("contact route: Resend failure", mailErr);
    /** Submission stored; still return generic error so ops can retry via Firestore */
    return NextResponse.json(
      { error: "Saved your message — we could not confirm email delivery yet. We'll follow up shortly." },
      { status: 503 },
    );
  }

  return genericOk();
}

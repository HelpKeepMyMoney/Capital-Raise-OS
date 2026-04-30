import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  generatePasswordSetLink,
  requestOriginFromRequest,
  sendPasswordSetEmail,
} from "@/lib/email/password-set-mail";

const BodySchema = z.object({
  email: z.string().trim().email(),
});

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
  const origin = requestOriginFromRequest(req);

  if (!process.env.RESEND_API_KEY?.trim()) {
    return NextResponse.json({ ok: true as const, useClientFirebase: true as const });
  }

  try {
    try {
      const link = await generatePasswordSetLink(email, origin);
      await sendPasswordSetEmail({ to: email, kind: "forgot", linkHref: link });
    } catch (err: unknown) {
      const code =
        typeof err === "object" && err !== null && "code" in err
          ? String((err as { code: string }).code)
          : "";
      if (code === "auth/user-not-found" || code === "auth/user-disabled") {
        return NextResponse.json({ ok: true as const });
      }
      throw err;
    }

    return NextResponse.json({ ok: true as const });
  } catch (err) {
    console.error("[forgot-password]", err);
    return NextResponse.json(
      { error: "Could not send reset email right now. Try again shortly or contact support." },
      { status: 500 },
    );
  }
}

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { batchUsersProfileDocExist } from "@/lib/firestore/queries";
import { requirePlatformAdminApi } from "@/lib/platform-admin/require-platform-admin";
import { PlatformAdminCreateUserSchema } from "@/lib/platform-admin/schemas";
import { generatePasswordSetLink, requestOriginFromRequest, sendPasswordSetEmail } from "@/lib/email/password-set-mail";
import { getAdminAuth } from "@/lib/firebase/admin";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { randomBytes } from "crypto";

export async function GET(req: NextRequest) {
  const gate = await requirePlatformAdminApi();
  if (!gate.ok) return gate.response;

  const maxResultsParam = req.nextUrl.searchParams.get("maxResults");
  const pageToken = req.nextUrl.searchParams.get("pageToken") ?? undefined;
  const maxResults = Math.min(Math.max(Number(maxResultsParam) || 50, 1), 100);

  const auth = getAdminAuth();
  const list = await auth.listUsers(maxResults, pageToken);

  const uids = list.users.map((u) => u.uid);
  const profileSet = await batchUsersProfileDocExist(uids);

  const users = list.users.map((u) => ({
    uid: u.uid,
    email: u.email ?? null,
    displayName: u.displayName ?? null,
    disabled: Boolean(u.disabled),
    photoURL: u.photoURL ?? null,
    hasProfileDoc: profileSet.has(u.uid),
  }));

  return NextResponse.json({
    users,
    nextPageToken: list.pageToken ?? null,
  });
}

export async function POST(req: NextRequest) {
  const gate = await requirePlatformAdminApi();
  if (!gate.ok) return gate.response;

  if (!process.env.RESEND_API_KEY?.trim()) {
    return NextResponse.json(
      {
        error:
          "RESEND_API_KEY must be set to create users from platform admin (welcome email).",
      },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PlatformAdminCreateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const displayName = parsed.data.displayName;
  const auth = getAdminAuth();
  try {
    await auth.getUserByEmail(email);
    return NextResponse.json({ error: "An account already exists with this email" }, { status: 409 });
  } catch (e: unknown) {
    const code =
      typeof e === "object" && e !== null && "code" in e ? String((e as { code: string }).code) : "";
    if (code !== "auth/user-not-found") {
      console.error("[platform-admin/users POST] getUserByEmail", e);
      return NextResponse.json({ error: "Could not verify email uniqueness" }, { status: 500 });
    }
  }

  const tempPassword = randomBytes(27).toString("base64url");
  let userRecord;
  try {
    userRecord = await auth.createUser({
      email,
      password: tempPassword,
      displayName,
      disabled: false,
      emailVerified: false,
    });
  } catch (e: unknown) {
    const code =
      typeof e === "object" && e !== null && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "auth/email-already-exists") {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    console.error("[platform-admin/users POST] createUser", e);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }

  const uid = userRecord.uid;
  const db = getAdminFirestore();
  const now = Date.now();
  await db.collection(col.users).doc(uid).set(
    {
      email,
      ...(displayName ? { displayName } : {}),
      createdAt: now,
    },
    { merge: true },
  );

  let emailSent = false;
  try {
    const origin = requestOriginFromRequest(req);
    const link = await generatePasswordSetLink(email, origin);
    await sendPasswordSetEmail({ to: email, kind: "welcome", linkHref: link });
    emailSent = true;
  } catch (e) {
    console.error("[platform-admin/users POST] welcome email", e);
    return NextResponse.json(
      {
        ok: false,
        uid,
        emailSent: false,
        error: "User was created but the welcome email could not be sent. Send a reset from another tool or retry.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, uid, emailSent });
}

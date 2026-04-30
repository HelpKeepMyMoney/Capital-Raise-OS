import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";
import { stripUndefinedDeep } from "@/lib/object/strip-undefined-deep";
import { UserContactProfileSchema } from "@/lib/users/patch-contact-profile";

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UserContactProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const cleaned = stripUndefinedDeep(parsed.data) as Record<string, unknown>;
  const db = getAdminFirestore();
  await db.collection(col.users).doc(user.uid).set(cleaned, { merge: true });

  return NextResponse.json({ ok: true });
}

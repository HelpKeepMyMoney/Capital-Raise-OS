import { NextResponse } from "next/server";
import type { DecodedIdToken } from "firebase-admin/auth";
import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { getSessionUser } from "@/lib/auth/session";

export async function requirePlatformAdminApi(): Promise<
  | { ok: true; user: DecodedIdToken }
  | { ok: false; response: NextResponse }
> {
  const user = await getSessionUser();
  if (!user)
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!isPlatformAdmin(user))
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { ok: true, user };
}

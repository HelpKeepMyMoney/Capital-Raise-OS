import { NextRequest, NextResponse } from "next/server";
import { ORG_COOKIE, SESSION_COOKIE, SESSION_MAX_AGE_SEC } from "@/lib/constants";
import { getAdminAuth } from "@/lib/firebase/admin";
import { getMembership } from "@/lib/firestore/queries";

export async function POST(req: NextRequest) {
  const session = req.cookies.get(SESSION_COOKIE)?.value;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const auth = getAdminAuth();
  let decoded;
  try {
    decoded = await auth.verifySessionCookie(session, true);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { organizationId } = (await req.json()) as { organizationId?: string };
  if (!organizationId) {
    return NextResponse.json({ error: "organizationId required" }, { status: 400 });
  }
  const orgs = decoded.orgs as Record<string, string> | undefined;
  if (!orgs || !(organizationId in orgs)) {
    const m = await getMembership(organizationId, decoded.uid);
    if (!m) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ORG_COOKIE, organizationId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SEC,
    path: "/",
  });
  return res;
}

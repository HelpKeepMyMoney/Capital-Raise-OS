import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, ORG_COOKIE, SESSION_MAX_AGE_SEC } from "@/lib/constants";
import { getAdminAuth } from "@/lib/firebase/admin";
import { sessionCookieOptions } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const { idToken, organizationId: preferredOrgId } = (await req.json()) as {
    idToken?: string;
    organizationId?: string;
  };
  if (!idToken) {
    return NextResponse.json({ error: "idToken required" }, { status: 400 });
  }
  const auth = getAdminAuth();
  const decoded = await auth.verifyIdToken(idToken);
  const expiresIn = SESSION_MAX_AGE_SEC * 1000;
  const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
  const res = NextResponse.json({ ok: true, uid: decoded.uid });
  res.cookies.set(SESSION_COOKIE, sessionCookie, sessionCookieOptions());
  const orgs = decoded.orgs as Record<string, string> | undefined;
  if (
    typeof preferredOrgId === "string" &&
    preferredOrgId &&
    orgs &&
    typeof orgs === "object" &&
    preferredOrgId in orgs
  ) {
    res.cookies.set(ORG_COOKIE, preferredOrgId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SEC,
      path: "/",
    });
  } else if (orgs && typeof orgs === "object") {
    const keys = Object.keys(orgs);
    if (keys.length === 1) {
      res.cookies.set(ORG_COOKIE, keys[0]!, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_MAX_AGE_SEC,
        path: "/",
      });
    }
  }
  return res;
}

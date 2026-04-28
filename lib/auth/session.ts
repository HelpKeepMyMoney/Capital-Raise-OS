import { cookies } from "next/headers";
import { SESSION_COOKIE, ORG_COOKIE, SESSION_MAX_AGE_SEC } from "@/lib/constants";
import { getAdminAuth } from "@/lib/firebase/admin";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getMembership, listUserOrganizations } from "@/lib/firestore/queries";

export async function getSessionUser(): Promise<DecodedIdToken | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return await getAdminAuth().verifySessionCookie(raw, true);
  } catch {
    return null;
  }
}

export async function getActiveOrganizationId(
  user: DecodedIdToken,
): Promise<string | null> {
  const jar = await cookies();
  const fromCookie = jar.get(ORG_COOKIE)?.value;
  const orgs = user.orgs as Record<string, string> | undefined;
  if (fromCookie) {
    if (orgs && fromCookie in orgs) return fromCookie;
    const m = await getMembership(fromCookie, user.uid);
    if (m) return fromCookie;
  }
  if (orgs && typeof orgs === "object") {
    const keys = Object.keys(orgs);
    if (keys.length) return keys[0]!;
  }
  const list = await listUserOrganizations(user.uid);
  return list[0]?.org.id ?? null;
}

export async function requireOrgSession(): Promise<{ user: DecodedIdToken; orgId: string } | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const orgId = await getActiveOrganizationId(user);
  if (!orgId) return null;
  return { user, orgId };
}

export function sessionCookieOptions() {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: SESSION_MAX_AGE_SEC,
    path: "/",
  };
}

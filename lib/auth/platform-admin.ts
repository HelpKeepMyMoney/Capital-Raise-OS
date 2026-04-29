import type { DecodedIdToken } from "firebase-admin/auth";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";

function parsePlatformAdminUids(): Set<string> {
  const raw = process.env.PLATFORM_ADMIN_UIDS;
  if (!raw?.trim()) return new Set<string>();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

/** Firebase custom claim for ops tooling; optional beside env allowlist. */
function claimsPlatformAdmin(decoded: DecodedIdToken): boolean {
  const o = decoded as unknown as Record<string, unknown>;
  return o.platform_admin === true || o.platformAdmin === true;
}

export function isPlatformAdmin(user: DecodedIdToken): boolean {
  if (claimsPlatformAdmin(user)) return true;
  const uids = parsePlatformAdminUids();
  return uids.has(user.uid);
}

export async function requirePlatformAdmin(): Promise<DecodedIdToken> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!isPlatformAdmin(user)) redirect("/dashboard");
  return user;
}

import { getAdminAuth } from "@/lib/firebase/admin";

/** Firebase Auth last sign-in time (ms); falls back to account creation time. */
export async function getUserLastSignInMs(uid: string): Promise<number | null> {
  try {
    const u = await getAdminAuth().getUser(uid);
    const iso = u.metadata.lastSignInTime ?? u.metadata.creationTime;
    if (!iso) return null;
    const t = Date.parse(iso);
    return Number.isFinite(t) ? t : null;
  } catch {
    return null;
  }
}

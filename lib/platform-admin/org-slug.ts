import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";

/** True when another organization already uses this slug (optionally excluding one org id during rename). */
export async function orgSlugTaken(
  slug: string,
  excludeOrgId?: string,
): Promise<boolean> {
  const db = getAdminFirestore();
  const dup = await db.collection(col.organizations).where("slug", "==", slug).limit(2).get();
  return dup.docs.some((d) => d.id !== excludeOrgId);
}

import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col } from "@/lib/firestore/paths";

export async function GET(req: NextRequest) {
  const t = req.nextUrl.searchParams.get("t");
  if (!t) {
    return transparentPng();
  }
  const db = getAdminFirestore();
  const q = await db.collection(col.emails).where("openToken", "==", t).limit(1).get();
  if (!q.empty) {
    const doc = q.docs[0]!;
    const cur = (doc.get("openCount") as number) ?? 0;
    await doc.ref.update({ openCount: cur + 1 });
  }
  return transparentPng();
}

function transparentPng() {
  const buf = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
}

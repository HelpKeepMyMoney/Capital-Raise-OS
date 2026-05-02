import type { RoomDocument } from "@/lib/firestore/types";

export type PitchDeckPick = Pick<RoomDocument, "id" | "name" | "kind" | "createdAt" | "mimeType">;

/**
 * Inline deal-room viewer only uses documents explicitly tagged as deck in the data room.
 * When multiple deck files exist, the newest by `createdAt` wins; ties break on `name`.
 */
export function pickPitchDeckDocument(docs: PitchDeckPick[]): PitchDeckPick | null {
  const decks = docs.filter((d) => d.kind === "deck");
  if (decks.length === 0) return null;

  const sorted = decks.slice().sort((a, b) => {
    const tb = b.createdAt ?? 0;
    const ta = a.createdAt ?? 0;
    if (tb !== ta) return tb - ta;
    return a.name.localeCompare(b.name);
  });
  return sorted[0] ?? null;
}

export function isLikelyPdfDeck(doc: Pick<RoomDocument, "name" | "mimeType">): boolean {
  if (doc.mimeType === "application/pdf") return true;
  return doc.name.toLowerCase().endsWith(".pdf");
}

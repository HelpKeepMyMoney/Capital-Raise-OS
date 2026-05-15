import type { RoomDocument } from "@/lib/firestore/types";

/** Minimal shape for slot matching (deal room + data room). */
export type SpotlightPickableDoc = Pick<RoomDocument, "id" | "name" | "kind">;

function byName(a: SpotlightPickableDoc, b: SpotlightPickableDoc) {
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

function firstUnused(
  files: SpotlightPickableDoc[],
  used: Set<string>,
  pred: (d: SpotlightPickableDoc) => boolean,
): SpotlightPickableDoc | undefined {
  const m = files.filter((d) => !used.has(d.id) && pred(d)).sort(byName);
  return m[0];
}

export type InvestorSpotlightRow = { doc: SpotlightPickableDoc; label: string };

/**
 * Up to five “hero” diligence files for the investor portal: pitch deck, PPM, term sheet,
 * financial projections, and articles-style governance docs — one best match per slot.
 */
export function pickInvestorSpotlightDocuments(docs: SpotlightPickableDoc[]): InvestorSpotlightRow[] {
  const files = docs.filter((d) => d.kind !== "folder");
  const used = new Set<string>();
  const rows: InvestorSpotlightRow[] = [];

  function take(doc: SpotlightPickableDoc | undefined, label: string) {
    if (!doc || used.has(doc.id)) return;
    used.add(doc.id);
    rows.push({ doc, label });
  }

  take(firstUnused(files, used, (d) => d.kind === "deck"), "Pitch deck");
  take(firstUnused(files, used, (d) => d.kind === "ppm"), "PPM");

  take(
    firstUnused(files, used, (d) => d.kind === "legal" && /\bterm\s*sheet\b/i.test(d.name)) ??
      firstUnused(files, used, (d) => d.kind === "legal" && /\bterms?\b/i.test(d.name) && !/\brisk\b/i.test(d.name)),
    "Term sheet",
  );

  take(
    firstUnused(files, used, (d) => d.kind === "model" && /\b(projection|financial|forecast)\b/i.test(d.name)) ??
      firstUnused(files, used, (d) => d.kind === "model"),
    "Financial projections",
  );

  take(
    firstUnused(
      files,
      used,
      (d) =>
        (d.kind === "legal" || d.kind === "other") &&
        /\b(article|articles|by-?law|bylaw|certificate|charter|incorporation)\b/i.test(d.name),
    ),
    "Articles",
  );

  return rows.slice(0, 5);
}

import type { RoomDocument } from "@/lib/firestore/types";

/** UI category labels mapped to persisted `RoomDocument.kind`. */
export const DATA_ROOM_KIND_TO_LABEL: Record<RoomDocument["kind"], string> = {
  deck: "Pitch Deck",
  model: "Financial Model",
  ppm: "Legal / PPM",
  video: "Video",
  legal: "Legal Docs",
  other: "Other",
};

export function kindLabel(kind: string): string {
  const k = kind as RoomDocument["kind"];
  return DATA_ROOM_KIND_TO_LABEL[k] ?? kind.replace(/_/g, " ");
}

/** Select options for upload / edit (value = stored kind). */
export const DATA_ROOM_KIND_OPTIONS: { value: RoomDocument["kind"]; label: string }[] = [
  { value: "deck", label: DATA_ROOM_KIND_TO_LABEL.deck },
  { value: "model", label: "Financial Model / Statements" },
  { value: "ppm", label: DATA_ROOM_KIND_TO_LABEL.ppm },
  { value: "legal", label: "Legal Docs" },
  { value: "video", label: DATA_ROOM_KIND_TO_LABEL.video },
  { value: "other", label: DATA_ROOM_KIND_TO_LABEL.other },
];

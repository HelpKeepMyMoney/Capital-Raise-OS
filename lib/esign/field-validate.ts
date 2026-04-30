import type { EsignTemplateField } from "@/lib/firestore/types";
import { normalizeDateFieldValue } from "@/lib/esign/native/pdf";

export function fieldsForRole(
  fields: EsignTemplateField[],
  role: "sponsor" | "investor" | "lp",
): EsignTemplateField[] {
  if (role === "lp") {
    return fields.filter((f) => f.assignee === "investor");
  }
  return fields.filter((f) => f.assignee === role);
}

export function validateFieldPayload(
  defs: EsignTemplateField[],
  values: Record<string, string>,
): { ok: true; normalized: Record<string, string> } | { ok: false; error: string } {
  const normalized: Record<string, string> = {};
  for (const f of defs) {
    if (f.fieldType === "signature") {
      continue;
    }
    const raw = values[f.id];
    const str = raw == null ? "" : String(raw).trim();
    if (f.required !== false && str === "") {
      return { ok: false, error: `Missing field: ${f.label ?? f.id}` };
    }
    if (str === "") continue;
    normalized[f.id] = f.fieldType === "date" ? normalizeDateFieldValue(str) : str;
  }
  return { ok: true, normalized };
}

export function hasAssigneeFields(fields: EsignTemplateField[], assignee: "sponsor" | "investor"): boolean {
  return fields.some((f) => f.assignee === assignee);
}

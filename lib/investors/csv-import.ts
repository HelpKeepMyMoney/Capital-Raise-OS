import {
  InvestorTypeSchema,
  PipelineStageSchema,
  WarmColdSchema,
  type InvestorType,
  type PipelineStage,
  type WarmCold,
} from "@/lib/firestore/types";
import { INVESTOR_TYPE_OPTIONS, PIPELINE_STAGES } from "@/lib/investors/form-options";

export type CsvImportPreviewRow = {
  /** 1-based data row index in the file (excluding header). */
  rowIndex: number;
  ok: boolean;
  errors: string[];
  warnings: string[];
  /** When ok, ready for server `importInvestorsCommit`. */
  payload: CsvImportCommitRow | null;
  /** Truncated summary for the preview table. */
  summary: { firstName: string; lastName: string; email: string };
};

export type CsvImportCommitRow = {
  firstName: string;
  lastName: string;
  email: string;
  investorType: InvestorType;
  warmCold: WarmCold;
  referralSource: string;
  firm?: string;
  title?: string;
  phone?: string;
  website?: string;
  linkedIn?: string;
  location?: string;
  pipelineStage?: PipelineStage;
  relationshipScore?: number;
  investProbability?: number;
  checkSizeMin?: number;
  checkSizeMax?: number;
  committedAmount?: number;
  relationshipOwnerUserId?: string;
  lastContactAt?: number;
  nextFollowUpAt?: number;
  interestedDealIds?: string[];
  notesSummary?: string;
};

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let i = 0;
  let cur = "";
  let inQ = false;
  while (i < line.length) {
    const c = line[i]!;
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 2;
          continue;
        }
        inQ = false;
        i++;
        continue;
      }
      cur += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQ = true;
      i++;
      continue;
    }
    if (c === ",") {
      out.push(cur.trim());
      cur = "";
      i++;
      continue;
    }
    cur += c;
    i++;
  }
  out.push(cur.trim());
  return out;
}

/** Split CSV into header row + data rows (handles `\r\n`). Skips fully empty rows. */
export function splitCsvRows(text: string): { headers: string[]; lines: string[] } | null {
  const normalized = text.replace(/^\uFEFF/, "");
  const rawLines = normalized.split(/\r?\n/).filter((l) => l.length > 0);
  if (rawLines.length === 0) return null;
  const headers = parseCsvLine(rawLines[0]!);
  const lines = rawLines.slice(1).filter((l) => l.trim() !== "");
  return { headers, lines };
}

/** Normalize header cell for lookup (firstname, last_name → consistent key). */
export function normalizeCsvHeaderKey(h: string): string {
  return h
    .trim()
    .replace(/^\uFEFF/, "")
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

/** Map normalized header to canonical export column name (PascalCase keys as stored in template). */
const HEADER_SYNONYMS: Record<string, keyof RawCsvCells> = {
  firstname: "FirstName",
  lastname: "LastName",
  firm: "Firm",
  title: "Title",
  email: "Email",
  phone: "Phone",
  website: "Website",
  linkedin: "LinkedIn",
  location: "Location",
  pipelinestage: "PipelineStage",
  investortype: "InvestorType",
  warmth: "WarmCold",
  warmcold: "WarmCold",
  temperature: "WarmCold",
  relationshipscore: "RelationshipScore",
  relationshipsorepercent: "RelationshipScore",
  score: "RelationshipScore",
  investprobability: "InvestProbability",
  probability: "InvestProbability",
  referralsource: "ReferralSource",
  referral: "ReferralSource",
  checkminsize: "CheckSizeMin",
  checksizemin: "CheckSizeMin",
  checkmaxsize: "CheckSizeMax",
  checksizemax: "CheckSizeMax",
  committedamount: "CommittedAmount",
  committed: "CommittedAmount",
  relationshipowneruserid: "RelationshipOwnerUserId",
  owneruserid: "RelationshipOwnerUserId",
  owner: "RelationshipOwnerUserId",
  lastcontactat: "LastContactAt",
  lastcontact: "LastContactAt",
  nextfollowupat: "NextFollowUpAt",
  nextfollowup: "NextFollowUpAt",
  interesteddeals: "InterestedDeals",
  deals: "InterestedDeals",
  notessummary: "NotesSummary",
  notes: "NotesSummary",
};

type RawCsvCells = Partial<Record<CsvCanonicalHeader, string>>;
type CsvCanonicalHeader =
  | "FirstName"
  | "LastName"
  | "Firm"
  | "Title"
  | "Email"
  | "Phone"
  | "Website"
  | "LinkedIn"
  | "Location"
  | "PipelineStage"
  | "InvestorType"
  | "WarmCold"
  | "RelationshipScore"
  | "InvestProbability"
  | "ReferralSource"
  | "CheckSizeMin"
  | "CheckSizeMax"
  | "CommittedAmount"
  | "RelationshipOwnerUserId"
  | "LastContactAt"
  | "NextFollowUpAt"
  | "InterestedDeals"
  | "NotesSummary";

function cellsFromLine(headers: string[], line: string): RawCsvCells {
  const cells = parseCsvLine(line);
  const row: RawCsvCells = {};
  headers.forEach((h, i) => {
    const key = normalizeCsvHeaderKey(h);
    const canon = HEADER_SYNONYMS[key];
    if (canon && cells[i] !== undefined) {
      row[canon] = cells[i];
    }
  });
  return row;
}

function parseOptionalNumber(raw: string | undefined): { ok: true; n?: number } | { ok: false; message: string } {
  if (raw === undefined || raw.trim() === "") return { ok: true, n: undefined };
  const n = Number(String(raw).replace(/,/g, "").trim());
  if (!Number.isFinite(n)) return { ok: false, message: `Invalid number: "${raw}"` };
  return { ok: true, n };
}

function parseOptionalPositiveInt(raw: string | undefined): { ok: true; n?: number } | { ok: false; message: string } {
  const p = parseOptionalNumber(raw);
  if (!p.ok) return p;
  if (p.n === undefined) return { ok: true, n: undefined };
  if (p.n < 0 || !Number.isInteger(p.n)) return { ok: false, message: `Must be a non-negative integer: "${raw}"` };
  return { ok: true, n: p.n };
}

/** Normalize investor type from slug or label (e.g. `VC`, `family office`). */
export function normalizeInvestorType(raw: string): InvestorType | null {
  const t = raw.trim().toLowerCase().replace(/\s+/g, "_");
  const direct = InvestorTypeSchema.safeParse(t);
  if (direct.success) return direct.data;
  for (const opt of INVESTOR_TYPE_OPTIONS) {
    if (opt.label.toLowerCase().replace(/\s+/g, "") === raw.trim().toLowerCase().replace(/\s+/g, "")) {
      return opt.value;
    }
    if (opt.value.replace(/_/g, "") === t.replace(/_/g, "")) return opt.value;
  }
  return null;
}

function normalizeWarmCold(raw: string): WarmCold | null {
  const x = raw.trim().toLowerCase();
  const p = WarmColdSchema.safeParse(x);
  return p.success ? p.data : null;
}

function normalizePipelineStage(raw: string | undefined): PipelineStage | null {
  if (!raw?.trim()) return null;
  const t = raw.trim().toLowerCase().replace(/\s+/g, "_");
  const p = PipelineStageSchema.safeParse(t);
  return p.success ? p.data : null;
}

function resolveInterestedDealIds(
  raw: string | undefined,
  deals: { id: string; name: string }[],
): { ids: string[]; warnings: string[] } {
  if (!raw?.trim()) return { ids: [], warnings: [] };
  const warnings: string[] = [];
  const parts = raw.split(";").map((s) => s.trim()).filter(Boolean);
  const ids: string[] = [];
  const lowerNameToId = new Map(deals.map((d) => [d.name.trim().toLowerCase(), d.id] as const));
  for (const p of parts) {
    const id = lowerNameToId.get(p.toLowerCase());
    if (id) ids.push(id);
    else warnings.push(`Deal not found (skipped): "${p}"`);
  }
  return { ids, warnings };
}

export function previewInvestorCsvRows(
  text: string,
  deals: { id: string; name: string }[],
): { rows: CsvImportPreviewRow[]; fileError: string | null } {
  const split = splitCsvRows(text);
  if (!split) return { rows: [], fileError: "File is empty." };
  const { headers, lines } = split;
  if (lines.length === 0) return { rows: [], fileError: "No data rows after the header." };

  const requiredCanon: CsvCanonicalHeader[] = [
    "FirstName",
    "LastName",
    "Email",
    "InvestorType",
    "WarmCold",
    "ReferralSource",
  ];
  const headerNormSet = new Set(headers.map((h) => HEADER_SYNONYMS[normalizeCsvHeaderKey(h)]));
  const missing = requiredCanon.filter((k) => !headerNormSet.has(k));
  if (missing.length > 0) {
    return {
      rows: [],
      fileError: `Missing required column(s): ${missing.join(", ")}. Download the latest import template.`,
    };
  }

  const rows: CsvImportPreviewRow[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rowIndex = i + 1;
    const line = lines[i]!;
    const c = cellsFromLine(headers, line);
    const errors: string[] = [];
    const warnings: string[] = [];

    const firstName = (c.FirstName ?? "").trim();
    const lastName = (c.LastName ?? "").trim();
    const email = (c.Email ?? "").trim();
    const referralSource = (c.ReferralSource ?? "").trim();

    if (!firstName) errors.push("First name is required.");
    if (!lastName) errors.push("Last name is required.");
    if (!email) errors.push("Email is required.");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Email is invalid.");

    const itRaw = (c.InvestorType ?? "").trim();
    if (!itRaw) errors.push("Investor type is required.");
    const invType = itRaw ? normalizeInvestorType(itRaw) : null;
    if (itRaw && !invType) errors.push(`Unknown investor type: "${itRaw}". Use template values (e.g. vc, angel).`);

    const wcRaw = (c.WarmCold ?? "").trim();
    if (!wcRaw) errors.push("Warm / cold is required.");
    const wc = wcRaw ? normalizeWarmCold(wcRaw) : null;
    if (wcRaw && !wc) errors.push(`Warm / cold must be "warm" or "cold" (got "${wcRaw}").`);

    if (!referralSource) errors.push("Referral source is required.");

    let pipelineStage: PipelineStage | undefined;
    const stageRaw = (c.PipelineStage ?? "").trim();
    if (stageRaw) {
      const st = normalizePipelineStage(stageRaw);
      if (st) pipelineStage = st;
      else {
        errors.push(
          `Unknown pipeline stage: "${stageRaw}". Expected one of: ${PIPELINE_STAGES.slice(0, 6).join(", ")}…`,
        );
      }
    }

    const rs = parseOptionalNumber(c.RelationshipScore);
    if (!rs.ok) errors.push(rs.message);
    const ip = parseOptionalNumber(c.InvestProbability);
    if (!ip.ok) errors.push(ip.message);
    const cmin = parseOptionalNumber(c.CheckSizeMin);
    if (!cmin.ok) errors.push(cmin.message);
    const cmax = parseOptionalNumber(c.CheckSizeMax);
    if (!cmax.ok) errors.push(cmax.message);
    const camt = parseOptionalNumber(c.CommittedAmount);
    if (!camt.ok) errors.push(camt.message);

    const lc = parseOptionalPositiveInt(c.LastContactAt);
    if (!lc.ok) errors.push(lc.message);
    const nf = parseOptionalPositiveInt(c.NextFollowUpAt);
    if (!nf.ok) errors.push(nf.message);

    if (rs.ok && rs.n !== undefined && (rs.n < 0 || rs.n > 100)) errors.push("Relationship score must be 0–100.");
    if (ip.ok && ip.n !== undefined && (ip.n < 0 || ip.n > 100)) errors.push("Invest probability must be 0–100.");

    const dealRes = resolveInterestedDealIds(c.InterestedDeals, deals);
    warnings.push(...dealRes.warnings);

    const ok = errors.length === 0 && invType != null && wc != null;

    let payload: CsvImportCommitRow | null = null;
    if (ok && invType && wc) {
      payload = {
        firstName,
        lastName,
        email: email.toLowerCase(),
        investorType: invType,
        warmCold: wc,
        referralSource,
      };
      if ((c.Firm ?? "").trim()) payload.firm = c.Firm!.trim();
      if ((c.Title ?? "").trim()) payload.title = c.Title!.trim();
      if ((c.Phone ?? "").trim()) payload.phone = c.Phone!.trim();
      if ((c.Website ?? "").trim()) payload.website = c.Website!.trim();
      if ((c.LinkedIn ?? "").trim()) payload.linkedIn = c.LinkedIn!.trim();
      if ((c.Location ?? "").trim()) payload.location = c.Location!.trim();
      if (pipelineStage) payload.pipelineStage = pipelineStage;
      if (rs.ok && rs.n !== undefined) payload.relationshipScore = rs.n;
      if (ip.ok && ip.n !== undefined) payload.investProbability = ip.n;
      if (cmin.ok && cmin.n !== undefined) payload.checkSizeMin = cmin.n;
      if (cmax.ok && cmax.n !== undefined) payload.checkSizeMax = cmax.n;
      if (camt.ok && camt.n !== undefined) payload.committedAmount = camt.n;
      if ((c.RelationshipOwnerUserId ?? "").trim()) payload.relationshipOwnerUserId = c.RelationshipOwnerUserId!.trim();
      if (lc.ok && lc.n !== undefined) payload.lastContactAt = lc.n;
      if (nf.ok && nf.n !== undefined) payload.nextFollowUpAt = nf.n;
      if (dealRes.ids.length) payload.interestedDealIds = dealRes.ids;
      if ((c.NotesSummary ?? "").trim()) payload.notesSummary = c.NotesSummary!.trim();
    }

    rows.push({
      rowIndex,
      ok,
      errors,
      warnings,
      payload,
      summary: { firstName, lastName, email },
    });
  }

  return { rows, fileError: null };
}

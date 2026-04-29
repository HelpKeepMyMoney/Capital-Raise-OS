import type { Investor, PipelineStage } from "@/lib/firestore/types";
import { isInvestorActive } from "@/lib/investors/investor-kpis";
import type { InvestorToolbarState, LastActivityFilter } from "@/lib/investors/investor-toolbar-types";
import { FILTER_UNSET } from "@/lib/investors/investor-toolbar-types";

const ACTIVE_CONVERSATION_STAGES: PipelineStage[] = [
  "contacted",
  "responded",
  "meeting_scheduled",
  "data_room_opened",
  "due_diligence",
];

function midCheck(inv: Investor): number | null {
  if (inv.checkSizeMin != null && inv.checkSizeMax != null)
    return (inv.checkSizeMin + inv.checkSizeMax) / 2;
  return inv.checkSizeMax ?? inv.checkSizeMin ?? null;
}

function inCheckBucket(inv: Investor, bucket: InvestorToolbarState["filterCheck"]): boolean {
  if (bucket === "any") return true;
  const mid = midCheck(inv);
  if (mid == null) return false;
  switch (bucket) {
    case "25k_100k":
      return mid >= 25000 && mid <= 100000;
    case "100k_500k":
      return mid > 100000 && mid <= 500000;
    case "500k_1m":
      return mid > 500000 && mid <= 1_000_000;
    case "1m_plus":
      return mid > 1_000_000;
    default:
      return true;
  }
}

function matchesLastActivity(inv: Investor, f: LastActivityFilter): boolean {
  if (f === "any") return true;
  const lastTouch = inv.lastContactAt;
  const now = Date.now();
  const d7 = 7 * 86400000;
  const d30 = 30 * 86400000;
  const d90 = 90 * 86400000;
  if (f === "never") return lastTouch == null;
  if (lastTouch == null) return false;
  if (f === "d7") return now - lastTouch <= d7;
  if (f === "d30") return now - lastTouch <= d30;
  if (f === "d90") return now - lastTouch <= d90;
  return true;
}

export function applyInvestorToolbarFilters(
  investors: Investor[],
  toolbar: InvestorToolbarState,
  opts: { showArchived: boolean; activeConversationOnly: boolean },
): Investor[] {
  const q = toolbar.search.trim().toLowerCase();

  return investors.filter((inv) => {
    if (!opts.showArchived && inv.crmStatus === "archived") return false;
    if (opts.showArchived && inv.crmStatus !== "archived") return false;

    if (
      opts.activeConversationOnly &&
      !ACTIVE_CONVERSATION_STAGES.includes(inv.pipelineStage)
    ) {
      return false;
    }

    if (toolbar.filterStage !== "all" && inv.pipelineStage !== toolbar.filterStage) return false;

    if (toolbar.filterType === FILTER_UNSET) {
      if (inv.investorType != null) return false;
    } else if (toolbar.filterType !== "all" && inv.investorType !== toolbar.filterType) {
      return false;
    }

    if (toolbar.filterWarmth === FILTER_UNSET) {
      if (inv.warmCold != null) return false;
    } else if (toolbar.filterWarmth !== "all" && inv.warmCold !== toolbar.filterWarmth) {
      return false;
    }

    if (toolbar.filterOwnerUserId === "__unassigned__") {
      if (inv.relationshipOwnerUserId) return false;
    } else if (
      toolbar.filterOwnerUserId !== "all" &&
      inv.relationshipOwnerUserId !== toolbar.filterOwnerUserId
    ) {
      return false;
    }

    if (!inCheckBucket(inv, toolbar.filterCheck)) return false;

    if (!matchesLastActivity(inv, toolbar.filterLastActivity)) return false;

    if (toolbar.filterDealId !== "all") {
      const ids = inv.interestedDealIds ?? [];
      if (!ids.includes(toolbar.filterDealId)) return false;
    }

    if (q) {
      const hay = `${inv.name ?? ""} ${inv.firm ?? ""} ${inv.notesSummary ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }

    return true;
  });
}

export function filterInvestorsForBoard(
  investors: Investor[],
  toolbar: InvestorToolbarState,
  opts: { showArchived: boolean; activeConversationOnly: boolean },
): Investor[] {
  return applyInvestorToolbarFilters(investors, toolbar, opts).filter((inv) => {
    if (!opts.showArchived) return isInvestorActive(inv);
    return inv.crmStatus === "archived";
  });
}

export function exportInvestorsCsv(
  investors: Investor[],
  deals: { id: string; name: string }[],
): string {
  const headers = [
    "Name",
    "Firm",
    "Stage",
    "Type",
    "Warmth",
    "Score",
    "Probability",
    "CheckMin",
    "CheckMax",
    "Committed",
    "OwnerUserId",
    "LastContact",
    "NextFollowUp",
    "InterestedDeals",
    "NotesSummary",
  ];
  const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const rows = investors.map((inv) =>
    [
      inv.name ?? "",
      inv.firm ?? "",
      inv.pipelineStage,
      inv.investorType ?? "",
      inv.warmCold ?? "",
      inv.relationshipScore ?? "",
      inv.investProbability ?? "",
      inv.checkSizeMin ?? "",
      inv.checkSizeMax ?? "",
      inv.committedAmount ?? "",
      inv.relationshipOwnerUserId ?? "",
      inv.lastContactAt ?? "",
      inv.nextFollowUpAt ?? "",
      (inv.interestedDealIds ?? [])
        .map((id) => deals.find((d) => d.id === id)?.name ?? id)
        .join(";"),
      inv.notesSummary ?? "",
    ]
      .map((c) => escape(String(c)))
      .join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}

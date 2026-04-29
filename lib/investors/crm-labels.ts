import type { Investor } from "@/lib/firestore/types";

/** Executive-facing segment label for cards and filters. */
export function investorSegmentLabel(inv: Investor): string {
  if (inv.linkedUserId) return "Guest LP";
  switch (inv.investorType) {
    case "family_office":
      return "Family office";
    case "high_net_worth":
      return "HNW";
    case "real_estate_lp":
      return "Real estate LP";
    case "institutional":
    case "fund_of_funds":
      return "Institutional LP";
    case "angel":
      return "Angel";
    case "vc":
      return "VC";
    case "corporate":
      return "Corporate";
    default:
      return inv.investorType?.replace(/_/g, " ") ?? "Prospect";
  }
}

export function checkSizeHint(inv: Investor): string | null {
  if (inv.checkSizeMin != null && inv.checkSizeMax != null) {
    return `$${Math.round(inv.checkSizeMin / 1000)}K–$${(inv.checkSizeMax / 1_000_000).toFixed(1)}M`;
  }
  if (inv.checkSizeMax != null) return `Up to $${(inv.checkSizeMax / 1_000_000).toFixed(1)}M`;
  if (inv.checkSizeMin != null) return `From $${Math.round(inv.checkSizeMin / 1000)}K`;
  return null;
}

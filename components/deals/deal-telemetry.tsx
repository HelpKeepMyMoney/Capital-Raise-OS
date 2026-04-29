"use client";

import * as React from "react";

const SESSION_KEY = "deal_telemetry_seen";

type TelemetryEvent =
  | "page_view"
  | "cta_commit_click"
  | "cta_data_room_click"
  | "cta_book_call_click"
  | "cta_express_interest"
  | "cta_download_summary"
  | "cta_view_documents";

function sessionKey(dealId: string, event: TelemetryEvent): string {
  return `${SESSION_KEY}:${dealId}:${event}`;
}

export function useDealPageViewTelemetry(dealId: string | undefined, enabled: boolean) {
  React.useEffect(() => {
    if (!dealId || !enabled) return;
    const k = sessionKey(dealId, "page_view");
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(k)) return;

    void fetch(`/api/deals/${encodeURIComponent(dealId)}/telemetry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "page_view" }),
    }).then((res) => {
      if (res.ok && typeof sessionStorage !== "undefined") sessionStorage.setItem(k, "1");
    });
  }, [dealId, enabled]);
}

export async function trackDealTelemetry(dealId: string, event: TelemetryEvent): Promise<void> {
  await fetch(`/api/deals/${encodeURIComponent(dealId)}/telemetry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event }),
  });
}

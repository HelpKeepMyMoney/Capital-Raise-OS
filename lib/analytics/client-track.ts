"use client";

import { GA4_EVENTS, type Ga4EventName } from "@/lib/analytics/ga4-events";

export function trackGa4(
  event: Ga4EventName,
  params?: Record<string, string | number | boolean | undefined>,
) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event,
    ...params,
  });
  if (typeof window.gtag === "function") {
    window.gtag("event", event, params ?? {});
  }
}

export { GA4_EVENTS };

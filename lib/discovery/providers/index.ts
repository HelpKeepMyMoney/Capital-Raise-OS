import type { DiscoveryProvider } from "@/lib/discovery/types";
import { noopDiscoveryProvider } from "@/lib/discovery/providers/noop";

export function getDiscoveryProviders(): DiscoveryProvider[] {
  const ids = (process.env.DISCOVERY_PROVIDER_IDS ?? "noop").split(",").map((s) => s.trim());
  const registry: Record<string, DiscoveryProvider> = {
    noop: noopDiscoveryProvider,
  };
  return ids.map((id) => registry[id] ?? noopDiscoveryProvider);
}

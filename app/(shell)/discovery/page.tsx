import { DiscoveryClient } from "@/components/discovery-client";

export default function DiscoveryPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Investor discovery</h1>
        <p className="mt-1 text-muted-foreground">
          AI-ranked search across your CRM with pluggable enrichment providers.
        </p>
      </div>
      <DiscoveryClient />
    </div>
  );
}

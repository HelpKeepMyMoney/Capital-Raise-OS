"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DealAnalytics, type DealAnalyticsDTO } from "@/components/deals/deal-analytics";
import { InvitePanel } from "@/components/deals/invite-panel";
import { CommitmentsTable, type CommitmentRow } from "@/components/deals/commitments-table";
import { DealSettingsForm } from "@/components/deals/deal-settings-form";
import type { Deal } from "@/lib/firestore/types";

const TABS = ["analytics", "invite", "commitments", "settings"] as const;
type TabId = (typeof TABS)[number];

function parseTab(v: string | null): TabId {
  if (v === "invite" || v === "commitments" || v === "settings" || v === "analytics") return v;
  return "analytics";
}

export function DealManagerPanel(props: {
  deal: Deal;
  analytics: DealAnalyticsDTO;
  commitments: CommitmentRow[];
  linkedDataRooms: { id: string; name: string }[];
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const tab = parseTab(sp.get("tab"));

  function onTabChange(next: string) {
    const t = parseTab(next);
    const params = new URLSearchParams(sp.toString());
    params.set("tab", t);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  React.useEffect(() => {
    const raw = sp.get("tab");
    if (raw && !TABS.includes(raw as TabId)) {
      const params = new URLSearchParams(sp.toString());
      params.delete("tab");
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [router, sp]);

  return (
    <section className="rounded-2xl border border-border/80 border-dashed border-blue-500/30 bg-blue-500/[0.03] p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-1">
        <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
          Sponsor only
        </p>
        <h2 className="font-heading text-lg font-semibold">Deal manager</h2>
        <p className="text-xs text-muted-foreground">
          Internal tools are hidden from investor guests.
        </p>
      </div>
      <Tabs value={tab} onValueChange={onTabChange} className="w-full">
        <TabsList className="mb-6 flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-muted/50 p-1">
          <TabsTrigger value="analytics" className="rounded-lg">
            Analytics
          </TabsTrigger>
          <TabsTrigger value="invite" className="rounded-lg">
            Invite investors
          </TabsTrigger>
          <TabsTrigger value="commitments" className="rounded-lg">
            Commitments
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-lg">
            Settings
          </TabsTrigger>
        </TabsList>
        <TabsContent value="analytics" className="mt-0">
          <DealAnalytics data={props.analytics} />
        </TabsContent>
        <TabsContent value="invite" className="mt-0">
          <InvitePanel dealId={props.deal.id} />
        </TabsContent>
        <TabsContent value="commitments" className="mt-0">
          <CommitmentsTable rows={props.commitments} />
        </TabsContent>
        <TabsContent value="settings" className="mt-0">
          <DealSettingsForm
            deal={props.deal}
            linkedDataRooms={props.linkedDataRooms}
            onSaved={() => {
              toast.success("Deal updated");
              router.refresh();
            }}
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}

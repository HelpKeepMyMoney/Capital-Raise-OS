"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  OutreachCampaign,
  OutreachCampaignStatus,
  OutreachCampaignType,
  OutreachEvent,
  OutreachRecipient,
  OutreachSequence,
} from "@/lib/firestore/types";
import type { OutreachAudienceFilters, OutreachInvestorOption } from "@/lib/outreach/audience";
import { logOutreach } from "@/lib/outreach/client-execution-log";
import { outreachProcessUserMessage } from "@/lib/outreach/client-execution-log";
import { runCampaignProcess } from "@/lib/outreach/run-campaign-process";
import type { OutreachFunnel, OutreachTimeSeriesPoint } from "@/lib/outreach/analytics";
import { OutreachMetrics } from "@/components/outreach/outreach-metrics";
import { OutreachFilters } from "@/components/outreach/outreach-filters";
import { CampaignTable } from "@/components/outreach/campaign-table";
import { CampaignAnalytics } from "@/components/outreach/campaign-analytics";
import { SequenceBuilder } from "@/components/outreach/sequence-builder";
import { RecipientTable } from "@/components/outreach/recipient-table";
import { OutreachActivityFeed } from "@/components/outreach/outreach-activity-feed";
import { OutreachCopilotPanel } from "@/components/outreach/outreach-copilot-panel";
import { CampaignDetailPanel } from "@/components/outreach/campaign-detail-panel";

export function OutreachDashboard(props: {
  initialCampaigns: OutreachCampaign[];
  initialSequences: OutreachSequence[];
  initialEvents: OutreachEvent[];
  initialFunnel: OutreachFunnel;
  initialTimeSeries: OutreachTimeSeriesPoint[];
  deals: { id: string; name: string }[];
  investors?: OutreachInvestorOption[];
}) {
  const [investors, setInvestors] = React.useState(props.investors ?? []);
  const [campaigns, setCampaigns] = React.useState(props.initialCampaigns);

  React.useEffect(() => {
    if (props.investors?.length) {
      setInvestors(props.investors);
      return;
    }
    void fetch("/api/outreach/investor-options")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { investors?: OutreachInvestorOption[] } | null) => {
        if (json?.investors?.length) setInvestors(json.investors);
      })
      .catch(() => undefined);
  }, [props.investors]);
  const [sequences, setSequences] = React.useState(props.initialSequences);
  const [events, setEvents] = React.useState(props.initialEvents);
  const [funnel, setFunnel] = React.useState(props.initialFunnel);
  const [timeSeries, setTimeSeries] = React.useState(props.initialTimeSeries);
  const [selectedId, setSelectedId] = React.useState<string | undefined>();
  const detailRef = React.useRef<HTMLDivElement>(null);
  const [recipients, setRecipients] = React.useState<
    (OutreachRecipient & { investorName?: string })[]
  >([]);
  const [statusFilter, setStatusFilter] = React.useState<OutreachCampaignStatus | "all">("all");
  const [typeFilter, setTypeFilter] = React.useState<OutreachCampaignType | "all">("all");
  const [dealFilter, setDealFilter] = React.useState<string | "all">("all");
  const [newOpen, setNewOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [activeSequence, setActiveSequence] = React.useState<OutreachSequence | null>(
    props.initialSequences[0] ?? null,
  );

  const selected = campaigns.find((c) => c.id === selectedId);

  const selectCampaign = React.useCallback((id: string) => {
    setSelectedId(id);
    requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, []);

  const filtered = React.useMemo(() => {
    return campaigns.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (typeFilter !== "all" && c.campaignType !== typeFilter) return false;
      if (dealFilter !== "all" && c.relatedDealId !== dealFilter) return false;
      return true;
    });
  }, [campaigns, statusFilter, typeFilter, dealFilter]);

  async function refreshAnalytics(campaignId?: string) {
    const q = campaignId ? `?campaignId=${campaignId}` : "";
    const res = await fetch(`/api/outreach/analytics${q}`);
    if (!res.ok) return;
    const json = (await res.json()) as {
      funnel: OutreachFunnel;
      timeSeries: OutreachTimeSeriesPoint[];
    };
    setFunnel(json.funnel);
    setTimeSeries(json.timeSeries);
  }

  async function refreshCampaignFromServer(campaignId: string) {
    const res = await fetch(`/api/outreach/campaigns/${campaignId}`);
    if (!res.ok) return;
    const json = (await res.json()) as { campaign?: OutreachCampaign };
    if (json.campaign) {
      setCampaigns((prev) => prev.map((c) => (c.id === campaignId ? json.campaign! : c)));
    }
  }

  async function loadRecipients(campaignId: string) {
    const res = await fetch(`/api/outreach/campaigns/${campaignId}`);
    if (res.ok) {
      const json = (await res.json()) as {
        recipients?: (OutreachRecipient & { investorName?: string })[];
      };
      setRecipients(json.recipients ?? []);
    }
    const ev = await fetch(`/api/outreach/events?campaignId=${campaignId}&limit=50`);
    if (ev.ok) {
      const ejson = (await ev.json()) as { events: OutreachEvent[] };
      setEvents(ejson.events);
    }
  }

  React.useEffect(() => {
    if (!selectedId) return;
    void refreshAnalytics(selectedId);
    void loadRecipients(selectedId);
  }, [selectedId]);

  async function createCampaign() {
    if (!newName.trim()) return;
    const res = await fetch("/api/outreach/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(),
        campaignType: "capital_raise",
        audienceFilters: {},
      }),
    });
    if (!res.ok) {
      toast.error("Could not create campaign");
      return;
    }
    const c = (await res.json()) as OutreachCampaign;
    setCampaigns((prev) => [c, ...prev]);
    selectCampaign(c.id);
    setNewOpen(false);
    setNewName("");
    toast.success("Campaign created");
  }

  async function pauseCampaign(id: string) {
    const res = await fetch(`/api/outreach/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "paused" }),
    });
    if (!res.ok) {
      toast.error("Could not pause campaign");
      return;
    }
    const c = (await res.json()) as OutreachCampaign;
    setCampaigns((prev) => prev.map((x) => (x.id === id ? c : x)));
    toast.success("Campaign paused");
  }

  async function resumeCampaign(id: string) {
    const res = await fetch(`/api/outreach/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active" }),
    });
    if (!res.ok) {
      toast.error("Could not resume campaign");
      return;
    }
    const c = (await res.json()) as OutreachCampaign;
    setCampaigns((prev) => prev.map((x) => (x.id === id ? c : x)));
    toast.success("Campaign resumed — running due sequence steps…");
    const result = await runCampaignProcess(id, c.name);
    notifyOutreachProcessResult(result);
    await refreshCampaignFromServer(id);
    if (selectedId === id) {
      void refreshAnalytics(id);
      void loadRecipients(id);
    }
  }

  function handleCampaignDeleted(id: string) {
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    setSelectedId(undefined);
    setRecipients([]);
  }

  async function launchCampaign(id: string, audienceFilters: OutreachAudienceFilters) {
    const res = await fetch(`/api/outreach/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active", audienceFilters }),
    });
    if (!res.ok) {
      toast.error("Launch failed");
      return;
    }
    const c = (await res.json()) as OutreachCampaign;
    setCampaigns((prev) => prev.map((x) => (x.id === id ? c : x)));
    toast.success("Campaign launched — running due sequence steps…");
    logOutreach("Campaign is active; starting sequence processor", {
      campaignId: id,
      campaignName: c.name,
      recipientCount: c.metrics.recipients,
    });
    const result = await runCampaignProcess(id, c.name);
    await refreshCampaignFromServer(id);
    void refreshAnalytics(id);
    void loadRecipients(id);
    notifyOutreachProcessResult(result);
  }

  function notifyOutreachProcessResult(result: Awaited<ReturnType<typeof runCampaignProcess>>) {
    if (!result) return;
    const message = outreachProcessUserMessage(result);
    if (!message) return;
    if (result.emailsSent > 0 || result.errors.length > 0) {
      if (result.errors.length > 0) toast.error(message);
      else toast.success(message);
    } else {
      toast.message(message);
    }
  }

  async function executeCampaignSequence(campaignId: string, campaignName: string) {
    const result = await runCampaignProcess(campaignId, campaignName);
    await refreshCampaignFromServer(campaignId);
    void refreshAnalytics(campaignId);
    void loadRecipients(campaignId);
    notifyOutreachProcessResult(result);
    return result;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <OutreachFilters
          status={statusFilter}
          campaignType={typeFilter}
          dealId={dealFilter}
          deals={props.deals}
          onStatusChange={setStatusFilter}
          onTypeChange={setTypeFilter}
          onDealChange={setDealFilter}
        />
        <Dialog open={newOpen} onOpenChange={setNewOpen}>
          <DialogTrigger
            render={
              <Button className="rounded-full">
                <Plus className="mr-2 size-4" />
                New campaign
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create outreach campaign</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Label>Campaign name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Detroit Affordable Housing Raise"
              />
              <Button onClick={() => void createCampaign()}>Create draft</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <OutreachMetrics funnel={funnel} />

      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="sequences">Sequences</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
            <div className="space-y-4">
              <CampaignTable
                campaigns={filtered}
                selectedId={selectedId}
                onSelect={selectCampaign}
              />
              {selected ? (
                <CampaignDetailPanel
                  ref={detailRef}
                  campaign={selected}
                  deals={props.deals}
                  sequences={sequences}
                  investors={investors}
                  onUpdated={(c) =>
                    setCampaigns((prev) => prev.map((x) => (x.id === c.id ? c : x)))
                  }
                  onLaunch={(id, audienceFilters) => void launchCampaign(id, audienceFilters)}
                  onPause={(id) => void pauseCampaign(id)}
                  onResume={(id) => void resumeCampaign(id)}
                  onDeleted={handleCampaignDeleted}
                  onExecuteSequence={executeCampaignSequence}
                />
              ) : filtered.length > 0 ? (
                <p className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                  Select a campaign in the table to configure deal, sequence, and launch settings.
                </p>
              ) : null}
              <CampaignAnalytics funnel={funnel} timeSeries={timeSeries} />
              <RecipientTable recipients={recipients} />
            </div>
            <div className="space-y-4">
              <OutreachCopilotPanel
                campaignName={selected?.name}
                dealName={props.deals.find((d) => d.id === selected?.relatedDealId)?.name}
              />
              <OutreachActivityFeed events={events} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sequences">
          <div className="mb-4 flex flex-wrap gap-2">
            {sequences.map((s) => (
              <Button
                key={s.id}
                size="sm"
                variant={activeSequence?.id === s.id ? "default" : "outline"}
                onClick={() => setActiveSequence(s)}
              >
                {s.name}
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={() => setActiveSequence(null)}>
              + New
            </Button>
          </div>
          <SequenceBuilder
            sequence={activeSequence}
            onSaved={(seq) => {
              setSequences((prev) => {
                const ix = prev.findIndex((x) => x.id === seq.id);
                if (ix === -1) return [seq, ...prev];
                const next = [...prev];
                next[ix] = seq;
                return next;
              });
              setActiveSequence(seq);
            }}
          />
        </TabsContent>

        <TabsContent value="activity">
          <OutreachActivityFeed events={events} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

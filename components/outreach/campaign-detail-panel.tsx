"use client";

import * as React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CampaignInvestorPicker } from "@/components/outreach/campaign-investor-picker";
import type { OutreachCampaign, OutreachSequence } from "@/lib/firestore/types";
import {
  type CampaignAudienceMode,
  type OutreachAudienceFilters,
  type OutreachInvestorOption,
  audienceFiltersEqual,
  buildCampaignAudienceFilters,
  getCampaignAudienceMode,
} from "@/lib/outreach/audience";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_VARIANT: Record<OutreachCampaign["status"], "secondary" | "default" | "outline"> = {
  draft: "secondary",
  active: "default",
  paused: "outline",
  completed: "secondary",
};

export const CampaignDetailPanel = React.forwardRef<
  HTMLDivElement,
  {
    campaign: OutreachCampaign;
    deals: { id: string; name: string }[];
    sequences: OutreachSequence[];
    investors?: OutreachInvestorOption[];
    onUpdated: (campaign: OutreachCampaign) => void;
    onLaunch: (id: string, audienceFilters: OutreachAudienceFilters) => void;
    onPause: (id: string) => void;
    onResume: (id: string) => void;
    onDeleted: (id: string) => void;
    onExecuteSequence?: (id: string, name: string) => Promise<unknown>;
  }
>(function CampaignDetailPanel(props, ref) {
  const { campaign, deals, sequences } = props;
  const investors = props.investors ?? [];
  const [name, setName] = React.useState(campaign.name);
  const [description, setDescription] = React.useState(campaign.description ?? "");
  const [relatedDealId, setRelatedDealId] = React.useState(campaign.relatedDealId ?? "");
  const [sequenceId, setSequenceId] = React.useState(campaign.sequenceId ?? "");
  const [audienceMode, setAudienceMode] = React.useState<CampaignAudienceMode>(() =>
    getCampaignAudienceMode(campaign.audienceFilters ?? {}, campaign.relatedDealId),
  );
  const [pickedInvestorIds, setPickedInvestorIds] = React.useState<string[]>(
    () => campaign.audienceFilters?.investorIds ?? [],
  );
  const [saving, setSaving] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [executing, setExecuting] = React.useState(false);

  const isDraft = campaign.status === "draft";
  const isPaused = campaign.status === "paused";
  const isActive = campaign.status === "active";
  const canEditSettings = isDraft || isPaused;
  const canEditAudience = isDraft;
  const canDelete = isDraft || isPaused;

  const dealLabel = React.useMemo(() => {
    if (!relatedDealId) return "No deal linked";
    return deals.find((d) => d.id === relatedDealId)?.name ?? relatedDealId;
  }, [relatedDealId, deals]);

  const sequenceLabel = React.useMemo(() => {
    if (!sequenceId) return "No sequence";
    return sequences.find((s) => s.id === sequenceId)?.name ?? sequenceId;
  }, [sequenceId, sequences]);

  React.useEffect(() => {
    setName(campaign.name);
    setDescription(campaign.description ?? "");
    setRelatedDealId(campaign.relatedDealId ?? "");
    setSequenceId(campaign.sequenceId ?? "");
    setAudienceMode(getCampaignAudienceMode(campaign.audienceFilters ?? {}, campaign.relatedDealId));
    setPickedInvestorIds(campaign.audienceFilters?.investorIds ?? []);
  }, [campaign]);

  React.useEffect(() => {
    if (audienceMode === "deal_interest" && !relatedDealId) {
      setAudienceMode("all");
    }
  }, [audienceMode, relatedDealId]);

  const audienceFilters = React.useMemo(
    () =>
      buildCampaignAudienceFilters(audienceMode, {
        relatedDealId,
        investorIds: pickedInvestorIds,
      }),
    [audienceMode, relatedDealId, pickedInvestorIds],
  );

  const savedAudienceFilters = campaign.audienceFilters ?? {};
  const audienceDirty = !audienceFiltersEqual(audienceFilters, savedAudienceFilters);

  const dirty =
    name.trim() !== campaign.name ||
    description !== (campaign.description ?? "") ||
    relatedDealId !== (campaign.relatedDealId ?? "") ||
    sequenceId !== (campaign.sequenceId ?? "") ||
    audienceDirty;

  const enabledSequenceSteps = React.useMemo(() => {
    if (!sequenceId) return 0;
    const seq = sequences.find((s) => s.id === sequenceId);
    return (seq?.steps ?? []).filter((s) => s.enabled).length;
  }, [sequenceId, sequences]);

  const launchBlocked =
    (audienceMode === "hand_picked" && pickedInvestorIds.length === 0) ||
    !sequenceId ||
    enabledSequenceSteps === 0;

  async function save(opts?: { silent?: boolean }): Promise<boolean> {
    if (!name.trim()) {
      toast.error("Campaign name is required");
      return false;
    }
    if (canEditAudience && audienceMode === "hand_picked" && pickedInvestorIds.length === 0) {
      toast.error("Select at least one investor for a hand-picked campaign");
      return false;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/outreach/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          relatedDealId: relatedDealId || undefined,
          sequenceId: sequenceId || undefined,
          ...(canEditAudience ? { audienceFilters } : {}),
        }),
      });
      if (!res.ok) {
        let message = "Could not save campaign";
        try {
          const err = (await res.json()) as { error?: unknown };
          if (typeof err.error === "string") message = err.error;
          else if (err.error && typeof err.error === "object" && "formErrors" in err.error) {
            const flat = err.error as { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
            const parts = [
              ...(flat.formErrors ?? []),
              ...Object.entries(flat.fieldErrors ?? {}).flatMap(([k, v]) =>
                (v ?? []).map((msg) => `${k}: ${msg}`),
              ),
            ];
            if (parts[0]) message = parts[0];
          }
        } catch {
          /* ignore */
        }
        toast.error(message);
        return false;
      }
      const updated = (await res.json()) as OutreachCampaign;
      props.onUpdated(updated);
      if (!opts?.silent) toast.success("Campaign saved");
      return true;
    } finally {
      setSaving(false);
    }
  }

  async function handleLaunch() {
    if (launchBlocked) {
      if (!sequenceId) toast.error("Attach an email sequence before launching");
      else if (enabledSequenceSteps === 0) toast.error("Enable at least one step in the sequence");
      else toast.error("Select at least one investor, or change audience to automatic");
      return;
    }
    if (canEditSettings) {
      const ok = await save({ silent: true });
      if (!ok) return;
    } else if (dirty) {
      toast.error("Save changes before launching");
      return;
    }
    const filtersToEnroll = canEditAudience
      ? audienceFilters
      : (campaign.audienceFilters ?? {});
    props.onLaunch(campaign.id, filtersToEnroll);
  }

  async function handleExecuteSequence() {
    if (!props.onExecuteSequence) return;
    setExecuting(true);
    try {
      await props.onExecuteSequence(campaign.id, campaign.name);
    } finally {
      setExecuting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/outreach/campaigns/${campaign.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Could not delete campaign");
        return;
      }
      toast.success("Campaign deleted");
      setDeleteOpen(false);
      props.onDeleted(campaign.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card
      ref={ref}
      className="scroll-mt-24 rounded-2xl border-primary/25 bg-card shadow-sm ring-1 ring-primary/15"
    >
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0 pb-3">
        <div className="min-w-0 flex-1 space-y-1">
          {canEditSettings ? (
            <Field label="Campaign name" className="max-w-md">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="font-heading text-base font-semibold"
              />
            </Field>
          ) : (
            <CardTitle className="font-heading text-xl font-semibold">{campaign.name}</CardTitle>
          )}
          <CampaignMeta campaign={campaign} />
        </div>
        <div className="flex flex-wrap gap-2">
          {isDraft ? (
            <Button size="sm" disabled={launchBlocked} onClick={handleLaunch}>
              Launch campaign
            </Button>
          ) : null}
          {isActive ? (
            <>
              <Button
                size="sm"
                disabled={executing || !props.onExecuteSequence}
                onClick={() => void handleExecuteSequence()}
              >
                {executing ? "Running…" : "Run due emails"}
              </Button>
              <Button size="sm" onClick={() => props.onPause(campaign.id)}>
                Pause
              </Button>
            </>
          ) : null}
          {isPaused ? (
            <Button size="sm" onClick={() => props.onResume(campaign.id)}>
              Resume
            </Button>
          ) : null}
          {canEditSettings && dirty ? (
            <Button size="sm" disabled={saving} onClick={() => void save()}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          ) : null}
          {canDelete ? (
            <Button size="sm" onClick={() => setDeleteOpen(true)}>
              Delete
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {isActive ? (
          <p className="text-sm text-muted-foreground sm:col-span-2">
            Due emails run when you click <strong className="font-medium text-foreground">Run due emails</strong>{" "}
            (logged in the browser console as{" "}
            <code className="rounded bg-muted px-1 text-xs">[CapitalOS Outreach]</code>). In production,
            the queue also runs about every 15 minutes. Later sequence steps follow each step&apos;s delay
            (days) after the previous email sends.
          </p>
        ) : null}
        {isPaused ? (
          <p className="text-sm text-muted-foreground sm:col-span-2">
            Outreach is paused. You can edit the name, deal, sequence, and notes. Audience rules are
            locked after launch.
          </p>
        ) : null}
        <Field label="Related deal">
          <Select
            value={relatedDealId || "none"}
            onValueChange={(v) => setRelatedDealId(v === "none" ? "" : (v ?? ""))}
            disabled={!canEditSettings}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="No deal linked">{dealLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No deal linked</SelectItem>
              {deals.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Email sequence">
          <Select
            value={sequenceId || "none"}
            onValueChange={(v) => setSequenceId(v === "none" ? "" : (v ?? ""))}
            disabled={!canEditSettings}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="No sequence">{sequenceLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No sequence</SelectItem>
              {sequences.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-muted-foreground">
            Build sequences on the Sequences tab, then attach one here before launch.
          </p>
        </Field>
        <Field label="Audience" className="sm:col-span-2">
          <div className="space-y-4 rounded-xl border border-border/80 bg-muted/20 p-4 text-sm">
            <p className="text-foreground/90">
              Investors must exist in{" "}
              <Link
                href="/investors"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Investor CRM
              </Link>{" "}
              with an email on file. Save your audience, then launch to enroll recipients.
            </p>
            {!canEditAudience ? (
              <SavedAudienceSummary
                campaign={campaign}
                investors={investors}
              />
            ) : (
              <AudienceModeOptions
                mode={audienceMode}
                relatedDealId={relatedDealId}
                disabled={!canEditAudience}
                onModeChange={setAudienceMode}
              />
            )}
            {canEditAudience ? null : (
              <p className="text-xs text-muted-foreground">
                Audience cannot be changed after launch. Delete and recreate the campaign to change
                recipients.
              </p>
            )}
            {audienceMode === "hand_picked" ? (
              <CampaignInvestorPicker
                investors={investors}
                selectedIds={pickedInvestorIds}
                onChange={setPickedInvestorIds}
                disabled={!canEditAudience}
              />
            ) : null}
            {audienceMode === "all" ? (
              <p className="text-xs text-muted-foreground">
                Launch enrolls all active CRM investors who have an email (up to 500).
              </p>
            ) : null}
            {audienceMode === "deal_interest" ? (
              <p className="text-xs text-muted-foreground">
                Launch enrolls investors who marked interest in the linked deal and have an email.
              </p>
            ) : null}
          </div>
        </Field>
        <Field label="Internal notes" className="sm:col-span-2">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Audience notes, talking points, or launch checklist for your team."
            rows={3}
            disabled={!canEditSettings}
          />
        </Field>
      </CardContent>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete campaign?</DialogTitle>
            <DialogDescription>
              {isPaused && campaign.metrics.recipients > 0
                ? `This removes "${campaign.name}" and its configuration. ${campaign.metrics.recipients} enrolled recipients will remain in history but no longer receive outreach from this campaign.`
                : `This permanently removes "${campaign.name}". This cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => void handleDelete()}
            >
              {deleting ? "Deleting…" : "Delete campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
});

function SavedAudienceSummary(props: {
  campaign: OutreachCampaign;
  investors: OutreachInvestorOption[];
}) {
  const mode = getCampaignAudienceMode(
    props.campaign.audienceFilters ?? {},
    props.campaign.relatedDealId,
  );
  const pickedIds = props.campaign.audienceFilters?.investorIds ?? [];
  const pickedNames = pickedIds
    .map((id) => props.investors.find((i) => i.id === id)?.name ?? id)
    .slice(0, 8);

  if (mode === "hand_picked") {
    return (
      <div className="space-y-1">
        <p className="font-medium text-foreground">
          Hand-picked audience · {pickedIds.length} investor{pickedIds.length === 1 ? "" : "s"}
        </p>
        {pickedNames.length > 0 ? (
          <p className="text-xs text-muted-foreground">{pickedNames.join(", ")}</p>
        ) : null}
      </div>
    );
  }

  if (mode === "deal_interest") {
    return (
      <p className="font-medium text-foreground">
        Investors who marked interest in the linked deal
      </p>
    );
  }

  return <p className="font-medium text-foreground">All CRM investors with an email on file</p>;
}

function AudienceModeOptions(props: {
  mode: CampaignAudienceMode;
  relatedDealId: string;
  disabled?: boolean;
  onModeChange: (mode: CampaignAudienceMode) => void;
}) {
  const options: { value: CampaignAudienceMode; label: string; hint?: string }[] = [
    { value: "all", label: "All CRM investors (with email)" },
    {
      value: "deal_interest",
      label: "Investors interested in linked deal",
      hint: props.relatedDealId ? undefined : "Link a deal above first",
    },
    { value: "hand_picked", label: "Hand-pick investors" },
  ];

  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const disabled =
          props.disabled || (opt.value === "deal_interest" && !props.relatedDealId);
        return (
          <label
            key={opt.value}
            className={cn(
              "flex cursor-pointer items-start gap-2",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            <input
              type="radio"
              name="audience-mode"
              className="mt-1"
              checked={props.mode === opt.value}
              disabled={disabled}
              onChange={() => props.onModeChange(opt.value)}
            />
            <span>
              <span className="font-medium text-foreground">{opt.label}</span>
              {opt.hint ? (
                <span className="ml-1 text-xs text-muted-foreground">({opt.hint})</span>
              ) : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}

function CampaignMeta({ campaign }: { campaign: OutreachCampaign }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <Badge variant={STATUS_VARIANT[campaign.status]} className="capitalize">
        {campaign.status}
      </Badge>
      <span className="capitalize">{campaign.campaignType.replace(/_/g, " ")}</span>
      <span className="tabular-nums">
        {campaign.metrics.recipients} recipients · {campaign.metrics.sent} sent
      </span>
    </div>
  );
}

function Field(props: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", props.className)}>
      <Label>{props.label}</Label>
      {props.children}
    </div>
  );
}

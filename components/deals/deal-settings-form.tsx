"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  WHY_INVEST_NARRATIVE_FIELD_DEFS,
  type WhyInvestNarrativeFieldKey,
} from "@/lib/deals/why-invest-narrative";
import type { Deal, DealStatus, DealType } from "@/lib/firestore/types";
import { Plus, Trash2 } from "lucide-react";

type TractionFormRow = { key: string; label: string; value: string; hint: string };

function newTractionRow(): TractionFormRow {
  return { key: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, label: "", value: "", hint: "" };
}

const TYPES: { value: DealType; label: string }[] = [
  { value: "startup_equity", label: "Startup equity" },
  { value: "safe", label: "SAFE" },
  { value: "convertible_note", label: "Convertible note" },
  { value: "real_estate_syndication", label: "Real estate syndication" },
  { value: "lp_fund", label: "LP fund" },
  { value: "revenue_share", label: "Revenue share" },
  { value: "private_bond", label: "Private bond" },
];

const STATUSES: { value: DealStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "closing", label: "Closing" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
];

function numOrUndef(s: string): number | undefined {
  const t = s.replace(/,/g, "").trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function narrativeRecordFromDeal(deal: Deal): Record<WhyInvestNarrativeFieldKey, string> {
  return Object.fromEntries(
    WHY_INVEST_NARRATIVE_FIELD_DEFS.map(({ key }) => [key, (deal[key] as string | undefined) ?? ""]),
  ) as Record<WhyInvestNarrativeFieldKey, string>;
}

type OrgRoomRow = { id: string; name: string; dealId: string | null };

/** Sentinel — must match a SelectItem so the control stays controlled (never `undefined`). */
const ROOM_LINK_NONE = "__room_link_none__";

export function DealSettingsForm(props: {
  deal: Deal;
  linkedDataRooms: { id: string; name: string }[];
  onSaved: () => void;
}) {
  const router = useRouter();
  const d = props.deal;
  const [pending, setPending] = React.useState(false);

  const [name, setName] = React.useState(d.name);
  const [tagline, setTagline] = React.useState(d.tagline ?? "");
  const [industry, setIndustry] = React.useState(d.industry ?? "");
  const [stage, setStage] = React.useState(d.stage ?? "");
  const [type, setType] = React.useState<DealType>(d.type);
  const [status, setStatus] = React.useState<DealStatus>(d.status);
  const [targetRaise, setTargetRaise] = React.useState(
    d.targetRaise != null ? String(d.targetRaise) : "",
  );
  const [minimumInvestment, setMinimumInvestment] = React.useState(
    d.minimumInvestment != null ? String(d.minimumInvestment) : "",
  );
  const [valuation, setValuation] = React.useState(
    d.valuation != null ? String(d.valuation) : "",
  );
  const [closeDate, setCloseDate] = React.useState(
    d.closeDate ? new Date(d.closeDate).toISOString().slice(0, 10) : "",
  );
  const [calendarBookingUrl, setCalendarBookingUrl] = React.useState(
    d.calendarBookingUrl ?? "",
  );
  const [logoUrl, setLogoUrl] = React.useState(d.logoUrl ?? "");
  const [whyInvestNarrative, setWhyInvestNarrative] = React.useState<Record<
    WhyInvestNarrativeFieldKey,
    string
  >>(() => narrativeRecordFromDeal(d));
  const [sponsorProfile, setSponsorProfile] = React.useState(d.sponsorProfile ?? "");
  const [useOfProceeds, setUseOfProceeds] = React.useState(d.useOfProceeds ?? "");
  const [returnsModel, setReturnsModel] = React.useState(d.returnsModel ?? "");
  const [terms, setTerms] = React.useState(d.terms ?? "");
  const [jurisdiction, setJurisdiction] = React.useState(d.jurisdiction ?? "");
  const [eligibility, setEligibility] = React.useState(d.eligibility ?? "");

  const [showDataRoom, setShowDataRoom] = React.useState(d.cta?.showDataRoom !== false);
  const [showBookCall, setShowBookCall] = React.useState(d.cta?.showBookCall !== false);

  const [orgRooms, setOrgRooms] = React.useState<OrgRoomRow[] | null>(null);
  const [roomLinkPick, setRoomLinkPick] = React.useState<string>(ROOM_LINK_NONE);
  const [roomLinkPending, setRoomLinkPending] = React.useState(false);
  const [logoPreviewFailed, setLogoPreviewFailed] = React.useState(false);

  const logoTrimmed = logoUrl.trim();

  React.useEffect(() => {
    setLogoPreviewFailed(false);
  }, [logoUrl]);

  async function refetchOrgRooms() {
    try {
      const res = await fetch("/api/data-room/rooms");
      if (!res.ok) return;
      const data = (await res.json()) as { rooms?: OrgRoomRow[] };
      if (data.rooms) setOrgRooms(data.rooms);
    } catch {
      /* ignore */
    }
  }

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/data-room/rooms");
        if (!res.ok) return;
        const data = (await res.json()) as { rooms?: OrgRoomRow[] };
        if (!cancelled && data.rooms) setOrgRooms(data.rooms);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function patchRoomDealLink(roomId: string, dealId: string | null) {
    setRoomLinkPending(true);
    try {
      const res = await fetch(`/api/data-room/rooms/${encodeURIComponent(roomId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      toast.success(dealId ? "Data room linked to this deal" : "Data room unlinked");
      setRoomLinkPick(ROOM_LINK_NONE);
      await refetchOrgRooms();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setRoomLinkPending(false);
    }
  }

  const linkableRooms =
    orgRooms?.filter((r) => r.dealId !== d.id) ?? [];

  const [tractionRows, setTractionRows] = React.useState<TractionFormRow[]>(() =>
    (d.tractionMetrics?.length
      ? d.tractionMetrics
      : []).map((m, i) => ({
      key: `init-${d.id}-${i}`,
      label: m.label,
      value: m.value,
      hint: m.hint ?? "",
    })),
  );

  React.useEffect(() => {
    setWhyInvestNarrative(narrativeRecordFromDeal(props.deal));
  }, [props.deal]);

  React.useEffect(() => {
    const m = props.deal.tractionMetrics ?? [];
    setTractionRows(
      m.map((row, i) => ({
        key: `sync-${props.deal.id}-${i}-${row.label}`,
        label: row.label,
        value: row.value,
        hint: row.hint ?? "",
      })),
    );
  }, [props.deal]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) {
      toast.error("Name is required");
      return;
    }

    const body: Record<string, unknown> = {
      name: n,
      type,
      status,
      tagline: tagline.trim() || null,
      industry: industry.trim() || null,
      stage: stage.trim() || null,
      sponsorProfile: sponsorProfile.trim() || null,
      useOfProceeds: useOfProceeds.trim() || null,
      returnsModel: returnsModel.trim() || null,
      terms: terms.trim() || null,
      jurisdiction: jurisdiction.trim() || null,
      eligibility: eligibility.trim() || null,
      logoUrl: logoUrl.trim() || null,
      calendarBookingUrl: calendarBookingUrl.trim() || null,
      cta: {
        showDataRoom,
        showBookCall,
      },
    };
    for (const { key } of WHY_INVEST_NARRATIVE_FIELD_DEFS) {
      body[key] = whyInvestNarrative[key].trim() || null;
    }

    const tr = numOrUndef(targetRaise);
    const mi = numOrUndef(minimumInvestment);
    const val = numOrUndef(valuation);
    if (tr !== undefined) body.targetRaise = tr;
    else body.targetRaise = null;
    if (mi !== undefined) body.minimumInvestment = mi;
    else body.minimumInvestment = null;
    if (val !== undefined) body.valuation = val;
    else body.valuation = null;

    if (closeDate.trim()) {
      const t = new Date(closeDate).getTime();
      if (Number.isFinite(t)) body.closeDate = t;
    } else body.closeDate = null;

    const tractionMetrics = tractionRows
      .map((r) => ({
        label: r.label.trim(),
        value: r.value.trim(),
        hint: r.hint.trim() || undefined,
      }))
      .filter((r) => r.label.length > 0 && r.value.length > 0);
    body.tractionMetrics = tractionMetrics;
    setPending(true);
    try {
      const res = await fetch(`/api/deals/${encodeURIComponent(d.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      props.onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="max-w-3xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="st-name">Deal name</Label>
          <Input
            id="st-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="st-tag">Tagline</Label>
          <Input
            id="st-tag"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            className="rounded-xl"
            placeholder="One-sentence pitch"
          />
        </div>
        <div className="space-y-2">
          <Label>Security type</Label>
          <Select value={type} onValueChange={(v) => setType(v as DealType)}>
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as DealStatus)}>
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="st-ind">Industry</Label>
          <Input
            id="st-ind"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="st-stage">Stage</Label>
          <Input
            id="st-stage"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="rounded-xl"
            placeholder="e.g. Series A"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="st-tr">Target raise (USD)</Label>
          <Input
            id="st-tr"
            value={targetRaise}
            onChange={(e) => setTargetRaise(e.target.value)}
            className="rounded-xl"
            placeholder="12000000"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="st-min">Minimum investment (USD)</Label>
          <Input
            id="st-min"
            value={minimumInvestment}
            onChange={(e) => setMinimumInvestment(e.target.value)}
            className="rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="st-val">Valuation (USD)</Label>
          <Input
            id="st-val"
            value={valuation}
            onChange={(e) => setValuation(e.target.value)}
            className="rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="st-close">Target close</Label>
          <Input
            id="st-close"
            type="date"
            value={closeDate}
            onChange={(e) => setCloseDate(e.target.value)}
            className="rounded-xl"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="st-cal">Calendar booking URL</Label>
          <Input
            id="st-cal"
            value={calendarBookingUrl}
            onChange={(e) => setCalendarBookingUrl(e.target.value)}
            className="rounded-xl"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="st-logo">Logo URL</Label>
          <Input
            id="st-logo"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            className="rounded-xl"
            placeholder="https://…"
          />
          <p className="text-xs text-muted-foreground">
            Use a direct image URL (usually ends in .png / .jpg / .svg). GitHub &quot;blob&quot; page links are web
            pages, not images — use{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[0.65rem]">raw.githubusercontent.com</code> or host the
            file on your site or a CDN.
          </p>
          {logoTrimmed ? (
            <div className="mt-2 rounded-xl border border-border/80 bg-muted/20 p-3">
              {!logoPreviewFailed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoTrimmed}
                  alt=""
                  className="h-12 w-auto max-w-[140px] object-contain"
                  onError={() => setLogoPreviewFailed(true)}
                />
              ) : (
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  Preview failed — the URL may not point to an image browsers can load. Fix the URL to see the logo
                  on the deal page header.
                </p>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-border/80 bg-muted/15 p-4">
        <div>
          <Label className="text-base">Data room</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Link one or more data rooms to this deal so documents appear under &quot;Documents &amp; data room&quot;
            and investors can open the room from the deal page. Rooms are stored separately; you can also set
            &quot;Linked deal&quot; from the{" "}
            <Link href={`/data-room?deal=${encodeURIComponent(d.id)}`} className="font-medium underline underline-offset-2">
              Data Room
            </Link>{" "}
            workspace.
          </p>
        </div>
        {props.linkedDataRooms.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data room linked yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {props.linkedDataRooms.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-card px-3 py-2"
              >
                <span className="font-medium">{r.name}</span>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/data-room?deal=${encodeURIComponent(d.id)}`}
                    className="text-xs font-medium text-blue-700 underline underline-offset-2 dark:text-blue-300"
                  >
                    Open workspace
                  </Link>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-destructive hover:text-destructive"
                    disabled={roomLinkPending}
                    onClick={() => void patchRoomDealLink(r.id, null)}
                  >
                    Unlink
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Link an existing room</Label>
            <Select
              value={roomLinkPick}
              onValueChange={(v) => setRoomLinkPick(v ?? ROOM_LINK_NONE)}
              disabled={roomLinkPending || linkableRooms.length === 0}
            >
              <SelectTrigger className="rounded-xl w-full sm:min-w-[12rem]">
                <SelectValue placeholder={orgRooms == null ? "Loading rooms…" : linkableRooms.length === 0 ? "No more rooms to link" : "Choose a room…"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ROOM_LINK_NONE} className="text-muted-foreground">
                  Choose a room…
                </SelectItem>
                {linkableRooms.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                    {r.dealId && r.dealId !== d.id ? " (linked to another deal)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="rounded-xl sm:shrink-0"
            disabled={roomLinkPending || roomLinkPick === ROOM_LINK_NONE}
            onClick={() => {
              if (roomLinkPick !== ROOM_LINK_NONE) void patchRoomDealLink(roomLinkPick, d.id);
            }}
          >
            {roomLinkPending ? "Linking…" : "Link to this deal"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showDataRoom}
            onChange={(e) => setShowDataRoom(e.target.checked)}
          />
          Show data room CTA (when a room is linked)
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showBookCall}
            onChange={(e) => setShowBookCall(e.target.checked)}
          />
          Show book call CTA
        </label>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-base">Why invest — investor narrative</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Six short sections shown as cards on the public deal page. Leave blank to hide a card.
          </p>
        </div>
        {WHY_INVEST_NARRATIVE_FIELD_DEFS.map(({ key, title }) => (
          <div key={key} className="space-y-2">
            <Label htmlFor={`st-why-${key}`}>{title}</Label>
            <Textarea
              id={`st-why-${key}`}
              rows={4}
              value={whyInvestNarrative[key]}
              onChange={(e) =>
                setWhyInvestNarrative((prev) => ({ ...prev, [key]: e.target.value }))
              }
              className="rounded-xl"
            />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Label htmlFor="st-sp">Sponsor profile</Label>
        <Textarea
          id="st-sp"
          rows={4}
          value={sponsorProfile}
          onChange={(e) => setSponsorProfile(e.target.value)}
          className="rounded-xl"
        />
      </div>
      <div className="space-y-3 rounded-2xl border border-border/80 bg-muted/20 p-4">
        <div>
          <Label className="text-base">Traction metrics</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            KPI cards on the public deal page (e.g. revenue, users, growth). Label + value are required for each
            row.
          </p>
        </div>
        {tractionRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No metrics yet — add one to populate the Traction section.</p>
        ) : (
          <ul className="space-y-4">
            {tractionRows.map((row, index) => (
              <li
                key={row.key}
                className="grid gap-3 rounded-xl border border-border/70 bg-card p-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
              >
                <div className="space-y-1.5 sm:col-span-1">
                  <Label className="text-xs">Label</Label>
                  <Input
                    value={row.label}
                    onChange={(e) => {
                      const v = e.target.value;
                      setTractionRows((rs) =>
                        rs.map((r, i) => (i === index ? { ...r, label: v } : r)),
                      );
                    }}
                    placeholder="e.g. Active users"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Value</Label>
                  <Input
                    value={row.value}
                    onChange={(e) => {
                      const v = e.target.value;
                      setTractionRows((rs) =>
                        rs.map((r, i) => (i === index ? { ...r, value: v } : r)),
                      );
                    }}
                    placeholder="e.g. 12.4K"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Hint (optional)</Label>
                  <Input
                    value={row.hint}
                    onChange={(e) => {
                      const v = e.target.value;
                      setTractionRows((rs) =>
                        rs.map((r, i) => (i === index ? { ...r, hint: v } : r)),
                      );
                    }}
                    placeholder="YoY, segment, etc."
                    className="rounded-xl"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 rounded-xl text-muted-foreground hover:text-destructive"
                  onClick={() => setTractionRows((rs) => rs.filter((_, i) => i !== index))}
                  aria-label="Remove metric"
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl"
          onClick={() => setTractionRows((rs) => [...rs, newTractionRow()])}
        >
          <Plus className="mr-2 size-4" />
          Add traction metric
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="st-uop">Use of funds (prose)</Label>
        <Textarea
          id="st-uop"
          rows={3}
          value={useOfProceeds}
          onChange={(e) => setUseOfProceeds(e.target.value)}
          className="rounded-xl"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="st-ret">Returns model</Label>
        <Textarea
          id="st-ret"
          rows={3}
          value={returnsModel}
          onChange={(e) => setReturnsModel(e.target.value)}
          className="rounded-xl"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="st-terms">Terms</Label>
        <Textarea
          id="st-terms"
          rows={4}
          value={terms}
          onChange={(e) => setTerms(e.target.value)}
          className="rounded-xl"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="st-jur">Jurisdiction</Label>
        <Input
          id="st-jur"
          value={jurisdiction}
          onChange={(e) => setJurisdiction(e.target.value)}
          className="rounded-xl"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="st-elig">Investor eligibility</Label>
        <Textarea
          id="st-elig"
          rows={2}
          value={eligibility}
          onChange={(e) => setEligibility(e.target.value)}
          className="rounded-xl"
        />
      </div>

      <Button type="submit" disabled={pending} className="rounded-xl">
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}

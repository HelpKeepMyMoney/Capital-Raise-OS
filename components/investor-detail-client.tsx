"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import type {
  Activity,
  Investor,
  InvestorInteractionType,
  InvestorType,
  PipelineStage,
} from "@/lib/firestore/types";
import {
  deleteInvestor,
  deleteInvestorTimelineActivity,
  logInvestorInteraction,
  setInvestorArchived,
  updateInvestor,
  updateInvestorStage,
  updateInvestorTimelineActivity,
} from "@/app/actions/investors";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { investorDisplayName, investorNamePartsForForm } from "@/lib/investors/display-name";
import { PIPELINE_STAGES, pipelineStageLabel } from "@/lib/investors/form-options";
import { InvestorProfileFormFields } from "@/components/investor-profile-form-fields";
import { Pencil, Trash2 } from "lucide-react";

const INTERACTION_TYPES: InvestorInteractionType[] = [
  "call",
  "email",
  "meeting",
  "note",
  "other",
];

function isInteractionActivityType(t: string): t is InvestorInteractionType {
  return INTERACTION_TYPES.includes(t as InvestorInteractionType);
}

function activityTypeLabel(type: string): string {
  if (type === "pipeline_stage_changed") return "Stage";
  if (type === "investor_created") return "Created";
  if (type === "investor_archived") return "Archived";
  if (type === "investor_restored") return "Restored";
  return type.replace(/_/g, " ");
}

export function InvestorDetailClient(props: {
  investor: Investor;
  activities: Activity[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [inv, setInv] = React.useState(props.investor);
  const [activities, setActivities] = React.useState(props.activities);
  const [editOpen, setEditOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setInv(props.investor);
    setActivities(props.activities);
  }, [props.investor, props.activities]);

  const [firstName, setFirstName] = React.useState(() => investorNamePartsForForm(inv).firstName);
  const [lastName, setLastName] = React.useState(() => investorNamePartsForForm(inv).lastName);
  const [firm, setFirm] = React.useState(inv.firm ?? "");
  const [title, setTitle] = React.useState(inv.title ?? "");
  const [email, setEmail] = React.useState(inv.email ?? "");
  const [phone, setPhone] = React.useState(inv.phone ?? "");
  const [website, setWebsite] = React.useState(inv.website ?? "");
  const [linkedIn, setLinkedIn] = React.useState(inv.linkedIn ?? "");
  const [location, setLocation] = React.useState(inv.location ?? "");
  const [investorType, setInvestorType] = React.useState<InvestorType | "">(inv.investorType ?? "");
  const [warmCold, setWarmCold] = React.useState<"warm" | "cold" | "">(inv.warmCold ?? "");
  const [notesSummary, setNotesSummary] = React.useState(inv.notesSummary ?? "");
  const [relationshipScore, setRelationshipScore] = React.useState(
    inv.relationshipScore != null ? String(inv.relationshipScore) : "",
  );
  const [checkMin, setCheckMin] = React.useState(
    inv.checkSizeMin != null ? String(inv.checkSizeMin) : "",
  );
  const [checkMax, setCheckMax] = React.useState(
    inv.checkSizeMax != null ? String(inv.checkSizeMax) : "",
  );
  const [committedAmount, setCommittedAmount] = React.useState(
    inv.committedAmount != null ? String(inv.committedAmount) : "",
  );
  const [nextFollowUpAt, setNextFollowUpAt] = React.useState(() => {
    if (inv.nextFollowUpAt == null) return "";
    const d = new Date(inv.nextFollowUpAt);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });

  React.useEffect(() => {
    if (!editOpen) return;
    const p = investorNamePartsForForm(inv);
    setFirstName(p.firstName);
    setLastName(p.lastName);
    setFirm(inv.firm ?? "");
    setTitle(inv.title ?? "");
    setEmail(inv.email ?? "");
    setPhone(inv.phone ?? "");
    setWebsite(inv.website ?? "");
    setLinkedIn(inv.linkedIn ?? "");
    setLocation(inv.location ?? "");
    setInvestorType(inv.investorType ?? "");
    setWarmCold(inv.warmCold ?? "");
    setNotesSummary(inv.notesSummary ?? "");
    setRelationshipScore(inv.relationshipScore != null ? String(inv.relationshipScore) : "");
    setCheckMin(inv.checkSizeMin != null ? String(inv.checkSizeMin) : "");
    setCheckMax(inv.checkSizeMax != null ? String(inv.checkSizeMax) : "");
    setCommittedAmount(inv.committedAmount != null ? String(inv.committedAmount) : "");
    if (inv.nextFollowUpAt == null) setNextFollowUpAt("");
    else {
      const d = new Date(inv.nextFollowUpAt);
      const pad = (n: number) => String(n).padStart(2, "0");
      setNextFollowUpAt(
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
      );
    }
  }, [editOpen, inv]);

  const [interactionType, setInteractionType] = React.useState<InvestorInteractionType>("note");
  const [interactionSummary, setInteractionSummary] = React.useState("");
  const [logging, setLogging] = React.useState(false);

  const [timelineEdit, setTimelineEdit] = React.useState<Activity | null>(null);
  const [editTimelineSummary, setEditTimelineSummary] = React.useState("");
  const [editTimelineType, setEditTimelineType] =
    React.useState<InvestorInteractionType>("note");
  const [timelineSaving, setTimelineSaving] = React.useState(false);

  async function submitEdit() {
    const fn = firstName.trim();
    if (!fn) {
      toast.error("First name is required");
      return;
    }
    const patch: {
      firstName: string;
      lastName: string | null;
      firm: string | null;
      title: string | null;
      email: string | null;
      phone: string | null;
      website: string | null;
      linkedIn: string | null;
      location: string | null;
      investorType: InvestorType | null;
      warmCold: "warm" | "cold" | null;
      notesSummary: string | null;
      relationshipScore?: number | null;
      checkSizeMin?: number | null;
      checkSizeMax?: number | null;
      committedAmount?: number | null;
      nextFollowUpAt?: number | null;
    } = {
      firstName: fn,
      lastName: lastName.trim() || null,
      firm: firm.trim() || null,
      title: title.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      website: website.trim() || null,
      linkedIn: linkedIn.trim() || null,
      location: location.trim() || null,
      investorType: investorType || null,
      warmCold: warmCold || null,
      notesSummary: notesSummary.trim() || null,
    };

    const rs = relationshipScore.trim();
    if (rs) {
      const v = Number(rs);
      if (!Number.isFinite(v) || v < 0 || v > 100) {
        toast.error("Relationship score must be 0–100");
        return;
      }
      patch.relationshipScore = v;
    } else patch.relationshipScore = null;

    const cmin = checkMin.replace(/,/g, "").trim();
    if (cmin) {
      const v = Number(cmin);
      if (!Number.isFinite(v) || v < 0) {
        toast.error("Invalid minimum check");
        return;
      }
      patch.checkSizeMin = v;
    } else patch.checkSizeMin = null;

    const cmax = checkMax.replace(/,/g, "").trim();
    if (cmax) {
      const v = Number(cmax);
      if (!Number.isFinite(v) || v < 0) {
        toast.error("Invalid maximum check");
        return;
      }
      patch.checkSizeMax = v;
    } else patch.checkSizeMax = null;

    const camt = committedAmount.replace(/,/g, "").trim();
    if (camt) {
      const v = Number(camt);
      if (!Number.isFinite(v) || v < 0) {
        toast.error("Invalid committed amount");
        return;
      }
      patch.committedAmount = v;
    } else patch.committedAmount = null;

    if (nextFollowUpAt.trim()) {
      const t = new Date(nextFollowUpAt).getTime();
      if (!Number.isFinite(t)) {
        toast.error("Invalid follow-up date");
        return;
      }
      patch.nextFollowUpAt = t;
    } else patch.nextFollowUpAt = null;

    setSaving(true);
    try {
      await updateInvestor(inv.id, patch);
      toast.success("Profile updated");
      setEditOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function onStageChange(stage: PipelineStage) {
    if (!props.canManage) return;
    setInv((i) => ({ ...i, pipelineStage: stage }));
    try {
      await updateInvestorStage(inv.id, stage);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update stage");
      router.refresh();
    }
  }

  async function submitInteraction() {
    const s = interactionSummary.trim();
    if (!s) {
      toast.error("Summary is required");
      return;
    }
    setLogging(true);
    try {
      await logInvestorInteraction({
        investorId: inv.id,
        interactionType,
        summary: s,
      });
      toast.success("Interaction logged");
      setInteractionSummary("");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to log");
    } finally {
      setLogging(false);
    }
  }

  async function onArchive(archived: boolean) {
    const label = archived ? "Archive this investor?" : "Restore to pipeline?";
    if (!window.confirm(label)) return;
    try {
      await setInvestorArchived(inv.id, archived);
      toast.success(archived ? "Archived" : "Restored");
      router.push("/investors");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed");
    }
  }

  async function onDelete() {
    if (
      !window.confirm(
        "Permanently delete this investor and their CRM activity log? This cannot be undone.",
      )
    ) {
      return;
    }
    try {
      await deleteInvestor(inv.id);
      toast.success("Investor deleted");
      router.push("/investors");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  function openTimelineEdit(a: Activity) {
    setTimelineEdit(a);
    setEditTimelineSummary(a.summary);
    setEditTimelineType(
      isInteractionActivityType(a.type) ? a.type : "note",
    );
  }

  async function submitTimelineEdit() {
    if (!timelineEdit) return;
    const s = editTimelineSummary.trim();
    if (!s) {
      toast.error("Summary is required");
      return;
    }
    setTimelineSaving(true);
    try {
      await updateInvestorTimelineActivity(inv.id, timelineEdit.id, {
        summary: s,
        ...(isInteractionActivityType(timelineEdit.type)
          ? { interactionType: editTimelineType }
          : {}),
      });
      toast.success("Activity updated");
      setTimelineEdit(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setTimelineSaving(false);
    }
  }

  async function removeTimelineActivity(a: Activity) {
    if (!window.confirm("Remove this activity from the timeline?")) return;
    try {
      await deleteInvestorTimelineActivity(inv.id, a.id);
      toast.success("Activity removed");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/investors"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-2 -ml-2 w-fit px-2")}
          >
            ← Back to CRM
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">{investorDisplayName(inv)}</h1>
          {inv.firm ? <p className="mt-1 text-muted-foreground">{inv.firm}</p> : null}
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">{pipelineStageLabel(inv.pipelineStage)}</Badge>
            {inv.crmStatus === "archived" ? (
              <Badge variant="outline">Archived</Badge>
            ) : null}
            {inv.investorType ? (
              <Badge variant="outline" className="capitalize">
                {inv.investorType.replace(/_/g, " ")}
              </Badge>
            ) : null}
            {inv.warmCold ? (
              <Badge variant="outline" className="capitalize">
                {inv.warmCold}
              </Badge>
            ) : null}
          </div>
        </div>
        {props.canManage ? (
          <div className="flex flex-wrap gap-2">
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Edit profile
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" showCloseButton>
                <DialogHeader>
                  <DialogTitle>Edit investor</DialogTitle>
                </DialogHeader>
                <InvestorProfileFormFields
                  idPrefix="inv-edit"
                  showPipelineStage={false}
                  pipelineStage={inv.pipelineStage}
                  onPipelineStageChange={() => {}}
                  firstName={firstName}
                  onFirstNameChange={setFirstName}
                  lastName={lastName}
                  onLastNameChange={setLastName}
                  firm={firm}
                  onFirmChange={setFirm}
                  title={title}
                  onTitleChange={setTitle}
                  email={email}
                  onEmailChange={setEmail}
                  phone={phone}
                  onPhoneChange={setPhone}
                  location={location}
                  onLocationChange={setLocation}
                  website={website}
                  onWebsiteChange={setWebsite}
                  linkedIn={linkedIn}
                  onLinkedInChange={setLinkedIn}
                  investorType={investorType}
                  onInvestorTypeChange={setInvestorType}
                  warmCold={warmCold}
                  onWarmColdChange={setWarmCold}
                  checkMin={checkMin}
                  onCheckMinChange={setCheckMin}
                  checkMax={checkMax}
                  onCheckMaxChange={setCheckMax}
                  relationshipScore={relationshipScore}
                  onRelationshipScoreChange={setRelationshipScore}
                  committedAmount={committedAmount}
                  onCommittedAmountChange={setCommittedAmount}
                  nextFollowUpAt={nextFollowUpAt}
                  onNextFollowUpChange={setNextFollowUpAt}
                  notesSummary={notesSummary}
                  onNotesSummaryChange={setNotesSummary}
                />
                <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
                  <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="button" disabled={saving} onClick={() => void submitEdit()}>
                    {saving ? "Saving…" : "Save"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void onArchive(inv.crmStatus !== "archived")}
            >
              {inv.crmStatus === "archived" ? "Restore" : "Archive"}
            </Button>
            <Button variant="destructive" size="sm" onClick={() => void onDelete()}>
              Delete
            </Button>
          </div>
        ) : null}
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Pipeline stage</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={inv.pipelineStage}
            disabled={!props.canManage}
            onValueChange={(v) => void onStageChange(v as PipelineStage)}
          >
            <SelectTrigger className="h-9 w-full max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PIPELINE_STAGES.map((s) => (
                <SelectItem key={s} value={s}>
                  {pipelineStageLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Contact & profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {inv.title ? (
              <p>
                <span className="text-muted-foreground">Title:</span> {inv.title}
              </p>
            ) : null}
            {inv.email ? (
              <p>
                <span className="text-muted-foreground">Email:</span> {inv.email}
              </p>
            ) : null}
            {inv.phone ? (
              <p>
                <span className="text-muted-foreground">Phone:</span> {inv.phone}
              </p>
            ) : null}
            {inv.location ? (
              <p>
                <span className="text-muted-foreground">Location:</span> {inv.location}
              </p>
            ) : null}
            {inv.website ? (
              <p>
                <span className="text-muted-foreground">Website:</span>{" "}
                <a href={inv.website} className="text-primary underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
                  {inv.website}
                </a>
              </p>
            ) : null}
            {inv.linkedIn ? (
              <p>
                <span className="text-muted-foreground">LinkedIn:</span>{" "}
                <a href={inv.linkedIn} className="text-primary underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
                  Profile
                </a>
              </p>
            ) : null}
            {inv.checkSizeMin != null && inv.checkSizeMax != null ? (
              <p>
                <span className="text-muted-foreground">Check size:</span> $
                {(inv.checkSizeMin / 1000).toFixed(0)}K – ${(inv.checkSizeMax / 1_000_000).toFixed(1)}M
              </p>
            ) : null}
            {inv.relationshipScore != null ? (
              <p>
                <span className="text-muted-foreground">Relationship score:</span> {inv.relationshipScore}
              </p>
            ) : null}
            {inv.committedAmount != null ? (
              <p>
                <span className="text-muted-foreground">Committed:</span> $
                {inv.committedAmount.toLocaleString()}
              </p>
            ) : null}
            {inv.nextFollowUpAt ? (
              <p>
                <span className="text-muted-foreground">Next follow-up:</span>{" "}
                {new Date(inv.nextFollowUpAt).toLocaleString()}
                {inv.followUpTaskId ? (
                  <>
                    {" · "}
                    <Link
                      href="/tasks"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      Open in Tasks
                    </Link>
                  </>
                ) : null}
              </p>
            ) : null}
            {inv.notesSummary ? (
              <p className="pt-2 text-muted-foreground whitespace-pre-wrap">{inv.notesSummary}</p>
            ) : (
              <p className="text-muted-foreground">No notes summary yet.</p>
            )}
          </CardContent>
        </Card>

        {props.canManage ? (
          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Log interaction</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={interactionType}
                  onValueChange={(v) => setInteractionType(v as InvestorInteractionType)}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERACTION_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="int-sum">Summary</Label>
                <Textarea
                  id="int-sum"
                  rows={4}
                  value={interactionSummary}
                  onChange={(e) => setInteractionSummary(e.target.value)}
                  placeholder="What happened?"
                />
              </div>
              <Button type="button" disabled={logging} onClick={() => void submitInteraction()}>
                {logging ? "Saving…" : "Save to timeline"}
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Activity timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            activities.map((a) => (
              <div
                key={a.id}
                className="group rounded-lg border border-border bg-muted/40 px-3 py-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {activityTypeLabel(a.type)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(a.createdAt, { addSuffix: true })}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium">{a.summary}</p>
                  </div>
                  {props.canManage ? (
                    <div className="flex shrink-0 gap-0.5 opacity-70 transition-opacity group-hover:opacity-100">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Edit activity"
                        onClick={() => openTimelineEdit(a)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Delete activity"
                        onClick={() => void removeTimelineActivity(a)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={timelineEdit != null} onOpenChange={(o) => !o && setTimelineEdit(null)}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Edit activity</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            {timelineEdit && isInteractionActivityType(timelineEdit.type) ? (
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={editTimelineType}
                  onValueChange={(v) => setEditTimelineType(v as InvestorInteractionType)}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERACTION_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="tl-sum">Summary</Label>
              <Textarea
                id="tl-sum"
                rows={4}
                value={editTimelineSummary}
                onChange={(e) => setEditTimelineSummary(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setTimelineEdit(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={timelineSaving}
              onClick={() => void submitTimelineEdit()}
            >
              {timelineSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

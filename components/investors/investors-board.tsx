"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { Investor, InvestorType, PipelineStage } from "@/lib/firestore/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { InvestorProfileFormFields } from "@/components/investor-profile-form-fields";
import type { OrganizationMemberPublic } from "@/lib/firestore/queries";
import {
  createInvestor,
  logInvestorInteraction,
  setInvestorArchived,
  updateInvestorStage,
} from "@/app/actions/investors";
import {
  PIPELINE_STAGES,
  pipelineStageLabel,
} from "@/lib/investors/form-options";
import { computeInvestorKpis } from "@/lib/investors/investor-kpis";
import {
  applyInvestorToolbarFilters,
  exportInvestorsCsv,
  filterInvestorsForBoard,
} from "@/lib/investors/investor-filters";
import {
  DEFAULT_INVESTOR_TOOLBAR_STATE,
  type InvestorToolbarState,
} from "@/lib/investors/investor-toolbar-types";
import { InvestorHeader } from "@/components/investors/InvestorHeader";
import { InvestorMetrics } from "@/components/investors/InvestorMetrics";
import { InvestorToolbar } from "@/components/investors/InvestorToolbar";
import { KanbanBoard } from "@/components/investors/KanbanBoard";
import { InvestorTable } from "@/components/investors/InvestorTable";
import { RelationshipMap } from "@/components/investors/RelationshipMap";
import { InvestorListView } from "@/components/investors/InvestorListView";
import { InvestorCalendarView } from "@/components/investors/InvestorCalendarView";
import { InvestorCopilot } from "@/components/investors/InvestorCopilot";
import { InvestorSearchCommand } from "@/components/investors/InvestorSearchCommand";
import { LayoutGrid, List, Network, Table2, CalendarDays } from "lucide-react";

const PRESETS_STORAGE = "cpin-investor-filter-presets-v1";

type SavedPreset = { id: string; name: string; state: InvestorToolbarState };

export type MainTab = "board" | "table" | "map" | "list" | "calendar";

export function InvestorsBoard(props: {
  initial: Investor[];
  members: OrganizationMemberPublic[];
  deals: { id: string; name: string }[];
  canManage: boolean;
  showArchived: boolean;
  urlStage?: PipelineStage;
  urlFilter?: string;
  initialTab: MainTab;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [investors, setInvestors] = React.useState(props.initial);
  const [mainTab, setMainTab] = React.useState<MainTab>(props.initialTab);
  const [toolbar, setToolbar] = React.useState<InvestorToolbarState>(() => ({
    ...DEFAULT_INVESTOR_TOOLBAR_STATE,
    ...(props.urlStage ? { filterStage: props.urlStage } : {}),
    activeConversationOnly: props.urlFilter === "active",
  }));
  const [addOpen, setAddOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = React.useState(false);
  const [bulkStage, setBulkStage] = React.useState<PipelineStage>("lead");
  const [noteOpen, setNoteOpen] = React.useState(false);
  const [noteInvestorId, setNoteInvestorId] = React.useState<string | null>(null);
  const [noteBody, setNoteBody] = React.useState("");
  const [noteSaving, setNoteSaving] = React.useState(false);
  const [presets, setPresets] = React.useState<SavedPreset[]>([]);

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [firm, setFirm] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [linkedIn, setLinkedIn] = React.useState("");
  const [pipelineStage, setPipelineStage] = React.useState<PipelineStage>("lead");
  const [investorType, setInvestorType] = React.useState<InvestorType | "">("");
  const [warmCold, setWarmCold] = React.useState<"warm" | "cold" | "">("");
  const [checkMin, setCheckMin] = React.useState("");
  const [checkMax, setCheckMax] = React.useState("");
  const [relationshipScore, setRelationshipScore] = React.useState("");
  const [committedAmount, setCommittedAmount] = React.useState("");
  const [nextFollowUpAt, setNextFollowUpAt] = React.useState("");
  const [notesSummary, setNotesSummary] = React.useState("");

  React.useEffect(() => {
    setInvestors(props.initial);
  }, [props.initial]);

  React.useEffect(() => {
    setMainTab(props.initialTab);
  }, [props.initialTab]);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(PRESETS_STORAGE);
      if (raw) setPresets(JSON.parse(raw) as SavedPreset[]);
    } catch {
      /* ignore */
    }
  }, []);

  React.useEffect(() => {
    if (props.urlStage) setToolbar((t) => ({ ...t, filterStage: props.urlStage! }));
    setToolbar((t) => ({ ...t, activeConversationOnly: props.urlFilter === "active" }));
  }, [props.urlStage, props.urlFilter]);

  React.useEffect(() => {
    if (searchParams.get("add") !== "1") return;
    setAddOpen(true);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("add");
    const qs = next.toString();
    router.replace(qs ? `${window.location.pathname}?${qs}` : window.location.pathname, {
      scroll: false,
    });
  }, [searchParams, router]);

  function persistPresets(next: SavedPreset[]) {
    setPresets(next);
    localStorage.setItem(PRESETS_STORAGE, JSON.stringify(next));
  }

  function savePreset(name: string) {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `preset_${Date.now()}`;
    persistPresets([...presets, { id, name, state: { ...toolbar } }]);
    toast.success("Saved view");
  }

  function applyPreset(id: string) {
    const p = presets.find((x) => x.id === id);
    if (p) {
      setToolbar(p.state);
      toast.message(`Applied “${p.name}”`);
    }
  }

  function patchToolbar(patch: Partial<InvestorToolbarState>) {
    setToolbar((t) => ({ ...t, ...patch }));
  }

  function setTab(tab: MainTab) {
    setMainTab(tab);
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", tab);
    router.replace(`/investors?${next.toString()}`, { scroll: false });
  }

  const filtered = React.useMemo(
    () =>
      applyInvestorToolbarFilters(investors, toolbar, {
        showArchived: props.showArchived,
        activeConversationOnly: toolbar.activeConversationOnly,
      }),
    [investors, toolbar, props.showArchived],
  );

  const boardInvestors = React.useMemo(
    () =>
      filterInvestorsForBoard(investors, toolbar, {
        showArchived: props.showArchived,
        activeConversationOnly: toolbar.activeConversationOnly,
      }),
    [investors, toolbar, props.showArchived],
  );

  const kpis = React.useMemo(() => computeInvestorKpis(filtered), [filtered]);

  const grouped = React.useMemo(() => {
    const m = new Map<PipelineStage, Investor[]>();
    for (const s of PIPELINE_STAGES) m.set(s, []);
    for (const inv of boardInvestors) {
      m.get(inv.pipelineStage)?.push(inv);
    }
    return m;
  }, [boardInvestors]);

  function ownerShort(uid: string | undefined) {
    if (!uid) return "Unassigned";
    const mem = props.members.find((x) => x.userId === uid);
    return mem?.displayName ?? mem?.email ?? "Team member";
  }

  async function onStageChange(id: string, stage: PipelineStage) {
    if (!props.canManage) return;
    const prev = investors.find((i) => i.id === id)?.pipelineStage;
    setInvestors((prevList) => prevList.map((i) => (i.id === id ? { ...i, pipelineStage: stage } : i)));
    try {
      await updateInvestorStage(id, stage);
      if (stage === "meeting_scheduled" && prev !== "meeting_scheduled") {
        toast.message("Prep checklist: agenda, deck link, and diligence asks.");
      }
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update stage");
      router.refresh();
    }
  }

  async function onArchive(id: string, archived: boolean) {
    if (!props.canManage) return;
    const label = archived ? "Archive this investor?" : "Restore this investor to the pipeline?";
    if (!window.confirm(label)) return;
    try {
      await setInvestorArchived(id, archived);
      toast.success(archived ? "Archived" : "Restored");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed");
    }
  }

  function resetAddInvestorForm() {
    setFirstName("");
    setLastName("");
    setFirm("");
    setTitle("");
    setEmail("");
    setPhone("");
    setLocation("");
    setWebsite("");
    setLinkedIn("");
    setPipelineStage("lead");
    setInvestorType("");
    setWarmCold("");
    setCheckMin("");
    setCheckMax("");
    setRelationshipScore("");
    setCommittedAmount("");
    setNextFollowUpAt("");
    setNotesSummary("");
  }

  async function submitNewInvestor() {
    const fn = firstName.trim();
    if (!fn) {
      toast.error("First name is required");
      return;
    }
    const payload: Parameters<typeof createInvestor>[0] = {
      firstName: fn,
      lastName: lastName.trim() || undefined,
      firm: firm.trim() || undefined,
      title: title.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      location: location.trim() || undefined,
      website: website.trim() || undefined,
      linkedIn: linkedIn.trim() || undefined,
      pipelineStage,
    };
    if (investorType) payload.investorType = investorType;
    if (warmCold) payload.warmCold = warmCold;
    if (notesSummary.trim()) payload.notesSummary = notesSummary.trim();

    const rs = relationshipScore.trim();
    if (rs) {
      const v = Number(rs);
      if (!Number.isFinite(v) || v < 0 || v > 100) {
        toast.error("Relationship score must be 0–100");
        return;
      }
      payload.relationshipScore = v;
    }

    const cmin = checkMin.replace(/,/g, "").trim();
    if (cmin) {
      const v = Number(cmin);
      if (!Number.isFinite(v) || v < 0) {
        toast.error("Invalid minimum check size");
        return;
      }
      payload.checkSizeMin = v;
    }
    const cmax = checkMax.replace(/,/g, "").trim();
    if (cmax) {
      const v = Number(cmax);
      if (!Number.isFinite(v) || v < 0) {
        toast.error("Invalid maximum check size");
        return;
      }
      payload.checkSizeMax = v;
    }

    const camt = committedAmount.replace(/,/g, "").trim();
    if (camt) {
      const v = Number(camt);
      if (!Number.isFinite(v) || v < 0) {
        toast.error("Invalid committed amount");
        return;
      }
      payload.committedAmount = v;
    }

    if (nextFollowUpAt.trim()) {
      const t = new Date(nextFollowUpAt).getTime();
      if (!Number.isFinite(t)) {
        toast.error("Invalid follow-up date");
        return;
      }
      payload.nextFollowUpAt = t;
    } else payload.nextFollowUpAt = null;

    setSaving(true);
    try {
      await createInvestor(payload);
      toast.success("Investor added");
      toast.message("Tip: set next follow-up to sync a Tasks reminder.");
      setAddOpen(false);
      resetAddInvestorForm();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create investor");
    } finally {
      setSaving(false);
    }
  }

  function handleExportCsv() {
    const csv = exportInvestorsCsv(filtered, props.deals);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `investors-export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported CSV");
  }

  function downloadImportTemplate() {
    const csv = exportInvestorsCsv([], props.deals);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "investors-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.message("Template downloaded — fill rows and re-import when bulk ingest ships.");
  }

  async function submitQuickNote() {
    if (!noteInvestorId) return;
    const s = noteBody.trim();
    if (!s) {
      toast.error("Note required");
      return;
    }
    setNoteSaving(true);
    try {
      await logInvestorInteraction({
        investorId: noteInvestorId,
        interactionType: "note",
        summary: s,
      });
      toast.success("Note logged");
      setNoteOpen(false);
      setNoteBody("");
      setNoteInvestorId(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setNoteSaving(false);
    }
  }

  async function applyBulkStage() {
    if (!props.canManage || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    setBulkOpen(false);
    for (const id of ids) {
      try {
        await updateInvestorStage(id, bulkStage);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Bulk update failed");
        router.refresh();
        return;
      }
    }
    toast.success(`Updated ${ids.length} investors`);
    setSelectedIds(new Set());
    router.refresh();
  }

  const filtersActive =
    toolbar.search.trim() !== "" ||
    toolbar.filterStage !== "all" ||
    toolbar.filterType !== "all" ||
    toolbar.filterWarmth !== "all" ||
    toolbar.filterOwnerUserId !== "all" ||
    toolbar.filterCheck !== "any" ||
    toolbar.filterLastActivity !== "any" ||
    toolbar.filterDealId !== "all" ||
    toolbar.activeConversationOnly;

  function clearFilters() {
    setToolbar({
      ...DEFAULT_INVESTOR_TOOLBAR_STATE,
      activeConversationOnly: false,
    });
  }

  function toggleArchivedUrl(on: boolean) {
    router.push(on ? "/investors?archived=1" : "/investors");
  }

  return (
    <div className="relative space-y-6 pb-28">
      <InvestorHeader
        canManage={props.canManage}
        onAddInvestor={() => setAddOpen(true)}
        onImportCsv={downloadImportTemplate}
      />

      <InvestorMetrics
        totalInvestors={kpis.totalInvestors}
        activeConversations={kpis.activeConversations}
        weightedPipeline={kpis.weightedPipeline}
        hotProspects={kpis.hotProspects}
        meetingsScheduled={kpis.meetingsScheduled}
        committedCapital={kpis.committedCapital}
        totalTrend={kpis.totalTrend}
      />

      <InvestorToolbar
        state={toolbar}
        onChange={patchToolbar}
        members={props.members}
        deals={props.deals}
        savedPresets={presets.map((p) => ({ id: p.id, name: p.name }))}
        onSavePreset={savePreset}
        onApplyPreset={applyPreset}
        onClearFilters={clearFilters}
        filtersActive={filtersActive}
        onExportCsv={handleExportCsv}
        onBulkEdit={() => setBulkOpen(true)}
        onNewInvestor={() => setAddOpen(true)}
        canManage={props.canManage}
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={mainTab} onValueChange={(v) => setTab(v as MainTab)} className="w-full space-y-4">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-2xl border border-border/70 bg-muted/40 p-1.5 shadow-inner md:inline-flex md:w-auto">
            <TabsTrigger value="board" className="rounded-xl px-4 py-2 data-[state=active]:shadow-sm">
              <LayoutGrid className="mr-2 size-4 opacity-70" />
              Kanban
            </TabsTrigger>
            <TabsTrigger value="table" className="rounded-xl px-4 py-2 data-[state=active]:shadow-sm">
              <Table2 className="mr-2 size-4 opacity-70" />
              Table
            </TabsTrigger>
            <TabsTrigger value="map" className="rounded-xl px-4 py-2 data-[state=active]:shadow-sm">
              <Network className="mr-2 size-4 opacity-70" />
              Map
            </TabsTrigger>
            <TabsTrigger value="list" className="rounded-xl px-4 py-2 data-[state=active]:shadow-sm">
              <List className="mr-2 size-4 opacity-70" />
              List
            </TabsTrigger>
            <TabsTrigger value="calendar" className="rounded-xl px-4 py-2 data-[state=active]:shadow-sm">
              <CalendarDays className="mr-2 size-4 opacity-70" />
              Calendar
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border/60 bg-card/80 px-4 py-3">
            <div className="flex items-center gap-2">
              <Switch
                id="active-only"
                checked={toolbar.activeConversationOnly}
                onCheckedChange={(v) => patchToolbar({ activeConversationOnly: !!v })}
              />
              <Label htmlFor="active-only" className="cursor-pointer text-xs text-muted-foreground">
                Active conversations only
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="show-archived" checked={props.showArchived} onCheckedChange={(v) => toggleArchivedUrl(!!v)} />
              <Label htmlFor="show-archived" className="cursor-pointer text-xs text-muted-foreground">
                Show archived
              </Label>
            </div>
          </div>

          <TabsContent value="board" className="mt-4 outline-none animate-in fade-in duration-300">
            <KanbanBoard
              grouped={grouped}
              canManage={props.canManage}
              ownerLabel={ownerShort}
              onStageChange={(id, st) => void onStageChange(id, st)}
              onArchive={(id, a) => void onArchive(id, a)}
              onNoteQuick={(inv) => {
                setNoteInvestorId(inv.id);
                setNoteOpen(true);
              }}
            />
          </TabsContent>

          <TabsContent value="table" className="mt-4 outline-none animate-in fade-in duration-300">
            <InvestorTable
              investors={filtered}
              members={props.members}
              deals={props.deals}
              canManage={props.canManage}
              selectedIds={selectedIds}
              onSelectedIdsChange={setSelectedIds}
              onStageChange={(id, st) => void onStageChange(id, st)}
              onArchive={(id, a) => void onArchive(id, a)}
            />
          </TabsContent>

          <TabsContent value="map" className="mt-4 outline-none animate-in fade-in duration-300">
            <RelationshipMap investors={filtered} members={props.members} />
          </TabsContent>

          <TabsContent value="list" className="mt-4 outline-none animate-in fade-in duration-300">
            <InvestorListView investors={filtered} />
          </TabsContent>

          <TabsContent value="calendar" className="mt-4 outline-none animate-in fade-in duration-300">
            <InvestorCalendarView investors={filtered} />
          </TabsContent>
        </Tabs>
      </div>

      {props.canManage ? (
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" showCloseButton>
            <DialogHeader>
              <DialogTitle>Add investor</DialogTitle>
            </DialogHeader>
            <InvestorProfileFormFields
              idPrefix="inv-add"
              showPipelineStage
              pipelineStage={pipelineStage}
              onPipelineStageChange={setPipelineStage}
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
              investorType={investorType ?? ""}
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
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setAddOpen(false);
                  resetAddInvestorForm();
                }}
              >
                Cancel
              </Button>
              <Button type="button" disabled={saving} onClick={() => void submitNewInvestor()}>
                {saving ? "Saving…" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Bulk edit stage</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Apply to {selectedIds.size} selected investor{selectedIds.size === 1 ? "" : "s"}.
          </p>
          <Select value={bulkStage} onValueChange={(v) => setBulkStage(v as PipelineStage)}>
            <SelectTrigger className="h-10">
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
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setBulkOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={selectedIds.size === 0 || !props.canManage} onClick={() => void applyBulkStage()}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Log note</DialogTitle>
          </DialogHeader>
          <Textarea rows={4} value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="Relationship note…" />
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setNoteOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={noteSaving} onClick={() => void submitQuickNote()}>
              {noteSaving ? "Saving…" : "Save to timeline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InvestorSearchCommand
        investors={investors}
        deals={props.deals}
        open={commandOpen}
        onOpenChange={setCommandOpen}
      />

      <InvestorCopilot investors={filtered} />
    </div>
  );
}

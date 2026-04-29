"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type {
  Investor,
  InvestorType,
  PipelineStage,
  WarmCold,
} from "@/lib/firestore/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  createInvestor,
  setInvestorArchived,
  updateInvestorStage,
} from "@/app/actions/investors";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowDown, ArrowUp, ExternalLink, MoreHorizontal, Plus } from "lucide-react";
import {
  compareInvestorsByLastFirst,
  investorDisplayName,
  investorLastFirstName,
} from "@/lib/investors/display-name";
import {
  INVESTOR_TYPE_OPTIONS,
  PIPELINE_STAGES,
  pipelineStageLabel,
} from "@/lib/investors/form-options";
import { Input } from "@/components/ui/input";
import { InvestorProfileFormFields } from "@/components/investor-profile-form-fields";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FILTER_UNSET = "__unset__" as const;

type TableSortKey = "name" | "firm" | "stage" | "type" | "warmth";

const STAGE_SORT_INDEX = new Map(
  PIPELINE_STAGES.map((s, i) => [s, i] as const),
);

function compareTableInvestors(a: Investor, b: Investor, key: TableSortKey, dir: 1 | -1): number {
  const mul = dir;
  switch (key) {
    case "name": {
      return compareInvestorsByLastFirst(a, b) * mul;
    }
    case "firm": {
      const af = (a.firm ?? "").toLowerCase();
      const bf = (b.firm ?? "").toLowerCase();
      if (af !== bf) return af.localeCompare(bf) * mul;
      return compareInvestorsByLastFirst(a, b) * mul;
    }
    case "stage": {
      const ai = STAGE_SORT_INDEX.get(a.pipelineStage) ?? 999;
      const bi = STAGE_SORT_INDEX.get(b.pipelineStage) ?? 999;
      if (ai !== bi) return (ai - bi) * mul;
      return compareInvestorsByLastFirst(a, b) * mul;
    }
    case "type": {
      const at = (a.investorType ?? "").toLowerCase();
      const bt = (b.investorType ?? "").toLowerCase();
      if (at !== bt) return at.localeCompare(bt) * mul;
      return compareInvestorsByLastFirst(a, b) * mul;
    }
    case "warmth": {
      const rank = (w: WarmCold | undefined) => (w === "warm" ? 0 : w === "cold" ? 1 : 2);
      const ar = rank(a.warmCold);
      const br = rank(b.warmCold);
      if (ar !== br) return (ar - br) * mul;
      return compareInvestorsByLastFirst(a, b) * mul;
    }
    default:
      return 0;
  }
}

function SortableTableHead(props: {
  label: string;
  column: TableSortKey;
  sortKey: TableSortKey;
  sortDir: "asc" | "desc";
  onSort: (column: TableSortKey) => void;
  className?: string;
}) {
  const active = props.sortKey === props.column;
  return (
    <TableHead className={props.className}>
      <button
        type="button"
        className={cn(
          "-ml-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-left font-semibold hover:bg-white/5 hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground",
        )}
        onClick={() => props.onSort(props.column)}
      >
        {props.label}
        {active ? (
          props.sortDir === "asc" ? (
            <ArrowUp className="size-3.5 shrink-0 opacity-80" />
          ) : (
            <ArrowDown className="size-3.5 shrink-0 opacity-80" />
          )
        ) : null}
      </button>
    </TableHead>
  );
}

export function InvestorsBoard(props: {
  initial: Investor[];
  canManage: boolean;
  showArchived: boolean;
}) {
  const router = useRouter();
  const [investors, setInvestors] = React.useState(props.initial);
  const [addOpen, setAddOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [tableSearch, setTableSearch] = React.useState("");
  const [filterStage, setFilterStage] = React.useState<PipelineStage | "all">("all");
  const [filterType, setFilterType] = React.useState<InvestorType | "all" | typeof FILTER_UNSET>(
    "all",
  );
  const [filterWarmth, setFilterWarmth] = React.useState<
    WarmCold | "all" | typeof FILTER_UNSET
  >("all");
  const [sortKey, setSortKey] = React.useState<TableSortKey>("name");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");

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

  async function onStageChange(id: string, stage: PipelineStage) {
    if (!props.canManage) return;
    setInvestors((prev) => prev.map((i) => (i.id === id ? { ...i, pipelineStage: stage } : i)));
    try {
      await updateInvestorStage(id, stage);
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
      setAddOpen(false);
      resetAddInvestorForm();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create investor");
    } finally {
      setSaving(false);
    }
  }

  const grouped = React.useMemo(() => {
    const m = new Map<PipelineStage, Investor[]>();
    for (const s of PIPELINE_STAGES) m.set(s, []);
    for (const inv of investors) {
      m.get(inv.pipelineStage)?.push(inv);
    }
    return m;
  }, [investors]);

  const tableInvestors = React.useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    const rows = investors.filter((inv) => {
      if (filterStage !== "all" && inv.pipelineStage !== filterStage) return false;
      if (filterType === FILTER_UNSET) {
        if (inv.investorType != null) return false;
      } else if (filterType !== "all" && inv.investorType !== filterType) return false;
      if (filterWarmth === FILTER_UNSET) {
        if (inv.warmCold != null) return false;
      } else if (filterWarmth !== "all" && inv.warmCold !== filterWarmth) return false;
      if (q) {
        const nameFl = investorDisplayName(inv).toLowerCase();
        const nameLf = investorLastFirstName(inv).toLowerCase();
        const firm = (inv.firm ?? "").toLowerCase();
        if (!nameFl.includes(q) && !nameLf.includes(q) && !firm.includes(q)) return false;
      }
      return true;
    });
    const mul = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => compareTableInvestors(a, b, sortKey, mul));
  }, [investors, tableSearch, filterStage, filterType, filterWarmth, sortKey, sortDir]);

  const tableFiltersActive =
    tableSearch.trim() !== "" ||
    filterStage !== "all" ||
    filterType !== "all" ||
    filterWarmth !== "all";

  function onTableSortColumn(next: TableSortKey) {
    if (sortKey === next) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(next);
      setSortDir("asc");
    }
  }

  function clearTableFilters() {
    setTableSearch("");
    setFilterStage("all");
    setFilterType("all");
    setFilterWarmth("all");
  }

  function toggleArchivedUrl(on: boolean) {
    router.push(on ? "/investors?archived=1" : "/investors");
  }

  return (
    <Tabs defaultValue="board" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TabsList>
          <TabsTrigger value="board">Kanban</TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
        </TabsList>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              id="show-archived"
              checked={props.showArchived}
              onCheckedChange={(v) => toggleArchivedUrl(!!v)}
            />
            <Label htmlFor="show-archived" className="text-xs text-muted-foreground cursor-pointer">
              Show archived
            </Label>
          </div>
          {props.canManage ? (
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger render={<Button size="sm" className="gap-1" />}>
                <Plus className="size-4" />
                Add investor
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" showCloseButton>
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
        </div>
      </div>

      <TabsContent value="board" className="space-y-4">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {PIPELINE_STAGES.map((stage) => (
            <div key={stage} className="min-w-[240px] max-w-[280px] flex-1">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {pipelineStageLabel(stage)}
                </h3>
                <Badge variant="secondary">{grouped.get(stage)?.length ?? 0}</Badge>
              </div>
              <ScrollArea className="h-[calc(100vh-16rem)] pr-2">
                <div className="flex flex-col gap-2">
                  {(grouped.get(stage) ?? []).map((inv) => (
                    <Card
                      key={inv.id}
                      className="border-border bg-card shadow-sm"
                    >
                      <CardHeader className="p-3 pb-1">
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/investors/${inv.id}`}
                              className="block text-base font-semibold leading-snug tracking-tight text-card-foreground underline-offset-4 hover:text-link hover:underline"
                            >
                              {investorLastFirstName(inv)}
                            </Link>
                            {inv.firm ? (
                              <p className="text-xs text-muted-foreground truncate">{inv.firm}</p>
                            ) : null}
                            {inv.crmStatus === "archived" ? (
                              <Badge variant="outline" className="mt-1 text-[10px]">
                                Archived
                              </Badge>
                            ) : null}
                          </div>
                          {props.canManage ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                className={cn(
                                  buttonVariants({ variant: "ghost", size: "icon-sm" }),
                                  "shrink-0 -mr-1",
                                )}
                              >
                                <MoreHorizontal className="size-4" />
                                <span className="sr-only">Open menu</span>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => router.push(`/investors/${inv.id}`)}
                                >
                                  View details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    void onArchive(inv.id, inv.crmStatus !== "archived")
                                  }
                                >
                                  {inv.crmStatus === "archived" ? "Restore" : "Archive"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : null}
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 space-y-2">
                        <Select
                          value={inv.pipelineStage}
                          disabled={!props.canManage}
                          onValueChange={(v) => void onStageChange(inv.id, v as PipelineStage)}
                        >
                          <SelectTrigger className="h-8 text-xs">
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
                        <Link
                          href={`/investors/${inv.id}`}
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "sm" }),
                            "h-7 w-full justify-start gap-1 px-2 text-xs text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <ExternalLink className="size-3.5" />
                          View record
                        </Link>
                        {inv.checkSizeMin != null && inv.checkSizeMax != null ? (
                          <p className="text-[11px] text-muted-foreground">
                            Check ${(inv.checkSizeMin / 1000).toFixed(0)}K–$
                            {(inv.checkSizeMax / 1_000_000).toFixed(1)}M
                          </p>
                        ) : null}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ))}
        </div>
      </TabsContent>
      <TabsContent value="table">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="space-y-3 border-b border-border pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="min-w-[180px] flex-1 space-y-1">
                <Label htmlFor="inv-table-search" className="text-xs text-muted-foreground">
                  Search
                </Label>
                <Input
                  id="inv-table-search"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder="Name or firm…"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Stage</Label>
                <Select
                  value={filterStage}
                  onValueChange={(v) => setFilterStage(v as PipelineStage | "all")}
                >
                  <SelectTrigger className="h-9 w-[180px]">
                    <SelectValue placeholder="All stages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All stages</SelectItem>
                    {PIPELINE_STAGES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {pipelineStageLabel(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select
                  value={filterType}
                  onValueChange={(v) =>
                    setFilterType(v as InvestorType | "all" | typeof FILTER_UNSET)
                  }
                >
                  <SelectTrigger className="h-9 w-[180px]">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value={FILTER_UNSET}>Not set</SelectItem>
                    {INVESTOR_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Warmth</Label>
                <Select
                  value={filterWarmth}
                  onValueChange={(v) =>
                    setFilterWarmth(v as WarmCold | "all" | typeof FILTER_UNSET)
                  }
                >
                  <SelectTrigger className="h-9 w-[160px]">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value={FILTER_UNSET}>Not set</SelectItem>
                    <SelectItem value="warm">Warm</SelectItem>
                    <SelectItem value="cold">Cold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {tableFiltersActive ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 shrink-0"
                  onClick={clearTableFilters}
                >
                  Clear filters
                </Button>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              Showing {tableInvestors.length} of {investors.length}
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead
                    label="Name"
                    column="name"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={onTableSortColumn}
                  />
                  <SortableTableHead
                    label="Firm"
                    column="firm"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={onTableSortColumn}
                  />
                  <SortableTableHead
                    label="Stage"
                    column="stage"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={onTableSortColumn}
                  />
                  <SortableTableHead
                    label="Type"
                    column="type"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={onTableSortColumn}
                  />
                  <SortableTableHead
                    label="Warmth"
                    column="warmth"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={onTableSortColumn}
                  />
                  <TableHead className="w-[120px]">Record</TableHead>
                  {props.canManage ? <TableHead className="w-[56px]" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableInvestors.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={props.canManage ? 7 : 6}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      {investors.length === 0
                        ? "No investors yet."
                        : "No investors match your filters."}
                    </TableCell>
                  </TableRow>
                ) : (
                  tableInvestors.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/investors/${inv.id}`}
                          className="font-semibold text-card-foreground underline-offset-4 hover:text-link hover:underline"
                        >
                          {investorLastFirstName(inv)}
                        </Link>
                        {inv.crmStatus === "archived" ? (
                          <Badge variant="outline" className="ml-2 text-[10px]">
                            Archived
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell>{inv.firm}</TableCell>
                      <TableCell>
                        <Select
                          value={inv.pipelineStage}
                          disabled={!props.canManage}
                          onValueChange={(v) => void onStageChange(inv.id, v as PipelineStage)}
                        >
                          <SelectTrigger className="h-8 w-[160px]">
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
                      </TableCell>
                      <TableCell className="capitalize">{inv.investorType ?? "—"}</TableCell>
                      <TableCell className="capitalize">{inv.warmCold ?? "—"}</TableCell>
                      <TableCell>
                        <Link
                          href={`/investors/${inv.id}`}
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" }),
                            "h-7 gap-1 text-xs",
                          )}
                        >
                          <ExternalLink className="size-3.5" />
                          View
                        </Link>
                      </TableCell>
                      {props.canManage ? (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
                            >
                              <MoreHorizontal className="size-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => router.push(`/investors/${inv.id}`)}
                              >
                                View details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  void onArchive(inv.id, inv.crmStatus !== "archived")
                                }
                              >
                                {inv.crmStatus === "archived" ? "Restore" : "Archive"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

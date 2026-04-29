"use client";

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
import type { InvestorType, PipelineStage } from "@/lib/firestore/types";
import { INVESTOR_TYPE_OPTIONS, PIPELINE_STAGES, pipelineStageLabel } from "@/lib/investors/form-options";

export type InvestorProfileFormFieldsProps = {
  idPrefix: string;
  /** When true, show pipeline stage (e.g. Add investor). Edit profile omits it — stage is edited on the page. */
  showPipelineStage: boolean;
  pipelineStage: PipelineStage;
  onPipelineStageChange: (v: PipelineStage) => void;
  firstName: string;
  onFirstNameChange: (v: string) => void;
  lastName: string;
  onLastNameChange: (v: string) => void;
  firm: string;
  onFirmChange: (v: string) => void;
  title: string;
  onTitleChange: (v: string) => void;
  email: string;
  onEmailChange: (v: string) => void;
  phone: string;
  onPhoneChange: (v: string) => void;
  location: string;
  onLocationChange: (v: string) => void;
  website: string;
  onWebsiteChange: (v: string) => void;
  linkedIn: string;
  onLinkedInChange: (v: string) => void;
  investorType: InvestorType | "";
  onInvestorTypeChange: (v: InvestorType | "") => void;
  warmCold: "warm" | "cold" | "";
  onWarmColdChange: (v: "warm" | "cold" | "") => void;
  checkMin: string;
  onCheckMinChange: (v: string) => void;
  checkMax: string;
  onCheckMaxChange: (v: string) => void;
  relationshipScore: string;
  onRelationshipScoreChange: (v: string) => void;
  committedAmount: string;
  onCommittedAmountChange: (v: string) => void;
  nextFollowUpAt: string;
  onNextFollowUpChange: (v: string) => void;
  notesSummary: string;
  onNotesSummaryChange: (v: string) => void;
  /** Limit visible blocks for tabbed edit modals. Default shows full form (add investor). */
  part?: "all" | "basic" | "capital" | "notes";
};

export function InvestorProfileFormFields(props: InvestorProfileFormFieldsProps) {
  const p = props.idPrefix;
  const part = props.part ?? "all";
  const showBasic = part === "all" || part === "basic";
  const showCapital = part === "all" || part === "capital";
  const showNotes = part === "all" || part === "notes";

  return (
    <div className="grid gap-3 py-1">
      <div className="grid gap-3 sm:grid-cols-2">
        {showBasic ? (
          <>
        <div className="space-y-1.5">
          <Label htmlFor={`${p}-first`}>First name</Label>
          <Input
            id={`${p}-first`}
            value={props.firstName}
            onChange={(e) => props.onFirstNameChange(e.target.value)}
            autoComplete="given-name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${p}-last`}>Last name</Label>
          <Input
            id={`${p}-last`}
            value={props.lastName}
            onChange={(e) => props.onLastNameChange(e.target.value)}
            autoComplete="family-name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${p}-firm`}>Firm</Label>
          <Input
            id={`${p}-firm`}
            value={props.firm}
            onChange={(e) => props.onFirmChange(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${p}-title`}>Title</Label>
          <Input
            id={`${p}-title`}
            value={props.title}
            onChange={(e) => props.onTitleChange(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${p}-email`}>Email</Label>
          <Input
            id={`${p}-email`}
            type="email"
            value={props.email}
            onChange={(e) => props.onEmailChange(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${p}-phone`}>Phone</Label>
          <Input
            id={`${p}-phone`}
            value={props.phone}
            onChange={(e) => props.onPhoneChange(e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`${p}-loc`}>Location</Label>
          <Input
            id={`${p}-loc`}
            value={props.location}
            onChange={(e) => props.onLocationChange(e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`${p}-web`}>Website</Label>
          <Input
            id={`${p}-web`}
            value={props.website}
            onChange={(e) => props.onWebsiteChange(e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`${p}-li`}>LinkedIn</Label>
          <Input
            id={`${p}-li`}
            value={props.linkedIn}
            onChange={(e) => props.onLinkedInChange(e.target.value)}
          />
        </div>
        {props.showPipelineStage ? (
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Pipeline stage</Label>
            <Select
              value={props.pipelineStage}
              onValueChange={(v) => props.onPipelineStageChange(v as PipelineStage)}
            >
              <SelectTrigger className="h-9 w-full">
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
          </div>
        ) : null}
          </>
        ) : null}
        {showCapital ? (
          <>
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select
            value={props.investorType || "__none__"}
            onValueChange={(v) =>
              props.onInvestorTypeChange(v === "__none__" ? "" : (v as InvestorType))
            }
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Optional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {INVESTOR_TYPE_OPTIONS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Warmth</Label>
          <Select
            value={props.warmCold || "__none__"}
            onValueChange={(v) =>
              props.onWarmColdChange(v === "__none__" ? "" : (v as "warm" | "cold"))
            }
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Optional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              <SelectItem value="warm">Warm</SelectItem>
              <SelectItem value="cold">Cold</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${p}-cmin`}>Check min ($)</Label>
          <Input
            id={`${p}-cmin`}
            inputMode="decimal"
            value={props.checkMin}
            onChange={(e) => props.onCheckMinChange(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${p}-cmax`}>Check max ($)</Label>
          <Input
            id={`${p}-cmax`}
            inputMode="decimal"
            value={props.checkMax}
            onChange={(e) => props.onCheckMaxChange(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${p}-score`}>Relationship score (0–100)</Label>
          <Input
            id={`${p}-score`}
            inputMode="numeric"
            value={props.relationshipScore}
            onChange={(e) => props.onRelationshipScoreChange(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${p}-commit`}>Committed amount ($)</Label>
          <Input
            id={`${p}-commit`}
            value={props.committedAmount}
            onChange={(e) => props.onCommittedAmountChange(e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`${p}-follow`}>Next follow-up</Label>
          <Input
            id={`${p}-follow`}
            type="datetime-local"
            value={props.nextFollowUpAt}
            onChange={(e) => props.onNextFollowUpChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Syncs to Tasks as an open item titled &quot;Follow up: …&quot;. Clearing this date cancels
            that task.
          </p>
        </div>
          </>
        ) : null}
        {showNotes ? (
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`${p}-notes`}>Notes summary</Label>
          <Textarea
            id={`${p}-notes`}
            rows={3}
            value={props.notesSummary}
            onChange={(e) => props.onNotesSummaryChange(e.target.value)}
          />
        </div>
        ) : null}
      </div>
    </div>
  );
}

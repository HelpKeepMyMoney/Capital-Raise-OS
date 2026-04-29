"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { InvestorProfileFormFieldsProps } from "@/components/investor-profile-form-fields";
import { InvestorProfileFormFields } from "@/components/investor-profile-form-fields";
import type { OrganizationMemberPublic } from "@/lib/firestore/queries";

type IntelProps = {
  investProbability: string;
  onInvestProbabilityChange: (v: string) => void;
  referralSource: string;
  onReferralSourceChange: (v: string) => void;
  relationshipOwnerUserId: string;
  onRelationshipOwnerUserIdChange: (v: string) => void;
  deals: { id: string; name: string }[];
  members: OrganizationMemberPublic[];
  interestDealIds: Set<string>;
  onInterestDealIdsChange: React.Dispatch<React.SetStateAction<Set<string>>>;
};

export type InvestorEditModalProps = InvestorProfileFormFieldsProps &
  IntelProps & {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    saving: boolean;
    onSubmit: () => void | Promise<void>;
  };

export function InvestorEditModal(props: InvestorEditModalProps) {
  const formCommon: InvestorProfileFormFieldsProps = {
    idPrefix: props.idPrefix,
    showPipelineStage: props.showPipelineStage,
    pipelineStage: props.pipelineStage,
    onPipelineStageChange: props.onPipelineStageChange,
    firstName: props.firstName,
    onFirstNameChange: props.onFirstNameChange,
    lastName: props.lastName,
    onLastNameChange: props.onLastNameChange,
    firm: props.firm,
    onFirmChange: props.onFirmChange,
    title: props.title,
    onTitleChange: props.onTitleChange,
    email: props.email,
    onEmailChange: props.onEmailChange,
    phone: props.phone,
    onPhoneChange: props.onPhoneChange,
    location: props.location,
    onLocationChange: props.onLocationChange,
    website: props.website,
    onWebsiteChange: props.onWebsiteChange,
    linkedIn: props.linkedIn,
    onLinkedInChange: props.onLinkedInChange,
    investorType: props.investorType,
    onInvestorTypeChange: props.onInvestorTypeChange,
    warmCold: props.warmCold,
    onWarmColdChange: props.onWarmColdChange,
    checkMin: props.checkMin,
    onCheckMinChange: props.onCheckMinChange,
    checkMax: props.checkMax,
    onCheckMaxChange: props.onCheckMaxChange,
    relationshipScore: props.relationshipScore,
    onRelationshipScoreChange: props.onRelationshipScoreChange,
    committedAmount: props.committedAmount,
    onCommittedAmountChange: props.onCommittedAmountChange,
    nextFollowUpAt: props.nextFollowUpAt,
    onNextFollowUpChange: props.onNextFollowUpChange,
    notesSummary: props.notesSummary,
    onNotesSummaryChange: props.onNotesSummaryChange,
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-hidden border-border/80 p-0 sm:max-w-xl" showCloseButton>
        <DialogHeader className="border-b border-border/60 px-6 py-4">
          <DialogTitle>Edit investor</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="basic" className="flex max-h-[min(72vh,calc(100vh-12rem))] flex-col">
          <TabsList className="mx-6 mt-4 shrink-0 flex-wrap rounded-xl bg-muted/40 p-1">
            <TabsTrigger value="basic" className="rounded-lg text-xs">
              Basic
            </TabsTrigger>
            <TabsTrigger value="capital" className="rounded-lg text-xs">
              Capital
            </TabsTrigger>
            <TabsTrigger value="intel" className="rounded-lg text-xs">
              Intelligence
            </TabsTrigger>
            <TabsTrigger value="deals" className="rounded-lg text-xs">
              Deals
            </TabsTrigger>
            <TabsTrigger value="notes" className="rounded-lg text-xs">
              Notes
            </TabsTrigger>
          </TabsList>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <TabsContent value="basic" className="mt-0 outline-none">
              <InvestorProfileFormFields {...formCommon} part="basic" />
            </TabsContent>
            <TabsContent value="capital" className="mt-0 outline-none">
              <InvestorProfileFormFields {...formCommon} part="capital" />
            </TabsContent>
            <TabsContent value="intel" className="mt-0 space-y-3 outline-none">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor={`${props.idPrefix}-prob`}>Probability to close (%)</Label>
                  <Input
                    id={`${props.idPrefix}-prob`}
                    inputMode="numeric"
                    value={props.investProbability}
                    onChange={(e) => props.onInvestProbabilityChange(e.target.value)}
                    placeholder="0–100"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${props.idPrefix}-ref`}>Referral source</Label>
                  <Input
                    id={`${props.idPrefix}-ref`}
                    value={props.referralSource}
                    onChange={(e) => props.onReferralSourceChange(e.target.value)}
                    placeholder="Warm intro, event…"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Relationship owner</Label>
                  <Select
                    value={props.relationshipOwnerUserId || "__none__"}
                    onValueChange={(v) =>
                      props.onRelationshipOwnerUserIdChange(!v || v === "__none__" ? "" : v)
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Assign owner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Unassigned</SelectItem>
                      {props.members.map((m) => (
                        <SelectItem key={m.userId} value={m.userId}>
                          {m.displayName ?? m.email ?? m.userId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="deals" className="mt-0 outline-none">
              <div className="space-y-2">
                <Label>Interested deals</Label>
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-border/70 bg-muted/15 p-3">
                  {props.deals.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No deals in org yet.</p>
                  ) : (
                    props.deals.map((d) => (
                      <label key={d.id} className="flex cursor-pointer items-center gap-2 text-sm">
                        <Checkbox
                          checked={props.interestDealIds.has(d.id)}
                          onCheckedChange={(c) => {
                            props.onInterestDealIdsChange((prev) => {
                              const next = new Set(prev);
                              if (c) next.add(d.id);
                              else next.delete(d.id);
                              return next;
                            });
                          }}
                        />
                        <span className="truncate">{d.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="notes" className="mt-0 outline-none">
              <InvestorProfileFormFields {...formCommon} part="notes" />
            </TabsContent>
          </div>
        </Tabs>
        <DialogFooter className="gap-2 border-t border-border/60 bg-muted/15 px-6 py-4 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={props.saving} onClick={() => void props.onSubmit()}>
            {props.saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

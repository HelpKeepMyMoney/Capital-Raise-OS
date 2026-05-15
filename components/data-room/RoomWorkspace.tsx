"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DocumentManager } from "@/components/data-room/DocumentManager";
import { ActivityAnalytics } from "@/components/data-room/ActivityAnalytics";
import { InvestorAccessTable } from "@/components/data-room/InvestorAccessTable";
import { RoomNdaEnvelopesPanel } from "@/components/data-room/room-nda-envelopes-panel";
import { RoomSettings } from "@/components/data-room/RoomSettings";
import { InvestorPreview } from "@/components/data-room/InvestorPreview";
import type { SerializedDataRoom, SerializedRoomDocument, SerializedDealLite } from "@/components/data-room/types";
import type { InviteRow } from "@/lib/data-room/server-queries";
import type { ActivityFeedItemDTO } from "@/lib/data-room/server-queries";
import type { Deal } from "@/lib/firestore/types";
import { Search } from "lucide-react";

type Props = {
  room: SerializedDataRoom;
  documentsForRoom: SerializedRoomDocument[];
  deals: SerializedDealLite[];
  invitations: InviteRow[];
  activityPreview: ActivityFeedItemDTO[];
  dealForRoom?: Deal | null;
  canManage: boolean;
  selectedDealId?: string;
  roomSelectList: { id: string; name: string }[];
  lastLoginAtMs: number | null;
  activitySinceMs: number;
  workspaceTab?: string;
  onWorkspaceTabChange?: (tab: string) => void;
  esignTemplateLibraryConfigured?: boolean;
};

export function RoomWorkspace(props: Props) {
  const [internalTab, setInternalTab] = React.useState("preview");
  const tab = props.workspaceTab ?? internalTab;
  const { canManage, workspaceTab, onWorkspaceTabChange } = props;

  function goTab(next: string) {
    if (workspaceTab === undefined) setInternalTab(next);
    onWorkspaceTabChange?.(next);
  }

  const [query, setQuery] = React.useState("");
  const [investorDocumentsOpen, setInvestorDocumentsOpen] = React.useState(false);

  React.useEffect(() => {
    setInvestorDocumentsOpen(false);
  }, [props.room.id]);

  if (!props.canManage) {
    return (
      <div className="space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files in this room…"
            className="rounded-xl border-border bg-card pl-10"
          />
        </div>

        {investorDocumentsOpen ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">All documents</h3>
              <Button type="button" size="sm" className="rounded-lg" onClick={() => setInvestorDocumentsOpen(false)}>
                Back to portal
              </Button>
            </div>
            <DocumentManager
              rooms={props.roomSelectList}
              documents={props.documentsForRoom}
              documentSearch={query}
              selectedRoomId={props.room.id}
              canManage={false}
              investorDocsLockedByNda={props.room.investorDocsLockedByNda}
              investorPendingNdaSigningUrl={props.room.investorPendingNdaSigningUrl}
              investorNdaAwaitingSponsor={props.room.investorNdaAwaitingSponsor}
              investorNdaInvestorStepCompletedAt={props.room.investorNdaInvestorStepCompletedAt}
              investorNdaCanRequestSponsor={props.room.investorNdaCanRequestSponsor}
              uploading={false}
              uploadProgress={null}
            />
          </div>
        ) : (
          <InvestorPreview
            room={props.room}
            deal={props.dealForRoom}
            documentsForRoom={props.documentsForRoom}
            lastLoginAtMs={props.lastLoginAtMs}
            activitySinceMs={props.activitySinceMs}
            onOpenDocuments={() => setInvestorDocumentsOpen(true)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search files in this room…"
          className="rounded-xl border-border bg-card pl-10"
        />
      </div>

      <Tabs value={tab} onValueChange={goTab} className="w-full">
        <TabsList className="grid h-auto w-full max-w-3xl grid-cols-2 flex-wrap rounded-2xl bg-muted/60 p-1 lg:grid-cols-5">
          <TabsTrigger value="preview" className="rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Investor view
          </TabsTrigger>
          <TabsTrigger value="documents" className="rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Documents
          </TabsTrigger>
          <TabsTrigger value="activity" className="rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Activity
          </TabsTrigger>
          {props.canManage ? (
            <TabsTrigger value="investors" className="rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-sm">
              Investors
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="settings" className="rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="mt-4 focus-visible:outline-none">
          <InvestorPreview
            room={props.room}
            deal={props.dealForRoom}
            documentsForRoom={props.documentsForRoom}
            lastLoginAtMs={props.lastLoginAtMs}
            activitySinceMs={props.activitySinceMs}
            onOpenDocuments={() => goTab("documents")}
          />
        </TabsContent>

        <TabsContent value="documents" className="mt-4 focus-visible:outline-none">
          <DocumentManager
            rooms={props.roomSelectList}
            documents={props.documentsForRoom}
            documentSearch={query}
            selectedRoomId={props.room.id}
            canManage={props.canManage}
            investorDocsLockedByNda={props.room.investorDocsLockedByNda}
            investorPendingNdaSigningUrl={props.room.investorPendingNdaSigningUrl}
            investorNdaAwaitingSponsor={props.room.investorNdaAwaitingSponsor}
            investorNdaInvestorStepCompletedAt={props.room.investorNdaInvestorStepCompletedAt}
            investorNdaCanRequestSponsor={props.room.investorNdaCanRequestSponsor}
            uploading={false}
            uploadProgress={null}
          />
        </TabsContent>
        <TabsContent value="activity" className="mt-4 focus-visible:outline-none">
          <ActivityAnalytics documents={props.documentsForRoom} activityPreview={props.activityPreview} />
        </TabsContent>
        {props.canManage ? (
          <TabsContent value="investors" className="mt-4 space-y-6 focus-visible:outline-none">
            <RoomNdaEnvelopesPanel roomId={props.room.id} />
            <InvestorAccessTable
              invitations={props.invitations}
              selectedDealId={props.selectedDealId ?? props.room.dealId}
              selectedRoomId={props.room.id}
            />
          </TabsContent>
        ) : null}
        <TabsContent value="settings" className="mt-4 focus-visible:outline-none">
          <RoomSettings
            room={props.room}
            deals={props.deals}
            canManage={props.canManage}
            esignTemplateLibraryConfigured={props.esignTemplateLibraryConfigured}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { DocumentManager } from "@/components/data-room/DocumentManager";
import { ActivityAnalytics } from "@/components/data-room/ActivityAnalytics";
import { InvestorAccessTable } from "@/components/data-room/InvestorAccessTable";
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
};

export function RoomWorkspace(props: Props) {
  const [tab, setTab] = React.useState("documents");
  const [query, setQuery] = React.useState("");

  const filteredDocs = React.useMemo(() => {
    const list = props.documentsForRoom;
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.kind.toLowerCase().includes(q) ||
        (d.mimeType?.toLowerCase().includes(q) ?? false),
    );
  }, [props.documentsForRoom, query]);

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

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid h-auto w-full max-w-3xl grid-cols-2 flex-wrap rounded-2xl bg-muted/60 p-1 lg:grid-cols-5">
          <TabsTrigger value="documents" className="rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Documents
          </TabsTrigger>
          <TabsTrigger value="activity" className="rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Activity
          </TabsTrigger>
          <TabsTrigger value="investors" className="rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Investors
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Settings
          </TabsTrigger>
          <TabsTrigger value="preview" className="rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Investor view
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-4 focus-visible:outline-none">
          <DocumentManager
            rooms={props.roomSelectList}
            documents={filteredDocs}
            selectedRoomId={props.room.id}
            canManage={props.canManage}
            uploading={false}
            uploadProgress={null}
          />
        </TabsContent>
        <TabsContent value="activity" className="mt-4 focus-visible:outline-none">
          <ActivityAnalytics documents={props.documentsForRoom} activityPreview={props.activityPreview} />
        </TabsContent>
        <TabsContent value="investors" className="mt-4 focus-visible:outline-none">
          <InvestorAccessTable invitations={props.invitations} selectedDealId={props.selectedDealId ?? props.room.dealId} />
        </TabsContent>
        <TabsContent value="settings" className="mt-4 focus-visible:outline-none">
          <RoomSettings room={props.room} deals={props.deals} canManage={props.canManage} />
        </TabsContent>
        <TabsContent value="preview" className="mt-4 focus-visible:outline-none">
          <InvestorPreview room={props.room} deal={props.dealForRoom} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

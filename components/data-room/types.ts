import type { Deal } from "@/lib/firestore/types";
import type { DataRoomMetricsDTO } from "@/lib/data-room/metrics";
import type { InviteRow, ActivityFeedItemDTO } from "@/lib/data-room/server-queries";
import type { RoomDocument } from "@/lib/firestore/types";

export type SerializedDataRoom = {
  id: string;
  name: string;
  dealId?: string;
  ndaRequired: boolean;
  description?: string;
  visibility?: "open" | "invite_only";
  archived?: boolean;
  ndaTemplateRef?: string | null;
  signableTemplateId?: string | null;
  downloadAllowed?: boolean;
  watermarkDocs?: boolean;
  expiresAt?: number;
  requireLogin?: boolean;
  welcomeMessage?: string;
  createdAt?: number;
  updatedAt?: number;
  /** Set server-side for `investor_guest` when documents are withheld until NDA envelope is completed. */
  investorDocsLockedByNda?: boolean;
  /** Latest completed native NDA metadata for this viewer in this room. */
  investorNdaSignedAt?: number;
  investorNdaEnvelopeId?: string;
};

export type SerializedRoomDocument = {
  id: string;
  name: string;
  kind: RoomDocument["kind"];
  dataRoomId: string;
  viewCount?: number;
  lastViewedAt?: number;
  sizeBytes?: number;
  mimeType?: string;
  createdByUid?: string;
  version?: number;
  accessLevel?: RoomDocument["accessLevel"];
  createdAt?: number;
};

export type SerializedDealLite = Pick<Deal, "id" | "name" | "targetRaise" | "minimumInvestment" | "closeDate" | "status">;

export type DataRoomPageProps = {
  rooms: SerializedDataRoom[];
  documents: SerializedRoomDocument[];
  deals: SerializedDealLite[];
  metrics: DataRoomMetricsDTO;
  invitations: InviteRow[];
  activityPreview: ActivityFeedItemDTO[];
  canManage: boolean;
  dealSummaries?: Record<string, SerializedDealLite | null>;
};

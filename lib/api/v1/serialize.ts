import type { DataRoom, Deal, Investor, Organization, RoomDocument, Task } from "@/lib/firestore/types";

export function serializeDeal(deal: Deal, linkedRoomIds: string[]) {
  return {
    id: deal.id,
    name: deal.name,
    type: deal.type,
    status: deal.status,
    industry: deal.industry ?? null,
    stage: deal.stage ?? null,
    tagline: deal.tagline ?? null,
    targetRaise: deal.targetRaise ?? null,
    minimumInvestment: deal.minimumInvestment ?? null,
    valuation: deal.valuation ?? null,
    closeDate: deal.closeDate ?? null,
    terms: deal.terms ?? null,
    useOfProceeds: deal.useOfProceeds ?? null,
    tractionMetrics: deal.tractionMetrics ?? [],
    useOfFundsSplit: deal.useOfFundsSplit ?? [],
    whyInvest: deal.whyInvest ?? [],
    marketOpportunity: deal.marketOpportunity ?? null,
    problem: deal.problem ?? null,
    solution: deal.solution ?? null,
    competitiveEdge: deal.competitiveEdge ?? null,
    growthStrategy: deal.growthStrategy ?? null,
    exitPotential: deal.exitPotential ?? null,
    returnsModel: deal.returnsModel ?? null,
    sponsorProfile: deal.sponsorProfile ?? null,
    faqs: deal.faqs ?? [],
    calendarBookingUrl: deal.calendarBookingUrl ?? null,
    youtubeOverviewUrl: deal.youtubeOverviewUrl ?? null,
    linkedDataRoomIds: linkedRoomIds,
    createdAt: deal.createdAt,
  };
}

export function serializeInvestor(inv: Investor) {
  return {
    id: inv.id,
    name: inv.name,
    firstName: inv.firstName ?? null,
    lastName: inv.lastName ?? null,
    firm: inv.firm ?? null,
    title: inv.title ?? null,
    email: inv.email ?? null,
    phone: inv.phone ?? null,
    website: inv.website ?? null,
    linkedIn: inv.linkedIn ?? null,
    location: inv.location ?? null,
    investorType: inv.investorType ?? null,
    pipelineStage: inv.pipelineStage,
    warmCold: inv.warmCold ?? null,
    committedAmount: inv.committedAmount ?? null,
    investProbability: inv.investProbability ?? null,
    interestedDealIds: inv.interestedDealIds ?? [],
    checkSizeMin: inv.checkSizeMin ?? null,
    checkSizeMax: inv.checkSizeMax ?? null,
    relationshipScore: inv.relationshipScore ?? null,
    referralSource: inv.referralSource ?? null,
    relationshipOwnerUserId: inv.relationshipOwnerUserId ?? null,
    lastContactAt: inv.lastContactAt ?? null,
    nextFollowUpAt: inv.nextFollowUpAt ?? null,
    notes: inv.notes ?? null,
    notesSummary: inv.notesSummary ?? null,
    crmStatus: inv.crmStatus ?? "active",
    createdAt: inv.createdAt,
    updatedAt: inv.updatedAt,
  };
}

export function serializeRoom(room: DataRoom) {
  return {
    id: room.id,
    name: room.name,
    description: room.description ?? null,
    dealId: room.dealId ?? null,
    ndaRequired: room.ndaRequired,
    visibility: room.visibility ?? "open",
    downloadAllowed: room.downloadAllowed ?? true,
    watermarkDocs: room.watermarkDocs ?? false,
    expiresAt: room.expiresAt ?? null,
    requireLogin: room.requireLogin ?? false,
    welcomeMessage: room.welcomeMessage ?? null,
    archived: room.archived ?? false,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt ?? null,
  };
}

export function serializeDocument(doc: RoomDocument) {
  const extended = doc as RoomDocument & { updatedAt?: number };
  return {
    id: doc.id,
    dataRoomId: doc.dataRoomId,
    name: doc.name,
    kind: doc.kind,
    parentFolderId: doc.parentFolderId ?? null,
    sizeBytes: doc.sizeBytes ?? null,
    mimeType: doc.mimeType ?? null,
    viewCount: doc.viewCount ?? 0,
    version: doc.version ?? 1,
    createdAt: doc.createdAt,
    updatedAt: extended.updatedAt ?? null,
  };
}

export function serializeTask(task: Task) {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    dueAt: task.dueAt ?? null,
    assigneeId: task.assigneeId ?? null,
    linkedInvestorId: task.linkedInvestorId ?? null,
    linkedDealId: task.linkedDealId ?? null,
    linkedDataRoomId: task.linkedDataRoomId ?? null,
    taskType: task.taskType ?? null,
    taskPriority: task.taskPriority ?? null,
    workflowStatus: task.workflowStatus ?? null,
    description: task.description ?? null,
    notes: task.notes ?? null,
    reminderAt: task.reminderAt ?? null,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt ?? null,
    completedAt: task.completedAt ?? null,
  };
}

export function serializeOrganization(org: Organization) {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    contact: org.contact ?? null,
    createdAt: org.createdAt,
  };
}

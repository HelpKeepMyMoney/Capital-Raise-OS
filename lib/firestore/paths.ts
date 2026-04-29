export const col = {
  users: "users",
  organizations: "organizations",
  organizationMembers: "organization_members",
  investors: "investors",
  tasks: "tasks",
  activities: "activities",
  meetings: "meetings",
  campaigns: "campaigns",
  emailTemplates: "email_templates",
  emails: "emails",
  deals: "deals",
  dataRooms: "data_rooms",
  documents: "documents",
  auditLogs: "audit_logs",
  webhooks: "webhooks",
  subscriptions: "subscriptions",
  investorInvitations: "investor_invitations",
  dealCommitments: "deal_commitments",
  signingRequests: "signing_requests",
} as const;

export function memberDocId(orgId: string, uid: string) {
  return `${orgId}_${uid}`;
}

export function dealCommitmentDocId(orgId: string, dealId: string, userId: string) {
  return `${orgId}__${dealId}__${userId}`;
}

export function signingRequestDocId(orgId: string, dealId: string, userId: string) {
  return `${orgId}__${dealId}__${userId}__sign`;
}

export function investorNotesPath(orgId: string, investorId: string) {
  return `${col.investors}/${investorId}/notes`;
}

/** Subcollection under each task document. */
export const taskCommentsSubcollection = "comments" as const;

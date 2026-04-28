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
} as const;

export function memberDocId(orgId: string, uid: string) {
  return `${orgId}_${uid}`;
}

export function investorNotesPath(orgId: string, investorId: string) {
  return `${col.investors}/${investorId}/notes`;
}

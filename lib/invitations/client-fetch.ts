export type InviteValidateSuccess = {
  organizationName: string;
  organizationId: string;
  scope?: string;
  dealTitle?: string;
  inviteEmail: string | null;
  emailRequired: boolean;
  expiresAt?: number;
};

export async function fetchInviteValidation(
  token: string,
): Promise<{ ok: true; data: InviteValidateSuccess } | { ok: false; error: string }> {
  const res = await fetch(`/api/invitations/validate?token=${encodeURIComponent(token)}`, {
    cache: "no-store",
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    return { ok: false, error: typeof data.error === "string" ? data.error : "Invalid invite" };
  }
  return {
    ok: true,
    data: {
      organizationName: typeof data.organizationName === "string" ? data.organizationName : "",
      organizationId: typeof data.organizationId === "string" ? data.organizationId : "",
      scope: typeof data.scope === "string" ? data.scope : undefined,
      dealTitle: typeof data.dealTitle === "string" ? data.dealTitle : undefined,
      inviteEmail: typeof data.inviteEmail === "string" ? data.inviteEmail.toLowerCase().trim() : null,
      emailRequired: Boolean(data.emailRequired),
      expiresAt: typeof data.expiresAt === "number" ? data.expiresAt : undefined,
    },
  };
}

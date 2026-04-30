/** Shared invite email helpers (REST routes + transactional mail). */

export function invitationsTransactionalFrom(): string {
  return (
    process.env.RESEND_FROM ??
    process.env.OUTREACH_FROM_EMAIL ??
    "CPIN <onboarding@resend.dev>"
  );
}

export function escapeHtmlForEmail(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function textToEmailHtmlParagraphs(text: string): string {
  const safe = escapeHtmlForEmail(text);
  const blocks = safe.split(/\n\n+/).map((p) => p.replace(/\n/g, "<br/>"));
  return blocks.map((p) => `<p>${p}</p>`).join("\n");
}

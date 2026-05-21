import type { Deal, Investor, Organization } from "@/lib/firestore/types";
import { investorDisplayName } from "@/lib/investors/display-name";

export type TemplateVarContext = {
  investor: Investor;
  organization: Organization;
  deal?: Deal | null;
  sponsorName?: string;
};

const VAR_PATTERN = /\{\{\s*([a-z_]+)\s*\}\}/gi;

export function resolveTemplateVariables(
  template: string,
  ctx: TemplateVarContext,
): string {
  const map: Record<string, string> = {
    investor_name: investorDisplayName(ctx.investor),
    firm_name: ctx.investor.firm?.trim() ?? "your firm",
    deal_name: ctx.deal?.name?.trim() ?? "our opportunity",
    organization_name: ctx.organization.name,
    sponsor_name: ctx.sponsorName?.trim() ?? ctx.organization.name,
  };
  return template.replace(VAR_PATTERN, (_, key: string) => map[key.toLowerCase()] ?? `{{${key}}}`);
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const TEMPLATE_VARIABLE_HINTS = [
  "{{investor_name}}",
  "{{firm_name}}",
  "{{deal_name}}",
  "{{organization_name}}",
  "{{sponsor_name}}",
] as const;

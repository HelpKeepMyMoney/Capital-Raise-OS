import type { Firestore } from "firebase-admin/firestore";
import { getAnthropic } from "@/lib/ai/anthropic";
import { col } from "@/lib/firestore/paths";
import type { Deal, Investor, Organization } from "@/lib/firestore/types";
import { investorDisplayName } from "@/lib/investors/display-name";

export type PersonalizeInput = {
  investor: Investor;
  organization: Organization;
  deal?: Deal | null;
  subjectTemplate?: string;
  bodyTemplate?: string;
  recentActivitySummaries?: string[];
};

export type PersonalizeOutput = {
  subject: string;
  bodyHtml: string;
  bodyText: string;
};

const SYSTEM = `You write institutional private-capital outreach emails for fund sponsors.
Tone: professional, concise, relationship-oriented, never salesy or spammy.
No legal advice. No exaggerated claims. No emojis.
Return ONLY valid JSON: {"subject":"...","bodyHtml":"...","bodyText":"..."}
bodyHtml may use simple <p> tags only.`;

export async function generatePersonalizedOutreach(
  input: PersonalizeInput,
): Promise<PersonalizeOutput> {
  const client = getAnthropic();
  const inv = input.investor;
  const userContent = [
    `Organization: ${input.organization.name}`,
    `Investor: ${investorDisplayName(inv)}`,
    inv.firm ? `Firm: ${inv.firm}` : null,
    inv.investorType ? `Type: ${inv.investorType}` : null,
    inv.preferredSectors?.length ? `Sectors: ${inv.preferredSectors.join(", ")}` : null,
    inv.relationshipScore != null ? `Relationship score: ${inv.relationshipScore}` : null,
    input.deal ? `Deal: ${input.deal.name} — ${input.deal.tagline ?? input.deal.type}` : null,
    input.subjectTemplate ? `Subject template: ${input.subjectTemplate}` : null,
    input.bodyTemplate ? `Body template: ${input.bodyTemplate}` : null,
    input.recentActivitySummaries?.length
      ? `Recent CRM activity:\n${input.recentActivitySummaries.slice(0, 5).join("\n")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const msg = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-20241022",
    max_tokens: 1024,
    system: SYSTEM,
    messages: [{ role: "user", content: userContent }],
  });

  const text = msg.content.find((c) => c.type === "text");
  const raw = text && text.type === "text" ? text.text : "{}";
  let parsed: PersonalizeOutput;
  try {
    const json = JSON.parse(raw.replace(/^```json?\s*|\s*```$/g, "")) as PersonalizeOutput;
    parsed = {
      subject: json.subject?.slice(0, 500) ?? "Following up",
      bodyHtml: json.bodyHtml?.slice(0, 50_000) ?? "<p>Following up on our prior conversation.</p>",
      bodyText: json.bodyText?.slice(0, 50_000) ?? "Following up on our prior conversation.",
    };
  } catch {
    parsed = {
      subject: input.subjectTemplate ?? "Following up",
      bodyHtml: input.bodyTemplate ?? "<p>Following up on our prior conversation.</p>",
      bodyText: "Following up on our prior conversation.",
    };
  }
  return parsed;
}

export async function loadPersonalizeContext(
  db: Firestore,
  orgId: string,
  investorId: string,
  dealId?: string,
): Promise<{
  investor: Investor;
  deal: Deal | null;
  recentActivitySummaries: string[];
}> {
  const invSnap = await db.collection(col.investors).doc(investorId).get();
  if (!invSnap.exists) throw new Error("Investor not found");
  const investor = { id: invSnap.id, ...invSnap.data() } as Investor;
  if (investor.organizationId !== orgId) throw new Error("Investor not found");

  let deal: Deal | null = null;
  if (dealId) {
    const dealSnap = await db.collection(col.deals).doc(dealId).get();
    if (dealSnap.exists && dealSnap.data()?.organizationId === orgId) {
      deal = { id: dealSnap.id, ...dealSnap.data() } as Deal;
    }
  }

  const actSnap = await db
    .collection(col.activities)
    .where("organizationId", "==", orgId)
    .where("investorId", "==", investorId)
    .orderBy("createdAt", "desc")
    .limit(8)
    .get();

  const recentActivitySummaries = actSnap.docs.map((d) => {
    const a = d.data();
    return `${new Date((a.createdAt as number) ?? 0).toISOString().slice(0, 10)}: ${a.summary as string}`;
  });

  return { investor, deal, recentActivitySummaries };
}

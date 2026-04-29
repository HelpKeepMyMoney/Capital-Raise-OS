import { requireOrgSession } from "@/lib/auth/session";
import { getOrganization } from "@/lib/firestore/queries";
import { canUseAiCopilot, effectivePlan } from "@/lib/billing/features";
import { getAnthropic } from "@/lib/ai/anthropic";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const ctx = await requireOrgSession();
  if (!ctx) {
    return new Response("Unauthorized", { status: 401 });
  }

  const org = await getOrganization(ctx.orgId);
  const plan = effectivePlan(org?.subscription?.plan);
  if (!canUseAiCopilot(plan)) {
    return new Response(
      "AI Copilot requires Pro, Growth, or Enterprise. Upgrade under Settings → Billing.",
      { status: 402 },
    );
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const rl = checkRateLimit(rateLimitKey(ip, "ai-chat"), 20, 60_000);
  if (!rl.ok) {
    return new Response("Too many requests", { status: 429 });
  }

  const { messages } = (await req.json()) as {
    messages?: { role: "user" | "assistant"; content: string }[];
  };
  if (!messages?.length) {
    return new Response("Bad request", { status: 400 });
  }

  const client = getAnthropic();
  const stream = await client.messages.stream({
    model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-20241022",
    max_tokens: 2048,
    system: `You are CPIN Copilot, an AI assistant for private capital fundraising inside organization ${ctx.orgId}. 
Help draft investor emails, summarize meetings, suggest next investors, and review funnel metrics. 
Stay concise, compliant (no legal advice), and professional.`,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const ev of stream) {
          if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(ev.delta.text));
          }
        }
      } catch (e) {
        controller.error(e);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

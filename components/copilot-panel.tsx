"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

const DEAL_QUICK_ACTIONS = [
  {
    label: "Hottest investors on this deal?",
    prompt:
      "I'm on a live deal page in CPIN. Explain how to identify which investors are hottest for this specific offering using CRM signals (data room views, meeting stage, check fit, relationship score) and what to do next.",
  },
  {
    label: "Draft follow-ups for this deal",
    prompt:
      "Draft three concise follow-up emails to investors who viewed this deal but haven't soft-circled yet—professional tone, compliant, with clear CTA to book a call or review the data room.",
  },
  {
    label: "Summarize likely objections",
    prompt:
      "List the most common investor objections for a private placement like this and concise sponsor responses I can use on calls.",
  },
  {
    label: "Likely close this month",
    prompt:
      "Outline a simple forecast framework for closing a private capital raise this month: pipeline math, assumptions, and what must be true.",
  },
  {
    label: "Weekly raise update",
    prompt:
      "Write a weekly investor update email draft for an active private raise: progress vs target, timeline, data room additions, soft commits—tone confident and transparent.",
  },
  {
    label: "Improve this offering copy",
    prompt:
      "Rewrite the public-facing deal narrative to be more institutional: tighten headline, tagline, risk disclosures placeholder, and bullets—keep factual, no performance promises.",
  },
];

const TASKS_QUICK_ACTIONS = [
  {
    label: "What needs attention today?",
    prompt:
      "I'm on the Tasks page in CPIN (private capital OS). Given typical fundraising execution work, list concrete priorities for today: follow-ups, overdue items, closing tasks, and investor touches — ordered by impact.",
  },
  {
    label: "Warm leads without follow up?",
    prompt:
      "Explain how I'd identify warm investor leads in CPIN who lack a timely follow-up task, using CRM stages, last contact, and data room engagement — then suggest three outreach angles.",
  },
  {
    label: "Top 5 priorities",
    prompt:
      "Build my top 5 priorities for closing capital this week as a sponsor: mix of investor meetings, docs, diligence, and pipeline hygiene — bullet format.",
  },
  {
    label: "Summarize overdue risks",
    prompt:
      "Summarize risks when fundraising tasks slip (overdue follow-ups, unsigned docs, stalled diligence). What should operators watch for and fix first?",
  },
  {
    label: "Next week action plan",
    prompt:
      "Draft a one-week action plan for an active private raise: outreach cadence, internal checkpoints, and LP communications.",
  },
  {
    label: "Closing checklist",
    prompt:
      "Generate a practical closing checklist for a private placement (subscription docs, wires, signatures, regulatory reminders) suitable for my Tasks board.",
  },
];

const QUICK_ACTIONS = [
  {
    label: "What needs attention today?",
    prompt:
      "Given what a capital-raising team usually tracks, list the top priorities I should focus on today: pipeline, overdue follow-ups, commitments pending docs, and meetings — be specific and actionable.",
  },
  {
    label: "Who is most likely to invest?",
    prompt:
      "Explain how to rank investors by likelihood to commit using pipeline stage, relationship score, engagement (data room, meetings), and check size fit. Give a practical rubric I can apply this week.",
  },
  {
    label: "Draft follow-ups",
    prompt:
      "Draft three short follow-up email variants for warm LPs after they viewed our data room: one checking intent, one offering a call, one sharing a light update.",
  },
  {
    label: "Summarize pipeline",
    prompt:
      "Summarize how to read a private-capital pipeline from lead to close: key stages, common leakage points, and what good looks like for weekly cadence.",
  },
  {
    label: "Show stale leads",
    prompt:
      "List objective criteria for 'stale' investor leads in a raise (timing, stage, last touch) and give re-engagement plays for each pattern.",
  },
];

export function CopilotPanel(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  copilotEnabled: boolean;
}) {
  const pathname = usePathname();
  const quickActions = React.useMemo(() => {
    if (/^\/deals\/[^/]+$/.test(pathname)) {
      return [...DEAL_QUICK_ACTIONS, ...QUICK_ACTIONS];
    }
    if (pathname === "/tasks" || pathname.startsWith("/tasks/")) {
      return TASKS_QUICK_ACTIONS;
    }
    return QUICK_ACTIONS;
  }, [pathname]);
  const [input, setInput] = React.useState("");
  const [messages, setMessages] = React.useState<{ role: "user" | "assistant"; content: string }[]>(
    [],
  );
  const [loading, setLoading] = React.useState(false);

  async function runSend(appendMessages: { role: "user" | "assistant"; content: string }[]) {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: appendMessages.slice(-12).map((m) => ({
            role: m.role,
            content:
              m.role === "user" && appendMessages.length === 1
                ? `[Screen: ${pathname}]\n${m.content}`
                : m.content,
          })),
        }),
      });
      if (res.status === 402) {
        const text = await res.text();
        setMessages((m) => [...m, { role: "assistant", content: text }]);
        return;
      }
      if (!res.ok) throw new Error("Chat failed");
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistant = "";
      setMessages((m) => [...m, { role: "assistant", content: "" }]);
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        assistant += decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: assistant };
          return copy;
        });
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Unable to reach Copilot. Check API keys and billing tier." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function send() {
    if (!input.trim() || loading) return;
    const next = [...messages, { role: "user" as const, content: input.trim() }];
    setMessages(next);
    setInput("");
    await runSend(next);
  }

  function runQuick(prompt: string) {
    const next = [...messages, { role: "user" as const, content: prompt }];
    setMessages(next);
    void runSend(next);
  }

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent className="w-full border-l border-border bg-card sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="font-heading">AI Copilot</SheetTitle>
          <p className="text-xs text-muted-foreground">
            Context: <code className="text-[11px]">{pathname}</code> — available on Pro, Growth, and
            Enterprise.
          </p>
        </SheetHeader>
        {!props.copilotEnabled ? (
          <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
            Your plan does not include Copilot yet.{" "}
            <Link href="/settings/billing" className="font-semibold underline">
              Upgrade under Billing
            </Link>{" "}
            — you can still explore quick actions below; the assistant will prompt you to upgrade on send.
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {quickActions.map((a) => (
            <Button
              key={a.label}
              type="button"
              size="sm"
              variant="secondary"
              className="h-8 rounded-full text-xs"
              disabled={loading}
              onClick={() => runQuick(a.prompt)}
            >
              {a.label}
            </Button>
          ))}
          <Link
            href="/settings/billing"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "inline-flex h-8 rounded-full px-3 text-xs",
            )}
          >
            Upgrade
          </Link>
        </div>
        <ScrollArea className="mt-4 h-[calc(100vh-14rem)] pr-3">
          <div className="flex flex-col gap-3 text-sm">
            {messages.length === 0 && (
              <p className="text-muted-foreground">
                Draft LP emails, pressure-test your funnel, or prep IC memos — grounded in CPIN workflows.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "ml-6 rounded-xl bg-primary/10 px-3 py-2"
                    : "mr-2 rounded-xl border border-border/80 bg-muted/30 px-3 py-2 whitespace-pre-wrap"
                }
              >
                {m.content}
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="mt-4 flex flex-col gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Copilot…"
            className="min-h-[88px] resize-none rounded-xl"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <Button className="rounded-xl" onClick={() => void send()} disabled={loading}>
            {loading ? "Thinking…" : "Send"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

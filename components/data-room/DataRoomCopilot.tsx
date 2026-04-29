"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const CHIPS = [
  "Which investors are hottest this week?",
  "Who viewed docs but has not replied?",
  "Which files get the most engagement?",
  "Suggest investor follow-ups.",
  "Generate a short LP update email.",
  "Summarize activity in this room.",
];

type Props = {
  roomName: string;
  roomId: string;
  metricsSummary: string;
};

export function DataRoomCopilot(props: Props) {
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [messages, setMessages] = React.useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [loading, setLoading] = React.useState(false);

  async function runSend(appendMessages: { role: "user" | "assistant"; content: string }[]) {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: appendMessages.slice(-12).map((m, i, arr) => {
            let content = m.content;
            if (m.role === "user" && i === arr.length - 1) {
              content = `[Context: Data room "${props.roomName}" (${props.roomId}). Metrics: ${props.metricsSummary}]\n\n${m.content}`;
            }
            return { role: m.role, content };
          }),
        }),
      });
      if (res.status === 402) {
        const text = await res.text();
        setMessages((prev) => [...prev, { role: "assistant", content: text }]);
        return;
      }
      if (!res.ok) throw new Error("Chat failed");
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistant = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        assistant += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === "assistant") last.content = assistant;
          return copy;
        });
      }
    } catch {
      setMessages((prev) => [
        ...prev,
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
    <>
      <Button
        type="button"
        size="lg"
        className={cn("fixed bottom-6 right-6 z-40 gap-2 rounded-full px-5 shadow-lg", "hidden md:inline-flex")}
        onClick={() => setOpen(true)}
      >
        <Sparkles className="h-4 w-4" />
        Room AI
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full max-w-md flex-col gap-0 rounded-l-2xl p-0">
          <SheetHeader className="border-b border-border px-4 py-3 text-left">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Data room copilot
            </SheetTitle>
            <p className="text-xs text-muted-foreground">Prompts grounded on this workspace.</p>
          </SheetHeader>
          <div className="flex flex-1 flex-col overflow-hidden px-3 py-3">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {CHIPS.map((c) => (
                <Button
                  key={c}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto rounded-full px-2.5 py-1 text-[11px] font-normal leading-snug"
                  disabled={loading}
                  onClick={() => runQuick(c)}
                >
                  {c}
                </Button>
              ))}
            </div>
            <ScrollArea className="min-h-[200px] flex-1 rounded-xl border border-border bg-muted/30 p-3">
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ask anything about diligence and engagement.</p>
              ) : (
                <ul className="space-y-3 text-sm">
                  {messages.map((m, i) => (
                    <li
                      key={`${i}-${m.role}-${m.content.slice(0, 24)}`}
                      className={cn(
                        "whitespace-pre-wrap rounded-lg px-3 py-2",
                        m.role === "user" ? "ml-6 bg-primary text-primary-foreground" : "mr-6 bg-card",
                      )}
                    >
                      {m.content}
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
            <div className="mt-3 flex gap-2">
              <Textarea
                placeholder="Ask the copilot…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="min-h-[72px] flex-1 resize-none rounded-xl border-border"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <Button className="rounded-xl self-end" type="button" disabled={loading} onClick={() => void send()}>
                Send
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

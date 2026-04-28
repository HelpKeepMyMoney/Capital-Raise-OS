"use client";

import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

export function CopilotPanel(props: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [input, setInput] = React.useState("");
  const [messages, setMessages] = React.useState<{ role: "user" | "assistant"; content: string }[]>(
    [],
  );
  const [loading, setLoading] = React.useState(false);

  async function send() {
    if (!input.trim() || loading) return;
    const next = [...messages, { role: "user" as const, content: input.trim() }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.slice(-12).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
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
      setMessages((m) => [...m, { role: "assistant", content: "Unable to reach Copilot. Check API keys." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg border-l border-white/10 bg-background/95 backdrop-blur-xl">
        <SheetHeader>
          <SheetTitle>AI Copilot</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-12rem)] mt-4 pr-3">
          <div className="flex flex-col gap-3 text-sm">
            {messages.length === 0 && (
              <p className="text-muted-foreground">
                Draft investor emails, summarize meetings, or analyze your funnel. Powered by Claude.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "ml-8 rounded-lg bg-primary/10 px-3 py-2"
                    : "mr-4 rounded-lg border border-border/60 bg-card/50 px-3 py-2 whitespace-pre-wrap"
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
            className="min-h-[88px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <Button onClick={() => void send()} disabled={loading}>
            {loading ? "Thinking…" : "Send"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

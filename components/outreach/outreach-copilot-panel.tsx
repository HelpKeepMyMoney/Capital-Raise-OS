"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export function OutreachCopilotPanel(props: {
  campaignName?: string;
  dealName?: string;
}) {
  const [prompt, setPrompt] = React.useState(
    "Draft a concise institutional follow-up for warm LPs who opened our data room twice.",
  );
  const [reply, setReply] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function run() {
    setLoading(true);
    setReply("");
    try {
      const context = [
        props.campaignName ? `Campaign: ${props.campaignName}` : null,
        props.dealName ? `Deal: ${props.dealName}` : null,
      ]
        .filter(Boolean)
        .join(". ");
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `${context}\n\n${prompt}`,
            },
          ],
        }),
      });
      if (!res.ok) throw new Error("Copilot unavailable");
      const text = await res.text();
      setReply(text);
    } catch {
      setReply("Connect AI (Pro+) to draft outreach copy from the workspace copilot.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="rounded-2xl border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading text-base">
          <Sparkles className="size-4 text-primary" />
          Outreach copilot
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[80px] text-sm"
        />
        <Button size="sm" onClick={() => void run()} disabled={loading}>
          {loading ? "Drafting…" : "Draft with AI"}
        </Button>
        {reply ? (
          <pre className="max-h-[200px] overflow-auto whitespace-pre-wrap rounded-lg bg-muted/30 p-3 text-xs">
            {reply}
          </pre>
        ) : null}
      </CardContent>
    </Card>
  );
}

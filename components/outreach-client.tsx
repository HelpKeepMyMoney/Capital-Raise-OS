"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function OutreachClient() {
  const [to, setTo] = React.useState("investor@example.com");
  const [subject, setSubject] = React.useState("Quick note on CPIN");
  const [html, setHtml] = React.useState(
    "<p>Hi — sharing our latest deck and data room. Happy to align on timing.</p>",
  );
  const [sending, setSending] = React.useState(false);

  async function send() {
    setSending(true);
    try {
      const res = await fetch("/api/outreach/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, html }),
      });
      if (!res.ok) throw new Error("Send failed");
      toast.success("Message queued via Resend");
    } catch {
      toast.error("Could not send — configure RESEND_API_KEY and domain");
    } finally {
      setSending(false);
    }
  }

  return (
    <Tabs defaultValue="compose" className="space-y-4">
      <TabsList>
        <TabsTrigger value="compose">Compose</TabsTrigger>
        <TabsTrigger value="sequences">Sequences</TabsTrigger>
        <TabsTrigger value="templates">Templates</TabsTrigger>
        <TabsTrigger value="inbox">Replies</TabsTrigger>
      </TabsList>
      <TabsContent value="compose">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle>Cold outreach</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-w-2xl">
            <Input placeholder="To" value={to} onChange={(e) => setTo(e.target.value)} />
            <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <Textarea
              className="min-h-[160px] font-mono text-sm"
              value={html}
              onChange={(e) => setHtml(e.target.value)}
            />
            <Button onClick={() => void send()} disabled={sending}>
              {sending ? "Sending…" : "Send with open tracking"}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="sequences">
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-6 text-sm text-muted-foreground">
            3-step follow-up builder: define delays, templates, and pause-if-replied rules (wired in
            campaigns collection + scheduled functions).
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="templates">
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Store reusable first lines and personalization tokens per investor field.
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="inbox">
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Connect Resend inbound webhooks to classify reply sentiment and pause sequences.
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

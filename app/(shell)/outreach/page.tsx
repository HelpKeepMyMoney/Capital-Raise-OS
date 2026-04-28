import { OutreachClient } from "@/components/outreach-client";

export default function OutreachPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Outreach engine</h1>
        <p className="mt-1 text-muted-foreground">
          Sequences, templates, tracking pixels, and reply-aware automation.
        </p>
      </div>
      <OutreachClient />
    </div>
  );
}

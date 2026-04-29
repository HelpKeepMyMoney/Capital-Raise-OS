"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { DealCommitment, DealCommitmentInvestingAs } from "@/lib/firestore/types";
import { Card, CardContent } from "@/components/ui/card";
import { Circle, CircleDashed, CircleDot } from "lucide-react";

function StatusRow(props: { label: string; state: "done" | "pending" | "open"; detail?: string }) {
  const Icon =
    props.state === "done" ? CircleDot : props.state === "pending" ? CircleDashed : Circle;
  return (
    <div className="flex gap-3 rounded-xl border border-border/70 bg-background/60 px-3 py-2.5">
      <Icon
        className={cn(
          "mt-0.5 size-4 shrink-0",
          props.state === "done" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
        )}
        aria-hidden
      />
      <div className="min-w-0">
        <p className="text-sm font-medium leading-tight">{props.label}</p>
        {props.detail ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{props.detail}</p>
        ) : null}
      </div>
    </div>
  );
}

export function DealCommitmentForm(props: {
  dealId: string;
  dealName: string;
  initialCommitment?: DealCommitment | null;
}) {
  const router = useRouter();
  const init = props.initialCommitment;
  const active = init?.status === "active";

  const [amount, setAmount] = React.useState(
    init?.status === "active" && init.amount ? String(init.amount) : "",
  );
  const [investingAs, setInvestingAs] = React.useState<DealCommitmentInvestingAs>(
    init?.investingAs ?? "individual",
  );
  const [entityName, setEntityName] = React.useState(init?.entityName ?? "");
  const [accreditation, setAccreditation] = React.useState(init?.accreditationStatus ?? "");
  const [preferredContact, setPreferredContact] = React.useState<"email" | "phone" | "either">(
    (init?.preferredContact as "email" | "phone" | "either" | undefined) ?? "email",
  );
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    const i = props.initialCommitment;
    if (i?.status === "active" && i.amount) setAmount(String(i.amount));
    if (i?.investingAs) setInvestingAs(i.investingAs);
    setEntityName(i?.entityName ?? "");
    setAccreditation(i?.accreditationStatus ?? "");
    if (i?.preferredContact === "email" || i?.preferredContact === "phone" || i?.preferredContact === "either") {
      setPreferredContact(i.preferredContact);
    }
  }, [props.initialCommitment]);

  const doc = init?.docStatus ?? "none";
  const docsStarted = doc === "complete" || doc === "pending";

  async function submit(withdraw: boolean) {
    setPending(true);
    try {
      const res = await fetch("/api/deals/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId: props.dealId,
          amount: withdraw ? undefined : Number(amount),
          withdraw,
          investingAs: withdraw ? undefined : investingAs,
          entityName: withdraw ? undefined : entityName.trim() || undefined,
          accreditationStatus: withdraw ? undefined : accreditation.trim() || undefined,
          preferredContact: withdraw ? undefined : preferredContact,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      toast.success(
        withdraw ? "Commitment withdrawn" : `Commitment saved for ${props.dealName}`,
      );
      if (withdraw) {
        setAmount("");
        setEntityName("");
        setAccreditation("");
      }
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save commitment");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Status
        </p>
        <div className="grid gap-2 sm:grid-cols-1">
          <StatusRow
            label="Reservation"
            state={active ? "done" : "open"}
            detail={active ? "Your soft commit is on file." : "No active reservation yet."}
          />
          <StatusRow
            label="Subscription docs"
            state={docsStarted ? "pending" : "open"}
            detail={
              doc === "complete"
                ? "Marked complete by sponsor."
                : doc === "pending"
                  ? "In progress — finish when invited."
                  : "Not started — sponsor will send next steps."
            }
          />
          <StatusRow
            label="Allocation"
            state={doc === "complete" ? "done" : "pending"}
            detail={
              doc === "complete"
                ? "Docs complete — confirm wire with sponsor."
                : "Final allocation after sponsor confirms docs and suitability."
            }
          />
        </div>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardContent className="space-y-5 p-5 pt-5">
          <div>
            <Label htmlFor={`commit-amt-${props.dealId}`}>Amount (USD, whole dollars)</Label>
            <p className="text-xs text-muted-foreground">
              Non-binding indication for the issuer. Update anytime.
            </p>
            <Input
              id={`commit-amt-${props.dealId}`}
              type="number"
              min={1}
              step={1}
              className="mt-2 max-w-md rounded-xl"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 50000"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Investing as</Label>
              <Select
                value={investingAs}
                onValueChange={(v) => setInvestingAs(v as DealCommitmentInvestingAs)}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="llc">LLC</SelectItem>
                  <SelectItem value="trust">Trust</SelectItem>
                  <SelectItem value="ira">IRA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`commit-entity-${props.dealId}`}>Entity name</Label>
              <Input
                id={`commit-entity-${props.dealId}`}
                className="rounded-xl"
                value={entityName}
                onChange={(e) => setEntityName(e.target.value)}
                placeholder="If applicable"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Accreditation (self-reported)</Label>
              <Select
                value={accreditation || "unset"}
                onValueChange={(v) => setAccreditation(!v || v === "unset" ? "" : v)}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unset">Prefer not to say</SelectItem>
                  <SelectItem value="accredited">Accredited investor</SelectItem>
                  <SelectItem value="qualified_client">Qualified client / purchaser</SelectItem>
                  <SelectItem value="non_accredited">Not accredited</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Preferred contact</Label>
              <Select
                value={preferredContact}
                onValueChange={(v) => setPreferredContact(v as "email" | "phone" | "either")}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="either">Either</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <Button type="button" disabled={pending} onClick={() => void submit(false)}>
              {pending ? "Saving…" : "Save commitment"}
            </Button>
            <Button type="button" variant="danger" disabled={pending} onClick={() => void submit(true)}>
              Withdraw commitment
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from "lucide-react";

const RULES = [
  {
    id: "1",
    trigger: "Investor expresses interest on a deal",
    action: "Create follow-up task due in 3 days",
    status: "Live",
  },
  {
    id: "2",
    trigger: "Data room opened 2× by same investor",
    action: "Create outreach task",
    status: "Preview",
  },
  {
    id: "3",
    trigger: "Commitment stated",
    action: "Generate closing checklist tasks",
    status: "Preview",
  },
  {
    id: "4",
    trigger: "No response in 7 days",
    action: "Reminder task to sponsor owner",
    status: "Preview",
  },
  {
    id: "6",
    trigger: "Founder call booked from deal page",
    action: "Create prep task for sponsor",
    status: "Preview",
  },
  {
    id: "7",
    trigger: "Investor viewed diligence docs twice with no reply",
    action: "Create warm follow-up task",
    status: "Preview",
  },
  {
    id: "8",
    trigger: "Subscription docs pending wire",
    action: "Create funding / ops checklist task",
    status: "Preview",
  },
];

export function AutomationCenter() {
  return (
    <Card id="task-automation-center" className="rounded-2xl border-border/80 shadow-md">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 font-heading text-lg">
            <Zap className="size-5 text-primary" aria-hidden />
            Automation center
          </CardTitle>
          <CardDescription className="mt-1 max-w-2xl">
            Visual rule templates — execution hooks ship with Firebase Functions in a later release. Use this board to align the team on intended workflows.
          </CardDescription>
        </div>
        <Badge variant="secondary" className="rounded-full">
          Preview
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {RULES.map((r) => (
          <div
            key={r.id}
            className="flex flex-col gap-2 rounded-xl border border-border/70 bg-muted/20 px-4 py-3 md:flex-row md:items-center md:justify-between"
          >
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Trigger
              </p>
              <p className="text-sm">{r.trigger}</p>
            </div>
            <div className="min-w-0 flex-1 space-y-1 border-border/50 md:border-l md:pl-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Action
              </p>
              <p className="text-sm">{r.action}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge
                variant={r.status === "Live" ? "default" : "outline"}
                className="rounded-full text-[10px]"
              >
                {r.status}
              </Badge>
              <Button size="sm" variant="outline" className="rounded-lg" type="button" disabled>
                Edit
              </Button>
            </div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">
          Expressing interest on a deal already creates a follow-up task (see deal workflow). Additional connectors will appear here as they ship.
        </p>
      </CardContent>
    </Card>
  );
}

"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OutreachFunnel } from "@/lib/outreach/analytics";

export function OutreachMetrics(props: { funnel: OutreachFunnel }) {
  const items = [
    { label: "Recipients", value: props.funnel.recipients },
    { label: "Sent", value: props.funnel.sent },
    { label: "Open rate", value: `${props.funnel.openRate}%` },
    { label: "Click rate", value: `${props.funnel.clickRate}%` },
    { label: "Reply rate", value: `${props.funnel.replyRate}%` },
    { label: "Meetings", value: props.funnel.meetingsBooked },
    { label: "Data room visits", value: props.funnel.dataRoomVisits },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
        >
          <Card className="rounded-2xl border-border/80 shadow-sm">
            <CardHeader className="pb-1">
              <CardTitle className="font-heading text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {item.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-heading text-2xl font-semibold tabular-nums">{item.value}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

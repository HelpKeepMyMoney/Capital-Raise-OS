"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Activity } from "@/lib/firestore/types";
import { formatDistanceToNow } from "date-fns";

export function ActivityFeed(props: { items: Activity[] }) {
  return (
    <Card className="border-white/10 bg-card/60 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-base">Recent investor activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {props.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity.</p>
        ) : (
          props.items.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-lg border border-white/5 bg-background/40 px-3 py-2"
            >
              <p className="text-sm font-medium">{a.summary}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(a.createdAt, { addSuffix: true })}
              </p>
            </motion.div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

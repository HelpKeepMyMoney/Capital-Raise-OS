"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function StatCard(props: {
  title: string;
  value: string;
  hint?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: props.delay ?? 0 }}
    >
      <Card className="border-white/10 bg-gradient-to-br from-card/90 to-card/40 shadow-lg backdrop-blur-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{props.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold tracking-tight">{props.value}</p>
          {props.hint ? <p className="mt-1 text-xs text-muted-foreground">{props.hint}</p> : null}
        </CardContent>
      </Card>
    </motion.div>
  );
}

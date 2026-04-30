"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SettingsMainPanel(props: {
  organizationSection: React.ReactNode;
  profileSection: React.ReactNode;
}) {
  const [section, setSection] = React.useState<"organization" | "profile">("organization");

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 border-b border-border pb-4">
        <nav className="flex flex-wrap items-center gap-2 text-sm" aria-label="Settings sections">
          <button
            type="button"
            onClick={() => setSection("organization")}
            className={cn(
              "rounded-md px-2 py-1 transition-colors",
              section === "organization"
                ? "font-semibold text-foreground"
                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
            )}
          >
            Organization
          </button>
          <span className="text-muted-foreground/60" aria-hidden>
            /
          </span>
          <button
            type="button"
            onClick={() => setSection("profile")}
            className={cn(
              "rounded-md px-2 py-1 transition-colors",
              section === "profile"
                ? "font-semibold text-foreground"
                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
            )}
          >
            Your Profile
          </button>
        </nav>
        <Link
          href="/settings/esign"
          className={cn(buttonVariants({ size: "sm", variant: "outline" }), "shrink-0 rounded-xl")}
        >
          E-Sign Templates
        </Link>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        {section === "organization" ? props.organizationSection : props.profileSection}
      </CardContent>
    </Card>
  );
}

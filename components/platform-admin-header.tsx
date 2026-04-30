"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export function PlatformAdminHeaderExtras() {
  return (
    <div className="flex items-center gap-2">
      <ThemeToggle />
      <Button
        variant="ghost"
        size="sm"
        className="text-foreground/80"
        type="button"
        onClick={async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          window.location.href = "/";
        }}
      >
        Log out
      </Button>
    </div>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function DeleteOrganizationSection(props: {
  organizationId: string;
  organizationName: string;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [confirmText, setConfirmText] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  const matches = confirmText.trim() === props.organizationName.trim();

  async function executeDelete() {
    if (!matches || !props.canDelete) return;
    setPending(true);
    try {
      const res = await fetch(`/api/organizations/${encodeURIComponent(props.organizationId)}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: confirmText.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not delete organization");
      toast.success("Organization deleted");
      setOpen(false);
      setConfirmText("");
      router.refresh();
      router.replace("/dashboard");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setPending(false);
    }
  }

  if (!props.canDelete) return null;

  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
      <h3 className="font-heading text-sm font-semibold text-destructive">Delete organization</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Permanently delete this workspace: deals, tasks, data rooms, documents (Firestore + Storage),
        outreach records, and memberships.{" "}
        <strong className="text-foreground">Investor CRM contacts are not deleted</strong> — those records stay in
        Firestore with this organization id for compliance and history.
      </p>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        className="mt-4 rounded-xl"
        onClick={() => setOpen(true)}
      >
        Delete organization…
      </Button>

      <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
        <DialogContent className="sm:max-w-md" showCloseButton={!pending}>
          <DialogHeader>
            <DialogTitle>Delete this organization?</DialogTitle>
            <DialogDescription>
              This cannot be undone. Type the organization name exactly to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 px-0 pb-2">
            <Label htmlFor="delete-org-confirm">Organization name</Label>
            <Input
              id="delete-org-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={props.organizationName}
              autoComplete="off"
              disabled={pending}
            />
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!matches || pending}
              onClick={() => void executeDelete()}
            >
              {pending ? "Deleting…" : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

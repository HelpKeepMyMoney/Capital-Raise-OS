"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { slugify } from "@/lib/organizations/slug";

export function OrganizationSettingsForm(props: {
  organizationId: string;
  initialName: string;
  initialSlug: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [name, setName] = React.useState(props.initialName);
  const [slug, setSlug] = React.useState(props.initialSlug);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    setName(props.initialName);
    setSlug(props.initialSlug);
  }, [props.initialName, props.initialSlug]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!props.canEdit) return;
    setPending(true);
    try {
      const res = await fetch(`/api/organizations/${encodeURIComponent(props.organizationId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });
      const data = (await res.json()) as { error?: string; details?: unknown };
      if (!res.ok) {
        throw new Error(data.error ?? "Update failed");
      }
      toast.success("Organization updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="org-name">Name</Label>
        <Input
          id="org-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!props.canEdit || pending}
          autoComplete="organization"
        />
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <Label htmlFor="org-slug">Slug</Label>
          {props.canEdit ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs text-muted-foreground"
              disabled={pending}
              onClick={() => setSlug(slugify(name))}
            >
              Normalize from name
            </Button>
          ) : null}
        </div>
        <Input
          id="org-slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          disabled={!props.canEdit || pending}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
        />
        <p className="text-xs text-muted-foreground">
          Lowercase letters, numbers, and hyphens only (3–64 characters). Must be unique across CPIN.
        </p>
      </div>
      {props.canEdit ? (
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          Only founders and admins can change the organization name and slug.
        </p>
      )}
    </form>
  );
}

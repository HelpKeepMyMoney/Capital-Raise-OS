"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { SerializedDataRoom } from "@/components/data-room/types";
import type { SerializedDealLite } from "@/components/data-room/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  room: SerializedDataRoom;
  deals: SerializedDealLite[];
  canManage: boolean;
};

export function RoomSettings(props: Props) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    name: props.room.name,
    dealId: props.room.dealId ?? "",
    description: props.room.description ?? "",
    ndaRequired: props.room.ndaRequired,
    visibility: (props.room.visibility ?? "open") as "open" | "invite_only",
    downloadAllowed: props.room.downloadAllowed !== false,
    watermarkDocs: props.room.watermarkDocs === true,
    expiresAt: props.room.expiresAt ? new Date(props.room.expiresAt).toISOString().slice(0, 10) : "",
    requireLogin: props.room.requireLogin === true,
    welcomeMessage: props.room.welcomeMessage ?? "",
    ndaTemplateRef: props.room.ndaTemplateRef ?? "",
  });

  React.useEffect(() => {
    setForm({
      name: props.room.name,
      dealId: props.room.dealId ?? "",
      description: props.room.description ?? "",
      ndaRequired: props.room.ndaRequired,
      visibility: (props.room.visibility ?? "open") as "open" | "invite_only",
      downloadAllowed: props.room.downloadAllowed !== false,
      watermarkDocs: props.room.watermarkDocs === true,
      expiresAt: props.room.expiresAt ? new Date(props.room.expiresAt).toISOString().slice(0, 10) : "",
      requireLogin: props.room.requireLogin === true,
      welcomeMessage: props.room.welcomeMessage ?? "",
      ndaTemplateRef: props.room.ndaTemplateRef ?? "",
    });
  }, [props.room]);

  async function save() {
    setSaving(true);
    try {
      const expiresAt =
        form.expiresAt.trim() === ""
          ? null
          : new Date(form.expiresAt + "T23:59:59.999Z").getTime();
      const res = await fetch(`/api/data-room/rooms/${props.room.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          dealId: form.dealId.trim() === "" ? null : form.dealId.trim(),
          description: form.description.trim(),
          ndaRequired: form.ndaRequired,
          visibility: form.visibility,
          downloadAllowed: form.downloadAllowed,
          watermarkDocs: form.watermarkDocs,
          expiresAt,
          requireLogin: form.requireLogin,
          welcomeMessage: form.welcomeMessage.trim() || null,
          ndaTemplateRef: form.ndaTemplateRef.trim() || null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      toast.success("Room updated");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!props.canManage) {
    return (
      <p className="text-sm text-muted-foreground">Only team members can change room settings.</p>
    );
  }

  return (
    <Card className="rounded-2xl border-border shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Room settings</CardTitle>
        <CardDescription>Govern deal linkage, NDA, downloads, and investor welcome copy.</CardDescription>
      </CardHeader>
      <CardContent className="grid max-w-xl gap-4">
        <div className="space-y-2">
          <Label htmlFor="rm-name">Room name</Label>
          <Input
            id="rm-name"
            className="rounded-xl"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Associated deal</Label>
          <Select
            value={form.dealId || "__none"}
            onValueChange={(v) =>
              setForm((f) => ({
                ...f,
                dealId: typeof v === "string" ? (v === "__none" ? "" : v) : "",
              }))
            }
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Select deal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">None</SelectItem>
              {props.deals.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Deal linkage powers investor preview and deal-scoped invitations.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rm-desc">Description</Label>
          <Textarea
            id="rm-desc"
            className="min-h-[80px] rounded-xl"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Visibility</Label>
          <Select
            value={form.visibility}
            onValueChange={(v) => {
              if (v === "open" || v === "invite_only") {
                setForm((f) => ({ ...f, visibility: v }));
              }
            }}
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open — team + invited investors</SelectItem>
              <SelectItem value="invite_only">Invite only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={form.ndaRequired} onCheckedChange={(v) => setForm((f) => ({ ...f, ndaRequired: v === true }))} />
          NDA required before access
        </label>
        <div className="space-y-2">
          <Label htmlFor="nda-ref">NDA template reference (SignWell / provider)</Label>
          <Input
            id="nda-ref"
            className="rounded-xl"
            placeholder="Template ID or URI (optional)"
            value={form.ndaTemplateRef}
            onChange={(e) => setForm((f) => ({ ...f, ndaTemplateRef: e.target.value }))}
          />
          <p className="text-[11px] text-muted-foreground">Wire your e-sign workflow; execution comes from the NDA pipeline.</p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={form.downloadAllowed}
            onCheckedChange={(v) => setForm((f) => ({ ...f, downloadAllowed: v === true }))}
          />
          Download allowed
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={form.watermarkDocs}
            onCheckedChange={(v) => setForm((f) => ({ ...f, watermarkDocs: v === true }))}
          />
          Watermark sensitive documents (future)
        </label>
        <div className="space-y-2">
          <Label htmlFor="exp">Expiration date (UTC end of day)</Label>
          <Input
            id="exp"
            type="date"
            className="rounded-xl"
            value={form.expiresAt}
            onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={form.requireLogin}
            onCheckedChange={(v) => setForm((f) => ({ ...f, requireLogin: v === true }))}
          />
          Require authenticated login to open room
        </label>
        <div className="space-y-2">
          <Label htmlFor="wel">Welcome message (investor preview)</Label>
          <Textarea
            id="wel"
            className="min-h-[100px] rounded-xl"
            value={form.welcomeMessage}
            onChange={(e) => setForm((f) => ({ ...f, welcomeMessage: e.target.value }))}
          />
        </div>
        <Button className="max-w-xs rounded-xl" disabled={saving} type="button" onClick={() => void save()}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </CardContent>
    </Card>
  );
}

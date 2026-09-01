"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Copy, KeyRound, Trash2 } from "lucide-react";

type ApiKeyRow = {
  id: string;
  name: string;
  prefix: string;
  createdAt: number;
  revokedAt?: number;
  lastUsedAt?: number;
};

export function ApiKeysSection(props: { organizationId: string; canManage: boolean }) {
  const router = useRouter();
  const [keys, setKeys] = React.useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [newSecret, setNewSecret] = React.useState<string | null>(null);
  const [revokingId, setRevokingId] = React.useState<string | null>(null);

  const base = `/api/organizations/${encodeURIComponent(props.organizationId)}/api-keys`;

  async function loadKeys() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(base);
      const data = (await res.json()) as { keys?: ApiKeyRow[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load API keys");
      setKeys(data.keys ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load API keys";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (props.canManage) void loadKeys();
    else setLoading(false);
  }, [props.canManage, props.organizationId]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!props.canManage) return;
    const label = name.trim();
    if (!label) {
      toast.error("Name is required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: label }),
      });
      const data = (await res.json()) as { secret?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Create failed");
      if (!data.secret) throw new Error("No secret returned");
      setNewSecret(data.secret);
      setName("");
      await loadKeys();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  async function onRevoke(keyId: string) {
    if (!props.canManage) return;
    if (!window.confirm("Revoke this API key? Integrations using it will stop working immediately.")) {
      return;
    }
    setRevokingId(keyId);
    try {
      const res = await fetch(`${base}/${encodeURIComponent(keyId)}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Revoke failed");
      toast.success("API key revoked");
      await loadKeys();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Revoke failed");
    } finally {
      setRevokingId(null);
    }
  }

  async function copySecret() {
    if (!newSecret) return;
    try {
      await navigator.clipboard.writeText(newSecret);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Copy failed — select and copy manually");
    }
  }

  const activeKeys = keys.filter((k) => !k.revokedAt);

  return (
    <>
      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            REST API keys
          </CardTitle>
          <CardDescription>
            Create org-scoped keys so clients can read and update deals, investors, data rooms, and
            tasks via <code className="text-xs">/api/v1</code> instead of the website. Keys
            authenticate as this organization, not as your user session. Invites and email sends stay
            in the CapitalOS UI.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!props.canManage ? (
            <p className="text-sm text-muted-foreground">
              Only founders and admins can create or revoke API keys.
            </p>
          ) : (
            <>
              <form onSubmit={(e) => void onCreate(e)} className="flex flex-wrap items-end gap-3">
                <div className="min-w-[200px] flex-1 space-y-2">
                  <Label htmlFor="api-key-name">Key label</Label>
                  <Input
                    id="api-key-name"
                    placeholder="CFO sync agent"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={creating}
                  />
                </div>
                <Button type="submit" disabled={creating}>
                  {creating ? "Creating…" : "Create API key"}
                </Button>
              </form>

              {loading ? (
                <p className="text-sm text-muted-foreground">Loading keys…</p>
              ) : loadError ? (
                <div className="space-y-2">
                  <p className="text-sm text-destructive">{loadError}</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => void loadKeys()}>
                    Retry
                  </Button>
                </div>
              ) : activeKeys.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active API keys.</p>
              ) : (
                <ul className="divide-y rounded-lg border border-border">
                  {activeKeys.map((k) => (
                    <li key={k.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium">{k.name}</p>
                        <p className="text-muted-foreground">
                          <code>{k.prefix}…</code>
                          {k.lastUsedAt ? (
                            <span className="ml-2">
                              · last used {new Date(k.lastUsedAt).toLocaleString()}
                            </span>
                          ) : (
                            <span className="ml-2">· never used</span>
                          )}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={revokingId === k.id}
                        onClick={() => void onRevoke(k.id)}
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Revoke
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(newSecret)} onOpenChange={(open) => !open && setNewSecret(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy your API key</DialogTitle>
            <DialogDescription>
              This is the only time the full key is shown. Store it securely — it cannot be retrieved later.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md bg-muted p-3 font-mono text-xs break-all">{newSecret}</div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => void copySecret()}>
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
            <Button type="button" onClick={() => setNewSecret(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

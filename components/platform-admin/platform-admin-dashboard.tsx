"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { InvestorAccess } from "@/lib/firestore/types";
import type { Organization } from "@/lib/firestore/types";
import { SubscriptionPlanSchema, UserRoleSchema, type UserRole } from "@/lib/firestore/types";

const USER_ROLES = UserRoleSchema.options;
const SUBSCRIPTION_PLANS = SubscriptionPlanSchema.options;

const SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due", "cancelled", "none"] as const;

type MembershipAssignmentResult =
  | { ok: true }
  | { ok: false; message: string };

type MembershipAssignmentHandle = {
  willAssignMembership: () => boolean;
  assignToUser: (uid: string) => Promise<MembershipAssignmentResult>;
};

type ListedUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  disabled: boolean;
  photoURL: string | null;
  hasProfileDoc: boolean;
};

type OrgRow = Organization;

type MembershipRow = {
  organizationId: string;
  organizationName: string;
  role: string;
  investorAccess?: unknown;
};

type UserDetail = {
  uid: string;
  email: string | null;
  emailVerified?: boolean;
  displayName: string | null;
  disabled: boolean;
  photoURL?: string | null;
  memberships: MembershipRow[];
  profile?: {
    email: string;
    displayName?: string;
    defaultOrganizationId?: string;
    createdAt?: number | null;
  } | null;
};

export function PlatformAdminDashboard() {
  const [orgs, setOrgs] = React.useState<OrgRow[]>([]);
  const [orgsError, setOrgsError] = React.useState<string | null>(null);

  const [users, setUsers] = React.useState<ListedUser[]>([]);
  const [nextPageToken, setNextPageToken] = React.useState<string | null>(null);
  const [usersLoading, setUsersLoading] = React.useState(false);
  const [usersError, setUsersError] = React.useState<string | null>(null);
  const [profileOnly, setProfileOnly] = React.useState(false);

  const [userDialogOpen, setUserDialogOpen] = React.useState(false);
  const [userDialogMode, setUserDialogMode] = React.useState<"create" | "edit">("edit");
  const [detailUid, setDetailUid] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailError, setDetailError] = React.useState<string | null>(null);

  const [actionMessage, setActionMessage] = React.useState<string | null>(null);
  const [createUserFormKey, setCreateUserFormKey] = React.useState(0);

  const loadOrgs = React.useCallback(async () => {
    setOrgsError(null);
    try {
      const res = await fetch("/api/platform-admin/organizations");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : res.statusText);
      setOrgs(json.organizations ?? []);
    } catch (e) {
      setOrgsError(e instanceof Error ? e.message : "Failed to load organizations");
    }
  }, []);

  React.useEffect(() => {
    void loadOrgs();
  }, [loadOrgs]);

  const fetchUsersFirstPage = React.useCallback(async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const params = new URLSearchParams({ maxResults: "50" });
      const res = await fetch(`/api/platform-admin/users?${params}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : res.statusText);
      setUsers(json.users ?? []);
      setNextPageToken(json.nextPageToken ?? null);
    } catch (e) {
      setUsersError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchUsersFirstPage();
  }, [fetchUsersFirstPage]);

  const fetchNextPage = async () => {
    if (!nextPageToken) return;
    setUsersLoading(true);
    setUsersError(null);
    try {
      const params = new URLSearchParams({ maxResults: "50", pageToken: nextPageToken });
      const res = await fetch(`/api/platform-admin/users?${params}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : res.statusText);
      setUsers((prev) => [...prev, ...(json.users ?? [])]);
      setNextPageToken(json.nextPageToken ?? null);
    } catch (e) {
      setUsersError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  };

  const openDetail = (uid: string) => {
    setUserDialogMode("edit");
    setDetailUid(uid);
    setUserDialogOpen(true);
    setDetail(null);
    setDetailError(null);
  };

  const openCreateUser = () => {
    setCreateUserFormKey((k) => k + 1);
    setUserDialogMode("create");
    setDetailUid(null);
    setDetail(null);
    setDetailError(null);
    setUserDialogOpen(true);
  };

  React.useEffect(() => {
    if (!userDialogOpen || userDialogMode !== "edit" || !detailUid) return;
    let cancelled = false;
    (async () => {
      setDetailLoading(true);
      try {
        const res = await fetch(`/api/platform-admin/users/${detailUid}`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : res.statusText);
        if (!cancelled) setDetail(json as UserDetail);
      } catch (e) {
        if (!cancelled) setDetailError(e instanceof Error ? e.message : "Failed to load user");
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userDialogOpen, userDialogMode, detailUid]);

  const filteredUsersList = React.useMemo(
    () => (profileOnly ? users.filter((u) => u.hasProfileDoc) : users),
    [users, profileOnly],
  );

  async function reloadDetailAfterMutation() {
    if (!detailUid) return;
    const res = await fetch(`/api/platform-admin/users/${detailUid}`);
    const json = await res.json().catch(() => ({}));
    if (res.ok) setDetail(json as UserDetail);
    void fetchUsersFirstPage();
  }

  const displayUsersRows = filteredUsersList;

  return (
    <div className="space-y-8">
      {actionMessage ? (
        <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">{actionMessage}</p>
      ) : null}

      <Tabs defaultValue="orgs">
        <TabsList className="flex flex-wrap gap-2">
          <TabsTrigger value="orgs">Organizations</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="orgs" className="mt-6">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-4 space-y-0">
              <div>
                <CardTitle>Organizations</CardTitle>
                <CardDescription>Firestore organizations ({orgs.length}).</CardDescription>
              </div>
              <CreateOrganizationDialog
                reloadOrgs={loadOrgs}
                setActionMessage={setActionMessage}
              />
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {orgsError ? <p className="mb-2 text-sm text-destructive">{orgsError}</p> : null}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="font-mono text-xs">ID</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orgs.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">{o.name}</TableCell>
                      <TableCell>{o.slug}</TableCell>
                      <TableCell>{o.subscription?.plan ?? "—"}</TableCell>
                      <TableCell>{o.subscription?.status ?? "—"}</TableCell>
                      <TableCell className="max-w-[12rem] truncate font-mono text-xs">{o.id}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <EditOrganizationDialog
                            org={o}
                            reloadOrgs={loadOrgs}
                            setActionMessage={setActionMessage}
                          />
                          <DeleteOrganizationDialog
                            org={o}
                            reloadOrgs={loadOrgs}
                            setActionMessage={setActionMessage}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {orgs.length === 0 && !orgsError ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground">
                        No organizations
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="prof-only"
                checked={profileOnly}
                onCheckedChange={(x) => setProfileOnly(x === true)}
              />
              <Label htmlFor="prof-only" className="text-sm font-normal">
                Profile doc only{" "}
                <span className="text-muted-foreground">(current page)</span>
              </Label>
            </div>
            <Button variant="outline" size="sm" type="button" onClick={() => void fetchUsersFirstPage()}>
              Refresh
            </Button>
          </div>

          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-4 space-y-0">
              <div>
                <CardTitle>Users</CardTitle>
                <CardDescription>Firebase Authentication users ({displayUsersRows.length} shown).</CardDescription>
              </div>
              <Button type="button" onClick={openCreateUser}>
                Add user
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {usersError ? <p className="mb-2 text-sm text-destructive">{usersError}</p> : null}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Display name</TableHead>
                    <TableHead className="font-mono text-xs">UID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Profile</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayUsersRows.map((u) => (
                    <TableRow key={u.uid}>
                      <TableCell>{u.email ?? "—"}</TableCell>
                      <TableCell>{u.displayName ?? "—"}</TableCell>
                      <TableCell className="max-w-[9rem] truncate font-mono text-xs">{u.uid}</TableCell>
                      <TableCell>{u.disabled ? <Badge variant="destructive">Disabled</Badge> : "Active"}</TableCell>
                      <TableCell>
                        {u.hasProfileDoc ? <Badge variant="secondary">Firestore</Badge> : "—"}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" type="button" onClick={() => openDetail(u.uid)}>
                          Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!usersLoading && displayUsersRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground">
                        No users
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>

              <div className="mt-4 flex items-center gap-2">
                {nextPageToken ? (
                  <Button type="button" variant="outline" disabled={usersLoading} onClick={() => void fetchNextPage()}>
                    {usersLoading ? "Loading…" : "Load next page"}
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">{usersLoading ? "Loading…" : "End of list"}</span>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={userDialogOpen}
        onOpenChange={(open) => {
          setUserDialogOpen(open);
          if (!open) {
            setDetail(null);
            setDetailError(null);
          }
        }}
      >
        <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto border-border sm:max-w-xl">
          <DialogHeader className="border-border border-b pb-4">
            <DialogTitle>{userDialogMode === "create" ? "New user" : "Manage user"}</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              {userDialogMode === "create"
                ? "Creates a Firebase user and sends a welcome email when Resend is configured."
                : (detailUid ?? "")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-6 py-2">
            {userDialogMode === "create" ? (
              <UserCreateForm
                key={createUserFormKey}
                organizations={orgs}
                onCancel={() => setUserDialogOpen(false)}
                onCreated={(uid) => {
                  setUserDialogMode("edit");
                  setDetailUid(uid);
                  setDetail(null);
                  setDetailError(null);
                  setActionMessage("User created. Welcome email sent when Resend is configured.");
                  void fetchUsersFirstPage();
                }}
              />
            ) : (
              <>
                {detailLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
                {detailError ? <p className="text-sm text-destructive">{detailError}</p> : null}
                {detail ? (
                  <UserDetailPane
                    detail={detail}
                    organizations={orgs}
                    setActionMessage={setActionMessage}
                    reload={() => void reloadDetailAfterMutation()}
                  />
                ) : null}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateOrganizationDialog(props: {
  reloadOrgs: () => Promise<void>;
  setActionMessage: (s: string | null) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const body: { name: string; slug?: string } = { name: name.trim() };
      const s = slug.trim();
      if (s) body.slug = s;
      const res = await fetch("/api/platform-admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Create failed");
      setOpen(false);
      setName("");
      setSlug("");
      props.setActionMessage("Organization created.");
      await props.reloadOrgs();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Add organization
      </Button>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setError(null);
        }}
      >
        <DialogContent className="border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New organization</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-2">
            <Label htmlFor="org-name">Name</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Organization name"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="org-slug">Slug (optional)</Label>
            <Input
              id="org-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="leave blank for auto slug"
              className="font-mono text-sm lowercase"
            />
            <p className="text-muted-foreground text-xs">
              Lowercase, numbers, hyphens. If empty, slug is derived from name and org id suffix.
            </p>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={busy || !name.trim()} onClick={() => void submit()}>
            {busy ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

function EditOrganizationDialog(props: {
  org: OrgRow;
  reloadOrgs: () => Promise<void>;
  setActionMessage: (s: string | null) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(props.org.name);
  const [slug, setSlug] = React.useState(props.org.slug);
  const [plan, setPlan] = React.useState<string>(props.org.subscription?.plan ?? "none");
  const [status, setStatus] = React.useState<string>(props.org.subscription?.status ?? "none");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setName(props.org.name);
    setSlug(props.org.slug);
    setPlan(props.org.subscription?.plan ?? "none");
    setStatus(props.org.subscription?.status ?? "none");
    setError(null);
  }, [open, props.org]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/platform-admin/organizations/${props.org.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim().toLowerCase(),
          subscription: {
            plan,
            status,
          },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Update failed");
      setOpen(false);
      props.setActionMessage("Organization updated.");
      await props.reloadOrgs();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Edit
      </Button>
      <DialogContent className="border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit organization</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-2">
            <Label htmlFor={`edit-org-name-${props.org.id}`}>Name</Label>
            <Input id={`edit-org-name-${props.org.id}`} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`edit-org-slug-${props.org.id}`}>Slug</Label>
            <Input
              id={`edit-org-slug-${props.org.id}`}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="font-mono text-sm lowercase"
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs">Subscription plan</Label>
            <Select value={plan} onValueChange={(v: string | null) => setPlan(v ?? "none")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUBSCRIPTION_PLANS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label className="text-xs">Subscription status</Label>
            <Select value={status} onValueChange={(v: string | null) => setStatus(v ?? "none")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUBSCRIPTION_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={busy || !name.trim() || !slug.trim()} onClick={() => void submit()}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteOrganizationDialog(props: {
  org: OrgRow;
  reloadOrgs: () => Promise<void>;
  setActionMessage: (s: string | null) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [confirmation, setConfirmation] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setConfirmation("");
      setError(null);
    }
  }, [open]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/platform-admin/organizations/${props.org.id}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: confirmation.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Delete failed");
      setOpen(false);
      props.setActionMessage("Organization deleted.");
      await props.reloadOrgs();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="destructive" size="sm" onClick={() => setOpen(true)}>
        Delete
      </Button>
      <DialogContent className="border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete organization</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-foreground/90">
          This runs the same destructive cascade as org settings: deals, tasks, data rooms, memberships, etc.
          Type the organization name <span className="font-semibold">{props.org.name}</span> to confirm.
        </p>
        <div className="grid gap-2 py-2">
          <Label htmlFor={`del-org-${props.org.id}`}>Confirmation</Label>
          <Input
            id={`del-org-${props.org.id}`}
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder={props.org.name}
            autoComplete="off"
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={busy || confirmation.trim() !== props.org.name.trim()}
            onClick={() => void submit()}
          >
            {busy ? "Deleting…" : "Delete permanently"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type MembershipAssignmentPickerProps = {
  organizations: OrgRow[];
  /** When set, shows “Add membership” for this user. Omit for create-user; call `assignToUser` via ref after the account exists. */
  userId?: string;
  onAssignSuccess?: () => void;
  notifyAssignment?: (message: string | null) => void;
};

const MEMBERSHIP_ORG_SKIP_VALUE = "__skip__";

const MembershipAssignmentPicker = React.forwardRef<MembershipAssignmentHandle, MembershipAssignmentPickerProps>(
  function MembershipAssignmentPicker(props, ref) {
    const { organizations, userId, onAssignSuccess, notifyAssignment } = props;
    /** Pre-select first org only on “add membership” for an existing user (create flow defaults to skip). */
    const autoSelectFirstOrg = userId !== undefined;
    const [orgId, setOrgId] = React.useState<string>(() =>
      autoSelectFirstOrg ? (organizations[0]?.id ?? "") : "",
    );
    const [role, setRole] = React.useState<UserRole>("analyst");
    const [guestScope, setGuestScope] = React.useState<"org" | "deal">("org");
    const [dealIds, setDealIds] = React.useState<string[]>([]);
    const [roomIds, setRoomIds] = React.useState<string[]>([]);
    const [linkables, setLinkables] = React.useState<{
      deals: { id: string; name: string }[];
      dataRooms: { id: string; name: string; dealId: string | null; archived: boolean }[];
    } | null>(null);
    const [busy, setBusy] = React.useState(false);

    React.useEffect(() => {
      if (!autoSelectFirstOrg) return;
      if (!orgId && organizations[0]) setOrgId(organizations[0].id);
    }, [organizations, orgId, autoSelectFirstOrg]);

    React.useEffect(() => {
      if (!orgId) {
        setLinkables(null);
        return;
      }
      let cancelled = false;
      (async () => {
        const res = await fetch(`/api/platform-admin/organizations/${orgId}/linkables`);
        const json = await res.json().catch(() => ({}));
        if (!cancelled && res.ok) {
          setLinkables({
            deals: json.deals ?? [],
            dataRooms: json.dataRooms ?? [],
          });
          setDealIds([]);
          setRoomIds([]);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [orgId]);

    function toggleDeal(id: string) {
      setDealIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    }

    function toggleRoom(id: string) {
      setRoomIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    }

    const roomsForPick = React.useMemo(() => {
      if (!linkables || guestScope !== "deal") return [];
      const setDeal = new Set(dealIds);
      return linkables.dataRooms.filter(
        (r) => !r.archived && r.dealId && setDeal.has(r.dealId),
      );
    }, [linkables, guestScope, dealIds]);

    const assignCore = React.useCallback(
      async (targetUid: string): Promise<MembershipAssignmentResult> => {
        if (!orgId.trim()) {
          return { ok: false, message: "Select an organization." };
        }
        let investorAccess: InvestorAccess | undefined;
        if (role === "investor_guest") {
          if (guestScope === "org") {
            investorAccess = { scope: "org" };
          } else {
            if (!dealIds.length) {
              return { ok: false, message: "Select at least one deal for deal-scoped guest." };
            }
            investorAccess = { scope: "deal", dealIds, dataRoomIds: roomIds };
          }
        }

        const body: Record<string, unknown> = { organizationId: orgId, role };
        if (investorAccess) body.investorAccess = investorAccess;

        const res = await fetch(`/api/platform-admin/users/${targetUid}/organizations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          return {
            ok: false,
            message: typeof json.error === "string" ? json.error : "Add membership failed",
          };
        }

        setGuestScope("org");
        setDealIds([]);
        setRoomIds([]);
        return { ok: true };
      },
      [orgId, role, guestScope, dealIds, roomIds],
    );

    React.useImperativeHandle(
      ref,
      () => ({
        willAssignMembership: () => Boolean(orgId.trim()),
        assignToUser: assignCore,
      }),
      [assignCore, orgId],
    );

    async function handleInlineAddMembership() {
      if (!userId) return;
      setBusy(true);
      notifyAssignment?.(null);
      try {
        const r = await assignCore(userId);
        if (!r.ok) {
          notifyAssignment?.(r.message);
          return;
        }
        onAssignSuccess?.();
      } finally {
        setBusy(false);
      }
    }

    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Assign to organization
        </h4>
        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label className="text-xs">Organization</Label>
            <Select
              value={orgId || MEMBERSHIP_ORG_SKIP_VALUE}
              onValueChange={(v: string | null) =>
                setOrgId(v === MEMBERSHIP_ORG_SKIP_VALUE ? "" : (v ?? ""))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Organization" />
              </SelectTrigger>
              <SelectContent>
                {!autoSelectFirstOrg ? (
                  <SelectItem value={MEMBERSHIP_ORG_SKIP_VALUE}>Skip — assign later</SelectItem>
                ) : null}
                {organizations.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label className="text-xs">Role</Label>
            <Select value={role} onValueChange={(v: string | null) => setRole((v ?? "analyst") as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {USER_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {role === "investor_guest" ? (
            <div className="grid gap-2">
              <Label className="text-xs">Guest scope</Label>
              <Select
                value={guestScope}
                onValueChange={(v: string | null) => setGuestScope(v === "deal" ? "deal" : "org")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="org">Organization-wide portal</SelectItem>
                  <SelectItem value="deal">Deal-scoped</SelectItem>
                </SelectContent>
              </Select>

              {guestScope === "deal" && linkables ? (
                <div className="grid gap-3 rounded-lg border border-border bg-background p-3">
                  <p className="text-xs font-medium text-foreground">Deals</p>
                  <div className="flex max-h-32 flex-col gap-1 overflow-y-auto text-sm">
                    {linkables.deals.map((d) => (
                      <label key={d.id} className="flex cursor-pointer items-center gap-2">
                        <Checkbox checked={dealIds.includes(d.id)} onCheckedChange={() => toggleDeal(d.id)} />
                        {d.name}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs font-medium text-foreground">Data rooms</p>
                  <p className="text-muted-foreground text-[11px]">Rooms listed belong to selected deals.</p>
                  <div className="flex max-h-32 flex-col gap-1 overflow-y-auto text-sm">
                    {roomsForPick.map((r) => (
                      <label key={r.id} className="flex cursor-pointer items-center gap-2">
                        <Checkbox checked={roomIds.includes(r.id)} onCheckedChange={() => toggleRoom(r.id)} />
                        {r.name}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {userId ? (
            <Button type="button" size="sm" disabled={busy || !orgId} onClick={() => void handleInlineAddMembership()}>
              {busy ? "Saving…" : "Add membership"}
            </Button>
          ) : null}
        </div>
      </div>
    );
  },
);

MembershipAssignmentPicker.displayName = "MembershipAssignmentPicker";

function UserCreateForm(props: {
  organizations: OrgRow[];
  onCancel: () => void;
  onCreated: (uid: string) => void;
}) {
  const [email, setEmail] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const assignRef = React.useRef<MembershipAssignmentHandle>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, string> = { email: email.trim() };
      if (displayName.trim()) body.displayName = displayName.trim();
      const res = await fetch("/api/platform-admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Create failed");
      const uid = typeof json.uid === "string" ? json.uid : null;
      if (!uid) throw new Error("Create succeeded but no uid returned");

      const assign = assignRef.current;
      if (assign?.willAssignMembership()) {
        const r = await assign.assignToUser(uid);
        if (!r.ok) {
          setError(
            `User was created, but assigning to the organization failed: ${r.message}. After this screen reloads you can assign the membership from Manage user.`,
          );
          props.onCreated(uid);
          return;
        }
      }

      setEmail("");
      setDisplayName("");
      props.onCreated(uid);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-2">
        <Label htmlFor="cu-name">Display name</Label>
        <Input
          id="cu-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          autoComplete="off"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="cu-email">Email</Label>
        <Input
          id="cu-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="border-border border-t pt-4">
        <h3 className="mb-2 text-sm font-semibold">Memberships</h3>
        <p className="text-muted-foreground mb-4 text-sm">
          Optionally choose an organization and role; the membership is created immediately after the account.
        </p>
        <MembershipAssignmentPicker ref={assignRef} organizations={props.organizations} />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" onClick={props.onCancel}>
          Cancel
        </Button>
        <Button type="button" disabled={busy || !email.trim()} onClick={() => void submit()}>
          {busy ? "Creating…" : "Create & email"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function UserDetailPane(props: {
  detail: UserDetail;
  organizations: OrgRow[];
  setActionMessage: (s: string | null) => void;
  reload: () => void;
}) {
  const { detail, organizations, setActionMessage, reload } = props;
  const [editName, setEditName] = React.useState(detail.displayName ?? "");
  const [editEmail, setEditEmail] = React.useState(detail.email ?? "");
  const [editDisabled, setEditDisabled] = React.useState(detail.disabled);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setEditName(detail.displayName ?? "");
    setEditEmail(detail.email ?? "");
    setEditDisabled(detail.disabled);
  }, [detail]);

  async function saveProfile() {
    setSaving(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/platform-admin/users/${detail.uid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: editName.trim() || undefined,
          email: editEmail.trim() || undefined,
          disabled: editDisabled,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Save failed");
      setActionMessage("User updated.");
      reload();
    } catch (e) {
      setActionMessage(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function deactivate() {
    if (!confirm("Disable this user and remove all organization memberships?")) return;
    setActionMessage(null);
    const res = await fetch(`/api/platform-admin/users/${detail.uid}/deactivate`, {
      method: "POST",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setActionMessage(typeof json.error === "string" ? json.error : "Deactivate failed");
      return;
    }
    setActionMessage("User deactivated and removed from organizations.");
    reload();
  }

  async function stripOnly() {
    if (!confirm("Remove this user from all organizations (account can still sign in)?")) return;
    setActionMessage(null);
    const res = await fetch(`/api/platform-admin/users/${detail.uid}/strip-memberships`, {
      method: "POST",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setActionMessage(typeof json.error === "string" ? json.error : "Strip failed");
      return;
    }
    setActionMessage("Memberships removed.");
    reload();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-2">
        <Label>Display name</Label>
        <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label>Email</Label>
        <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="disabled"
          checked={editDisabled}
          onCheckedChange={(x) => setEditDisabled(x === true)}
        />
        <Label htmlFor="disabled" className="font-normal">
          Disabled
        </Label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="default" disabled={saving} onClick={() => void saveProfile()}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" variant="outline" onClick={() => void stripOnly()}>
          Remove from all orgs
        </Button>
        <Button type="button" variant="destructive" onClick={() => void deactivate()}>
          Deactivate & strip orgs
        </Button>
      </div>

      <div className="border-border border-t pt-4">
        <h3 className="mb-2 text-sm font-semibold">Memberships</h3>
        <ul className="mb-4 space-y-2 text-sm">
          {detail.memberships.length === 0 ? (
            <li className="text-muted-foreground">No organization memberships</li>
          ) : (
            detail.memberships.map((m) => (
              <li
                key={m.organizationId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-2 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{m.organizationName}</div>
                  <div className="text-muted-foreground truncate text-xs">
                    {m.role}
                    {m.investorAccess ? ` · ${JSON.stringify(m.investorAccess)}` : ""}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={m.role}
                    onValueChange={async (v: string | null) => {
                      const newRole = (v ?? m.role) as UserRole;
                      if (newRole === "investor_guest" && m.role !== "investor_guest") {
                        setActionMessage(
                          "To add an investor guest, remove this row and assign again with Guest scope.",
                        );
                        return;
                      }
                      if (newRole === m.role) return;
                      setActionMessage(null);
                      const res = await fetch(
                        `/api/platform-admin/users/${detail.uid}/organizations/${m.organizationId}`,
                        {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ role: newRole }),
                        },
                      );
                      const json = await res.json().catch(() => ({}));
                      if (!res.ok) {
                        setActionMessage(typeof json.error === "string" ? json.error : "Update failed");
                        return;
                      }
                      setActionMessage("Role updated.");
                      reload();
                    }}
                  >
                    <SelectTrigger className="w-[172px]" size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {USER_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={async () => {
                      if (!confirm(`Remove from ${m.organizationName}?`)) return;
                      const res = await fetch(
                        `/api/platform-admin/users/${detail.uid}/organizations/${m.organizationId}`,
                        { method: "DELETE" },
                      );
                      const json = await res.json().catch(() => ({}));
                      if (!res.ok) {
                        setActionMessage(typeof json.error === "string" ? json.error : "Remove failed");
                        return;
                      }
                      setActionMessage("Membership removed.");
                      reload();
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))
          )}
        </ul>

        <MembershipAssignmentPicker
          organizations={organizations}
          userId={detail.uid}
          onAssignSuccess={() => {
            setActionMessage("Membership added.");
            reload();
          }}
          notifyAssignment={setActionMessage}
        />
      </div>
    </div>
  );
}

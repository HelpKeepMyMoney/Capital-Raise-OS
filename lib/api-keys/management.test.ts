import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

type DocStore = Map<string, Record<string, unknown>>;

function makeFirestore(initial: DocStore = new Map()) {
  const store = initial;
  let autoId = 0;

  const collection = (name: string) => ({
    doc: (id: string) => ({
      get: async () => {
        const key = `${name}/${id}`;
        const data = store.get(key);
        return {
          exists: Boolean(data),
          id,
          data: () => data,
          ref: {
            update: async (u: Record<string, unknown>) => store.set(key, { ...data, ...u }),
          },
        };
      },
      set: async (data: Record<string, unknown>) => {
        store.set(`${name}/${id}`, { ...data });
      },
      update: async (u: Record<string, unknown>) => {
        const key = `${name}/${id}`;
        store.set(key, { ...(store.get(key) ?? {}), ...u });
      },
    }),
    where: (field: string, _op: string, value: unknown) => {
      const filters: Array<{ field: string; value: unknown }> = [{ field, value }];
      const chain = {
        where: (f2: string, _o2: string, v2: unknown) => {
          filters.push({ field: f2, value: v2 });
          return chain;
        },
        orderBy: () => chain,
        limit: () => chain,
        get: async () => {
          const docs = [...store.entries()]
            .filter(([k]) => k.startsWith(`${name}/`))
            .map(([k, data]) => ({
              id: k.slice(name.length + 1),
              data: () => data,
              ref: {
                update: async (u: Record<string, unknown>) => store.set(k, { ...data, ...u }),
              },
            }))
            .filter((d) => filters.every((f) => d.data()[f.field] === f.value));
          return { docs, empty: docs.length === 0 };
        },
      };
      return chain;
    },
    add: async (data: Record<string, unknown>) => {
      autoId += 1;
      const id = `auto-${autoId}`;
      store.set(`${name}/${id}`, data);
      return { id };
    },
  });

  return { store, db: { collection } };
}

const ORG_A = "org-a";

vi.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  writeAuditLog: vi.fn(async () => undefined),
}));

vi.mock("@/lib/auth/session", () => ({
  requireOrgSession: vi.fn(async () => ({ user: { uid: "user-1" }, orgId: ORG_A })),
}));

vi.mock("@/lib/firestore/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/firestore/queries")>();
  return {
    ...actual,
    getMembership: vi.fn(async () => ({ role: "founder", organizationId: ORG_A, userId: "user-1" })),
  };
});

describe("org API key create/revoke (session routes)", () => {
  let store: DocStore;

  beforeEach(async () => {
    vi.clearAllMocks();
    store = new Map();
    const { db } = makeFirestore(store);
    const admin = await import("@/lib/firebase/admin");
    vi.mocked(admin.getAdminFirestore).mockReturnValue(db as never);
  });

  it("creates and revokes keys", async () => {
    const { POST } = await import("@/app/api/organizations/[id]/api-keys/route");
    const createRes = await POST(
      new NextRequest(`http://localhost/api/organizations/${ORG_A}/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "CFO bot" }),
      }),
      { params: Promise.resolve({ id: ORG_A }) },
    );
    expect(createRes.status).toBe(200);
    const created = (await createRes.json()) as { secret: string; key: { id: string } };
    expect(created.secret.startsWith("cpin_live_")).toBe(true);

    const { DELETE } = await import("@/app/api/organizations/[id]/api-keys/[keyId]/route");
    const delRes = await DELETE(
      new NextRequest(`http://localhost/api/organizations/${ORG_A}/api-keys/${created.key.id}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: ORG_A, keyId: created.key.id }) },
    );
    expect(delRes.status).toBe(200);

    const row = store.get(`org_api_keys/${created.key.id}`);
    expect(row?.revokedAt).toBeTruthy();
  });
});

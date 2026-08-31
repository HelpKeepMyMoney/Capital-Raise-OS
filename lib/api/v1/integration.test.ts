import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { generateOrgApiKeySecret, hashOrgApiKey } from "@/lib/api-keys/token";

type DocStore = Map<string, Record<string, unknown>>;

function makeFirestore(initial: DocStore = new Map()) {
  const store = initial;

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
  });

  return { store, db: { collection } };
}

const ORG_A = "org-a";
const ORG_B = "org-b";

vi.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: vi.fn(),
  getAdminBucket: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  writeAuditLog: vi.fn(async () => undefined),
}));

vi.mock("@/lib/firestore/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/firestore/queries")>();
  return {
    ...actual,
    getOrganization: vi.fn(async (orgId: string) =>
      orgId === ORG_A ? { id: ORG_A, name: "Org A", slug: "org-a", createdAt: 1 } : null,
    ),
    listInvestors: vi.fn(async (orgId: string) =>
      orgId === ORG_A
        ? [
            {
              id: "inv-1",
              organizationId: ORG_A,
              name: "LP One",
              pipelineStage: "committed",
              committedAmount: 100_000,
              createdAt: 1,
              updatedAt: 1,
            },
          ]
        : [],
    ),
    listDeals: vi.fn(async (orgId: string) =>
      orgId === ORG_A
        ? [
            {
              id: "deal-1",
              organizationId: ORG_A,
              name: "Draft SAFE",
              type: "safe",
              status: "draft",
              createdAt: 1,
            },
          ]
        : [],
    ),
    getDeal: vi.fn(async (orgId: string, dealId: string) => {
      if (orgId !== ORG_A || dealId !== "deal-1") return null;
      return {
        id: "deal-1",
        organizationId: ORG_A,
        name: "Draft SAFE",
        type: "safe",
        status: "draft",
        createdAt: 1,
      };
    }),
    listActiveDataRoomsForDeal: vi.fn(async () => []),
  };
});

describe("REST API v1 integration (mocked Firestore)", () => {
  let store: DocStore;
  let orgASecret: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    store = new Map();
    orgASecret = generateOrgApiKeySecret();
    const keyId = "key-a";
    store.set(`org_api_keys/${keyId}`, {
      id: keyId,
      organizationId: ORG_A,
      name: "Agent",
      prefix: orgASecret.slice(0, 16),
      keyHash: hashOrgApiKey(orgASecret),
      createdByUid: "user-1",
      createdAt: Date.now(),
    });
    store.set("investors/inv-1", {
      id: "inv-1",
      organizationId: ORG_A,
      name: "LP One",
      firstName: "LP",
      lastName: "One",
      pipelineStage: "committed",
      committedAmount: 100_000,
      createdAt: 1,
      updatedAt: 1,
    });
    store.set("deals/deal-1", {
      id: "deal-1",
      organizationId: ORG_A,
      name: "Draft SAFE",
      type: "safe",
      status: "draft",
      createdAt: 1,
    });

    const { db } = makeFirestore(store);
    const admin = await import("@/lib/firebase/admin");
    vi.mocked(admin.getAdminFirestore).mockReturnValue(db as never);
  });

  function authReq(url: string, init?: RequestInit & { secret?: string | null }) {
    const headers = new Headers(init?.headers);
    if (init?.secret) headers.set("Authorization", `Bearer ${init.secret}`);
    return new NextRequest(url, { ...init, headers });
  }

  it("rejects unauthenticated requests", async () => {
    const { GET } = await import("@/app/api/v1/org/route");
    const res = await GET(authReq("http://localhost/api/v1/org"));
    expect(res.status).toBe(401);
  });

  it("allows authorized read for org A", async () => {
    const { GET } = await import("@/app/api/v1/org/route");
    const res = await GET(authReq("http://localhost/api/v1/org", { secret: orgASecret }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { organization: { id: string } } };
    expect(body.data.organization.id).toBe(ORG_A);
  });

  it("isolates org B data from org A key", async () => {
    const orgBSecret = generateOrgApiKeySecret();
    store.set("org_api_keys/key-b", {
      id: "key-b",
      organizationId: ORG_B,
      name: "B agent",
      prefix: orgBSecret.slice(0, 16),
      keyHash: hashOrgApiKey(orgBSecret),
      createdByUid: "user-2",
      createdAt: Date.now(),
    });

    const { GET } = await import("@/app/api/v1/deals/route");
    const res = await GET(authReq("http://localhost/api/v1/deals", { secret: orgBSecret }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { deals: unknown[] } };
    expect(body.data.deals).toHaveLength(0);
  });

  it("creates an active deal on authorized write", async () => {
    const { POST } = await import("@/app/api/v1/deals/route");
    const res = await POST(
      authReq("http://localhost/api/v1/deals", {
        method: "POST",
        secret: orgASecret,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Live SAFE", type: "safe", status: "active" }),
      }),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { deal: { status: string } } };
    expect(body.data.deal.status).toBe("active");
  });

  it("creates draft deal when status omitted", async () => {
    const { POST } = await import("@/app/api/v1/deals/route");
    const res = await POST(
      authReq("http://localhost/api/v1/deals", {
        method: "POST",
        secret: orgASecret,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New draft", type: "safe" }),
      }),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { deal: { status: string } } };
    expect(body.data.deal.status).toBe("draft");
  });

  it("publishes a deal via patch", async () => {
    const { PATCH } = await import("@/app/api/v1/deals/[id]/route");
    const res = await PATCH(
      authReq("http://localhost/api/v1/deals/deal-1", {
        method: "PATCH",
        secret: orgASecret,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      }),
      { params: Promise.resolve({ id: "deal-1" }) },
    );
    expect(res.status).toBe(200);
  }, 20_000);

  it("creates and updates an investor", async () => {
    const { POST } = await import("@/app/api/v1/investors/route");
    const created = await POST(
      authReq("http://localhost/api/v1/investors", {
        method: "POST",
        secret: orgASecret,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: "Ada", lastName: "Lovelace", pipelineStage: "lead" }),
      }),
    );
    expect(created.status).toBe(201);
    const createdBody = (await created.json()) as { data: { investor: { id: string; pipelineStage: string } } };
    expect(createdBody.data.investor.pipelineStage).toBe("lead");

    const { PATCH } = await import("@/app/api/v1/investors/[id]/route");
    const patched = await PATCH(
      authReq(`http://localhost/api/v1/investors/${createdBody.data.investor.id}`, {
        method: "PATCH",
        secret: orgASecret,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineStage: "due_diligence", committedAmount: 50_000 }),
      }),
      { params: Promise.resolve({ id: createdBody.data.investor.id }) },
    );
    expect(patched.status).toBe(200);
    const patchedBody = (await patched.json()) as { data: { investor: { pipelineStage: string } } };
    expect(patchedBody.data.investor.pipelineStage).toBe("due_diligence");
  });

  it("creates a task", async () => {
    const { POST } = await import("@/app/api/v1/tasks/route");
    const res = await POST(
      authReq("http://localhost/api/v1/tasks", {
        method: "POST",
        secret: orgASecret,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Call LP", taskType: "call_investor" }),
      }),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { task: { title: string; status: string } } };
    expect(body.data.task.title).toBe("Call LP");
    expect(body.data.task.status).toBe("open");
  });

  it("rejects invite actions", async () => {
    const { POST } = await import("@/app/api/v1/investors/route");
    const res = await POST(
      authReq("http://localhost/api/v1/investors", {
        method: "POST",
        secret: orgASecret,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: "X", inviteInvestor: true }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it("rejects revoked keys", async () => {
    store.set("org_api_keys/key-a", {
      ...(store.get("org_api_keys/key-a") as Record<string, unknown>),
      revokedAt: Date.now(),
    });
    const { GET } = await import("@/app/api/v1/org/route");
    const res = await GET(authReq("http://localhost/api/v1/org", { secret: orgASecret }));
    expect(res.status).toBe(401);
  });
});

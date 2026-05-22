import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createAuditLogsRouter } from "./audit-logs-api.js";
import { createExportRouter } from "./import-export-api.js";
import { createSecurityRouter } from "./security-api.js";
import { createCustomersRouter } from "./customers-api.js";

type Row = Record<string, any>;

function createTestApp(seed: Partial<Store> = {}) {
  const db = createDb(seed);
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const userId = req.header("x-user-id") || "owner";
    req.user = { id: userId, email: `${userId}@example.com`, name: userId };
    next();
  });
  app.use("/api/customers", createCustomersRouter(db as any));
  app.use("/api/export", createExportRouter(db as any));
  app.use("/api/audit-logs", createAuditLogsRouter(db as any));
  app.use("/api/security", createSecurityRouter(db as any));
  return { app, db };
}

describe("V4-D confirmation, export permission and audit risk events", () => {
  it("requires confirmation before deleting a customer and logs confirm-required security event", async () => {
    const { app, db } = createTestApp();

    const blocked = await request(app).delete("/api/customers/c1").set("x-user-id", "owner").expect(409);
    expect(blocked.body.error).toBe("CONFIRM_REQUIRED");
    expect(db._store.auditLogs[0]).toMatchObject({ action: "confirm_required", entityType: "Customer", riskLevel: "high" });

    await request(app).delete("/api/customers/c1?confirm=true").set("x-user-id", "owner").expect(204);
    expect(db._store.auditLogs.some((log) => log.action === "delete" && log.riskLevel === "high")).toBe(true);
  });

  it("enforces sensitive export confirmation and owner-only sensitive fields", async () => {
    const managerSensitive = await request(createTestApp().app)
      .post("/api/export/customer?organizationId=org-a")
      .set("x-user-id", "manager")
      .send({ fieldsScope: "sensitive", confirm: true })
      .expect(403);
    expect(managerSensitive.body.message).toContain("sensitive");

    const ownerMissingConfirm = await request(createTestApp().app)
      .post("/api/export/customer?organizationId=org-a")
      .set("x-user-id", "owner")
      .send({ fieldsScope: "sensitive" })
      .expect(409);
    expect(ownerMissingConfirm.body.error).toBe("CONFIRM_REQUIRED");

    const { app, db } = createTestApp();
    const exported = await request(app)
      .post("/api/export/customer?organizationId=org-a")
      .set("x-user-id", "owner")
      .send({ fieldsScope: "sensitive", confirm: true })
      .expect(200);
    expect(exported.body.fieldsScope).toBe("sensitive");
    expect(db._store.auditLogs.some((log) => log.entityType === "ExportJob" && log.riskLevel === "high")).toBe(true);
  });

  it("lets owner/manager view risk events and blocks sales/support", async () => {
    const { app } = createTestApp({
      auditLogs: [
        makeAudit({ id: "a1", organizationId: "org-a", userId: "owner", action: "delete", entityType: "Customer", riskLevel: "high" }),
        makeAudit({ id: "a2", organizationId: "org-a", userId: "manager", action: "export", entityType: "ExportJob", riskLevel: "medium" })
      ]
    });

    const response = await request(app).get("/api/security/risk-events?organizationId=org-a").set("x-user-id", "manager").expect(200);
    expect(response.body.map((item: any) => item.id)).toEqual(["a1", "a2"]);
    await request(app).get("/api/security/risk-events?organizationId=org-a").set("x-user-id", "sales").expect(403);
  });

  it("limits audit visibility and supports audit export", async () => {
    const { app } = createTestApp({
      auditLogs: [
        makeAudit({ id: "own", organizationId: "org-a", userId: "sales", actorId: "sales", action: "create", entityType: "Customer" }),
        makeAudit({ id: "team", organizationId: "org-a", userId: "manager", actorId: "manager", action: "delete", entityType: "Product", riskLevel: "high" })
      ]
    });

    const sales = await request(app).get("/api/audit-logs?organizationId=org-a").set("x-user-id", "sales").expect(200);
    expect(sales.body.items.map((item: any) => item.id)).toEqual(["own"]);

    const ownerExport = await request(app).get("/api/audit-logs/export?organizationId=org-a").set("x-user-id", "owner").expect(200);
    expect(ownerExport.headers["content-type"]).toContain("text/csv");
    expect(ownerExport.text).toContain("riskLevel");
  });
});

type Store = {
  customers: Row[];
  auditLogs: Row[];
  exportJobs: Row[];
};

function createDb(seed: Partial<Store> = {}) {
  const store: Store = {
    customers: seed.customers || [makeCustomer()],
    auditLogs: seed.auditLogs || [],
    exportJobs: seed.exportJobs || []
  };
  let nextId = 1;
  const createRow = (items: Row[], prefix: string, data: Row) => {
    const row = { id: data.id || `${prefix}-${nextId++}`, createdAt: new Date("2026-05-21T00:00:00.000Z"), updatedAt: new Date("2026-05-21T00:00:00.000Z"), ...data };
    items.push(row);
    return row;
  };
  return {
    _store: store,
    customer: {
      async findFirst(args: any) { return store.customers.find((row) => matchesWhere(row, args.where)) || null; },
      async findMany(args: any) { return store.customers.filter((row) => matchesWhere(row, args.where)); },
      async delete(args: any) { const index = store.customers.findIndex((row) => row.id === args.where.id); return store.customers.splice(index, 1)[0]; }
    },
    quote: { async findMany() { return []; } },
    followUpTask: { async findMany() { return []; } },
    sampleOrder: { async findMany() { return []; } },
    customRequest: { async findMany() { return []; } },
    organizationMember: { async findFirst(args: any) { return members().find((row) => matchesWhere(row, args.where)) || null; } },
    exportJob: {
      async create(args: any) { return createRow(store.exportJobs, "export", args.data); },
      async update(args: any) { const item = store.exportJobs.find((row) => row.id === args.where.id)!; Object.assign(item, args.data); return item; },
      async findUnique(args: any) { return store.exportJobs.find((row) => row.id === args.where.id) || null; }
    },
    auditLog: {
      async create(args: any) { return createRow(store.auditLogs, "audit", args.data); },
      async findMany(args: any) {
        return store.auditLogs.filter((row) => matchesWhere(row, args.where)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      },
      async findUnique(args: any) { return store.auditLogs.find((row) => row.id === args.where.id) || null; }
    }
  };
}

function members() {
  return [
    { organizationId: "org-a", userId: "owner", role: "owner", status: "active" },
    { organizationId: "org-a", userId: "manager", role: "manager", status: "active" },
    { organizationId: "org-a", userId: "sales", role: "sales", status: "active" },
    { organizationId: "org-a", userId: "support", role: "support", status: "active" }
  ];
}

function makeCustomer(overrides: Row = {}) {
  return { id: "c1", name: "Maria", ownerId: "sales", organizationId: "org-a", assignedTo: "sales", collaborators: [], tags: [], stage: "new lead", createdAt: new Date(), updatedAt: new Date(), ...overrides };
}

function makeAudit(overrides: Row = {}) {
  return { id: "audit", organizationId: "org-a", actorId: "owner", userId: "owner", action: "create", entityType: "Customer", entityId: "c1", before: null, after: null, metadata: null, riskLevel: "low", createdAt: new Date("2026-05-21T00:00:00.000Z"), ...overrides };
}

function matchesWhere(row: Row, where: Row = {}): boolean {
  return Object.entries(where || {}).every(([key, value]) => {
    if (key === "OR" && Array.isArray(value)) return value.some((condition) => matchesWhere(row, condition));
    if (value && typeof value === "object" && "in" in value) return value.in.includes(row[key]);
    if (value && typeof value === "object" && "contains" in value) return String(row[key] || "").toLowerCase().includes(String(value.contains).toLowerCase());
    return row[key] === value;
  });
}

import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createEnterpriseRouter } from "./enterprise-api.js";

type Row = Record<string, any>;

function createTestApp() {
  const now = new Date("2026-05-22T00:00:00.000Z");
  const members: Row[] = [
    { id: "member-owner", organizationId: "org-1", userId: "owner-1", role: "owner", status: "active", user: { id: "owner-1", email: "owner@example.com", name: "Owner" }, createdAt: now, updatedAt: now },
    { id: "member-manager", organizationId: "org-1", userId: "manager-1", role: "manager", status: "active", user: { id: "manager-1", email: "manager@example.com", name: "Manager" }, createdAt: now, updatedAt: now },
    { id: "member-sales", organizationId: "org-1", userId: "sales-1", role: "sales", status: "active", user: { id: "sales-1", email: "sales@example.com", name: "Sales" }, createdAt: now, updatedAt: now },
    { id: "member-other", organizationId: "org-2", userId: "manager-2", role: "manager", status: "active", user: { id: "manager-2", email: "other@example.com", name: "Other" }, createdAt: now, updatedAt: now }
  ];
  const users: Row[] = members.map((member) => member.user);
  const units: Row[] = [];
  const enterpriseRoles: Row[] = [];
  const enterpriseReports: Row[] = [];
  const enterpriseAuditLogs: Row[] = [];
  const auditLogs: Row[] = [];
  const brands: Row[] = [{ id: "brand-1", organizationId: "org-1", name: "GoSea", status: "active", createdAt: now, updatedAt: now }];
  const brandRules: Row[] = [{ id: "rule-1", brandId: "brand-1", organizationId: "org-1", ruleType: "quote_rule", title: "Quote rule", content: "Confirm price and stock before quote.", language: "en", enabled: true, createdAt: now, updatedAt: now }];
  const brandAssignments: Row[] = [];
  const customers: Row[] = [
    { id: "customer-1", organizationId: "org-1", ownerId: "sales-1", assignedTo: "sales-1", collaborators: [], name: "Alice", stage: "new", intentLevel: "high", intentScore: 80, createdAt: now, updatedAt: now },
    { id: "customer-2", organizationId: "org-2", ownerId: "manager-2", assignedTo: "manager-2", collaborators: [], name: "Bob", stage: "new", intentLevel: "low", intentScore: 10, createdAt: now, updatedAt: now }
  ];
  const quotes: Row[] = [{ id: "quote-1", organizationId: "org-1", customerId: "customer-1", createdBy: "sales-1", createdAt: now }];
  const followUps: Row[] = [{ id: "fu-1", organizationId: "org-1", customerId: "customer-1", ownerId: "sales-1", status: "pending", remindAt: now, createdAt: now }];
  const orders: Row[] = [{ id: "order-1", organizationId: "org-1", paymentStatus: "unpaid", orderStatus: "pending_payment", createdAt: now }];
  const suppliers: Row[] = [{ id: "supplier-1", organizationId: "org-1", name: "Factory" }];
  const afterSalesCases: Row[] = [{ id: "case-1", organizationId: "org-1", status: "open" }];
  let seq = 1;

  const db: Row = {
    organizationMember: {
      findMany: async ({ where }: any = {}) => members.filter((row) => matches(row, where)),
      findFirst: async ({ where }: any = {}) => members.find((row) => matches(row, where)) || null,
      findUnique: async ({ where }: any = {}) => members.find((row) => matches(row, where)) || null,
      upsert: async ({ where, create, update, include }: any) => {
        const existing = members.find((row) => row.organizationId === where.organizationId_userId.organizationId && row.userId === where.organizationId_userId.userId);
        if (existing) Object.assign(existing, update, { updatedAt: now });
        const row = existing || { id: `member-${seq++}`, ...create, user: users.find((user) => user.id === create.userId), createdAt: now, updatedAt: now };
        if (!existing) members.push(row);
        return withIncludedUser(row, include);
      },
      update: async ({ where, data, include }: any) => withIncludedUser(updateRow(members, where, data), include)
    },
    user: { findUnique: async ({ where }: any) => users.find((row) => matches(row, where)) || null },
    organizationUnit: crudCollection(units, () => `unit-${seq++}`),
    enterpriseRole: crudCollection(enterpriseRoles, () => `erole-${seq++}`),
    enterpriseReport: crudCollection(enterpriseReports, () => `ereport-${seq++}`),
    enterpriseAuditLog: crudCollection(enterpriseAuditLogs, () => `eaudit-${seq++}`),
    auditLog: { create: async ({ data }: any) => { const row = { id: `audit-${seq++}`, ...data, createdAt: now }; auditLogs.push(row); return row; } },
    customer: { findMany: async ({ where }: any = {}) => customers.filter((row) => matches(row, where)), findFirst: async ({ where }: any = {}) => customers.find((row) => matches(row, where)) || null },
    quote: { findMany: async ({ where }: any = {}) => quotes.filter((row) => matches(row, where)), findFirst: async () => null },
    followUpTask: { findMany: async ({ where }: any = {}) => followUps.filter((row) => matches(row, where)) },
    sampleOrder: { findMany: async () => [], findFirst: async () => null },
    customRequest: { findMany: async () => [], findFirst: async () => null },
    order: { findMany: async ({ where }: any = {}) => orders.filter((row) => matches(row, where)), findFirst: async () => null },
    brand: { findMany: async ({ where }: any = {}) => brands.filter((row) => matches(row, where)), findFirst: async ({ where }: any = {}) => brands.find((row) => matches(row, where)) || null, findUnique: async ({ where }: any = {}) => brands.find((row) => matches(row, where)) || null },
    supplier: { findMany: async ({ where }: any = {}) => suppliers.filter((row) => matches(row, where)), findFirst: async () => null },
    afterSalesCase: { findMany: async ({ where }: any = {}) => afterSalesCases.filter((row) => matches(row, where)), findFirst: async () => null },
    brandRule: { findMany: async ({ where }: any = {}) => brandRules.filter((row) => matches(row, where)) },
    brandKnowledgeBase: { findMany: async () => [] },
    brandProduct: { findMany: async () => [] },
    brandMaterial: { findMany: async () => [] },
    brandAssignment: { findFirst: async ({ where }: any = {}) => brandAssignments.find((row) => matches(row, where)) || null },
    knowledgeBaseOrg: { findMany: async () => [] },
    knowledgeBase: { findFirst: async () => null },
    product: { findFirst: async () => null },
    material: { findFirst: async () => null },
    scriptOrg: { findFirst: async () => null },
    scriptVariant: { findFirst: async () => null },
    reorderOpportunity: { findFirst: async () => null }
  };

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const userId = req.header("x-user-id") || "manager-1";
    req.user = { id: userId, email: `${userId}@example.com`, name: userId };
    next();
  });
  app.use("/api/enterprise", createEnterpriseRouter(db as any));
  app.use((error: any, _req: any, res: any, _next: any) => res.status(error.status || 500).json({ message: error.message }));
  return { app, units, enterpriseRoles, enterpriseReports, enterpriseAuditLogs, auditLogs };
}

describe("V5 enterprise platform API", () => {
  it("lets owner or manager create enterprise organization units and blocks sales", async () => {
    const { app, units } = createTestApp();
    await request(app).post("/api/enterprise/organizations").set("x-user-id", "sales-1").send({ organizationId: "org-1", name: "Branch A", type: "branch" }).expect(403);
    const created = await request(app).post("/api/enterprise/organizations").set("x-user-id", "manager-1").send({ organizationId: "org-1", name: "Branch A", type: "branch" }).expect(201);
    expect(created.body.name).toBe("Branch A");
    expect(units).toHaveLength(1);
    await request(app).patch(`/api/enterprise/organizations/${created.body.id}`).set("x-user-id", "manager-1").send({ status: "archived" }).expect(409);
    await request(app).patch(`/api/enterprise/organizations/${created.body.id}`).set("x-user-id", "manager-1").send({ status: "archived", confirm: true }).expect(200);
  });

  it("enforces organization isolation for enterprise reads", async () => {
    const { app } = createTestApp();
    await request(app).get("/api/enterprise/organizations?organizationId=org-2").set("x-user-id", "sales-1").expect(403);
    await request(app).get("/api/enterprise/organizations?organizationId=org-1").set("x-user-id", "sales-1").expect(200);
  });

  it("creates enterprise roles and reports with audit logs", async () => {
    const { app, enterpriseRoles, enterpriseReports, enterpriseAuditLogs } = createTestApp();
    await request(app).post("/api/enterprise/roles").set("x-user-id", "sales-1").send({ organizationId: "org-1", roleName: "regional_admin", permissions: ["enterprise.report.view"] }).expect(403);
    await request(app).post("/api/enterprise/roles").set("x-user-id", "owner-1").send({ organizationId: "org-1", roleName: "regional_admin", permissions: ["enterprise.report.view"] }).expect(201);
    expect(enterpriseRoles[0].roleName).toBe("regional_admin");
    const report = await request(app).post("/api/enterprise/reports").set("x-user-id", "manager-1").send({ organizationId: "org-1", reportType: "enterprise_summary" }).expect(201);
    expect(report.body.result.kpis.orderCount).toBe(1);
    expect(enterpriseReports).toHaveLength(1);
    expect(enterpriseAuditLogs.some((log) => log.entityType === "EnterpriseReport")).toBe(true);
  });

  it("returns enterprise brand context without crossing organization boundaries", async () => {
    const { app } = createTestApp();
    const context = await request(app).post("/api/enterprise/brand-context").set("x-user-id", "manager-1").send({ organizationId: "org-1", brandId: "brand-1", scenario: "price_reply" }).expect(200);
    expect(context.body.brandUsed).toBe("GoSea");
    expect(context.body.brandRulesUsed).toEqual(["Quote rule"]);
    expect(context.body.riskWarnings.join(" ")).toMatch(/advisory/i);
    await request(app).post("/api/enterprise/brand-context").set("x-user-id", "sales-1").send({ organizationId: "org-2", brandId: "brand-1" }).expect(403);
  });
});

function crudCollection(rows: Row[], idFactory: () => string, defaults: Row = {}) {
  return {
    findMany: async ({ where }: any = {}) => rows.filter((row) => matches(row, where)),
    findFirst: async ({ where }: any = {}) => rows.find((row) => matches(row, where)) || null,
    findUnique: async ({ where }: any = {}) => rows.find((row) => matches(row, where)) || null,
    create: async ({ data }: any) => {
      const now = new Date("2026-05-22T00:00:00.000Z");
      const row = { id: idFactory(), ...defaults, ...data, createdAt: now, updatedAt: now };
      rows.push(row);
      return row;
    },
    update: async ({ where, data }: any) => updateRow(rows, where, data)
  };
}

function updateRow(rows: Row[], where: Row, data: Row) {
  const index = rows.findIndex((row) => matches(row, where));
  rows[index] = { ...rows[index], ...data, updatedAt: new Date("2026-05-22T00:00:00.000Z") };
  return rows[index];
}

function withIncludedUser(row: Row, include: Row = {}) {
  if (!include?.user) return row;
  return row;
}

function matches(row: Row | undefined, where: Row = {}): boolean {
  if (!row) return false;
  return Object.entries(where).every(([key, expected]) => {
    if (expected === undefined) return true;
    if (key === "OR") return expected.some((clause: Row) => matches(row, clause));
    if (expected && typeof expected === "object" && "in" in expected) return expected.in.includes(row[key]);
    if (expected && typeof expected === "object" && "some" in expected) return Array.isArray(row[key]) && row[key].some((item) => matches(item, expected.some));
    if (expected && typeof expected === "object" && "gte" in expected) return new Date(row[key]) >= new Date(expected.gte);
    if (expected && typeof expected === "object" && "lte" in expected) return new Date(row[key]) <= new Date(expected.lte);
    if (expected && typeof expected === "object" && !Array.isArray(expected)) return matches(row[key] || {}, expected);
    return row[key] === expected;
  });
}

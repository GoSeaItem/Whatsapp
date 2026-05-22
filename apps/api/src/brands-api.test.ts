import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createBrandLinksRouter, createBrandRulesRouter, createBrandsRouter, resolveBrandContext } from "./brands-api.js";

type Row = Record<string, any>;

function createTestApp() {
  const members = [
    { organizationId: "org-1", userId: "owner-1", role: "owner", status: "active" },
    { organizationId: "org-1", userId: "manager-1", role: "manager", status: "active" },
    { organizationId: "org-1", userId: "sales-1", role: "sales", status: "active" },
    { organizationId: "org-1", userId: "support-1", role: "support", status: "active" },
    { organizationId: "org-2", userId: "manager-2", role: "manager", status: "active" }
  ];
  const products = [{ id: "product-1", ownerId: "sales-1", name: "Dress", sku: "DR-1", organizationProducts: [{ organizationId: "org-1" }] }, { id: "product-2", ownerId: "manager-2", name: "Other", sku: "O-1", organizationProducts: [{ organizationId: "org-2" }] }];
  const materials = [{ id: "material-1", ownerId: "sales-1", title: "Catalog", type: "catalog", organizationMaterials: [{ organizationId: "org-1" }] }];
  const orgKnowledge = [{ id: "kb-org-1", organizationId: "org-1", title: "Brand logistics", category: "logistics", content: "Confirm city before shipping quote.", language: "en", enabled: true }];
  const customers = [{ id: "customer-1", organizationId: "org-1", ownerId: "sales-1", assignedTo: null, collaborators: [] }, { id: "customer-2", organizationId: "org-2", ownerId: "manager-2", assignedTo: null, collaborators: [] }];
  const brands: Row[] = [];
  const brandProducts: Row[] = [];
  const brandMaterials: Row[] = [];
  const brandKnowledgeBases: Row[] = [];
  const brandScripts: Row[] = [];
  const brandRules: Row[] = [];
  const brandAssignments: Row[] = [];
  const auditLogs: Row[] = [];
  let seq = 1;

  const db: Row = {
    organizationMember: { findFirst: async ({ where }: any) => members.find((row) => matches(row, where)) || null },
    brand: {
      findMany: async ({ where }: any = {}) => brands.filter((row) => matches(row, where)),
      findFirst: async ({ where }: any = {}) => brands.find((row) => matches(row, where)) || null,
      findUnique: async ({ where }: any) => brands.find((row) => matches(row, where)) || null,
      create: async ({ data }: any) => {
        if (brands.some((row) => row.organizationId === data.organizationId && row.name === data.name)) {
          const error: any = new Error("unique");
          error.code = "P2002";
          throw error;
        }
        const row = { id: `brand-${seq++}`, ...data, createdAt: new Date(), updatedAt: new Date() };
        brands.push(row);
        return row;
      },
      update: async ({ where, data }: any) => update(brands, where, data)
    },
    brandProduct: withGroupBy(crudCollection(brandProducts, () => `bp-${seq++}`)),
    brandMaterial: withGroupBy(crudCollection(brandMaterials, () => `bm-${seq++}`)),
    brandKnowledgeBase: crudCollection(brandKnowledgeBases, () => `bk-${seq++}`),
    brandScript: crudCollection(brandScripts, () => `bs-${seq++}`),
    brandRule: withGroupBy({
      ...crudCollection(brandRules, () => `br-${seq++}`, { enabled: true }),
      findUnique: async ({ where }: any) => brandRules.find((row) => matches(row, where)) || null
    }),
    brandAssignment: crudCollection(brandAssignments, () => `ba-${seq++}`),
    product: { findFirst: async ({ where }: any) => products.find((row) => matches(row, where)) || null },
    material: { findFirst: async ({ where }: any) => materials.find((row) => matches(row, where)) || null },
    knowledgeBaseOrg: {
      findMany: async ({ where }: any = {}) => orgKnowledge.filter((row) => matches(row, where)),
      findFirst: async ({ where }: any) => orgKnowledge.find((row) => matches(row, where)) || null
    },
    knowledgeBase: { findFirst: async () => null },
    scriptOrg: { findFirst: async () => null },
    scriptVariant: { findFirst: async () => null },
    customer: { findFirst: async ({ where }: any) => customers.find((row) => matches(row, where)) || null },
    quote: { findFirst: async () => null },
    order: { findFirst: async () => null },
    afterSalesCase: { findFirst: async () => null },
    reorderOpportunity: { findFirst: async () => null },
    supplier: { findFirst: async () => null },
    sampleOrder: { findFirst: async () => null },
    customRequest: { findFirst: async () => null },
    auditLog: { create: async ({ data }: any) => { const row = { id: `audit-${auditLogs.length + 1}`, ...data }; auditLogs.push(row); return row; } }
  };

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const userId = req.header("x-user-id") || "manager-1";
    req.user = { id: userId, email: `${userId}@example.com`, name: userId };
    next();
  });
  app.use("/api/brands", createBrandsRouter(db as any));
  app.use("/api/brand-products", createBrandLinksRouter("brandProduct", "brand.manageProducts", db as any));
  app.use("/api/brand-rules", createBrandRulesRouter(db as any));
  app.use((error: any, _req: any, res: any, _next: any) => res.status(error.status || 500).json({ message: error.message }));
  return { app, db, brands, brandProducts, brandRules, brandAssignments, auditLogs };
}

describe("V4-M brands / stores API", () => {
  it("creates brands, blocks duplicate org names, and archives only with confirmation", async () => {
    const { app, auditLogs } = createTestApp();
    const created = await request(app).post("/api/brands").set("x-user-id", "manager-1").send({ organizationId: "org-1", name: "GoSea", defaultLanguage: "en" }).expect(201);
    expect(created.body.name).toBe("GoSea");
    await request(app).post("/api/brands").set("x-user-id", "manager-1").send({ organizationId: "org-1", name: "GoSea" }).expect(409);
    await request(app).delete(`/api/brands/${created.body.id}`).set("x-user-id", "manager-1").expect(409);
    await request(app).delete(`/api/brands/${created.body.id}?confirm=true`).set("x-user-id", "manager-1").expect(200).expect((res) => expect(res.body.status).toBe("archived"));
    expect(auditLogs.some((log) => log.action === "delete" && log.entityType === "Brand" && log.metadata?.operation === "brand_archive")).toBe(true);
  });

  it("filters active brands for sales/support and rejects cross-org access", async () => {
    const { app } = createTestApp();
    await request(app).post("/api/brands").set("x-user-id", "manager-1").send({ organizationId: "org-1", name: "Active", status: "active" }).expect(201);
    await request(app).post("/api/brands").set("x-user-id", "manager-1").send({ organizationId: "org-1", name: "Inactive", status: "inactive" }).expect(201);
    const salesList = await request(app).get("/api/brands?organizationId=org-1").set("x-user-id", "sales-1").expect(200);
    expect(salesList.body.map((item: any) => item.name)).toEqual(["Active"]);
    await request(app).get("/api/brands?organizationId=org-2").set("x-user-id", "sales-1").expect(403);
  });

  it("links resources, rejects cross-org product links, and manages brand rules", async () => {
    const { app, brandProducts } = createTestApp();
    const brand = await request(app).post("/api/brands").set("x-user-id", "manager-1").send({ organizationId: "org-1", name: "Resource Brand" }).expect(201);
    await request(app).post(`/api/brands/${brand.body.id}/products`).set("x-user-id", "manager-1").send({ productId: "product-2" }).expect(403);
    await request(app).post(`/api/brands/${brand.body.id}/products`).set("x-user-id", "manager-1").send({ productId: "product-1" }).expect(201);
    expect(brandProducts[0].productId).toBe("product-1");

    const rule = await request(app).post(`/api/brands/${brand.body.id}/rules`).set("x-user-id", "manager-1").send({ ruleType: "payment_method", title: "PayPal", content: "Confirm PayPal account before sending.", language: "en" }).expect(201);
    await request(app).patch(`/api/brand-rules/${rule.body.id}`).set("x-user-id", "manager-1").send({ enabled: false }).expect(200).expect((res) => expect(res.body.enabled).toBe(false));
    await request(app).delete(`/api/brand-rules/${rule.body.id}?confirm=true`).set("x-user-id", "manager-1").expect(200).expect((res) => expect(res.body.enabled).toBe(false));
  });

  it("assigns brands to accessible customers and resolves AI brand context", async () => {
    const { app, db, brandAssignments } = createTestApp();
    const brand = await request(app).post("/api/brands").set("x-user-id", "manager-1").send({ organizationId: "org-1", name: "AI Brand" }).expect(201);
    await request(app).post(`/api/brands/${brand.body.id}/rules`).set("x-user-id", "manager-1").send({ ruleType: "logistics", title: "Shipping", content: "Confirm city before shipping quote.", language: "en" }).expect(201);
    await request(app).post(`/api/brands/${brand.body.id}/assign`).set("x-user-id", "manager-1").send({ entityType: "customer", entityId: "customer-1", confirm: true }).expect(201);
    await request(app).post(`/api/brands/${brand.body.id}/assign`).set("x-user-id", "manager-1").send({ entityType: "customer", entityId: "customer-2", confirm: true }).expect(403);
    expect(brandAssignments[0].entityId).toBe("customer-1");

    const context = await resolveBrandContext(db as any, "sales-1", { customerId: "customer-1", scenario: "shipping_explain" });
    expect(context.brandUsed).toBe("AI Brand");
    expect(context.brandRulesUsed).toEqual(["Shipping"]);
    expect(context.knowledgeUsed.join(" ")).toMatch(/\[Brand\] Shipping/);
  });
});

function crudCollection(rows: Row[], idFactory: () => string, defaults: Row = {}) {
  return {
    findMany: async ({ where }: any = {}) => rows.filter((row) => matches(row, where)),
    findFirst: async ({ where }: any = {}) => rows.find((row) => matches(row, where)) || null,
    create: async ({ data }: any) => { const row = { id: idFactory(), ...defaults, ...data, createdAt: new Date(), updatedAt: new Date() }; rows.push(row); return row; },
    update: async ({ where, data }: any) => update(rows, where, data),
    delete: async ({ where }: any) => rows.splice(rows.findIndex((row) => matches(row, where)), 1)[0]
  };
}

function withGroupBy(collection: Row) {
  return {
    ...collection,
    groupBy: async ({ by, where }: any) => {
      const key = by[0];
      const counts = new Map<string, number>();
      for (const row of await collection.findMany({ where })) counts.set(row[key], (counts.get(row[key]) || 0) + 1);
      return [...counts.entries()].map(([value, count]) => ({ [key]: value, _count: { _all: count } }));
    }
  };
}

function update(rows: Row[], where: Row, data: Row) {
  const index = rows.findIndex((row) => matches(row, where));
  rows[index] = { ...rows[index], ...data, updatedAt: new Date() };
  return rows[index];
}

function matches(row: Row | undefined, where: Row = {}): boolean {
  if (!row) return false;
  return Object.entries(where).every(([key, expected]) => {
    if (key === "OR") return expected.some((clause: Row) => matches(row, clause));
    if (expected && typeof expected === "object" && "in" in expected) return expected.in.includes(row[key]);
    if (expected && typeof expected === "object" && "some" in expected) return Array.isArray(row[key]) && row[key].some((item) => matches(item, expected.some));
    if (expected && typeof expected === "object" && !Array.isArray(expected)) return matches(row[key] || {}, expected);
    return row[key] === expected;
  });
}

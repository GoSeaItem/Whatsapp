import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createPurchaseNotesRouter, createSupplierAiRouter, createSupplierContactsRouter, createSupplierQuotesRouter, createSupplierRisksRouter, createSuppliersRouter } from "./suppliers-api.js";

type Row = Record<string, any>;

function createTestApp() {
  const members = [
    { organizationId: "org-1", userId: "owner-1", role: "owner", status: "active" },
    { organizationId: "org-1", userId: "manager-1", role: "manager", status: "active" },
    { organizationId: "org-1", userId: "sales-1", role: "sales", status: "active" },
    { organizationId: "org-1", userId: "support-1", role: "support", status: "active" },
    { organizationId: "org-2", userId: "manager-2", role: "manager", status: "active" }
  ];
  const products = [{ id: "product-1", ownerId: "sales-1", name: "Blue Dress", sku: "BD-1" }, { id: "product-2", ownerId: "manager-2", name: "Other", sku: "O-1" }];
  const orgProducts = [{ organizationId: "org-1", productId: "product-1" }];
  const customers = [{ id: "customer-1", organizationId: "org-1", ownerId: "sales-1", assignedTo: null, collaborators: [] }];
  const orders = [{ id: "order-1", organizationId: "org-1", customerId: "customer-1", productId: "product-1", orderNo: "ORD-1", amount: "500.00", currency: "USD", ownerId: "sales-1", assignedTo: null, createdBy: "sales-1", customer: customers[0], product: products[0] }];
  const costs: Row[] = [];
  const suppliers: Row[] = [];
  const contacts: Row[] = [];
  const quotes: Row[] = [];
  const notes: Row[] = [];
  const risks: Row[] = [];
  const links: Row[] = [];
  const auditLogs: Row[] = [];
  const aiLogs: Row[] = [];
  let seq = 1;

  const db: Row = {
    organizationMember: { findFirst: async ({ where }: any) => members.find((row) => matches(row, where)) || null },
    organizationProduct: { findFirst: async ({ where }: any) => orgProducts.find((row) => matches(row, where)) || null },
    product: { findFirst: async ({ where }: any) => products.find((row) => matches(row, where)) || null },
    order: { findFirst: async ({ where }: any) => orders.find((row) => matches(row, where)) || null },
    orderCost: {
      findUnique: async ({ where }: any) => costs.find((row) => matches(row, where)) || null,
      create: async ({ data }: any) => { const row = { id: `cost-${seq++}`, ...data, createdAt: new Date(), updatedAt: new Date() }; costs.push(row); return row; },
      update: async ({ where, data }: any) => update(costs, where, data)
    },
    supplier: {
      findMany: async ({ where }: any) => suppliers.filter((row) => matches(row, where)),
      findFirst: async ({ where }: any) => suppliers.find((row) => matches(row, where)) || null,
      create: async ({ data }: any) => { const row = { id: `supplier-${seq++}`, status: "candidate", tags: [], ...data, createdAt: new Date(), updatedAt: new Date() }; suppliers.push(row); return row; },
      update: async ({ where, data }: any) => update(suppliers, where, data)
    },
    supplierContact: crudCollection(contacts, () => `contact-${seq++}`),
    supplierQuote: crudCollection(quotes, () => `quote-${seq++}`),
    purchaseNote: crudCollection(notes, () => `note-${seq++}`),
    supplierRisk: crudCollection(risks, () => `risk-${seq++}`),
    supplierLink: crudCollection(links, () => `link-${seq++}`),
    auditLog: { create: async ({ data }: any) => { auditLogs.push(data); return { id: `audit-${auditLogs.length}`, ...data }; } },
    aiActionSuggestionLog: { create: async ({ data }: any) => { const row = { id: `ai-${aiLogs.length + 1}`, ...data }; aiLogs.push(row); return row; } }
  };

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const userId = req.header("x-user-id") || "manager-1";
    req.user = { id: userId, email: `${userId}@example.com`, name: userId };
    next();
  });
  app.use("/api/suppliers", createSuppliersRouter(db as any));
  app.use("/api/supplier-contacts", createSupplierContactsRouter(db as any));
  app.use("/api/supplier-quotes", createSupplierQuotesRouter(db as any));
  app.use("/api/purchase-notes", createPurchaseNotesRouter(db as any));
  app.use("/api/supplier-risks", createSupplierRisksRouter(db as any));
  app.use("/api/ai", createSupplierAiRouter(db as any));
  app.use((error: any, _req: any, res: any, _next: any) => res.status(error.status || 500).json({ message: error.message }));
  return { app, suppliers, contacts, quotes, costs, notes, risks, auditLogs, aiLogs };
}

describe("V4-L suppliers / procurement API", () => {
  it("creates suppliers, blocks duplicates, and requires confirmation for high-risk updates/deactivation", async () => {
    const { app } = createTestApp();
    const created = await request(app).post("/api/suppliers").set("x-user-id", "manager-1").send({ organizationId: "org-1", name: "Yiwu Factory", phone: "10086", status: "active" }).expect(201);
    expect(created.body.name).toBe("Yiwu Factory");

    await request(app).post("/api/suppliers").set("x-user-id", "manager-1").send({ organizationId: "org-1", name: "Yiwu Factory", phone: "10086" }).expect(409);
    await request(app).patch(`/api/suppliers/${created.body.id}`).set("x-user-id", "manager-1").send({ status: "blocked" }).expect(409);
    await request(app).patch(`/api/suppliers/${created.body.id}`).set("x-user-id", "manager-1").send({ status: "blocked", confirm: true }).expect(200);
    await request(app).delete(`/api/suppliers/${created.body.id}`).set("x-user-id", "manager-1").expect(409);
    await request(app).delete(`/api/suppliers/${created.body.id}?confirm=true`).set("x-user-id", "manager-1").expect(200).expect((res) => expect(res.body.status).toBe("inactive"));
  });

  it("manages contacts, quotes, notes, risks and applies supplier cost manually", async () => {
    const { app, costs, auditLogs } = createTestApp();
    const supplier = await request(app).post("/api/suppliers").set("x-user-id", "manager-1").send({ organizationId: "org-1", name: "Factory A" }).expect(201);
    const contact = await request(app).post(`/api/suppliers/${supplier.body.id}/contacts`).set("x-user-id", "manager-1").send({ name: "Linda", whatsapp: "123" }).expect(201);
    expect(contact.body.name).toBe("Linda");
    await request(app).post("/api/purchase-notes").set("x-user-id", "sales-1").send({ supplierId: supplier.body.id, noteType: "sample", content: "Check sample timing." }).expect(201);
    await request(app).post("/api/supplier-risks").set("x-user-id", "manager-1").send({ supplierId: supplier.body.id, riskType: "unstable_delivery", level: "medium" }).expect(201);

    const quote = await request(app).post("/api/supplier-quotes").set("x-user-id", "manager-1").send({
      supplierId: supplier.body.id,
      productId: "product-1",
      moq: 100,
      unitCost: 3.2,
      currency: "USD",
      leadTime: "15 days"
    }).expect(201);
    await request(app).post(`/api/supplier-quotes/${quote.body.id}/apply-to-order-cost`).set("x-user-id", "manager-1").send({ orderId: "order-1" }).expect(409);
    const applied = await request(app).post(`/api/supplier-quotes/${quote.body.id}/apply-to-order-cost`).set("x-user-id", "manager-1").send({ orderId: "order-1", confirm: true }).expect(200);
    expect(costs[0].productCost).toBe("3.20");
    expect(applied.body.riskWarnings.join(" ")).toMatch(/manual|Supplier quote/i);
    expect(auditLogs.some((log) => log.metadata?.operation === "supplier_quote_apply_to_order_cost")).toBe(true);
  });

  it("rejects cross-organization product use and hides sensitive contact for support", async () => {
    const { app } = createTestApp();
    const supplier = await request(app).post("/api/suppliers").set("x-user-id", "manager-1").send({ organizationId: "org-1", name: "Factory B", phone: "secret-phone" }).expect(201);
    await request(app).post("/api/supplier-quotes").set("x-user-id", "manager-1").send({ supplierId: supplier.body.id, productId: "product-2", unitCost: 2 }).expect(403);
    const listed = await request(app).get("/api/suppliers?organizationId=org-1").set("x-user-id", "support-1").expect(200);
    expect(listed.body[0].phone).toBeNull();
  });

  it("generates supplier scripts as drafts without auto procurement or auto contact", async () => {
    const { app, aiLogs } = createTestApp();
    const supplier = await request(app).post("/api/suppliers").set("x-user-id", "manager-1").send({ organizationId: "org-1", name: "Factory C" }).expect(201);
    const response = await request(app).post("/api/ai/supplier-script").set("x-user-id", "sales-1").send({ supplierId: supplier.body.id, productId: "product-1", scenario: "ask_price" }).expect(200);
    expect(response.body.scriptText).toMatch(/confirm|cost|MOQ/i);
    expect(response.body.riskWarnings.join(" ")).toMatch(/draft|auto-contact|auto-place|price|MOQ|lead time/i);
    expect(JSON.stringify(response.body).toLowerCase()).not.toMatch(/auto-send|bulk send|send button|place purchase order automatically/);
    expect(aiLogs[0].actionType).toBe("supplier_price_inquiry");
  });
});

function crudCollection(rows: Row[], idFactory: () => string) {
  return {
    findMany: async ({ where }: any) => rows.filter((row) => matches(row, where)),
    findFirst: async ({ where }: any) => rows.find((row) => matches(row, where)) || null,
    create: async ({ data }: any) => { const row = { id: idFactory(), ...data, createdAt: new Date(), updatedAt: new Date() }; rows.push(row); return row; },
    update: async ({ where, data }: any) => update(rows, where, data),
    delete: async ({ where }: any) => {
      const index = rows.findIndex((row) => matches(row, where));
      const [deleted] = rows.splice(index, 1);
      return deleted;
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
    if (expected && typeof expected === "object" && "has" in expected) return Array.isArray(row[key]) && row[key].includes(expected.has);
    if (expected && typeof expected === "object" && !Array.isArray(expected)) return matches(row[key] || {}, expected);
    return row[key] === expected;
  });
}

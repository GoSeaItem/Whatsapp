import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createAfterSalesAiRouter, createAfterSalesRouter } from "./after-sales-api.js";

type Row = Record<string, any>;

function createTestApp(seed: { cases?: Row[] } = {}) {
  const customers = [
    { id: "customer-1", name: "Maria", ownerId: "sales-1", assignedTo: null, collaborators: [], organizationId: null, language: "en" },
    { id: "customer-2", name: "Other", ownerId: "sales-2", assignedTo: null, collaborators: [], organizationId: null, language: "en" }
  ];
  const products = [
    { id: "product-1", name: "Blue Dress", ownerId: "sales-1", sku: "BD-1" },
    { id: "product-2", name: "Other Product", ownerId: "sales-2", sku: "OP-1" }
  ];
  const orders = [
    makeOrder({ id: "order-1", customerId: "customer-1", productId: "product-1", ownerId: "sales-1" }),
    makeOrder({ id: "order-2", customerId: "customer-2", productId: "product-2", ownerId: "sales-2" })
  ];
  const cases: Row[] = [...(seed.cases || [])];
  const events: Row[] = [];
  const followUps: Row[] = [];
  const costs: Row[] = [];
  let nextCaseId = 1;
  let nextEventId = 1;
  let nextTaskId = 1;

  const hydrate = (row: Row) => ({
    ...row,
    customer: customers.find((customer) => customer.id === row.customerId) || null,
    order: orders.find((order) => order.id === row.orderId) || null,
    product: products.find((product) => product.id === row.productId) || null,
    events: events.filter((event) => event.afterSalesCaseId === row.id)
  });

  const db = {
    customer: { findFirst: async ({ where }: any) => customers.find((row) => matches(row, where)) || null },
    product: { findFirst: async ({ where }: any) => products.find((row) => matches(row, where)) || null },
    organizationMember: { findFirst: async () => null },
    organizationProduct: { findFirst: async () => null },
    knowledgeBase: { findMany: async () => [] },
    knowledgeBaseOrg: { findMany: async () => [] },
    order: {
      findFirst: async ({ where }: any) => {
        const order = orders.find((row) => matches(row, where));
        return order ? { ...order, customer: customers.find((customer) => customer.id === order.customerId), product: products.find((product) => product.id === order.productId) } : null;
      },
      update: async ({ where, data }: any) => {
        const index = orders.findIndex((row) => row.id === where.id);
        orders[index] = { ...orders[index], ...data, updatedAt: new Date() };
        return orders[index];
      }
    },
    afterSalesCase: {
      count: async ({ where }: any) => cases.filter((row) => matches(row, where)).length,
      findMany: async ({ where }: any) => cases.filter((row) => matches(row, where)).map(hydrate),
      findFirst: async ({ where }: any) => {
        const found = cases.find((row) => matches(row, where));
        return found ? hydrate(found) : null;
      },
      create: async ({ data }: any) => {
        const row = { id: `case-${nextCaseId++}`, ...data, openedAt: new Date(), createdAt: new Date(), updatedAt: new Date(), resolvedAt: null, closedAt: null };
        cases.push(row);
        return hydrate(row);
      },
      update: async ({ where, data }: any) => {
        const index = cases.findIndex((row) => row.id === where.id);
        cases[index] = { ...cases[index], ...data, updatedAt: new Date() };
        return hydrate(cases[index]);
      },
      delete: async ({ where }: any) => {
        const index = cases.findIndex((row) => row.id === where.id);
        const [deleted] = cases.splice(index, 1);
        return deleted;
      }
    },
    afterSalesEvent: {
      create: async ({ data }: any) => {
        const event = { id: `event-${nextEventId++}`, ...data, createdAt: new Date() };
        events.push(event);
        return event;
      }
    },
    followUpTask: {
      findMany: async ({ where }: any) => followUps.filter((row) => matches(row, where)),
      create: async ({ data }: any) => {
        const task = { id: `task-${nextTaskId++}`, ...data, createdAt: new Date(), completedAt: null };
        followUps.push(task);
        return task;
      }
    },
    orderCost: {
      findFirst: async ({ where }: any) => costs.find((row) => matches(row, where)) || null,
      create: async ({ data }: any) => {
        const row = { id: "cost-1", ...data, createdAt: new Date(), updatedAt: new Date(), costConfirmed: false };
        costs.push(row);
        return row;
      },
      update: async ({ where, data }: any) => {
        const index = costs.findIndex((row) => row.id === where.id);
        costs[index] = { ...costs[index], ...data, updatedAt: new Date() };
        return costs[index];
      }
    },
    aiActionSuggestionLog: { create: async ({ data }: any) => ({ id: "ai-log-1", ...data, createdAt: new Date() }) },
    auditLog: { create: async ({ data }: any) => ({ id: "audit-1", ...data, createdAt: new Date() }) }
  };

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const userId = req.header("x-user-id") || "sales-1";
    req.user = { id: userId, email: `${userId}@example.com`, name: userId };
    next();
  });
  app.use("/api/after-sales", createAfterSalesRouter(db as any));
  app.use("/api/ai", createAfterSalesAiRouter(db as any));
  app.use((error: any, _req: any, res: any, _next: any) => res.status(error.status || 500).json({ message: error.message }));
  return { app, cases, events, followUps, costs, orders };
}

describe("V4-J after-sales API", () => {
  it("creates, lists, resolves and creates a manual follow-up for owned cases", async () => {
    const { app, cases, followUps, orders } = createTestApp();

    const created = await request(app).post("/api/after-sales").set("x-user-id", "sales-1").send({
      customerId: "customer-1",
      orderId: "order-1",
      productId: "product-1",
      caseType: "quality_issue",
      priority: "high",
      description: "Color issue",
      customerClaim: "The color looks different."
    }).expect(201);

    expect(created.body.caseNo).toMatch(/^AS-\d{8}-0001$/);
    expect(created.body.riskWarnings.join(" ")).toMatch(/draft/i);
    expect(orders[0].afterSalesStatus).toBe("pending");

    const list = await request(app).get("/api/after-sales").set("x-user-id", "sales-1").expect(200);
    expect(list.body.map((item: Row) => item.id)).toEqual([created.body.id]);

    await request(app).patch(`/api/after-sales/${created.body.id}/status`).set("x-user-id", "sales-1").send({ status: "resolved" }).expect(400);
    await request(app).patch(`/api/after-sales/${created.body.id}/status`).set("x-user-id", "sales-1").send({ status: "resolved", notes: "Customer accepted explanation." }).expect(200);
    expect(cases[0].status).toBe("resolved");

    await request(app).post(`/api/after-sales/${created.body.id}/create-follow-up-task`).set("x-user-id", "sales-1").send({ confirm: true }).expect(201);
    expect(followUps[0].afterSalesCaseId).toBe(created.body.id);
  });

  it("rejects cross-user access and requires confirmation for sensitive actions", async () => {
    const { app } = createTestApp({ cases: [makeCase({ id: "case-1", customerId: "customer-1", ownerId: "sales-1" })] });

    await request(app).post("/api/after-sales").set("x-user-id", "sales-1").send({ customerId: "customer-2", caseType: "complaint" }).expect(403);
    await request(app).get("/api/after-sales/case-1").set("x-user-id", "sales-2").expect(403);
    await request(app).patch("/api/after-sales/case-1/responsibility").set("x-user-id", "sales-1").send({ responsibility: "company" }).expect(409);
    await request(app).patch("/api/after-sales/case-1/solution").set("x-user-id", "sales-1").send({ finalSolution: "refund" }).expect(409);
    await request(app).delete("/api/after-sales/case-1").set("x-user-id", "sales-1").expect(409);
    await request(app).delete("/api/after-sales/case-1?confirm=true").set("x-user-id", "sales-1").expect(204);
  });

  it("updates refund/reship solution with risk warnings and optional cost sync", async () => {
    const { app, costs } = createTestApp({ cases: [makeCase({ id: "case-1", customerId: "customer-1", orderId: "order-1", ownerId: "sales-1" })] });

    const response = await request(app).patch("/api/after-sales/case-1/solution").set("x-user-id", "sales-1").send({
      finalSolution: "reship",
      refundAmount: "5",
      reshipCost: "12",
      currency: "USD",
      syncOrderCost: true,
      confirm: true
    }).expect(200);

    expect(response.body.riskWarnings.join(" ")).toMatch(/reship|refund/i);
    expect(costs[0].reshipCost).toBe("12");
    expect(costs[0].refundAmount).toBe("5");
  });

  it("generates safe after-sales script drafts without auto-send behavior", async () => {
    const { app } = createTestApp({ cases: [makeCase({ id: "case-1", customerId: "customer-1", orderId: "order-1", ownerId: "sales-1", caseType: "refund_request" })] });

    const response = await request(app).post("/api/ai/after-sales-script").set("x-user-id", "sales-1").send({
      afterSalesCaseId: "case-1",
      scenario: "refund_policy_explain",
      targetLanguage: "en"
    }).expect(200);

    const text = JSON.stringify(response.body).toLowerCase();
    expect(response.body.scriptText).toMatch(/policy|check/i);
    expect(response.body.riskWarnings.join(" ").toLowerCase()).toContain("draft");
    expect(text).not.toMatch(/auto-send|bulk send|click.*send|send button|refund is approved|we accept responsibility/);
  });
});

function makeOrder(overrides: Row = {}) {
  return {
    id: "order-1",
    organizationId: null,
    customerId: "customer-1",
    productId: "product-1",
    orderNo: "ORD-20260521-0001",
    amount: 100,
    currency: "USD",
    afterSalesStatus: "none",
    ownerId: "sales-1",
    assignedTo: null,
    ...overrides
  };
}

function makeCase(overrides: Row = {}) {
  return {
    id: "case-1",
    organizationId: null,
    customerId: "customer-1",
    orderId: null,
    productId: "product-1",
    caseNo: "AS-20260521-0001",
    caseType: "complaint",
    priority: "medium",
    status: "open",
    responsibility: "unknown",
    requestedSolution: null,
    finalSolution: null,
    refundAmount: null,
    reshipCost: null,
    compensationAmount: null,
    currency: "USD",
    description: null,
    customerClaim: null,
    internalNotes: null,
    evidenceUrls: [],
    resolutionNotes: null,
    openedAt: new Date(),
    resolvedAt: null,
    closedAt: null,
    ownerId: "sales-1",
    assignedTo: null,
    createdBy: "sales-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
}

function matches(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([key, expected]) => {
    if (key === "OR") return expected.some((clause: Row) => matches(row, clause));
    if (expected && typeof expected === "object" && "in" in expected) return expected.in.includes(row[key]);
    if (expected && typeof expected === "object" && "startsWith" in expected) return String(row[key] || "").startsWith(expected.startsWith);
    if (expected && typeof expected === "object" && "contains" in expected) return String(row[key] || "").toLowerCase().includes(String(expected.contains).toLowerCase());
    if (expected && typeof expected === "object" && "has" in expected) return Array.isArray(row[key]) && row[key].includes(expected.has);
    if (expected && typeof expected === "object" && !Array.isArray(expected)) return matches(row[key] || {}, expected);
    return row[key] === expected;
  });
}

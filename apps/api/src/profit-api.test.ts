import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createProfitRouter } from "./profit-api.js";

type Row = Record<string, any>;

function createTestApp() {
  const customers = [
    { id: "customer-1", name: "Maria", country: "Mexico", ownerId: "sales-1", assignedTo: null, collaborators: [], organizationId: "org-1" },
    { id: "customer-2", name: "Other", country: "Chile", ownerId: "sales-2", assignedTo: null, collaborators: [], organizationId: "org-2" }
  ];
  const products = [{ id: "product-1", name: "Blue Dress", sku: "BD-1" }];
  const users = [
    { id: "owner-1", name: "Owner" },
    { id: "manager-1", name: "Manager" },
    { id: "sales-1", name: "Sales" },
    { id: "support-1", name: "Support" }
  ];
  const members = [
    { organizationId: "org-1", userId: "owner-1", role: "owner", status: "active" },
    { organizationId: "org-1", userId: "manager-1", role: "manager", status: "active" },
    { organizationId: "org-1", userId: "sales-1", role: "sales", status: "active" },
    { organizationId: "org-1", userId: "support-1", role: "support", status: "active" },
    { organizationId: "org-2", userId: "sales-2", role: "sales", status: "active" }
  ];
  const orders = [
    makeOrder({ id: "order-1", organizationId: "org-1", customerId: "customer-1", ownerId: "sales-1", assignedTo: "sales-1", amount: 1000, currency: "USD" }),
    makeOrder({ id: "order-2", organizationId: "org-2", customerId: "customer-2", ownerId: "sales-2", assignedTo: "sales-2", amount: 500, currency: "USD" })
  ];
  const costs: Row[] = [];
  const audits: Row[] = [];
  const aiLogs: Row[] = [];

  const hydrate = (order: Row) => ({
    ...order,
    customer: customers.find((customer) => customer.id === order.customerId) || null,
    product: products.find((product) => product.id === order.productId) || null,
    cost: costs.find((cost) => cost.orderId === order.id) || null,
    owner: users.find((user) => user.id === order.ownerId) || null,
    assignee: users.find((user) => user.id === order.assignedTo) || null
  });

  const db = {
    organizationMember: {
      findFirst: async ({ where }: any) => members.find((row) => matches(row, where)) || null
    },
    order: {
      findFirst: async ({ where }: any) => {
        const row = orders.find((order) => matches(order, where));
        return row ? hydrate(row) : null;
      },
      findMany: async ({ where }: any) => orders.filter((order) => matches(order, where)).map(hydrate)
    },
    orderCost: {
      findUnique: async ({ where }: any) => costs.find((row) => matches(row, where)) || null,
      create: async ({ data }: any) => {
        const row = { id: `cost-${costs.length + 1}`, ...data, costConfirmed: false, confirmedBy: null, confirmedAt: null, createdAt: new Date(), updatedAt: new Date() };
        costs.push(row);
        return row;
      },
      update: async ({ where, data }: any) => {
        const index = costs.findIndex((row) => matches(row, where));
        costs[index] = { ...costs[index], ...data, updatedAt: new Date() };
        return costs[index];
      },
      delete: async ({ where }: any) => {
        const index = costs.findIndex((row) => matches(row, where));
        const [row] = costs.splice(index, 1);
        return row;
      }
    },
    auditLog: {
      create: async ({ data }: any) => {
        audits.push(data);
        return { id: `audit-${audits.length}`, ...data };
      }
    },
    aiActionSuggestionLog: {
      create: async ({ data }: any) => {
        const row = { id: `ai-${aiLogs.length + 1}`, ...data, createdAt: new Date() };
        aiLogs.push(row);
        return row;
      }
    }
  };

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const userId = req.header("x-user-id") || "sales-1";
    req.user = { id: userId, email: `${userId}@example.com`, name: userId };
    next();
  });
  app.use("/api", createProfitRouter(db as any));
  app.use((error: any, _req: any, res: any, _next: any) => res.status(error.status || 500).json({ message: error.message }));
  return { app, costs, audits, aiLogs };
}

describe("Profit Review API", () => {
  it("allows manager to create, confirm, list, summarize, and review order cost", async () => {
    const { app, costs, audits, aiLogs } = createTestApp();

    const cost = await request(app)
      .put("/api/orders/order-1/cost")
      .set("x-user-id", "manager-1")
      .send({ productCost: 500, packagingCost: 20, internationalShipping: 80, paymentFee: 10, otherCost: 10, currency: "USD" })
      .expect(200);

    expect(cost.body.totalCost).toBe("620.00");
    expect(cost.body.grossProfit).toBe("380.00");
    expect(cost.body.costConfirmed).toBe(false);

    await request(app).patch("/api/orders/order-1/cost/confirm").set("x-user-id", "manager-1").send({ confirm: true }).expect(200);
    expect(costs[0].costConfirmed).toBe(true);

    const list = await request(app).get("/api/profit/orders?organizationId=org-1").set("x-user-id", "manager-1").expect(200);
    expect(list.body[0].orderId).toBe("order-1");

    const summary = await request(app).get("/api/profit/summary?organizationId=org-1").set("x-user-id", "manager-1").expect(200);
    expect(summary.body.totalRevenue).toBe("1000.00");
    expect(summary.body.totalCost).toBe("620.00");

    const review = await request(app).post("/api/ai/profit-review").set("x-user-id", "manager-1").send({ orderId: "order-1", scope: "order" }).expect(200);
    expect(review.body.riskWarnings.join(" ").toLowerCase()).toContain("not accounting");
    expect(aiLogs[0].actionType).toBe("profit_review");
    expect(audits.length).toBeGreaterThan(0);
  });

  it("enforces role and confirmation boundaries", async () => {
    const { app } = createTestApp();

    await request(app).get("/api/orders/order-1/cost").set("x-user-id", "support-1").expect(403);
    await request(app).put("/api/orders/order-1/cost").set("x-user-id", "sales-1").send({ productCost: 100 }).expect(403);
    await request(app).get("/api/orders/order-2/cost").set("x-user-id", "sales-1").expect(403);
    await request(app).put("/api/orders/order-1/cost").set("x-user-id", "manager-1").send({ productCost: 100 }).expect(200);
    await request(app).delete("/api/orders/order-1/cost").set("x-user-id", "manager-1").send({ confirm: true }).expect(403);
    await request(app).delete("/api/orders/order-1/cost").set("x-user-id", "owner-1").expect(409);
    await request(app).delete("/api/orders/order-1/cost?confirm=true").set("x-user-id", "owner-1").expect(204);
  });
});

function makeOrder(overrides: Row = {}) {
  return {
    id: "order-1",
    organizationId: "org-1",
    customerId: "customer-1",
    orderNo: "ORD-20260521-0001",
    title: "Order",
    productId: "product-1",
    amount: 1000,
    currency: "USD",
    ownerId: "sales-1",
    assignedTo: "sales-1",
    createdBy: "sales-1",
    createdAt: new Date("2026-05-20T00:00:00.000Z"),
    updatedAt: new Date("2026-05-20T00:00:00.000Z"),
    ...overrides
  };
}

function matches(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([key, expected]) => {
    if (key === "OR") return expected.some((clause: Row) => matches(row, clause));
    if (expected && typeof expected === "object" && "in" in expected) return expected.in.includes(row[key]);
    if (expected && typeof expected === "object" && "contains" in expected) return String(row[key] || "").toLowerCase().includes(String(expected.contains).toLowerCase());
    if (expected && typeof expected === "object" && "has" in expected) return Array.isArray(row[key]) && row[key].includes(expected.has);
    if (expected && typeof expected === "object" && !Array.isArray(expected)) return matches(row[key] || {}, expected);
    return row[key] === expected;
  });
}

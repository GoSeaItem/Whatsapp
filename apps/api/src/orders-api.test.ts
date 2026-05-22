import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createOrderAiRouter, createOrderFulfillmentAlertsRouter, createOrdersRouter } from "./orders-api.js";

type Row = Record<string, any>;

function createTestApp(seed: { orders?: Row[] } = {}) {
  const customers = [
    { id: "customer-1", name: "Maria", ownerId: "sales-1", assignedTo: null, collaborators: [], organizationId: null, language: "en" },
    { id: "customer-2", name: "Other", ownerId: "sales-2", assignedTo: null, collaborators: [], organizationId: null, language: "en" }
  ];
  const products = [
    { id: "product-1", name: "Blue Dress", ownerId: "sales-1", sku: "BD-1" },
    { id: "product-2", name: "Other Product", ownerId: "sales-2", sku: "OP-1" }
  ];
  const quotes = [
    { id: "quote-1", customerId: "customer-1", productId: "product-1", quantity: 100, unitPrice: 8, shippingCost: 20, currency: "USD", quoteText: "Quote draft", createdBy: "sales-1" }
  ];
  const samples = [
    { id: "sample-1", customerId: "customer-1", productId: "product-1", sampleName: "Blue Dress sample", currency: "USD", notes: "Sample notes", ownerId: "sales-1" }
  ];
  const customRequests = [
    { id: "custom-1", customerId: "customer-1", productId: "product-1", requestType: "logo", quantity: 300, notes: "Logo request", ownerId: "sales-1" }
  ];
  const orders: Row[] = [...(seed.orders || [])];
  const followUps: Row[] = [];
  const alerts: Row[] = [];
  let nextOrderId = 1;
  let nextTaskId = 1;
  let nextAlertId = 1;

  const hydrate = (order: Row) => ({
    ...order,
    customer: customers.find((customer) => customer.id === order.customerId) || null,
    product: products.find((product) => product.id === order.productId) || null,
    quote: quotes.find((quote) => quote.id === order.quoteId) || null,
    sampleOrder: samples.find((sample) => sample.id === order.sampleOrderId) || null,
    customRequest: customRequests.find((custom) => custom.id === order.customRequestId) || null
  });

  const db = {
    customer: { findFirst: async ({ where }: any) => customers.find((row) => matches(row, where)) || null },
    product: { findFirst: async ({ where }: any) => products.find((row) => matches(row, where)) || null },
    organizationMember: { findFirst: async () => null },
    organizationProduct: { findFirst: async () => null },
    knowledgeBase: { findMany: async () => [] },
    knowledgeBaseOrg: { findMany: async () => [] },
    quote: {
      findFirst: async ({ where }: any) => {
        const quote = quotes.find((row) => matches(row, where));
        return quote ? { ...quote, customer: customers.find((customer) => customer.id === quote.customerId), product: products.find((product) => product.id === quote.productId) } : null;
      }
    },
    sampleOrder: {
      findFirst: async ({ where }: any) => {
        const sample = samples.find((row) => matches(row, where));
        return sample ? { ...sample, customer: customers.find((customer) => customer.id === sample.customerId), product: products.find((product) => product.id === sample.productId) } : null;
      }
    },
    customRequest: {
      findFirst: async ({ where }: any) => {
        const custom = customRequests.find((row) => matches(row, where));
        return custom ? { ...custom, customer: customers.find((customer) => customer.id === custom.customerId), product: products.find((product) => product.id === custom.productId) } : null;
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
    aiActionSuggestionLog: {
      create: async ({ data }: any) => ({ id: "ai-log-1", ...data, createdAt: new Date() })
    },
    orderFulfillmentAlert: {
      findMany: async ({ where }: any) => alerts.filter((row) => matches(row, where)),
      findFirst: async ({ where }: any) => {
        const alert = alerts.find((row) => matches(row, where));
        return alert ? { ...alert, order: hydrate(orders.find((order) => order.id === alert.orderId) || {}) } : null;
      },
      create: async ({ data }: any) => {
        const alert = { id: `alert-${nextAlertId++}`, ...data, createdAt: new Date(), updatedAt: new Date() };
        alerts.push(alert);
        return alert;
      },
      update: async ({ where, data }: any) => {
        const index = alerts.findIndex((row) => row.id === where.id);
        alerts[index] = { ...alerts[index], ...data, updatedAt: new Date() };
        return alerts[index];
      }
    },
    order: {
      count: async ({ where }: any) => orders.filter((row) => matches(row, where)).length,
      findMany: async ({ where }: any) => orders.filter((row) => matches(row, where)).map(hydrate),
      findFirst: async ({ where }: any) => {
        const order = orders.find((row) => matches(row, where));
        return order ? hydrate(order) : null;
      },
      create: async ({ data }: any) => {
        const order = { id: `order-${nextOrderId++}`, ...data, createdAt: new Date(), updatedAt: new Date() };
        orders.push(order);
        return hydrate(order);
      },
      update: async ({ where, data }: any) => {
        const index = orders.findIndex((row) => row.id === where.id);
        orders[index] = { ...orders[index], ...data, updatedAt: new Date() };
        return hydrate(orders[index]);
      },
      delete: async ({ where }: any) => {
        const index = orders.findIndex((row) => row.id === where.id);
        const [deleted] = orders.splice(index, 1);
        return deleted;
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
  app.use("/api/orders", createOrdersRouter(db as any));
  app.use("/api/order-fulfillment-alerts", createOrderFulfillmentAlertsRouter(db as any));
  app.use("/api/ai", createOrderAiRouter(db as any));
  app.use((error: any, _req: any, res: any, _next: any) => res.status(error.status || 500).json({ message: error.message }));
  return { app, orders, followUps, alerts };
}

describe("Order Center API", () => {
  it("creates, lists, updates statuses, and creates follow-up tasks for owned orders", async () => {
    const { app, followUps } = createTestApp();
    const create = await request(app).post("/api/orders").set("x-user-id", "sales-1").send({ customerId: "customer-1", productId: "product-1", orderType: "normal", amount: 820, currency: "USD", quantity: 100 }).expect(201);

    expect(create.body.orderNo).toMatch(/^ORD-\d{8}-0001$/);
    expect(create.body.riskWarnings.join(" ")).toMatch(/draft|confirm/i);

    const list = await request(app).get("/api/orders").set("x-user-id", "sales-1").expect(200);
    expect(list.body.map((order: Row) => order.id)).toEqual([create.body.id]);

    const paid = await request(app).patch(`/api/orders/${create.body.id}/payment-status`).set("x-user-id", "sales-1").send({ paymentStatus: "paid" }).expect(200);
    expect(paid.body.riskWarnings.join(" ")).toContain("actual payment");

    const shipped = await request(app).patch(`/api/orders/${create.body.id}/shipping-status`).set("x-user-id", "sales-1").send({ shippingStatus: "shipped" }).expect(200);
    expect(shipped.body.riskWarnings.join(" ").toLowerCase()).toContain("tracking number");

    await request(app).post(`/api/orders/${create.body.id}/create-follow-up-task`).set("x-user-id", "sales-1").send({}).expect(201);
    expect(followUps).toHaveLength(1);
  });

  it("rejects cross-user customer/product/order access and requires delete confirmation", async () => {
    const { app } = createTestApp({ orders: [makeOrder({ id: "order-1", ownerId: "sales-1", customerId: "customer-1" })] });

    await request(app).post("/api/orders").set("x-user-id", "sales-1").send({ customerId: "customer-2", orderType: "normal" }).expect(403);
    await request(app).post("/api/orders").set("x-user-id", "sales-1").send({ customerId: "customer-1", productId: "product-2", orderType: "normal" }).expect(403);
    await request(app).get("/api/orders/order-1").set("x-user-id", "sales-2").expect(403);
    await request(app).delete("/api/orders/order-1").set("x-user-id", "sales-1").expect(409);
    await request(app).delete("/api/orders/order-1?confirm=true").set("x-user-id", "sales-1").expect(204);
  });

  it("converts quote, sample order, and custom request without inventing missing order data", async () => {
    const { app } = createTestApp();

    const quoteOrder = await request(app).post("/api/orders/from-quote/quote-1").set("x-user-id", "sales-1").expect(201);
    expect(quoteOrder.body.amount).toBe("820");
    expect(quoteOrder.body.riskWarnings.join(" ").toLowerCase()).toContain("confirm price");

    const sampleOrder = await request(app).post("/api/orders/from-sample/sample-1").set("x-user-id", "sales-1").expect(201);
    expect(sampleOrder.body.orderType).toBe("sample_to_bulk");
    expect(sampleOrder.body.amount).toBeNull();
    expect(sampleOrder.body.riskWarnings.join(" ")).toContain("bulk quantity");

    const customOrder = await request(app).post("/api/orders/from-custom-request/custom-1").set("x-user-id", "sales-1").expect(201);
    expect(customOrder.body.orderType).toBe("custom");
    expect(customOrder.body.amount).toBeNull();
    expect(customOrder.body.riskWarnings.join(" ")).toContain("production capability");
  });

  it("generates order scripts as drafts without auto-send behavior", async () => {
    const { app } = createTestApp({ orders: [makeOrder({ id: "order-1", ownerId: "sales-1", customerId: "customer-1", shippingStatus: "shipped" })] });
    const response = await request(app).post("/api/ai/order-script").set("x-user-id", "sales-1").send({ orderId: "order-1", scenario: "shipping_notice", targetLanguage: "en" }).expect(200);

    const text = JSON.stringify(response.body).toLowerCase();
    expect(text).toContain("draft");
    expect(response.body.riskWarnings.join(" ").toLowerCase()).toContain("tracking");
    expect(text).not.toMatch(/auto-send|bulk send|click.*send|send button/);
  });

  it("returns fulfillment board, recalculates alerts, updates alert status, and creates manual fulfillment follow-up", async () => {
    const overdue = makeOrder({
      id: "order-overdue",
      orderStatus: "pending_payment",
      paymentStatus: "unpaid",
      createdAt: new Date("2026-05-01T00:00:00.000Z")
    });
    const { app, alerts, followUps } = createTestApp({ orders: [overdue] });

    const board = await request(app).get("/api/orders/fulfillment-board").set("x-user-id", "sales-1").expect(200);
    expect(board.body.groups.pending_payment[0].alerts.some((alert: Row) => alert.alertType === "payment_overdue")).toBe(true);

    const recalc = await request(app).post("/api/orders/order-overdue/recalculate-fulfillment-alerts").set("x-user-id", "sales-1").expect(200);
    expect(recalc.body.alerts.some((alert: Row) => alert.alertType === "payment_overdue")).toBe(true);
    expect(alerts.length).toBeGreaterThan(0);

    await request(app).patch(`/api/order-fulfillment-alerts/${alerts[0].id}`).set("x-user-id", "sales-1").send({ status: "resolved" }).expect(200);
    expect(alerts[0].status).toBe("resolved");

    await request(app).post("/api/orders/order-overdue/create-fulfillment-follow-up").set("x-user-id", "sales-1").send({ taskType: "payment_follow_up" }).expect(201);
    expect(followUps[0].orderId).toBe("order-overdue");
  });

  it("generates fulfillment scripts as drafts without auto-send behavior", async () => {
    const { app } = createTestApp({ orders: [makeOrder({ id: "order-1", ownerId: "sales-1", customerId: "customer-1", shippingStatus: "shipped" })] });
    const response = await request(app).post("/api/ai/order-fulfillment-script").set("x-user-id", "sales-1").send({ orderId: "order-1", scenario: "shipping_notice", targetLanguage: "en" }).expect(200);
    const text = JSON.stringify(response.body).toLowerCase();
    expect(response.body.scriptText).toContain("[please confirm tracking number]");
    expect(response.body.riskWarnings.join(" ").toLowerCase()).toContain("drafts only");
    expect(text).not.toMatch(/auto-send|bulk send|click.*send|send button/);
  });
});

function makeOrder(overrides: Row = {}) {
  return {
    id: "order-1",
    organizationId: null,
    customerId: "customer-1",
    quoteId: null,
    sampleOrderId: null,
    customRequestId: null,
    orderNo: "ORD-20260521-0001",
    orderType: "normal",
    title: "Order",
    amount: 100,
    currency: "USD",
    quantity: 10,
    productId: "product-1",
    paymentStatus: "unpaid",
    productionStatus: "not_started",
    shippingStatus: "pending",
    afterSalesStatus: "none",
    orderStatus: "draft",
    expectedShipDate: null,
    expectedDeliveryDate: null,
    trackingNumber: null,
    notes: null,
    files: [],
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

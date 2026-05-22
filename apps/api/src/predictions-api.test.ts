import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createPredictionsRouter, createReorderAiRouter, createReorderRemindersRouter } from "./predictions-api.js";

type Row = Record<string, any>;

function createTestApp(seed: Partial<Store> = {}, auth = true) {
  const db = createMemoryDb(seed);
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    if (!auth) return res.status(401).json({ message: "unauthorized" });
    const userId = req.header("x-user-id") || "sales-1";
    req.user = { id: userId, email: `${userId}@example.com`, name: userId };
    next();
  });
  app.use("/api/predictions", createPredictionsRouter(db as any));
  app.use("/api/reorder-reminders", createReorderRemindersRouter(db as any));
  app.use("/api/ai", createReorderAiRouter(db as any));
  app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(error.status || 500).json({ message: error.message });
  });
  return { app, db };
}

describe("V4-E prediction API", () => {
  it("rejects unauthenticated access and cross-organization customer access", async () => {
    await request(createTestApp({}, false).app).get("/api/predictions/customers").expect(401);

    const { app } = createTestApp(seed());
    await request(app)
      .post("/api/predictions/customers/recalculate")
      .set("x-user-id", "sales-1")
      .send({ customerId: "other-org" })
      .expect(403);
  });

  it("recalculates predictions, lists current scope, and lets sales avoid org bulk calculation", async () => {
    const { app, db } = createTestApp(seed());

    const result = await request(app)
      .post("/api/predictions/customers/recalculate")
      .set("x-user-id", "sales-1")
      .send({ customerId: "maria" })
      .expect(200);

    expect(result.body.createdCount).toBeGreaterThan(0);
    expect(db._store.predictions.every((item) => item.userId === "sales-1")).toBe(true);

    const list = await request(app).get("/api/predictions/customers").set("x-user-id", "sales-1").expect(200);
    expect(list.body.map((item: any) => item.customerId)).toContain("maria");

    await request(app)
      .post("/api/predictions/customers/recalculate")
      .set("x-user-id", "sales-1")
      .send({ organizationId: "org-1" })
      .expect(403);
  });

  it("allows managers to recalculate organization predictions and update prediction status", async () => {
    const { app, db } = createTestApp(seed({ members: [member({ userId: "manager-1", role: "manager" })] }));

    await request(app)
      .post("/api/predictions/customers/recalculate")
      .set("x-user-id", "manager-1")
      .send({ organizationId: "org-1" })
      .expect(200);

    const predictionId = db._store.predictions[0].id;
    const updated = await request(app).patch(`/api/predictions/customers/${predictionId}`).set("x-user-id", "manager-1").send({ status: "dismissed" }).expect(200);
    expect(updated.body.status).toBe("dismissed");
  });

  it("creates reorder reminders manually and only creates FollowUpTask after explicit endpoint call", async () => {
    const { app, db } = createTestApp(seed());

    const reminder = await request(app)
      .post("/api/reorder-reminders")
      .set("x-user-id", "sales-1")
      .send({ customerId: "maria", reminderType: "reorder", remindAt: "2026-05-22T10:00:00.000Z", reason: "old customer" })
      .expect(201);

    expect(db._store.followUps).toHaveLength(0);

    await request(app).post(`/api/reorder-reminders/${reminder.body.id}/create-follow-up-task`).set("x-user-id", "sales-1").expect(201);
    expect(db._store.followUps).toHaveLength(1);
    expect(db._store.followUps[0].recommendedScript).not.toMatch(/auto.?send|bulk.?send|click send/i);
  });

  it("generates reorder scripts with risk warnings and without fake purchase history", async () => {
    const { app } = createTestApp(seed());

    const response = await request(app)
      .post("/api/ai/reorder-script")
      .set("x-user-id", "sales-1")
      .send({ customerId: "maria", reminderType: "reorder", targetLanguage: "English" })
      .expect(200);

    expect(response.body.scriptText).toContain("previously discussed");
    expect(response.body.scriptText).not.toMatch(/previously purchased|limited stock|lowest price|only today/i);
    expect(response.body.riskWarnings.join(" ")).toContain("Confirm price");
  });

  it("returns product opportunities from accessible products only", async () => {
    const { app } = createTestApp(seed());

    const response = await request(app).get("/api/predictions/product-opportunities").set("x-user-id", "sales-1").expect(200);

    expect(response.body.map((item: any) => item.productId)).toContain("p1");
    expect(response.body.map((item: any) => item.productId)).not.toContain("other-product");
  });
});

type Store = {
  customers: Row[];
  products: Row[];
  quotes: Row[];
  followUps: Row[];
  samples: Row[];
  customRequests: Row[];
  predictions: Row[];
  reminders: Row[];
  orgProducts: Row[];
  orgMaterials: Row[];
  materials: Row[];
  members: Row[];
  knowledge: Row[];
  orgKnowledge: Row[];
  scripts: Row[];
  aiLogs: Row[];
  auditLogs: Row[];
};

function createMemoryDb(seedData: Partial<Store>) {
  const store: Store = {
    customers: seedData.customers || [customer(), customer({ id: "other-org", ownerId: "other", organizationId: "org-2", assignedTo: "other" })],
    products: seedData.products || [product(), product({ id: "other-product", ownerId: "other" })],
    quotes: seedData.quotes || [quote({ createdAt: new Date("2026-04-20T10:00:00.000Z") })],
    followUps: seedData.followUps || [],
    samples: seedData.samples || [{ id: "sample-1", customerId: "maria", productId: "p1", paymentStatus: "paid", shippingStatus: "delivered", feedbackStatus: "no_response" }],
    customRequests: seedData.customRequests || [{ id: "custom-1", customerId: "maria", productId: "p1", requestType: "logo", quantity: 500, status: "waiting_customer_confirm" }],
    predictions: seedData.predictions || [],
    reminders: seedData.reminders || [],
    orgProducts: seedData.orgProducts || [{ organizationId: "org-1", productId: "p1" }],
    orgMaterials: seedData.orgMaterials || [],
    materials: seedData.materials || [{ id: "mat-1", ownerId: "sales-1", productId: "p1" }],
    members: seedData.members || [member()],
    knowledge: seedData.knowledge || [],
    orgKnowledge: seedData.orgKnowledge || [],
    scripts: seedData.scripts || [],
    aiLogs: seedData.aiLogs || [],
    auditLogs: seedData.auditLogs || []
  };
  let nextId = 1;
  const createRow = (rows: Row[], prefix: string, data: Row) => {
    const row = { id: data.id || `${prefix}-${nextId++}`, createdAt: new Date(), updatedAt: new Date(), ...data };
    rows.push(row);
    return row;
  };
  return {
    _store: store,
    organizationMember: { async findFirst(args: any) { return store.members.find((row) => matches(row, args.where)) || null; } },
    customer: {
      async findFirst(args: any) { return store.customers.find((row) => matches(row, args.where)) || null; },
      async findMany(args: any) { return store.customers.filter((row) => matches(row, args.where)).slice(0, args.take || 100); }
    },
    product: {
      async findFirst(args: any) { return store.products.find((row) => matches(row, args.where)) || null; },
      async findMany(args: any) { return store.products.filter((row) => matchesProduct(row, args.where, store)).slice(0, args.take || 100); }
    },
    material: { async findMany(args: any) { return store.materials.filter((row) => matches(row, args.where)).slice(0, args.take || 100); } },
    quote: { async findMany(args: any) { return store.quotes.filter((row) => matches(row, args.where)); } },
    followUpTask: {
      async findMany(args: any) { return store.followUps.filter((row) => matches(row, args.where)); },
      async create(args: any) { return createRow(store.followUps, "follow", args.data); }
    },
    sampleOrder: { async findMany(args: any) { return store.samples.filter((row) => matches(row, args.where)); } },
    customRequest: { async findMany(args: any) { return store.customRequests.filter((row) => matches(row, args.where)); } },
    customerPrediction: {
      async findMany(args: any) { return store.predictions.filter((row) => matchesPrediction(row, args.where, store)).map((row) => includeCustomer(row, store)); },
      async findFirst(args: any) { const row = store.predictions.find((item) => matchesPrediction(item, args.where, store)); return row ? includeCustomer(row, store) : null; },
      async create(args: any) { return createRow(store.predictions, "prediction", args.data); },
      async update(args: any) { const row = store.predictions.find((item) => item.id === args.where.id)!; Object.assign(row, args.data, { updatedAt: new Date() }); return includeCustomer(row, store); }
    },
    reorderReminder: {
      async findMany(args: any) { return store.reminders.filter((row) => matchesReminder(row, args.where, store)).map((row) => includeCustomerProduct(row, store)); },
      async findFirst(args: any) { const row = store.reminders.find((item) => matchesReminder(item, args.where, store)); return row ? includeCustomerProduct(row, store) : null; },
      async create(args: any) { return includeCustomerProduct(createRow(store.reminders, "reminder", args.data), store); },
      async update(args: any) { const row = store.reminders.find((item) => item.id === args.where.id)!; Object.assign(row, args.data, { updatedAt: new Date() }); return includeCustomerProduct(row, store); }
    },
    organizationProduct: { async findFirst(args: any) { return store.orgProducts.find((row) => matches(row, args.where)) || null; } },
    knowledgeBase: { async findMany() { return store.knowledge; } },
    knowledgeBaseOrg: { async findMany() { return store.orgKnowledge; } },
    scriptOrg: { async findMany() { return store.scripts; } },
    aiActionSuggestionLog: { async create(args: any) { return createRow(store.aiLogs, "ai", args.data); } },
    auditLog: { async create(args: any) { return createRow(store.auditLogs, "audit", args.data); } }
  };
}

function matches(row: Row, where: any = {}): boolean {
  if (!where) return true;
  if (where.OR && !where.OR.some((item: any) => matches(row, item))) return false;
  return Object.entries(where).every(([key, value]) => {
    if (key === "OR") return true;
    if (value && typeof value === "object" && "in" in value) return (value.in as unknown[]).includes(row[key]);
    if (value && typeof value === "object" && "has" in value) return Array.isArray(row[key]) && row[key].includes(value.has);
    if (value && typeof value === "object" && "gte" in value) return new Date(row[key]).getTime() >= new Date(value.gte).getTime();
    if (value && typeof value === "object" && "lte" in value) return new Date(row[key]).getTime() <= new Date(value.lte).getTime();
    if (value && typeof value === "object") return true;
    return row[key] === value;
  });
}

function matchesProduct(row: Row, where: any, store: Store) {
  if (where?.OR) {
    return where.OR.some((item: any) => item.organizationProducts ? store.orgProducts.some((shared) => shared.productId === row.id && matches(shared, item.organizationProducts.some)) : matches(row, item));
  }
  return matches(row, where);
}

function matchesPrediction(row: Row, where: any, store: Store) {
  if (where?.customer) {
    const customerRow = store.customers.find((item) => item.id === row.customerId);
    return Boolean(customerRow && matches(customerRow, where.customer) && matches(row, { ...where, customer: undefined }));
  }
  return matches(row, where);
}

function matchesReminder(row: Row, where: any, store: Store) {
  if (where?.customer) {
    const customerRow = store.customers.find((item) => item.id === row.customerId);
    return Boolean(customerRow && matches(customerRow, where.customer) && matches(row, { ...where, customer: undefined }));
  }
  return matches(row, where);
}

function includeCustomer(row: Row, store: Store) {
  return { ...row, customer: store.customers.find((item) => item.id === row.customerId) };
}

function includeCustomerProduct(row: Row, store: Store) {
  return { ...row, customer: store.customers.find((item) => item.id === row.customerId), product: store.products.find((item) => item.id === row.productId) };
}

function seed(overrides: Partial<Store> = {}) {
  return overrides;
}

function customer(overrides: Row = {}) {
  return { id: "maria", name: "Maria", ownerId: "sales-1", organizationId: "org-1", assignedTo: "sales-1", collaborators: [], tags: ["old customer"], stage: "reorder", latestSummary: "reorder restock", notes: "", interestedProduct: "Blue Dress", language: "English", intentScore: 80, intentLevel: "high", createdAt: new Date("2026-04-01T10:00:00.000Z"), updatedAt: new Date("2026-05-20T10:00:00.000Z"), ...overrides };
}

function product(overrides: Row = {}) {
  return { id: "p1", name: "Blue Dress", sku: "BD-1", category: "dress", ownerId: "sales-1", ...overrides };
}

function quote(overrides: Row = {}) {
  return { id: "q1", customerId: "maria", productId: "p1", quantity: 200, unitPrice: 8, createdAt: new Date("2026-05-10T10:00:00.000Z"), ...overrides };
}

function member(overrides: Row = {}) {
  return { id: `member-${overrides.userId || "sales-1"}`, organizationId: "org-1", userId: "sales-1", role: "sales", status: "active", ...overrides };
}

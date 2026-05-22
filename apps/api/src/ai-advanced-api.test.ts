import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createAiAdvancedRouter } from "./ai-advanced-api.js";

type Row = Record<string, any>;

function createTestApp(seed: Partial<MemoryStore> = {}, auth = true) {
  const db = createMemoryDb(seed);
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    if (!auth) {
      res.status(401).json({ message: "unauthorized" });
      return;
    }
    const userId = req.header("x-user-id") || "sales-1";
    req.user = { id: userId, email: `${userId}@example.com`, name: userId };
    next();
  });
  app.use("/api/ai", createAiAdvancedRouter(db as any));
  app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(error.status || 500).json({ message: error.message, stack: error.stack });
  });
  return { app, db };
}

describe("V4-C AI advanced API", () => {
  it("rejects unauthenticated and cross-organization customer access", async () => {
    await request(createTestApp({}, false).app).post("/api/ai/next-action").send({ customerId: "maria" }).expect(401);

    const { app } = createTestApp(aiSeed());
    await request(app).post("/api/ai/next-action").set("x-user-id", "other").send({ customerId: "maria" }).expect(403);
  });

  it("returns quote follow-up next action and logs the current user", async () => {
    const { app, db } = createTestApp(aiSeed({ quotes: [makeQuote({ id: "quote-old", customerId: "maria", createdAt: hoursAgo(48) })] }));

    const response = await request(app).post("/api/ai/next-action").send({ customerId: "maria" }).expect(200);

    expect(response.body.recommendedAction).toContain("Quote follow-up");
    expect(response.body.suggestedScript).toContain("quotation");
    expect(response.body.riskWarnings.join(" ")).toContain("AI only generates");
    expect(db._store.aiLogs[0]).toMatchObject({ userId: "sales-1", customerId: "maria", actionType: "next_action" });
  });

  it("detects payment, sample feedback, custom logo, and high-intent next actions", async () => {
    const payment = await request(createTestApp(aiSeed({ customers: [makeCustomer({ id: "pay", stage: "pending payment" })] })).app)
      .post("/api/ai/next-action")
      .send({ customerId: "pay" })
      .expect(200);
    expect(payment.body.recommendedAction).toContain("Payment reminder");

    const sample = await request(createTestApp(aiSeed({ samples: [makeSample({ id: "sample", shippingStatus: "delivered", feedbackStatus: "pending" })] })).app)
      .post("/api/ai/next-action")
      .send({ customerId: "maria" })
      .expect(200);
    expect(sample.body.recommendedAction).toContain("Sample feedback");

    const custom = await request(createTestApp(aiSeed({ customRequests: [makeCustom({ id: "custom", logoRequired: true, files: [] })] })).app)
      .post("/api/ai/next-action")
      .send({ customerId: "maria" })
      .expect(200);
    expect(custom.body.recommendedAction).toContain("Request logo");

    const high = await request(createTestApp(aiSeed({ customers: [makeCustomer({ id: "hot", latestSummary: "payment address order" })] })).app)
      .post("/api/ai/next-action")
      .send({ customerId: "hot" })
      .expect(200);
    expect(high.body.recommendedAction).toContain("priority");
  });

  it("builds customer sales summary with missing data marked as unconfirmed", async () => {
    const response = await request(createTestApp(aiSeed({ customers: [makeCustomer({ latestSummary: "", interestedProduct: null, country: null })] })).app)
      .post("/api/ai/customer-sales-summary")
      .send({ customerId: "maria" })
      .expect(200);

    expect(response.body.customerNeed).toBe("\u672a\u786e\u8ba4");
    expect(response.body.quantity).toBe("\u672a\u786e\u8ba4");
    expect(response.body.sampleStatus).toBe("\u672a\u786e\u8ba4");
    expect(response.body.summaryText).toContain("Next:");
  });

  it("generates requested sales script scenarios as drafts with missing info and warnings", async () => {
    for (const scenario of ["quote_follow_up", "payment_reminder", "sample_feedback_follow_up", "custom_request_files", "too_expensive", "old_customer_reorder"]) {
      const response = await request(createTestApp(aiSeed()).app)
        .post("/api/ai/sales-script")
        .send({ customerId: "maria", scenario, targetLanguage: "English" })
        .expect(200);
      expect(response.body.scriptText.length).toBeGreaterThan(20);
      expect(response.body.riskWarnings.join(" ")).toContain("AI only generates");
      expect(response.body.createdLogId).toBeTruthy();
    }
  });

  it("checks high and medium risk phrases and returns a safe version", async () => {
    const high = await request(createTestApp(aiSeed()).app)
      .post("/api/ai/risk-check")
      .send({ customerId: "maria", text: "This is the lowest price and always in stock with 100% guaranteed delivery and today shipping." })
      .expect(200);

    expect(high.body.riskLevel).toBe("high");
    expect(high.body.riskyPhrases).toEqual(expect.arrayContaining(["lowest price", "always in stock", "100% guaranteed delivery", "today shipping"]));
    expect(high.body.safeVersion).toContain("[please confirm]");

    const medium = await request(createTestApp(aiSeed()).app)
      .post("/api/ai/risk-check")
      .send({ customerId: "maria", text: "Shipping cost is 20 USD and delivery in 5 days." })
      .expect(200);
    expect(medium.body.riskLevel).toBe("medium");
  });

  it("uses forbidden expressions from knowledge base in risk check", async () => {
    const response = await request(createTestApp(aiSeed({ knowledge: [makeKnowledge({ category: "forbidden_expressions", content: "free return for all wholesale orders" })] })).app)
      .post("/api/ai/risk-check")
      .send({ customerId: "maria", text: "We offer free return for all wholesale orders." })
      .expect(200);

    expect(response.body.riskLevel).toBe("high");
    expect(response.body.riskWarnings.join(" ")).toContain("Forbidden expression");
  });

  it("generates follow-up plan without creating tasks unless createTasks=true", async () => {
    const dry = createTestApp(aiSeed());
    const dryResponse = await request(dry.app).post("/api/ai/follow-up-plan").send({ customerId: "maria", createTasks: false }).expect(200);
    expect(dryResponse.body.plan.length).toBeGreaterThanOrEqual(3);
    expect(dry.db._store.followUps).toHaveLength(0);

    const create = createTestApp(aiSeed());
    const response = await request(create.app).post("/api/ai/follow-up-plan").send({ customerId: "maria", createTasks: true, days: 14 }).expect(200);
    expect(response.body.createdTasks.length).toBeGreaterThan(0);
    expect(create.db._store.followUps.length).toBe(response.body.createdTasks.length);
    expect(response.body.plan.map((item: any) => item.suggestedMessage).join(" ")).not.toMatch(/auto.?send|bulk.?send|click send/i);
  });
});

type MemoryStore = {
  customers: Row[];
  quotes: Row[];
  followUps: Row[];
  samples: Row[];
  customRequests: Row[];
  products: Row[];
  materials: Row[];
  knowledge: Row[];
  orgKnowledge: Row[];
  orgProducts: Row[];
  orgMaterials: Row[];
  aiLogs: Row[];
  auditLogs: Row[];
};

function createMemoryDb(seed: Partial<MemoryStore>) {
  const store: MemoryStore = {
    customers: seed.customers || [makeCustomer()],
    quotes: seed.quotes || [],
    followUps: seed.followUps || [],
    samples: seed.samples || [],
    customRequests: seed.customRequests || [],
    products: seed.products || [makeProduct()],
    materials: seed.materials || [makeMaterial()],
    knowledge: seed.knowledge || [],
    orgKnowledge: seed.orgKnowledge || [],
    orgProducts: seed.orgProducts || [],
    orgMaterials: seed.orgMaterials || [],
    aiLogs: seed.aiLogs || [],
    auditLogs: seed.auditLogs || []
  };
  let nextId = 1;
  const createRow = (items: Row[], prefix: string, data: Row) => {
    const row = { id: data.id || `${prefix}-${nextId++}`, createdAt: new Date(), updatedAt: new Date(), ...data };
    items.push(row);
    return row;
  };
  return {
    _store: store,
    customer: { async findFirst(args: any) { return store.customers.find((row) => matchesWhere(row, args.where)) || null; } },
    product: { async findFirst(args: any) { return store.products.find((row) => matchesWhere(row, args.where)) || null; } },
    material: { async findFirst(args: any) { return store.materials.find((row) => matchesWhere(row, args.where)) || null; } },
    quote: { async findMany(args: any) { return store.quotes.filter((row) => matchesWhere(row, args.where)); } },
    followUpTask: {
      async findMany(args: any) { return store.followUps.filter((row) => matchesWhere(row, args.where)); },
      async create(args: any) { return createRow(store.followUps, "follow", args.data); }
    },
    sampleOrder: { async findMany(args: any) { return store.samples.filter((row) => matchesWhere(row, args.where)); } },
    customRequest: { async findMany(args: any) { return store.customRequests.filter((row) => matchesWhere(row, args.where)); } },
    knowledgeBase: { async findMany(args: any) { return store.knowledge.filter((row) => matchesWhere(row, args.where)); } },
    knowledgeBaseOrg: { async findMany(args: any) { return store.orgKnowledge.filter((row) => matchesWhere(row, args.where)); } },
    scriptOrg: { async findMany() { return []; } },
    organizationProduct: { async findFirst(args: any) { return store.orgProducts.find((row) => matchesWhere(row, args.where)) || null; } },
    organizationMaterial: { async findFirst(args: any) { return store.orgMaterials.find((row) => matchesWhere(row, args.where)) || null; } },
    organizationMember: { async findFirst(args: any) { return members().find((row) => matchesWhere(row, args.where)) || null; } },
    aiActionSuggestionLog: { async create(args: any) { return createRow(store.aiLogs, "ai-log", args.data); } },
    auditLog: { async create(args: any) { return createRow(store.auditLogs, "audit", args.data); } }
  };
}

function aiSeed(overrides: Partial<MemoryStore> = {}): Partial<MemoryStore> {
  return {
    customers: [makeCustomer()],
    products: [makeProduct()],
    knowledge: [makeKnowledge()],
    ...overrides
  };
}

function makeCustomer(overrides: Row = {}) {
  return {
    id: "maria",
    name: "Maria",
    whatsappNumber: "+52155",
    country: "Mexico",
    language: "English",
    tags: [],
    stage: "new lead",
    interestedProduct: null,
    latestSummary: "Customer asked about price and shipping",
    notes: "",
    nextFollowUpAt: null,
    ownerId: "sales-1",
    organizationId: "org-a",
    assignedTo: "sales-1",
    collaborators: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
}

function makeProduct(overrides: Row = {}) {
  return { id: "product-1", name: "Blue Dress", sku: "BD-001", ownerId: "sales-1", sellingPoints: ["soft fabric"], createdAt: new Date(), updatedAt: new Date(), ...overrides };
}

function makeMaterial(overrides: Row = {}) {
  return { id: "material-1", title: "Real picture", type: "image", url: "https://example.com/a.jpg", ownerId: "sales-1", createdAt: new Date(), updatedAt: new Date(), ...overrides };
}

function makeQuote(overrides: Row = {}) {
  return { id: "quote-1", customerId: "maria", productId: "product-1", ownerId: "sales-1", quantity: 100, createdAt: new Date(), ...overrides };
}

function makeSample(overrides: Row = {}) {
  return { id: "sample-1", customerId: "maria", productId: "product-1", sampleName: "Blue Dress Sample", paymentStatus: "paid", shippingStatus: "pending", feedbackStatus: "pending", ownerId: "sales-1", createdAt: new Date(), updatedAt: new Date(), ...overrides };
}

function makeCustom(overrides: Row = {}) {
  return { id: "custom-1", customerId: "maria", productId: "product-1", requestType: "logo", logoRequired: false, files: [], status: "draft", ownerId: "sales-1", createdAt: new Date(), updatedAt: new Date(), ...overrides };
}

function makeKnowledge(overrides: Row = {}) {
  return { id: "kb-1", title: "Policy", category: "faq", content: "Confirm all details before sending.", language: "en", productId: null, enabled: true, ownerId: "sales-1", createdAt: new Date(), updatedAt: new Date(), ...overrides };
}

function members() {
  return [
    { organizationId: "org-a", userId: "owner", role: "owner", status: "active" },
    { organizationId: "org-a", userId: "manager", role: "manager", status: "active" },
    { organizationId: "org-a", userId: "sales-1", role: "sales", status: "active" },
    { organizationId: "org-a", userId: "support", role: "support", status: "active" },
    { organizationId: "org-b", userId: "other", role: "owner", status: "active" }
  ];
}

function matchesWhere(row: Row, where: Row = {}): boolean {
  return Object.entries(where || {}).every(([key, value]) => {
    if (value === undefined) return true;
    if (value && typeof value === "object" && "in" in value) return value.in.includes(row[key]);
    if (value && typeof value === "object" && "has" in value) return (row[key] || []).includes(value.has);
    if (value && typeof value === "object" && "hasSome" in value) return value.hasSome.some((item: string) => (row[key] || []).includes(item));
    if (key === "OR" && Array.isArray(value)) return value.some((item) => matchesWhere(row, item));
    return row[key] === value;
  });
}

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 3_600_000);
}

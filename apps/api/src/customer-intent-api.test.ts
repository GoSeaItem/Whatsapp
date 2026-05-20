import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createCustomersRouter } from "./customers-api.js";
import { createDashboardRouter } from "./dashboard-api.js";

type CustomerRow = {
  id: string;
  name: string;
  whatsappNumber: string | null;
  country: string | null;
  language: string | null;
  tags: string[];
  stage: string;
  interestedProduct: string | null;
  latestSummary: string | null;
  nextFollowUpAt: Date | null;
  ownerId: string;
  organizationId?: string | null;
  assignedTo?: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type QuoteRow = {
  id: string;
  customerId: string;
  ownerId: string;
  createdBy?: string;
  createdAt: Date;
};

type FollowUpRow = {
  id: string;
  customerId: string;
  ownerId: string;
  remindAt: Date;
  status: string;
  completedAt: Date | null;
};

function createTestApp(seed: { customers?: CustomerRow[]; quotes?: QuoteRow[]; followUps?: FollowUpRow[] } = {}) {
  const customers = [...(seed.customers || [])];
  const quotes = [...(seed.quotes || [])];
  const followUps = [...(seed.followUps || [])];

  const db = {
    customer: {
      async findMany(args: { where: Record<string, any>; take?: number }) {
        return customers.filter((customer) => matchesWhere(customer, args.where)).slice(0, args.take || 200);
      },
      async findFirst(args: { where: Record<string, any> }) {
        return customers.find((customer) => matchesWhere(customer, args.where)) || null;
      },
      async create() {
        throw new Error("not needed");
      },
      async update() {
        throw new Error("not needed");
      },
      async deleteMany() {
        throw new Error("not needed");
      }
    },
    quote: {
      async findMany(args: { where: Record<string, any> }) {
        return quotes.filter((quote) => matchesWhere(quote, args.where));
      }
    },
    followUpTask: {
      async findMany(args: { where: Record<string, any> }) {
        return followUps.filter((task) => matchesWhere(task, args.where));
      }
    },
    organizationMember: {
      async findFirst(args: { where: Record<string, any> }) {
        return organizationMembers().find((member) => matchesWhere(member, args.where)) || null;
      },
      async findMany(args: { where: Record<string, any> }) {
        return organizationMembers().filter((member) => matchesWhere(member, args.where));
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
  app.use("/api/customers", createCustomersRouter(db as any));
  app.use("/api/dashboard", createDashboardRouter(db as any));
  return { app };
}

describe("customer intent API", () => {
  it("returns customer intent for the current user's customer", async () => {
    const { app } = createTestApp({
      customers: [makeCustomer({ id: "maria", tags: ["高意向"], stage: "已报价", latestSummary: "Asked payment by PayPal and shipping to Mexico city." })],
      quotes: [makeQuote({ id: "q1", customerId: "maria", createdAt: new Date() })],
      followUps: [makeFollowUp({ id: "f1", customerId: "maria", status: "pending", remindAt: new Date() })]
    });

    const response = await request(app).get("/api/customers/maria/intent").set("x-user-id", "sales-1").expect(200);

    expect(response.body.customerId).toBe("maria");
    expect(response.body.intentScore).toBeGreaterThanOrEqual(70);
    expect(response.body.intentLevel).toBe("high");
    expect(response.body.intentReasons.join(" ")).toContain("高意向");
    expect(response.body.riskWarnings).toContain("意向评分仅作辅助，不代表客户一定成交。");
  });

  it("rejects cross-user customer intent access", async () => {
    const { app } = createTestApp({ customers: [makeCustomer({ id: "other", ownerId: "sales-2" })] });

    await request(app).get("/api/customers/other/intent").set("x-user-id", "sales-1").expect(404);
    await request(app).post("/api/customers/other/recalculate-intent").set("x-user-id", "sales-1").expect(404);
  });

  it("sorts customer list by intent score and filters high-intent customers", async () => {
    const { app } = createTestApp({
      customers: [
        makeCustomer({ id: "low", name: "Low", ownerId: "sales-1", tags: [], stage: "新线索" }),
        makeCustomer({ id: "high", name: "High", ownerId: "sales-1", tags: ["高意向", "待付款"], stage: "待付款", latestSummary: "payment order invoice" }),
        makeCustomer({ id: "other-user", name: "Other", ownerId: "sales-2", tags: ["高意向"], stage: "待付款" })
      ]
    });

    const sorted = await request(app).get("/api/customers?sort=intentScore").set("x-user-id", "sales-1").expect(200);
    expect(sorted.body.map((customer: any) => customer.id)).toEqual(["high", "low"]);
    expect(sorted.body[0]).toMatchObject({ intentLevel: "high" });

    const highOnly = await request(app).get("/api/customers?intentLevel=high&sort=intentScore").set("x-user-id", "sales-1").expect(200);
    expect(highOnly.body.map((customer: any) => customer.id)).toEqual(["high"]);
  });

  it("returns only current user's high-intent dashboard customers", async () => {
    const { app } = createTestApp({
      customers: [
        makeCustomer({ id: "maria", ownerId: "sales-1", tags: ["高意向", "待付款"], stage: "待付款", latestSummary: "payment address order" }),
        makeCustomer({ id: "low", ownerId: "sales-1", stage: "新线索" }),
        makeCustomer({ id: "other", ownerId: "sales-2", tags: ["高意向", "待付款"], stage: "待付款" })
      ],
      quotes: [
        makeQuote({ id: "q1", ownerId: "sales-1", customerId: "maria" }),
        makeQuote({ id: "q-other", ownerId: "sales-2", customerId: "other" })
      ]
    });

    const response = await request(app).get("/api/dashboard/high-intent-customers").set("x-user-id", "sales-1").expect(200);

    expect(response.body.map((customer: any) => customer.id)).toEqual(["maria"]);
    expect(response.body[0].intentScore).toBeGreaterThanOrEqual(70);
    expect(response.body[0].recommendedAction).toContain("优先跟进");
  });

  it("returns team dashboard KPI for owner/manager and rejects sales/support", async () => {
    const { app } = createTestApp({
      customers: [
        makeCustomer({ id: "maria", ownerId: "sales-1", organizationId: "org-a", assignedTo: "sales-1", latestSummary: "payment address order", createdAt: new Date("2026-05-20T08:00:00.000Z") }),
        makeCustomer({ id: "luis", ownerId: "sales-2", organizationId: "org-a", assignedTo: "sales-2", createdAt: new Date("2026-05-19T08:00:00.000Z") }),
        makeCustomer({ id: "other-org", ownerId: "other", organizationId: "org-b", latestSummary: "payment address order" })
      ],
      quotes: [makeQuote({ id: "q1", ownerId: "sales-1", createdBy: "sales-1", customerId: "maria" })],
      followUps: [
        makeFollowUp({ id: "today", ownerId: "sales-1", customerId: "maria", status: "pending", remindAt: new Date("2026-05-20T12:00:00.000Z") }),
        makeFollowUp({ id: "overdue", ownerId: "sales-2", customerId: "luis", status: "pending", remindAt: new Date("2026-05-18T12:00:00.000Z") }),
        makeFollowUp({ id: "done", ownerId: "sales-1", customerId: "maria", status: "completed", remindAt: new Date("2026-05-19T12:00:00.000Z") })
      ]
    });

    const response = await request(app).get("/api/dashboard/team-summary?organizationId=org-a&now=2026-05-20T08:00:00.000Z").set("x-user-id", "manager").expect(200);
    expect(response.body.kpis).toMatchObject({
      todayNewCustomers: 1,
      todayFollowUpCustomers: 1,
      overdueFollowUpCustomers: 1,
      highIntentCustomers: 1,
      quotedNoFollowUpCustomers: 0
    });
    expect(response.body.memberStats.find((item: any) => item.userId === "sales-1")).toMatchObject({ customerCount: 1, completedFollowUps: 1, quoteCount: 1 });
    expect(response.body.highIntentCustomers[0]).toMatchObject({ id: "maria", intentLevel: "high" });
    expect(response.body.highIntentCustomers[0].whatsappNumber).toBeUndefined();

    await request(app).get("/api/dashboard/team-summary?organizationId=org-a").set("x-user-id", "sales-1").expect(403);
    await request(app).get("/api/dashboard/team-summary?organizationId=org-b").set("x-user-id", "manager").expect(403);
  });

  it("exports team dashboard CSV and protects organization high-intent list", async () => {
    const { app } = createTestApp({
      customers: [makeCustomer({ id: "maria", ownerId: "sales-1", organizationId: "org-a", assignedTo: "sales-1", name: "=Maria", latestSummary: "payment address order" })],
      quotes: [makeQuote({ id: "q1", ownerId: "sales-1", createdBy: "sales-1", customerId: "maria" })]
    });

    const highIntent = await request(app).get("/api/dashboard/high-intent-customers?organizationId=org-a").set("x-user-id", "owner").expect(200);
    expect(highIntent.body.map((item: any) => item.id)).toEqual(["maria"]);
    await request(app).get("/api/dashboard/high-intent-customers?organizationId=org-a").set("x-user-id", "support").expect(403);

    const csv = await request(app).get("/api/dashboard/team-summary?organizationId=org-a&format=csv").set("x-user-id", "owner").expect(200);
    expect(csv.text).toContain('"kpi","highIntentCustomers"');
    expect(csv.text).toContain("'=Maria");
    expect(csv.text).not.toContain("whatsappNumber");
  });
});

function makeCustomer(overrides: Partial<CustomerRow> = {}): CustomerRow {
  const now = new Date("2026-05-20T08:00:00.000Z");
  return {
    id: "customer-id",
    name: "Customer",
    whatsappNumber: null,
    country: null,
    language: "English",
    tags: [],
    stage: "新线索",
    interestedProduct: null,
    latestSummary: null,
    nextFollowUpAt: null,
    ownerId: "sales-1",
    organizationId: null,
    assignedTo: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function makeQuote(overrides: Partial<QuoteRow> = {}): QuoteRow {
  return {
    id: "quote-id",
    customerId: "customer-id",
    ownerId: "sales-1",
    createdBy: "sales-1",
    createdAt: new Date("2026-05-20T08:00:00.000Z"),
    ...overrides
  };
}

function makeFollowUp(overrides: Partial<FollowUpRow> = {}): FollowUpRow {
  return {
    id: "follow-up-id",
    customerId: "customer-id",
    ownerId: "sales-1",
    remindAt: new Date("2026-05-20T12:00:00.000Z"),
    status: "pending",
    completedAt: null,
    ...overrides
  };
}

function matchesWhere<T extends Record<string, any>>(item: T, where: Record<string, any>): boolean {
  return Object.entries(where).every(([key, expected]) => {
    if (expected === undefined) return true;
    if (expected && typeof expected === "object" && "in" in expected) return expected.in.includes(item[key]);
    return item[key] === expected;
  });
}

function organizationMembers() {
  const now = new Date("2026-05-20T08:00:00.000Z");
  return [
    { id: "m-owner", organizationId: "org-a", userId: "owner", role: "owner", status: "active", createdAt: now, updatedAt: now, user: { id: "owner", name: "Owner", email: "owner@example.com" } },
    { id: "m-manager", organizationId: "org-a", userId: "manager", role: "manager", status: "active", createdAt: now, updatedAt: now, user: { id: "manager", name: "Manager", email: "manager@example.com" } },
    { id: "m-sales-1", organizationId: "org-a", userId: "sales-1", role: "sales", status: "active", createdAt: now, updatedAt: now, user: { id: "sales-1", name: "Sales One", email: "sales1@example.com" } },
    { id: "m-sales-2", organizationId: "org-a", userId: "sales-2", role: "sales", status: "active", createdAt: now, updatedAt: now, user: { id: "sales-2", name: "Sales Two", email: "sales2@example.com" } },
    { id: "m-support", organizationId: "org-a", userId: "support", role: "support", status: "active", createdAt: now, updatedAt: now, user: { id: "support", name: "Support", email: "support@example.com" } },
    { id: "m-other", organizationId: "org-b", userId: "other", role: "owner", status: "active", createdAt: now, updatedAt: now, user: { id: "other", name: "Other", email: "other@example.com" } }
  ];
}

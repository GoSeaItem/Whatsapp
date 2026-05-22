import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createReportsRouter } from "./reports-api.js";

type Row = Record<string, any>;

function createTestApp(seed: Partial<MemoryDb> = {}) {
  const db = createMemoryDb(seed);
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const userId = req.header("x-user-id") || "manager";
    req.user = { id: userId, email: `${userId}@example.com`, name: userId };
    next();
  });
  app.use("/api/reports", createReportsRouter(db as any));
  return { app, db };
}

describe("V4-B reports API", () => {
  it("returns team report KPI for owner/manager and rejects sales/support", async () => {
    const { app } = createTestApp(reportSeed());

    const response = await request(app).get("/api/reports/team-summary?organizationId=org-a&now=2026-05-20T08:00:00.000Z").set("x-user-id", "manager").expect(200);

    expect(response.body.kpis).toMatchObject({
      todayNewCustomers: 1,
      todayFollowUpCustomers: 1,
      overdueFollowUpCustomers: 1,
      highIntentCustomers: 1,
      quotedNoFollowUpCustomers: 0
    });
    expect(response.body.memberStats.find((item: any) => item.userId === "sales-1")).toMatchObject({ customerCount: 1, completedFollowUps: 1, quoteCount: 1 });

    await request(app).get("/api/reports/team-summary?organizationId=org-a").set("x-user-id", "sales-1").expect(403);
    await request(app).get("/api/reports/team-summary?organizationId=org-a").set("x-user-id", "support").expect(403);
  });

  it("filters high-intent customers and hides contact fields", async () => {
    const { app } = createTestApp(reportSeed());

    const response = await request(app)
      .get("/api/reports/high-intent-customers?organizationId=org-a&assignedTo=sales-1&stage=已报价&intentLevel=high")
      .set("x-user-id", "owner")
      .expect(200);

    expect(response.body.map((item: any) => item.id)).toEqual(["maria"]);
    expect(response.body[0].whatsappNumber).toBeUndefined();
    expect(response.body[0].email).toBeUndefined();
  });

  it("generates report jobs, stores results, records audit logs, and protects cross-organization status", async () => {
    const { app, db } = createTestApp(reportSeed());

    const response = await request(app)
      .post("/api/reports/generate?organizationId=org-a")
      .set("x-user-id", "manager")
      .send({ type: "customer_summary", filters: { now: "2026-05-20T08:00:00.000Z" } })
      .expect(200);

    expect(response.body.job).toMatchObject({ organizationId: "org-a", type: "customer_summary", status: "completed" });
    expect(response.body.job.result.kpis.highIntentCustomers).toBe(1);
    expect(db._store.reportJobs[0]).toMatchObject({ type: "customer_summary", status: "completed", createdBy: "manager" });
    expect(db._store.auditLogs[0]).toMatchObject({ entityType: "ReportJob", organizationId: "org-a", userId: "manager" });

    await request(app).get(`/api/reports/${response.body.job.id}/status`).set("x-user-id", "manager").expect(200);
    await request(app).get(`/api/reports/${response.body.job.id}/status`).set("x-user-id", "other").expect(403);
  });

  it("exports CSV and Excel-compatible report data with formula escaping", async () => {
    const { app } = createTestApp({
      ...reportSeed(),
      customers: [makeCustomer({ id: "maria", name: "=Maria", latestSummary: "payment address order", organizationId: "org-a", assignedTo: "sales-1" })]
    });

    const csv = await request(app).get("/api/reports/team-summary?organizationId=org-a&format=csv").set("x-user-id", "owner").expect(200);
    expect(csv.headers["content-type"]).toContain("text/csv");
    expect(csv.text).toContain("'=Maria");
    expect(csv.text).not.toContain("whatsappNumber");

    const excel = await request(app).get("/api/reports/team-summary?organizationId=org-a&format=excel").set("x-user-id", "owner").expect(200);
    expect(excel.headers["content-type"]).toContain("application/vnd.ms-excel");
  });
});

type MemoryDb = {
  customers: Row[];
  quotes: Row[];
  followUps: Row[];
  reportJobs: Row[];
  auditLogs: Row[];
};

function createMemoryDb(seed: Partial<MemoryDb>) {
  const store: MemoryDb = {
    customers: [...(seed.customers || [])],
    quotes: [...(seed.quotes || [])],
    followUps: [...(seed.followUps || [])],
    reportJobs: [...(seed.reportJobs || [])],
    auditLogs: [...(seed.auditLogs || [])]
  };
  let nextId = 1;
  const now = new Date("2026-05-20T08:00:00.000Z");
  const createRow = (items: Row[], prefix: string, data: Row) => {
    const row = { id: `${prefix}-${nextId++}`, createdAt: now, updatedAt: now, ...data };
    items.push(row);
    return row;
  };
  return {
    _store: store,
    customer: {
      async findMany(args: any) {
        return store.customers.filter((row) => matchesWhere(row, args.where)).slice(0, args.take || 500);
      }
    },
    quote: {
      async findMany(args: any) {
        return store.quotes.filter((row) => matchesWhere(row, args.where));
      }
    },
    followUpTask: {
      async findMany(args: any) {
        return store.followUps.filter((row) => matchesWhere(row, args.where));
      }
    },
    organizationMember: {
      async findFirst(args: any) {
        return members().find((row) => matchesWhere(row, args.where)) || null;
      },
      async findMany(args: any) {
        return members().filter((row) => matchesWhere(row, args.where));
      }
    },
    sampleOrder: { async findMany() { return []; } },
    customRequest: { async findMany() { return []; } },
    reportJob: {
      async create(args: any) {
        return createRow(store.reportJobs, "report", args.data);
      },
      async update(args: any) {
        const index = store.reportJobs.findIndex((row) => row.id === args.where.id);
        store.reportJobs[index] = { ...store.reportJobs[index], ...args.data, updatedAt: now };
        return store.reportJobs[index];
      },
      async findUnique(args: any) {
        return store.reportJobs.find((row) => row.id === args.where.id) || null;
      }
    },
    auditLog: {
      async create(args: any) {
        return createRow(store.auditLogs, "audit", args.data);
      }
    }
  };
}

function reportSeed(): Partial<MemoryDb> {
  return {
    customers: [
      makeCustomer({ id: "maria", organizationId: "org-a", ownerId: "sales-1", assignedTo: "sales-1", stage: "已报价", latestSummary: "payment address order", createdAt: new Date("2026-05-20T08:00:00.000Z") }),
      makeCustomer({ id: "luis", organizationId: "org-a", ownerId: "sales-2", assignedTo: "sales-2", createdAt: new Date("2026-05-19T08:00:00.000Z") }),
      makeCustomer({ id: "other", organizationId: "org-b", ownerId: "other", latestSummary: "payment address order" })
    ],
    quotes: [makeQuote({ id: "q1", customerId: "maria", ownerId: "sales-1", createdBy: "sales-1" })],
    followUps: [
      makeFollowUp({ id: "today", customerId: "maria", ownerId: "sales-1", status: "pending", remindAt: new Date("2026-05-20T12:00:00.000Z") }),
      makeFollowUp({ id: "overdue", customerId: "luis", ownerId: "sales-2", status: "pending", remindAt: new Date("2026-05-18T12:00:00.000Z") }),
      makeFollowUp({ id: "done", customerId: "maria", ownerId: "sales-1", status: "completed" })
    ]
  };
}

function members() {
  return [
    { organizationId: "org-a", userId: "owner", role: "owner", status: "active", user: { id: "owner", name: "Owner", email: "owner@example.com" }, createdAt: new Date("2026-05-19T00:00:00.000Z") },
    { organizationId: "org-a", userId: "manager", role: "manager", status: "active", user: { id: "manager", name: "Manager", email: "manager@example.com" }, createdAt: new Date("2026-05-19T00:00:00.000Z") },
    { organizationId: "org-a", userId: "sales-1", role: "sales", status: "active", user: { id: "sales-1", name: "Sales 1", email: "sales1@example.com" }, createdAt: new Date("2026-05-19T00:00:00.000Z") },
    { organizationId: "org-a", userId: "sales-2", role: "sales", status: "active", user: { id: "sales-2", name: "Sales 2", email: "sales2@example.com" }, createdAt: new Date("2026-05-19T00:00:00.000Z") },
    { organizationId: "org-a", userId: "support", role: "support", status: "active", user: { id: "support", name: "Support", email: "support@example.com" }, createdAt: new Date("2026-05-19T00:00:00.000Z") },
    { organizationId: "org-b", userId: "other", role: "owner", status: "active", user: { id: "other", name: "Other", email: "other@example.com" }, createdAt: new Date("2026-05-19T00:00:00.000Z") }
  ];
}

function makeCustomer(overrides: Row = {}) {
  return {
    id: "customer",
    name: "Customer",
    whatsappNumber: "+52155",
    email: "customer@example.com",
    tags: [],
    stage: "新线索",
    latestSummary: "",
    notes: "",
    ownerId: "sales-1",
    organizationId: "org-a",
    assignedTo: "sales-1",
    collaborators: [],
    createdAt: new Date("2026-05-20T08:00:00.000Z"),
    updatedAt: new Date("2026-05-20T08:00:00.000Z"),
    ...overrides
  };
}

function makeQuote(overrides: Row = {}) {
  return { id: "quote", customerId: "customer", ownerId: "sales-1", createdBy: "sales-1", createdAt: new Date("2026-05-20T08:00:00.000Z"), ...overrides };
}

function makeFollowUp(overrides: Row = {}) {
  return { id: "follow", customerId: "customer", ownerId: "sales-1", remindAt: new Date("2026-05-20T12:00:00.000Z"), status: "pending", completedAt: null, ...overrides };
}

function matchesWhere(row: Row, where: Row = {}) {
  return Object.entries(where || {}).every(([key, value]) => {
    if (value && typeof value === "object" && "in" in value) return value.in.includes(row[key]);
    return row[key] === value;
  });
}

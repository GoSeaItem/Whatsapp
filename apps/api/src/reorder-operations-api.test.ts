import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createReorderOperationsAiRouter, createReorderOperationsRouter } from "./reorder-operations-api.js";

type Row = Record<string, any>;

function createTestApp() {
  const members = [
    { organizationId: "org-1", userId: "owner-1", role: "owner", status: "active" },
    { organizationId: "org-1", userId: "manager-1", role: "manager", status: "active" },
    { organizationId: "org-1", userId: "sales-1", role: "sales", status: "active" },
    { organizationId: "org-1", userId: "support-1", role: "support", status: "active" },
    { organizationId: "org-2", userId: "sales-2", role: "sales", status: "active" }
  ];
  const customers = [
    { id: "customer-1", name: "Maria", tags: ["old customer"], stage: "reorder", ownerId: "sales-1", assignedTo: "sales-1", collaborators: [], organizationId: "org-1", language: "en", intentScore: 80, updatedAt: new Date("2026-05-20T00:00:00.000Z") },
    { id: "customer-2", name: "Other", tags: [], stage: "new lead", ownerId: "sales-2", assignedTo: "sales-2", collaborators: [], organizationId: "org-2", language: "en", intentScore: 0, updatedAt: new Date("2026-05-20T00:00:00.000Z") }
  ];
  const products = [
    { id: "product-1", name: "Blue Dress", category: "dress", ownerId: "sales-1", createdAt: new Date("2026-05-10T00:00:00.000Z") }
  ];
  const orgProducts = [{ organizationId: "org-1", productId: "product-1" }];
  const orders = [
    { id: "order-1", customerId: "customer-1", productId: "product-1", organizationId: "org-1", orderStatus: "completed", afterSalesStatus: "closed", amount: 1200, quantity: 100, ownerId: "sales-1", assignedTo: "sales-1", createdAt: new Date("2026-03-01T00:00:00.000Z"), updatedAt: new Date("2026-03-01T00:00:00.000Z"), cost: { grossMargin: 30, costConfirmed: true } }
  ];
  const quotes = [{ id: "quote-1", customerId: "customer-1", productId: "product-1", quantity: 100, unitPrice: 12, createdAt: new Date("2026-04-01T00:00:00.000Z") }];
  const followUps = [{ id: "follow-1", customerId: "customer-1", status: "completed", remindAt: new Date("2026-04-05T00:00:00.000Z"), completedAt: new Date("2026-04-05T00:00:00.000Z") }];
  const opportunities: Row[] = [];
  const campaigns: Row[] = [];
  const playbooks: Row[] = [];
  const auditLogs: Row[] = [];
  const aiLogs: Row[] = [];

  const hydrateOpportunity = (row: Row) => ({
    ...row,
    customer: customers.find((customer) => customer.id === row.customerId) || null,
    product: products.find((product) => product.id === row.productId) || null
  });

  const db = {
    organizationMember: { findFirst: async ({ where }: any) => members.find((row) => matches(row, where)) || null },
    customer: {
      findFirst: async ({ where }: any) => customers.find((row) => matches(row, where)) || null,
      findMany: async ({ where }: any) => customers.filter((row) => matches(row, where))
    },
    product: {
      findFirst: async ({ where }: any) => products.find((row) => matchesProduct(row, where, orgProducts)) || null,
      findMany: async ({ where }: any) => products.filter((row) => matchesProduct(row, where, orgProducts))
    },
    order: {
      count: async ({ where }: any) => orders.filter((row) => matches(row, where)).length,
      findMany: async ({ where }: any) => orders.filter((row) => matches(row, where))
    },
    quote: { findMany: async ({ where }: any) => quotes.filter((row) => matches(row, where)) },
    followUpTask: {
      findMany: async ({ where }: any) => followUps.filter((row) => matches(row, where)),
      create: async ({ data }: any) => {
        const row = { id: `follow-${followUps.length + 1}`, ...data, createdAt: new Date(), completedAt: null };
        followUps.push(row);
        return row;
      }
    },
    reorderOpportunity: {
      findMany: async ({ where }: any) => opportunities.filter((row) => matches(hydrateOpportunity(row), where)).map(hydrateOpportunity),
      findFirst: async ({ where }: any) => {
        const row = opportunities.find((item) => matches(hydrateOpportunity(item), where));
        return row ? hydrateOpportunity(row) : null;
      },
      create: async ({ data }: any) => {
        const row = { id: `opp-${opportunities.length + 1}`, ...data, createdAt: new Date(), updatedAt: new Date() };
        opportunities.push(row);
        return row;
      },
      update: async ({ where, data }: any) => {
        const index = opportunities.findIndex((row) => matches(row, where));
        opportunities[index] = { ...opportunities[index], ...data, updatedAt: new Date() };
        return hydrateOpportunity(opportunities[index]);
      }
    },
    reorderCampaign: collection(campaigns, "campaign"),
    reorderPlaybook: collection(playbooks, "playbook"),
    knowledgeBase: { findMany: async () => [] },
    knowledgeBaseOrg: { findMany: async () => [] },
    scriptOrg: { findMany: async () => [] },
    auditLog: {
      create: async ({ data }: any) => {
        auditLogs.push(data);
        return { id: `audit-${auditLogs.length}`, ...data };
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
  app.use("/api/reorder", createReorderOperationsRouter(db as any));
  app.use("/api/ai", createReorderOperationsAiRouter(db as any));
  app.use((error: any, _req: any, res: any, _next: any) => res.status(error.status || 500).json({ message: error.message }));
  return { app, opportunities, campaigns, playbooks, auditLogs, aiLogs, followUps };
}

describe("V4-I Reorder Operations API", () => {
  it("recalculates, lists, updates, and manually creates follow-up tasks", async () => {
    const { app, opportunities, followUps, auditLogs } = createTestApp();

    const recalc = await request(app)
      .post("/api/reorder/opportunities/recalculate")
      .set("x-user-id", "manager-1")
      .send({ organizationId: "org-1", opportunityTypes: ["reorder"] })
      .expect(200);

    expect(recalc.body.createdCount).toBeGreaterThan(0);
    expect(opportunities[0].opportunityType).toBe("reorder");

    const list = await request(app).get("/api/reorder/opportunities?organizationId=org-1").set("x-user-id", "sales-1").expect(200);
    expect(list.body[0].customerName).toBe("Maria");

    await request(app).patch(`/api/reorder/opportunities/${opportunities[0].id}`).set("x-user-id", "sales-1").send({ status: "contacted" }).expect(200);
    await request(app).post(`/api/reorder/opportunities/${opportunities[0].id}/create-follow-up-task`).set("x-user-id", "sales-1").send({}).expect(400);
    await request(app).post(`/api/reorder/opportunities/${opportunities[0].id}/create-follow-up-task`).set("x-user-id", "sales-1").send({ confirm: true }).expect(200);

    expect(followUps.some((task) => task.status === "pending")).toBe(true);
    expect(auditLogs.length).toBeGreaterThan(0);
  });

  it("enforces team recalculation and cross-organization boundaries", async () => {
    const { app } = createTestApp();

    await request(app).post("/api/reorder/opportunities/recalculate").set("x-user-id", "sales-1").send({ organizationId: "org-1" }).expect(403);
    await request(app).post("/api/reorder/opportunities/recalculate").set("x-user-id", "sales-1").send({ customerId: "customer-2" }).expect(403);
  });

  it("manages campaigns and playbooks with confirmation and without auto-send", async () => {
    const { app, campaigns, playbooks } = createTestApp();

    const campaign = await request(app)
      .post("/api/reorder/campaigns")
      .set("x-user-id", "manager-1")
      .send({ organizationId: "org-1", name: "Dormant wake-up", campaignType: "dormant_reactivation", targetScope: "team" })
      .expect(201);
    expect(campaign.body.name).toBe("Dormant wake-up");
    await request(app).delete(`/api/reorder/campaigns/${campaign.body.id}`).set("x-user-id", "manager-1").expect(400);
    await request(app).delete(`/api/reorder/campaigns/${campaign.body.id}?confirm=true`).set("x-user-id", "manager-1").expect(204);
    expect(campaigns.length).toBe(0);

    const playbook = await request(app)
      .post("/api/reorder/playbooks")
      .set("x-user-id", "manager-1")
      .send({ organizationId: "org-1", title: "Safe reorder", scenario: "reorder_follow_up", language: "en", content: "Draft only. Confirm price and stock." })
      .expect(201);
    expect(playbook.body.content).toContain("Draft only");
    await request(app).delete(`/api/reorder/playbooks/${playbook.body.id}?confirm=true`).set("x-user-id", "manager-1").expect(204);
    expect(playbooks.length).toBe(0);
  });

  it("generates reorder operation scripts without inventing purchase history", async () => {
    const { app, aiLogs } = createTestApp();

    const response = await request(app)
      .post("/api/ai/reorder-operation-script")
      .set("x-user-id", "sales-1")
      .send({ customerId: "customer-1", productId: "product-1", scenario: "new_product_recommendation" })
      .expect(200);

    expect(response.body.scriptText).not.toMatch(/lowest price|limited stock|auto-send/i);
    expect(response.body.riskWarnings.join(" ")).toContain("Confirm price");
    expect(aiLogs[0].actionType).toBe("new_product_recommendation_script");
  });
});

function collection(rows: Row[], prefix: string) {
  return {
    findMany: async ({ where }: any) => rows.filter((row) => matches(row, where)),
    findFirst: async ({ where }: any) => rows.find((row) => matches(row, where)) || null,
    create: async ({ data }: any) => {
      const row = { id: `${prefix}-${rows.length + 1}`, ...data, createdAt: new Date(), updatedAt: new Date() };
      rows.push(row);
      return row;
    },
    update: async ({ where, data }: any) => {
      const index = rows.findIndex((row) => matches(row, where));
      rows[index] = { ...rows[index], ...data, updatedAt: new Date() };
      return rows[index];
    },
    delete: async ({ where }: any) => {
      const index = rows.findIndex((row) => matches(row, where));
      const [row] = rows.splice(index, 1);
      return row;
    }
  };
}

function matchesProduct(row: Row, where: Row = {}, orgProducts: Row[] = []) {
  if (!where) return true;
  return Object.entries(where).every(([key, expected]) => {
    if (key === "organizationProducts") {
      return orgProducts.some((item) => item.productId === row.id && matches(item, expected.some || {}));
    }
    return matches({ ...row, organizationProducts: orgProducts.filter((item) => item.productId === row.id) }, { [key]: expected });
  });
}

function matches(row: Row, where: Row = {}): boolean {
  return Object.entries(where || {}).every(([key, expected]) => {
    if (key === "OR") return expected.some((clause: Row) => matches(row, clause));
    if (expected && typeof expected === "object" && "some" in expected) {
      const values = Array.isArray(row[key]) ? row[key] : [];
      return values.some((item: Row) => matches(item, expected.some));
    }
    if (expected && typeof expected === "object" && "has" in expected) return Array.isArray(row[key]) && row[key].includes(expected.has);
    if (expected && typeof expected === "object" && !Array.isArray(expected) && !("in" in expected)) return matches(row[key] || {}, expected);
    if (expected && typeof expected === "object" && "in" in expected) return expected.in.includes(row[key]);
    return row[key] === expected;
  });
}

import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createScriptAbAiRouter, createScriptAbRouter } from "./script-ab-api.js";

type Row = Record<string, any>;

function createTestApp() {
  const customers = [
    { id: "customer-1", name: "Maria", ownerId: "sales-1", assignedTo: null, collaborators: [], organizationId: "org-1" },
    { id: "customer-2", name: "Other", ownerId: "sales-2", assignedTo: null, collaborators: [], organizationId: "org-2" }
  ];
  const members = [
    { id: "m-1", organizationId: "org-1", userId: "owner-1", role: "owner", status: "active" },
    { id: "m-2", organizationId: "org-1", userId: "manager-1", role: "manager", status: "active" },
    { id: "m-3", organizationId: "org-1", userId: "sales-1", role: "sales", status: "active" },
    { id: "m-4", organizationId: "org-1", userId: "support-1", role: "support", status: "active" },
    { id: "m-5", organizationId: "org-2", userId: "sales-2", role: "sales", status: "active" }
  ];
  const experiments: Row[] = [];
  const variants: Row[] = [];
  const usages: Row[] = [];
  const auditLogs: Row[] = [];
  const aiLogs: Row[] = [];
  let expSeq = 1;
  let varSeq = 1;
  let usageSeq = 1;

  const hydrateExperiment = (row: Row) => ({
    ...row,
    variants: variants.filter((variant) => variant.experimentId === row.id),
    _count: {
      variants: variants.filter((variant) => variant.experimentId === row.id).length,
      usages: usages.filter((usage) => usage.experimentId === row.id).length
    }
  });
  const hydrateUsage = (row: Row) => ({
    ...row,
    customer: customers.find((customer) => customer.id === row.customerId) || null,
    variant: variants.find((variant) => variant.id === row.variantId) || null
  });

  const db = {
    organizationMember: { findFirst: async ({ where }: any) => members.find((row) => matches(row, where)) || null },
    customer: { findFirst: async ({ where }: any) => customers.find((row) => matches(row, where)) || null },
    scriptExperiment: {
      findMany: async ({ where }: any) => experiments.filter((row) => matches(row, where)).map(hydrateExperiment),
      findFirst: async ({ where }: any) => {
        const row = experiments.find((item) => matches(item, where));
        return row ? hydrateExperiment(row) : null;
      },
      create: async ({ data }: any) => {
        const row = { id: `exp-${expSeq++}`, ...data, createdAt: new Date(), updatedAt: new Date() };
        experiments.push(row);
        return row;
      },
      update: async ({ where, data }: any) => {
        const index = experiments.findIndex((row) => row.id === where.id);
        experiments[index] = { ...experiments[index], ...data, updatedAt: new Date() };
        return hydrateExperiment(experiments[index]);
      }
    },
    scriptVariant: {
      findFirst: async ({ where }: any) => {
        const row = variants.find((item) => matches(item, where));
        return row ? { ...row, experiment: experiments.find((experiment) => experiment.id === row.experimentId) } : null;
      },
      create: async ({ data }: any) => {
        if (variants.some((row) => row.experimentId === data.experimentId && row.versionLabel === data.versionLabel)) {
          const error = new Error("unique") as Error & { code?: string };
          error.code = "P2002";
          throw error;
        }
        const row = { id: `variant-${varSeq++}`, ...data, createdAt: new Date(), updatedAt: new Date() };
        variants.push(row);
        return row;
      },
      update: async ({ where, data }: any) => {
        const index = variants.findIndex((row) => row.id === where.id);
        variants[index] = { ...variants[index], ...data, updatedAt: new Date() };
        return variants[index];
      },
      delete: async ({ where }: any) => {
        const index = variants.findIndex((row) => row.id === where.id);
        const [deleted] = variants.splice(index, 1);
        return deleted;
      }
    },
    scriptUsage: {
      count: async ({ where }: any) => usages.filter((row) => matches(row, where)).length,
      findMany: async ({ where }: any) => usages.filter((row) => matches(row, where)).map(hydrateUsage),
      findFirst: async ({ where }: any) => {
        const row = usages.find((item) => matches(item, where));
        return row ? hydrateUsage(row) : null;
      },
      create: async ({ data }: any) => {
        const row = { id: `usage-${usageSeq++}`, ...data, usedAt: new Date(), outcomeAt: null };
        usages.push(row);
        return hydrateUsage(row);
      },
      update: async ({ where, data }: any) => {
        const index = usages.findIndex((row) => row.id === where.id);
        usages[index] = { ...usages[index], ...data };
        return hydrateUsage(usages[index]);
      }
    },
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
  app.use("/api", createScriptAbRouter(db as any));
  app.use("/api/ai", createScriptAbAiRouter(db as any));
  app.use((error: any, _req: any, res: any, _next: any) => res.status(error.status || 500).json({ message: error.message }));
  return { app, experiments, variants, usages, auditLogs, aiLogs };
}

describe("V4-K script A/B testing API", () => {
  it("creates experiment, variants, usage, outcome and stats", async () => {
    const { app, usages } = createTestApp();
    const experiment = await request(app).post("/api/script-experiments").set("x-user-id", "manager-1").send({
      organizationId: "org-1",
      name: "Price reply test",
      scenario: "price_reply",
      status: "active",
      targetLanguage: "en"
    }).expect(201);

    const variant = await request(app).post(`/api/script-experiments/${experiment.body.id}/variants`).set("x-user-id", "manager-1").send({
      title: "Short price reply",
      versionLabel: "A",
      content: "Please confirm quantity and city before final quotation."
    }).expect(201);

    await request(app).post(`/api/script-experiments/${experiment.body.id}/variants`).set("x-user-id", "manager-1").send({
      title: "Duplicate",
      versionLabel: "A",
      content: "Duplicate"
    }).expect(409);

    const usage = await request(app).post("/api/script-usages").set("x-user-id", "sales-1").send({
      experimentId: experiment.body.id,
      variantId: variant.body.id,
      customerId: "customer-1",
      scenario: "price_reply",
      channel: "extension",
      usedText: "Please confirm quantity and city before final quotation."
    }).expect(201);
    expect(usages[0].outcome).toBe("used_draft");

    await request(app).patch(`/api/script-usages/${usage.body.usageId}/outcome`).set("x-user-id", "sales-1").send({ outcome: "customer_replied" }).expect(200);
    const stats = await request(app).get(`/api/script-experiments/${experiment.body.id}/stats`).set("x-user-id", "manager-1").expect(200);
    expect(stats.body.totalUsage).toBe(1);
    expect(stats.body.riskWarnings.join(" ")).toMatch(/Sample size/i);
  });

  it("requires confirm to archive experiments and disables used variants", async () => {
    const { app } = createTestApp();
    const experiment = await request(app).post("/api/script-experiments").set("x-user-id", "manager-1").send({ organizationId: "org-1", name: "Follow-up", scenario: "quote_follow_up", status: "active" }).expect(201);
    const variant = await request(app).post(`/api/script-experiments/${experiment.body.id}/variants`).set("x-user-id", "manager-1").send({ title: "A", versionLabel: "A", content: "Follow-up draft" }).expect(201);
    await request(app).post("/api/script-usages").set("x-user-id", "sales-1").send({ experimentId: experiment.body.id, variantId: variant.body.id, customerId: "customer-1", scenario: "quote_follow_up" }).expect(201);

    await request(app).delete(`/api/script-experiments/${experiment.body.id}`).set("x-user-id", "manager-1").expect(409);
    await request(app).delete(`/api/script-experiments/${experiment.body.id}?confirm=true`).set("x-user-id", "manager-1").expect(200).expect((res) => expect(res.body.status).toBe("archived"));
    await request(app).delete(`/api/script-variants/${variant.body.id}?confirm=true`).set("x-user-id", "manager-1").expect(200).expect((res) => expect(res.body.enabled).toBe(false));
  });

  it("rejects cross-organization customer usage and sales deleting org experiments", async () => {
    const { app } = createTestApp();
    const experiment = await request(app).post("/api/script-experiments").set("x-user-id", "manager-1").send({ organizationId: "org-1", name: "Support", scenario: "after_sales_soothing", status: "active" }).expect(201);
    const variant = await request(app).post(`/api/script-experiments/${experiment.body.id}/variants`).set("x-user-id", "manager-1").send({ title: "A", versionLabel: "A", content: "We will check the case first." }).expect(201);

    await request(app).post("/api/script-usages").set("x-user-id", "sales-1").send({ experimentId: experiment.body.id, variantId: variant.body.id, customerId: "customer-2" }).expect(403);
    await request(app).delete(`/api/script-experiments/${experiment.body.id}?confirm=true`).set("x-user-id", "sales-1").expect(403);
  });

  it("generates safe A/B/C variants and logs AI action", async () => {
    const { app, aiLogs } = createTestApp();
    const response = await request(app).post("/api/ai/script-experiments/generate-variants").set("x-user-id", "manager-1").send({
      organizationId: "org-1",
      scenario: "too_expensive",
      targetLanguage: "en",
      baseContent: "Customer says the price is too high."
    }).expect(200);

    expect(response.body.variants.map((item: Row) => item.versionLabel)).toEqual(["A", "B", "C"]);
    expect(JSON.stringify(response.body.variants).toLowerCase()).not.toMatch(/lowest price|always in stock|100% guaranteed|auto-send|bulk send|send button/);
    expect(response.body.riskWarnings.join(" ")).toMatch(/draft|price|stock/i);
    expect(aiLogs[0].actionType).toBe("script_ab_generate_variants");
  });
});

function matches(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([key, expected]) => {
    if (key === "OR") return expected.some((clause: Row) => matches(row, clause));
    if (expected && typeof expected === "object" && "in" in expected) return expected.in.includes(row[key]);
    if (expected && typeof expected === "object" && !Array.isArray(expected)) return matches(row[key] || {}, expected);
    return row[key] === expected;
  });
}

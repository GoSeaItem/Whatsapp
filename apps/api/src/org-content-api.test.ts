import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { generateAiReply } from "./ai-reply.js";
import { buildKnowledgeContext, findKnowledgeForAi } from "./knowledge-base-service.js";
import { createKnowledgeBaseOrgRouter, createScriptOrgRouter } from "./org-content-api.js";

type MemberRow = { id: string; organizationId: string; userId: string; role: string; status: string };
type ProductRow = { id: string; ownerId: string; name: string };
type PersonalKnowledgeRow = {
  id: string;
  title: string;
  category: string;
  content: string;
  language: string;
  productId: string | null;
  enabled: boolean;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
};
type OrgContentRow = {
  id: string;
  organizationId: string;
  title: string;
  category: string;
  content: string;
  language: string;
  enabled: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

function createTestApp(seed: { members?: MemberRow[]; orgKnowledge?: OrgContentRow[]; scripts?: OrgContentRow[]; personalKnowledge?: PersonalKnowledgeRow[] } = {}) {
  const members = seed.members || [
    { id: "m-owner", organizationId: "org-a", userId: "owner", role: "owner", status: "active" },
    { id: "m-manager", organizationId: "org-a", userId: "manager", role: "manager", status: "active" },
    { id: "m-sales", organizationId: "org-a", userId: "sales", role: "sales", status: "active" },
    { id: "m-support", organizationId: "org-a", userId: "support", role: "support", status: "active" },
    { id: "m-other", organizationId: "org-b", userId: "other", role: "owner", status: "active" }
  ];
  const orgKnowledge = [...(seed.orgKnowledge || [])];
  const scripts = [...(seed.scripts || [])];
  const personalKnowledge = [...(seed.personalKnowledge || [])];
  const auditLogs: any[] = [];
  const products: ProductRow[] = [{ id: "product-1", ownerId: "sales", name: "Blue Dress" }];
  let nextId = 1;

  const db = {
    organizationMember: {
      async findFirst(args: any) {
        return members.find((member) => matchesWhere(member, args.where)) || null;
      }
    },
    product: {
      async findFirst(args: any) {
        return products.find((product) => matchesWhere(product, args.where)) || null;
      }
    },
    knowledgeBase: {
      async findMany(args: any) {
        return personalKnowledge.filter((item) => matchesWhere(item, args.where)).slice(0, args.take || 200);
      }
    },
    knowledgeBaseOrg: createModel(orgKnowledge, "okb", () => nextId++),
    scriptOrg: createModel(scripts, "script", () => nextId++),
    auditLog: {
      async create(args: any) {
        auditLogs.push({ id: `audit-${auditLogs.length + 1}`, createdAt: new Date("2026-05-20T08:00:00.000Z"), ...args.data });
        return auditLogs[auditLogs.length - 1];
      }
    }
  };

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const id = req.header("x-user-id") || "owner";
    req.user = { id, email: `${id}@example.com`, name: id };
    next();
  });
  app.use("/api/knowledge-base/org", createKnowledgeBaseOrgRouter(db as any));
  app.use("/api/scripts/org", createScriptOrgRouter(db as any));
  return { app, db, orgKnowledge, scripts, auditLogs };
}

describe("V3-E organization knowledge and scripts", () => {
  it("allows owner and manager to write organization knowledge and records audit logs", async () => {
    const { app, auditLogs } = createTestApp();

    const created = await request(app)
      .post("/api/knowledge-base/org")
      .set("x-user-id", "owner")
      .send({ organizationId: "org-a", title: "Mexico logistics", category: "logistics", content: "Confirm city before freight quote.", language: "en" })
      .expect(201);

    expect(created.body).toMatchObject({ organizationId: "org-a", createdBy: "owner", enabled: true });
    expect(auditLogs[0]).toMatchObject({ action: "create", entityType: "KnowledgeBase", organizationId: "org-a", actorId: "owner", userId: "owner" });
    expect(auditLogs[0].after).toMatchObject({ title: "Mexico logistics" });

    const updated = await request(app).patch(`/api/knowledge-base/org/${created.body.id}`).set("x-user-id", "manager").send({ enabled: false }).expect(200);
    expect(updated.body.enabled).toBe(false);
    expect(auditLogs.some((log) => log.action === "update" && log.entityType === "KnowledgeBase" && log.before && log.after)).toBe(true);
  });

  it("keeps sales and support read-only and rejects cross-organization access", async () => {
    const { app } = createTestApp({
      orgKnowledge: [
        makeOrgContent({ id: "kb-a", organizationId: "org-a", title: "Org A logistics" }),
        makeOrgContent({ id: "kb-b", organizationId: "org-b", title: "Org B logistics" })
      ]
    });

    expect((await request(app).get("/api/knowledge-base/org?organizationId=org-a").set("x-user-id", "sales").expect(200)).body.map((item: any) => item.id)).toEqual(["kb-a"]);
    await request(app).post("/api/knowledge-base/org").set("x-user-id", "sales").send({ organizationId: "org-a", title: "Nope", category: "faq", content: "Nope", language: "en" }).expect(403);
    await request(app).get("/api/knowledge-base/org/kb-b").set("x-user-id", "sales").expect(403);
    await request(app).delete("/api/knowledge-base/org/kb-a").set("x-user-id", "support").expect(403);
  });

  it("supports organization script CRUD, search and duplicate detection", async () => {
    const { app, auditLogs } = createTestApp({
      scripts: [makeOrgContent({ id: "script-1", title: "PayPal reply", category: "payment", content: "Please confirm account before sending." })]
    });

    expect((await request(app).get("/api/scripts/org?organizationId=org-a&q=paypal").set("x-user-id", "sales").expect(200)).body.map((item: any) => item.id)).toEqual(["script-1"]);
    await request(app).post("/api/scripts/org").set("x-user-id", "owner").send({ organizationId: "org-a", title: "PayPal reply", category: "payment", content: "Duplicate", language: "en" }).expect(409);

    const created = await request(app).post("/api/scripts/org").set("x-user-id", "manager").send({ organizationId: "org-a", title: "Follow up", category: "follow_up", content: "Do you need more details?", language: "en" }).expect(201);
    expect((await request(app).patch(`/api/scripts/org/${created.body.id}`).set("x-user-id", "manager").send({ enabled: false }).expect(200)).body.enabled).toBe(false);
    await request(app).delete(`/api/scripts/org/${created.body.id}`).set("x-user-id", "owner").expect(204);
    expect(auditLogs.some((log) => log.action === "delete" && log.entityType === "ScriptOrg" && log.before && log.after === null)).toBe(true);
  });

  it("uses enabled organization knowledge in AI before personal fallback and ignores disabled entries", async () => {
    const { db } = createTestApp({
      orgKnowledge: [
        makeOrgContent({ id: "org-enabled", title: "Org Mexico logistics", category: "logistics", content: "Ask for destination city and shipping method.", enabled: true }),
        makeOrgContent({ id: "org-disabled", title: "Disabled org logistics", category: "logistics", content: "Should not be used.", enabled: false })
      ],
      scripts: [
        makeOrgContent({ id: "script-shipping", title: "Shipping reply", category: "shipping", content: "Please send your city and preferred shipping method.", enabled: true })
      ],
      personalKnowledge: [
        makePersonalKnowledge({ id: "personal-1", title: "Personal logistics", category: "logistics", content: "Personal fallback." })
      ]
    });

    const lookup = await findKnowledgeForAi(db as any, {
      ownerId: "sales",
      organizationId: "org-a",
      targetLanguage: "English",
      scenario: "shipping",
      mode: "reply",
      keyword: "Can you ship to Mexico?"
    });
    const context = buildKnowledgeContext(lookup.items);
    const reply = generateAiReply({ customerMessage: "Can you ship to Mexico?", targetLanguage: "English", scenario: "shipping", ...context });

    expect(reply.knowledgeUsed[0]).toBe("[Org] Org Mexico logistics");
    expect(reply.knowledgeUsed).toContain("[Org] Script: Shipping reply");
    expect(reply.knowledgeUsed).not.toContain("[Org] Disabled org logistics");
    expect(reply.professionalReply).toContain("[Org] Org Mexico logistics");
  });
});

function createModel(rows: OrgContentRow[], prefix: string, next: () => number) {
  return {
    async findMany(args: any) {
      return rows.filter((row) => matchesWhere(row, args.where)).slice(0, args.take || 200);
    },
    async findFirst(args: any) {
      return rows.find((row) => matchesWhere(row, args.where)) || null;
    },
    async findUnique(args: any) {
      return rows.find((row) => row.id === args.where.id) || null;
    },
    async create(args: any) {
      const now = new Date("2026-05-20T08:00:00.000Z");
      const row = { id: `${prefix}-${next()}`, createdAt: now, updatedAt: now, enabled: true, ...args.data };
      rows.push(row);
      return row;
    },
    async update(args: any) {
      const index = rows.findIndex((row) => row.id === args.where.id);
      rows[index] = { ...rows[index], ...args.data, updatedAt: new Date("2026-05-20T09:00:00.000Z") };
      return rows[index];
    },
    async delete(args: any) {
      const index = rows.findIndex((row) => row.id === args.where.id);
      const [deleted] = rows.splice(index, 1);
      return deleted;
    }
  };
}

function makeOrgContent(overrides: Partial<OrgContentRow> = {}): OrgContentRow {
  return {
    id: "okb-1",
    organizationId: "org-a",
    title: "Company policy",
    category: "logistics",
    content: "Confirm details before promising.",
    language: "en",
    enabled: true,
    createdBy: "owner",
    createdAt: new Date("2026-05-20T08:00:00.000Z"),
    updatedAt: new Date("2026-05-20T08:00:00.000Z"),
    ...overrides
  };
}

function makePersonalKnowledge(overrides: Partial<PersonalKnowledgeRow> = {}): PersonalKnowledgeRow {
  return {
    id: "personal-1",
    title: "Personal policy",
    category: "logistics",
    content: "Personal fallback.",
    language: "en",
    productId: null,
    enabled: true,
    ownerId: "sales",
    createdAt: new Date("2026-05-20T08:00:00.000Z"),
    updatedAt: new Date("2026-05-20T08:00:00.000Z"),
    ...overrides
  };
}

function matchesWhere<T extends Record<string, any>>(item: T, where: Record<string, any> = {}): boolean {
  return Object.entries(where).every(([key, expected]) => {
    if (expected === undefined) return true;
    if (key === "OR" && Array.isArray(expected)) return expected.some((candidate) => matchesWhere(item, candidate));
    if (expected && typeof expected === "object" && "in" in expected) return expected.in.includes(item[key]);
    if (expected && typeof expected === "object" && "contains" in expected) return String(item[key] || "").toLowerCase().includes(String(expected.contains).toLowerCase());
    return item[key] === expected;
  });
}

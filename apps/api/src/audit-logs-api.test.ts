import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createAuditLogsRouter } from "./audit-logs-api.js";
import { writeAuditLog } from "./audit-log-utils.js";

function createTestApp() {
  const members = [
    { organizationId: "org-a", userId: "owner", role: "owner", status: "active" },
    { organizationId: "org-a", userId: "manager", role: "manager", status: "active" },
    { organizationId: "org-a", userId: "sales", role: "sales", status: "active" },
    { organizationId: "org-a", userId: "support", role: "support", status: "active" },
    { organizationId: "org-b", userId: "other", role: "owner", status: "active" }
  ];
  const logs: any[] = [
    makeLog({ id: "log-owner", organizationId: "org-a", actorId: "owner", userId: "owner", action: "create", entityType: "Customer", entityId: "customer-1" }),
    makeLog({ id: "log-sales", organizationId: "org-a", actorId: "sales", userId: "sales", action: "update", entityType: "Quote", entityId: "quote-1" }),
    makeLog({ id: "log-other", organizationId: "org-b", actorId: "other", userId: "other", action: "delete", entityType: "Product", entityId: "product-9" })
  ];
  const db = {
    organizationMember: {
      async findFirst(args: any) {
        return members.find((member) => matchesWhere(member, args.where)) || null;
      }
    },
    auditLog: {
      async create(args: any) {
        const row = makeLog({ id: `log-${logs.length + 1}`, ...args.data });
        logs.push(row);
        return row;
      },
      async findMany(args: any) {
        return logs
          .filter((log) => matchesAuditWhere(log, args.where))
          .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
          .slice(args.skip || 0, (args.skip || 0) + (args.take || 50));
      },
      async findUnique(args: any) {
        return logs.find((log) => log.id === args.where.id) || null;
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
  app.use("/api/audit-logs", createAuditLogsRouter(db as any));
  return { app, db, logs };
}

describe("V3-G audit logs", () => {
  it("writes sanitized before/after audit logs", async () => {
    const { db, logs } = createTestApp();

    await writeAuditLog(db as any, {
      organizationId: "org-a",
      userId: "owner",
      action: "create",
      entityType: "Customer",
      entityId: "customer-2",
      before: null,
      after: { id: "customer-2", name: "=Formula Customer", passwordHash: "hidden" }
    });

    const created = logs[logs.length - 1];
    expect(created).toMatchObject({ actorId: "owner", userId: "owner", action: "create", entityType: "Customer" });
    expect(created.after).toMatchObject({ id: "customer-2", name: "=Formula Customer" });
    expect(created.after.passwordHash).toBeUndefined();
  });

  it("lets owner and manager list organization logs with filters", async () => {
    const { app } = createTestApp();

    const response = await request(app).get("/api/audit-logs?organizationId=org-a&entityType=Quote").set("x-user-id", "manager").expect(200);
    expect(response.body.items.map((item: any) => item.id)).toEqual(["log-sales"]);
  });

  it("limits sales and support to their own audit logs", async () => {
    const { app } = createTestApp();

    const response = await request(app).get("/api/audit-logs?organizationId=org-a").set("x-user-id", "sales").expect(200);
    expect(response.body.items.map((item: any) => item.id)).toEqual(["log-sales"]);
    await request(app).get("/api/audit-logs/log-owner").set("x-user-id", "sales").expect(403);
    await request(app).get("/api/audit-logs/log-sales").set("x-user-id", "sales").expect(200);
  });

  it("rejects cross-organization access and exports visible CSV safely", async () => {
    const { app } = createTestApp();

    await request(app).get("/api/audit-logs?organizationId=org-b").set("x-user-id", "sales").expect(403);
    const csv = await request(app).get("/api/audit-logs?organizationId=org-a&format=csv").set("x-user-id", "owner").expect(200);
    expect(csv.text).toContain('"createdAt","organizationId","userId","action","entityType","entityId","riskLevel","before","after"');
    expect(csv.text).not.toContain("passwordHash");
  });
});

function makeLog(overrides: Record<string, any>) {
  return {
    id: "log-1",
    organizationId: "org-a",
    actorId: "owner",
    userId: "owner",
    action: "create",
    entityType: "Customer",
    entityId: "customer-1",
    before: null,
    after: { name: "Maria" },
    metadata: null,
    createdAt: new Date("2026-05-20T10:00:00.000Z"),
    ...overrides
  };
}

function matchesAuditWhere(item: Record<string, any>, where: Record<string, any> = {}) {
  return Object.entries(where).every(([key, expected]) => {
    if (key === "OR" && Array.isArray(expected)) return expected.some((candidate) => matchesAuditWhere(item, candidate));
    if (key === "createdAt" && expected && typeof expected === "object") {
      if (expected.gte && item.createdAt < expected.gte) return false;
      if (expected.lte && item.createdAt > expected.lte) return false;
      return true;
    }
    return item[key] === expected;
  });
}

function matchesWhere(item: Record<string, any>, where: Record<string, any> = {}) {
  return Object.entries(where).every(([key, expected]) => item[key] === expected);
}

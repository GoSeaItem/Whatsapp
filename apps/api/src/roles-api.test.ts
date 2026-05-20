import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createRolesRouter } from "./roles-api.js";
import { requireOrganizationResourcePermission } from "./organization-permissions.js";

type MemberRow = { id: string; organizationId: string; userId: string; role: string; status: string };
type RoleRow = { id: string; organizationId: string; name: string; description: string; createdAt: Date; updatedAt: Date };

function createTestApp(seed: { members?: MemberRow[]; roles?: RoleRow[] } = {}) {
  const members = seed.members || [
    { id: "m-owner", organizationId: "org-a", userId: "owner", role: "owner", status: "active" },
    { id: "m-manager", organizationId: "org-a", userId: "manager", role: "manager", status: "active" },
    { id: "m-sales", organizationId: "org-a", userId: "sales", role: "sales", status: "active" },
    { id: "m-support", organizationId: "org-a", userId: "support", role: "support", status: "active" },
    { id: "m-other", organizationId: "org-b", userId: "other", role: "owner", status: "active" }
  ];
  const roles = [...(seed.roles || [
    makeRole({ id: "role-owner", organizationId: "org-a", name: "owner", description: "Owner role" }),
    makeRole({ id: "role-manager", organizationId: "org-a", name: "manager", description: "Manager role" }),
    makeRole({ id: "role-sales", organizationId: "org-a", name: "sales", description: "Sales role" }),
    makeRole({ id: "role-other-owner", organizationId: "org-b", name: "owner", description: "Other owner" })
  ])];
  let nextId = 1;

  const db = {
    organizationMember: {
      async findFirst(args: any) {
        return members.find((member) => matches(member, args.where)) || null;
      }
    },
    role: {
      async findMany(args: any) {
        return roles.filter((role) => matches(role, args.where));
      },
      async findUnique(args: any) {
        return roles.find((role) => role.id === args.where.id) || null;
      },
      async create(args: any) {
        if (roles.some((role) => role.organizationId === args.data.organizationId && role.name === args.data.name)) {
          const error = new Error("unique") as any;
          error.code = "P2002";
          throw error;
        }
        const now = new Date("2026-05-20T05:00:00.000Z");
        const role: RoleRow = { id: `role-${nextId++}`, createdAt: now, updatedAt: now, ...args.data };
        roles.push(role);
        return role;
      },
      async update(args: any) {
        const index = roles.findIndex((role) => role.id === args.where.id);
        roles[index] = { ...roles[index], ...args.data, updatedAt: new Date("2026-05-20T06:00:00.000Z") };
        return roles[index];
      },
      async delete(args: any) {
        const index = roles.findIndex((role) => role.id === args.where.id);
        const [deleted] = roles.splice(index, 1);
        return deleted;
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
  app.use("/api/roles", createRolesRouter(db as any));
  app.use("/api/protected-resource", requireOrganizationResourcePermission(db as any), (_req, res) => res.json({ ok: true }));
  return { app, roles };
}

describe("Role API and organization permission middleware", () => {
  it("lists current organization roles and creates missing default roles", async () => {
    const { app } = createTestApp();
    const response = await request(app).get("/api/roles?organizationId=org-a").set("x-user-id", "sales").expect(200);
    expect(response.body.map((role: any) => role.name).sort()).toEqual(["manager", "owner", "sales", "support"]);
  });

  it("rejects cross-organization role access", async () => {
    const { app } = createTestApp();
    await request(app).get("/api/roles?organizationId=org-b").set("x-user-id", "sales").expect(403);
    await request(app).get("/api/roles/role-other-owner").set("x-user-id", "sales").expect(403);
  });

  it("allows only owners to create, update and delete roles", async () => {
    const { app } = createTestApp({ roles: [makeRole({ id: "role-owner", organizationId: "org-a", name: "owner", description: "Owner role" })] });
    await request(app).post("/api/roles").set("x-user-id", "manager").send({ organizationId: "org-a", name: "sales", description: "Sales role" }).expect(403);
    const created = await request(app).post("/api/roles").set("x-user-id", "owner").send({ organizationId: "org-a", name: "sales", description: "Read only sales" }).expect(201);
    expect(created.body).toMatchObject({ organizationId: "org-a", name: "sales", description: "Read only sales" });
    await request(app).post("/api/roles").set("x-user-id", "owner").send({ organizationId: "org-a", name: "bad", description: "Bad" }).expect(400);
    await request(app).patch(`/api/roles/${created.body.id}`).set("x-user-id", "sales").send({ description: "Nope" }).expect(403);
    expect((await request(app).patch(`/api/roles/${created.body.id}`).set("x-user-id", "owner").send({ description: "Updated" }).expect(200)).body.description).toBe("Updated");
    await request(app).delete(`/api/roles/${created.body.id}`).set("x-user-id", "manager").expect(403);
    await request(app).delete(`/api/roles/${created.body.id}`).set("x-user-id", "owner").expect(204);
  });

  it("enforces owner/manager writes and sales/support read-only when organization context is provided", async () => {
    const { app } = createTestApp();
    await request(app).get("/api/protected-resource").set("x-user-id", "sales").set("x-organization-id", "org-a").expect(200);
    await request(app).post("/api/protected-resource").set("x-user-id", "sales").set("x-organization-id", "org-a").expect(403);
    await request(app).post("/api/protected-resource").set("x-user-id", "support").set("x-organization-id", "org-a").expect(403);
    await request(app).post("/api/protected-resource").set("x-user-id", "manager").set("x-organization-id", "org-a").expect(200);
    await request(app).post("/api/protected-resource").set("x-user-id", "owner").set("x-organization-id", "org-a").expect(200);
    await request(app).post("/api/protected-resource").set("x-user-id", "sales").expect(200);
  });
});

function makeRole(overrides: Partial<RoleRow> = {}): RoleRow {
  return {
    id: "role",
    organizationId: "org-a",
    name: "owner",
    description: "Role",
    createdAt: new Date("2026-05-20T05:00:00.000Z"),
    updatedAt: new Date("2026-05-20T05:00:00.000Z"),
    ...overrides
  };
}

function matches(row: any, where: any = {}) {
  return Object.entries(where).every(([key, expected]) => (row as any)[key] === expected);
}

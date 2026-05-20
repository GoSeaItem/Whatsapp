import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createOrganizationsRouter } from "./organizations-api.js";

type UserRow = { id: string; email: string; name: string };
type OrgRow = { id: string; name: string; ownerId: string; createdAt: Date; updatedAt: Date };
type MemberRow = { id: string; organizationId: string; userId: string; role: string; status: string; createdAt: Date; updatedAt: Date };

function createTestApp(seed: { users?: UserRow[]; organizations?: OrgRow[]; members?: MemberRow[] } = {}) {
  const users = seed.users || [
    { id: "owner", email: "owner@example.com", name: "Owner" },
    { id: "manager", email: "manager@example.com", name: "Manager" },
    { id: "sales", email: "sales@example.com", name: "Sales" },
    { id: "other", email: "other@example.com", name: "Other" }
  ];
  const organizations = [...(seed.organizations || [])];
  const members = [...(seed.members || [])];
  let nextId = 1;

  const db = {
    user: {
      async findUnique(args: { where: { id: string } }) {
        return users.find((user) => user.id === args.where.id) || null;
      }
    },
    organization: {
      async findMany(args: any) {
        return organizations
          .filter((org) => matchesOrganizationWhere(org, members, args.where))
          .map((org) => includeMembers(org, members, users));
      },
      async findFirst(args: any) {
        const org = organizations.find((item) => matchesOrganizationWhere(item, members, args.where));
        return org ? includeMembers(org, members, users) : null;
      },
      async create(args: any) {
        const now = new Date("2026-05-20T04:00:00.000Z");
        const org: OrgRow = { id: `org-${nextId++}`, name: args.data.name, ownerId: args.data.ownerId, createdAt: now, updatedAt: now };
        organizations.push(org);
        members.push({
          id: `member-${nextId++}`,
          organizationId: org.id,
          userId: args.data.members.create.userId,
          role: args.data.members.create.role,
          status: args.data.members.create.status,
          createdAt: now,
          updatedAt: now
        });
        return includeMembers(org, members, users);
      },
      async update(args: any) {
        const index = organizations.findIndex((org) => org.id === args.where.id);
        organizations[index] = { ...organizations[index], ...args.data, updatedAt: new Date("2026-05-20T05:00:00.000Z") };
        return includeMembers(organizations[index], members, users);
      },
      async delete(args: { where: { id: string } }) {
        const index = organizations.findIndex((org) => org.id === args.where.id);
        const [deleted] = organizations.splice(index, 1);
        for (let i = members.length - 1; i >= 0; i -= 1) {
          if (members[i].organizationId === args.where.id) members.splice(i, 1);
        }
        return deleted;
      }
    },
    organizationMember: {
      async create(args: any) {
        const now = new Date("2026-05-20T04:30:00.000Z");
        const member: MemberRow = { id: `member-${nextId++}`, createdAt: now, updatedAt: now, ...args.data };
        members.push(member);
        return { ...member, user: users.find((user) => user.id === member.userId) || null };
      },
      async update(args: any) {
        const index = members.findIndex((member) => member.id === args.where.id);
        members[index] = { ...members[index], ...args.data, updatedAt: new Date("2026-05-20T05:30:00.000Z") };
        return { ...members[index], user: users.find((user) => user.id === members[index].userId) || null };
      },
      async delete(args: { where: { id: string } }) {
        const index = members.findIndex((member) => member.id === args.where.id);
        const [deleted] = members.splice(index, 1);
        return deleted;
      }
    }
  };

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const userId = req.header("x-user-id") || "owner";
    const user = users.find((item) => item.id === userId) || users[0];
    req.user = { id: user.id, email: user.email, name: user.name };
    next();
  });
  app.use("/api/organizations", createOrganizationsRouter(db as any));
  return { app, organizations, members };
}

describe("Organization and member API", () => {
  it("creates organizations and adds owner membership", async () => {
    const { app } = createTestApp();
    const response = await request(app).post("/api/organizations").set("x-user-id", "owner").send({ name: "GoSea Sales" }).expect(201);
    expect(response.body).toMatchObject({ id: "org-1", name: "GoSea Sales", ownerId: "owner", currentUserRole: "owner" });
    expect(response.body.members).toHaveLength(1);
    expect(response.body.members[0]).toMatchObject({ userId: "owner", role: "owner", status: "active" });
  });

  it("lists only organizations visible to the current active member", async () => {
    const { app } = createTestApp(seedOrganizations());
    expect((await request(app).get("/api/organizations").set("x-user-id", "owner").expect(200)).body.map((item: any) => item.id)).toEqual(["org-a"]);
    expect((await request(app).get("/api/organizations").set("x-user-id", "sales").expect(200)).body.map((item: any) => item.id)).toEqual(["org-a"]);
    expect((await request(app).get("/api/organizations").set("x-user-id", "other").expect(200)).body.map((item: any) => item.id)).toEqual(["org-b"]);
  });

  it("allows only owners to update and delete organizations", async () => {
    const { app } = createTestApp(seedOrganizations());
    await request(app).patch("/api/organizations/org-a").set("x-user-id", "manager").send({ name: "Bad" }).expect(403);
    expect((await request(app).patch("/api/organizations/org-a").set("x-user-id", "owner").send({ name: "New name" }).expect(200)).body.name).toBe("New name");
    await request(app).delete("/api/organizations/org-a").set("x-user-id", "manager").expect(403);
    await request(app).delete("/api/organizations/org-a").set("x-user-id", "owner").expect(204);
  });

  it("adds members, validates userId, and rejects duplicate members", async () => {
    const { app } = createTestApp(seedOrganizations());
    const response = await request(app)
      .post("/api/organizations/org-a/members")
      .set("x-user-id", "manager")
      .send({ userId: "support", role: "support", status: "active" })
      .expect(201);
    expect(response.body).toMatchObject({ userId: "support", role: "support", status: "active" });
    await request(app).post("/api/organizations/org-a/members").set("x-user-id", "manager").send({ userId: "missing", role: "sales" }).expect(404);
    await request(app).post("/api/organizations/org-a/members").set("x-user-id", "manager").send({ userId: "sales", role: "sales" }).expect(409);
    await request(app).post("/api/organizations/org-a/members").set("x-user-id", "manager").send({ userId: "other", role: "owner" }).expect(400);
  });

  it("updates roles and statuses when the current user has manager permission", async () => {
    const { app } = createTestApp(seedOrganizations());
    const response = await request(app)
      .patch("/api/organizations/org-a/members/member-sales")
      .set("x-user-id", "manager")
      .send({ role: "support", status: "inactive" })
      .expect(200);
    expect(response.body).toMatchObject({ id: "member-sales", role: "support", status: "inactive" });
    await request(app).patch("/api/organizations/org-a/members/member-sales").set("x-user-id", "manager").send({ role: "bad" }).expect(400);
    await request(app).patch("/api/organizations/org-a/members/member-sales").set("x-user-id", "manager").send({ role: "owner" }).expect(400);
  });

  it("removes members when authorized and protects owner members from manager changes", async () => {
    const { app } = createTestApp(seedOrganizations());
    await request(app).delete("/api/organizations/org-a/members/member-sales").set("x-user-id", "manager").expect(204);
    await request(app).patch("/api/organizations/org-a/members/member-owner").set("x-user-id", "manager").send({ role: "sales" }).expect(403);
    await request(app).delete("/api/organizations/org-a/members/member-owner").set("x-user-id", "manager").expect(403);
    await request(app).delete("/api/organizations/org-a/members/member-owner").set("x-user-id", "owner").expect(403);
  });

  it("rejects cross-organization access and member writes from users outside the organization", async () => {
    const { app } = createTestApp(seedOrganizations());
    await request(app).get("/api/organizations/org-b").set("x-user-id", "sales").expect(404);
    await request(app).get("/api/organizations/org-b/members").set("x-user-id", "sales").expect(404);
    await request(app).post("/api/organizations/org-b/members").set("x-user-id", "sales").send({ userId: "manager", role: "manager" }).expect(404);
    await request(app).patch("/api/organizations/org-b/members/member-other").set("x-user-id", "sales").send({ role: "sales" }).expect(404);
    await request(app).delete("/api/organizations/org-b/members/member-other").set("x-user-id", "sales").expect(404);
  });

  it("requires owner or manager role for member management", async () => {
    const { app } = createTestApp(seedOrganizations());
    await request(app).post("/api/organizations/org-a/members").set("x-user-id", "sales").send({ userId: "support", role: "support" }).expect(403);
    await request(app).patch("/api/organizations/org-a/members/member-manager").set("x-user-id", "sales").send({ role: "sales" }).expect(403);
    await request(app).delete("/api/organizations/org-a/members/member-manager").set("x-user-id", "sales").expect(403);
  });
});

function seedOrganizations() {
  return {
    users: [
      { id: "owner", email: "owner@example.com", name: "Owner" },
      { id: "manager", email: "manager@example.com", name: "Manager" },
      { id: "sales", email: "sales@example.com", name: "Sales" },
      { id: "support", email: "support@example.com", name: "Support" },
      { id: "other", email: "other@example.com", name: "Other" }
    ],
    organizations: [
      makeOrg({ id: "org-a", ownerId: "owner", name: "Org A" }),
      makeOrg({ id: "org-b", ownerId: "other", name: "Org B" })
    ],
    members: [
      makeMember({ id: "member-owner", organizationId: "org-a", userId: "owner", role: "owner" }),
      makeMember({ id: "member-manager", organizationId: "org-a", userId: "manager", role: "manager" }),
      makeMember({ id: "member-sales", organizationId: "org-a", userId: "sales", role: "sales" }),
      makeMember({ id: "member-other", organizationId: "org-b", userId: "other", role: "owner" })
    ]
  };
}

function makeOrg(overrides: Partial<OrgRow> = {}): OrgRow {
  return {
    id: "org",
    name: "Org",
    ownerId: "owner",
    createdAt: new Date("2026-05-20T04:00:00.000Z"),
    updatedAt: new Date("2026-05-20T04:00:00.000Z"),
    ...overrides
  };
}

function makeMember(overrides: Partial<MemberRow> = {}): MemberRow {
  return {
    id: "member",
    organizationId: "org",
    userId: "owner",
    role: "owner",
    status: "active",
    createdAt: new Date("2026-05-20T04:00:00.000Z"),
    updatedAt: new Date("2026-05-20T04:00:00.000Z"),
    ...overrides
  };
}

function includeMembers(org: OrgRow, members: MemberRow[], users: UserRow[]) {
  return {
    ...org,
    members: members
      .filter((member) => member.organizationId === org.id)
      .map((member) => ({ ...member, user: users.find((user) => user.id === member.userId) || null }))
  };
}

function matchesOrganizationWhere(org: OrgRow, members: MemberRow[], where: any = {}) {
  return Object.entries(where).every(([key, expected]: [string, any]) => {
    if (expected === undefined) return true;
    if (key === "OR" && Array.isArray(expected)) return expected.some((candidate) => matchesOrganizationWhere(org, members, candidate));
    if (key === "members" && expected?.some) {
      return members.some((member) => member.organizationId === org.id && matchesMemberWhere(member, expected.some));
    }
    return (org as any)[key] === expected;
  });
}

function matchesMemberWhere(member: MemberRow, where: any = {}) {
  return Object.entries(where).every(([key, expected]) => (member as any)[key] === expected);
}

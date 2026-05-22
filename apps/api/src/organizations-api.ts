import { Router } from "express";
import { Prisma } from "@prisma/client";
import {
  ORGANIZATION_MEMBER_STATUSES,
  ORGANIZATION_ROLES,
  type OrganizationMemberStatus,
  type OrganizationRole
} from "@wa-ai/shared";
import { prisma } from "./db.js";
import { defaultRoleDescriptions } from "./organization-permissions.js";
import { recordSecurityAudit, requireConfirm } from "./permissions.js";

type OrganizationDb = Pick<typeof prisma, "organization" | "organizationMember" | "user">;
type Membership = { id: string; organizationId: string; userId: string; role: string; status: string };

const roleSet = new Set<string>(ORGANIZATION_ROLES);
const statusSet = new Set<string>(ORGANIZATION_MEMBER_STATUSES);
const managerRoles = new Set(["owner", "manager"]);

export function createOrganizationsRouter(db: OrganizationDb = prisma) {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const items = await db.organization.findMany({
        where: visibleOrganizationWhere(req.user!.id),
        include: { members: true },
        orderBy: { updatedAt: "desc" }
      });
      res.json(items.map((item: any) => serializeOrganization(item, req.user!.id)));
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const organization = await loadVisibleOrganization(db, req.params.id, req.user!.id);
      if (!organization) return res.status(404).json({ message: "organization not found" });
      res.json(serializeOrganizationDetail(organization, req.user!.id));
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      const name = clean(req.body?.name);
      if (!name) return res.status(400).json({ message: "validation failed", errors: [{ field: "name", message: "name is required" }] });

      const organization = await db.organization.create({
        data: {
          name,
          ownerId: req.user!.id,
          members: {
            create: {
              userId: req.user!.id,
              role: "owner",
              status: "active"
            }
          },
          roles: {
            create: ORGANIZATION_ROLES.map((name) => ({
              name,
              description: defaultRoleDescriptions[name]
            }))
          }
        },
        include: memberInclude()
      });
      res.status(201).json(serializeOrganizationDetail(organization, req.user!.id));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id", async (req, res, next) => {
    try {
      const organization = await loadVisibleOrganization(db, req.params.id, req.user!.id);
      if (!organization) return res.status(404).json({ message: "organization not found" });
      if (organization.ownerId !== req.user!.id) return res.status(403).json({ message: "owner role required" });

      const name = clean(req.body?.name);
      if (!name) return res.status(400).json({ message: "validation failed", errors: [{ field: "name", message: "name is required" }] });

      const updated = await db.organization.update({
        where: { id: req.params.id },
        data: { name },
        include: memberInclude()
      });
      res.json(serializeOrganizationDetail(updated, req.user!.id));
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", async (req, res, next) => {
    try {
      const organization = await loadVisibleOrganization(db, req.params.id, req.user!.id);
      if (!organization) return res.status(404).json({ message: "organization not found" });
      if (organization.ownerId !== req.user!.id) return res.status(403).json({ message: "owner role required" });
      const confirmError = requireConfirm(req, "organization.delete");
      if (confirmError) {
        await recordSecurityAudit(db as any, req, { organizationId: req.params.id, action: "confirm_required", entityType: "Organization", entityId: req.params.id, riskLevel: "high", metadata: { confirmRequired: true } });
        return res.status(409).json(confirmError);
      }
      await db.organization.delete({ where: { id: req.params.id } });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id/members", async (req, res, next) => {
    try {
      const organization = await loadVisibleOrganization(db, req.params.id, req.user!.id);
      if (!organization) return res.status(404).json({ message: "organization not found" });
      const q = clean(req.query.q);
      let members = organization.members.map(serializeMember);
      if (q) {
        const needle = q.toLowerCase();
        members = members.filter((member) => `${member.userName || ""} ${member.userEmail || ""}`.toLowerCase().includes(needle));
      }
      res.json(members);
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/members", async (req, res, next) => {
    try {
      const organization = await loadVisibleOrganization(db, req.params.id, req.user!.id);
      if (!organization) return res.status(404).json({ message: "organization not found" });
      const currentMember = currentMembership(organization.members, req.user!.id);
      if (!canManageMembers(currentMember)) return res.status(403).json({ message: "owner or manager role required" });

      const userId = clean(req.body?.userId);
      const role = clean(req.body?.role) || "sales";
      const status = clean(req.body?.status) || "active";
      const errors = validateMemberPayload({ userId, role, status }, { requireUser: true });
      if (role === "owner") errors.push({ field: "role", message: "owner role is reserved for organization creator" });
      if (errors.length) return res.status(400).json({ message: "validation failed", errors });

      const user = await db.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ message: "user not found" });
      if (organization.members.some((member: Membership) => member.userId === userId)) {
        return res.status(409).json({ message: "member already exists" });
      }

      const member = await db.organizationMember.create({
        data: { organizationId: req.params.id, userId, role, status },
        include: { user: true }
      });
      res.status(201).json(serializeMember(member));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id/members/:memberId", async (req, res, next) => {
    try {
      const organization = await loadVisibleOrganization(db, req.params.id, req.user!.id);
      if (!organization) return res.status(404).json({ message: "organization not found" });
      const currentMember = currentMembership(organization.members, req.user!.id);
      if (!canManageMembers(currentMember)) return res.status(403).json({ message: "owner or manager role required" });

      const target = organization.members.find((member: Membership) => member.id === req.params.memberId);
      if (!target) return res.status(404).json({ message: "member not found" });
      if (target.role === "owner") return res.status(403).json({ message: "organization owner member cannot be changed" });

      const role = req.body?.role === undefined ? undefined : clean(req.body.role);
      const status = req.body?.status === undefined ? undefined : clean(req.body.status);
      const errors = validateMemberPayload({ role, status }, { partial: true });
      if (role === "owner") errors.push({ field: "role", message: "owner role is reserved for organization creator" });
      if (errors.length) return res.status(400).json({ message: "validation failed", errors });
      const sensitiveAction = role !== undefined ? "member.updateRole" : status === "inactive" ? "member.disable" : "";
      if (sensitiveAction) {
        const confirmError = requireConfirm(req, sensitiveAction);
        if (confirmError) {
          await recordSecurityAudit(db as any, req, { organizationId: req.params.id, action: "confirm_required", entityType: "OrganizationMember", entityId: target.id, riskLevel: "high", metadata: { confirmRequired: true, operation: sensitiveAction } });
          return res.status(409).json(confirmError);
        }
      }

      const member = await db.organizationMember.update({
        where: { id: req.params.memberId },
        data: {
          ...(role ? { role } : {}),
          ...(status ? { status } : {})
        },
        include: { user: true }
      });
      res.json(serializeMember(member));
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id/members/:memberId", async (req, res, next) => {
    try {
      const organization = await loadVisibleOrganization(db, req.params.id, req.user!.id);
      if (!organization) return res.status(404).json({ message: "organization not found" });
      const currentMember = currentMembership(organization.members, req.user!.id);
      if (!canManageMembers(currentMember)) return res.status(403).json({ message: "owner or manager role required" });

      const target = organization.members.find((member: Membership) => member.id === req.params.memberId);
      if (!target) return res.status(404).json({ message: "member not found" });
      if (target.role === "owner") return res.status(403).json({ message: "organization owner member cannot be removed" });
      const confirmError = requireConfirm(req, "member.remove");
      if (confirmError) {
        await recordSecurityAudit(db as any, req, { organizationId: req.params.id, action: "confirm_required", entityType: "OrganizationMember", entityId: target.id, riskLevel: "high", metadata: { confirmRequired: true } });
        return res.status(409).json(confirmError);
      }

      await db.organizationMember.delete({ where: { id: req.params.memberId } });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export const organizationsRouter = createOrganizationsRouter();

function visibleOrganizationWhere(userId: string): Prisma.OrganizationWhereInput {
  return {
    OR: [
      { ownerId: userId },
      { members: { some: { userId, status: "active" } } }
    ]
  };
}

function memberInclude() {
  return { members: { include: { user: true }, orderBy: { createdAt: "asc" as const } } };
}

async function loadVisibleOrganization(db: OrganizationDb, id: string, userId: string) {
  return db.organization.findFirst({
    where: { id, ...visibleOrganizationWhere(userId) },
    include: memberInclude()
  });
}

function currentMembership(members: Membership[], userId: string) {
  return members.find((member) => member.userId === userId && member.status === "active") || null;
}

function canManageMembers(member: Membership | null) {
  return Boolean(member && managerRoles.has(member.role));
}

function validateMemberPayload(payload: { userId?: string; role?: string; status?: string }, options: { partial?: boolean; requireUser?: boolean } = {}) {
  const errors: Array<{ field: string; message: string }> = [];
  if (options.requireUser && !payload.userId) errors.push({ field: "userId", message: "userId is required" });
  if (!options.partial || payload.role !== undefined) {
    if (!payload.role || !roleSet.has(payload.role)) errors.push({ field: "role", message: "role is invalid" });
  }
  if (!options.partial || payload.status !== undefined) {
    if (!payload.status || !statusSet.has(payload.status)) errors.push({ field: "status", message: "status is invalid" });
  }
  return errors;
}

function serializeOrganization(item: any, currentUserId: string) {
  const member = currentMembership(item.members || [], currentUserId);
  return {
    id: item.id,
    name: item.name,
    ownerId: item.ownerId,
    currentUserRole: item.ownerId === currentUserId ? "owner" : (member?.role as OrganizationRole | undefined) || null,
    currentUserStatus: (member?.status as OrganizationMemberStatus | undefined) || null,
    memberCount: item.members?.length || 0,
    createdAt: iso(item.createdAt),
    updatedAt: iso(item.updatedAt)
  };
}

function serializeOrganizationDetail(item: any, currentUserId: string) {
  return {
    ...serializeOrganization(item, currentUserId),
    members: (item.members || []).map(serializeMember)
  };
}

function serializeMember(member: any) {
  return {
    id: member.id,
    organizationId: member.organizationId,
    userId: member.userId,
    role: member.role,
    status: member.status,
    userName: member.user?.name || null,
    userEmail: member.user?.email || null,
    createdAt: iso(member.createdAt),
    updatedAt: iso(member.updatedAt)
  };
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function iso(value: unknown) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

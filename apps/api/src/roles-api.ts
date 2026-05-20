import { Router } from "express";
import { ORGANIZATION_ROLES, type OrganizationRole } from "@wa-ai/shared";
import { prisma } from "./db.js";
import {
  canManageOrganizationRoles,
  canReadOrganization,
  defaultRoleDescriptions,
  ensureDefaultRoles,
  getActiveOrganizationRole,
  organizationIdFromRequest
} from "./organization-permissions.js";

type RoleDb = Pick<typeof prisma, "role" | "organizationMember">;
const roleSet = new Set<string>(ORGANIZATION_ROLES);

export function createRolesRouter(db: RoleDb = prisma) {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const organizationId = clean(req.query.organizationId);
      if (!organizationId) return res.status(400).json({ message: "organizationId is required" });
      const role = await getActiveOrganizationRole(db, organizationId, req.user!.id);
      if (!canReadOrganization(role)) return res.status(403).json({ message: "organization membership required" });
      await ensureDefaultRoles(db, organizationId);
      const q = clean(req.query.q).toLowerCase();
      let roles = await db.role.findMany({ where: { organizationId }, orderBy: { name: "asc" } });
      if (q) roles = roles.filter((item: any) => `${item.name} ${item.description}`.toLowerCase().includes(q));
      res.json(roles.map(serializeRole));
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const roleRow = await db.role.findUnique({ where: { id: req.params.id } });
      if (!roleRow) return res.status(404).json({ message: "role not found" });
      const role = await getActiveOrganizationRole(db, roleRow.organizationId, req.user!.id);
      if (!canReadOrganization(role)) return res.status(403).json({ message: "organization membership required" });
      res.json(serializeRole(roleRow));
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      const organizationId = clean(req.body?.organizationId);
      const name = clean(req.body?.name);
      const description = clean(req.body?.description) || (roleSet.has(name) ? defaultRoleDescriptions[name as OrganizationRole] : "");
      const errors = validateRolePayload({ organizationId, name, description });
      if (errors.length) return res.status(400).json({ message: "validation failed", errors });

      const currentRole = await getActiveOrganizationRole(db, organizationId, req.user!.id);
      if (!canManageOrganizationRoles(currentRole)) return res.status(403).json({ message: "owner role required" });

      const created = await db.role.create({
        data: { organizationId, name, description }
      });
      res.status(201).json(serializeRole(created));
    } catch (error: any) {
      if (error?.code === "P2002") return res.status(409).json({ message: "role already exists" });
      next(error);
    }
  });

  router.patch("/:id", async (req, res, next) => {
    try {
      const roleRow = await db.role.findUnique({ where: { id: req.params.id } });
      if (!roleRow) return res.status(404).json({ message: "role not found" });
      const currentRole = await getActiveOrganizationRole(db, roleRow.organizationId, req.user!.id);
      if (!canManageOrganizationRoles(currentRole)) return res.status(403).json({ message: "owner role required" });

      const description = req.body?.description === undefined ? roleRow.description : clean(req.body.description);
      if (!description) {
        return res.status(400).json({ message: "validation failed", errors: [{ field: "description", message: "description is required" }] });
      }
      const updated = await db.role.update({ where: { id: req.params.id }, data: { description } });
      res.json(serializeRole(updated));
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", async (req, res, next) => {
    try {
      const roleRow = await db.role.findUnique({ where: { id: req.params.id } });
      if (!roleRow) return res.status(404).json({ message: "role not found" });
      const currentRole = await getActiveOrganizationRole(db, roleRow.organizationId, req.user!.id);
      if (!canManageOrganizationRoles(currentRole)) return res.status(403).json({ message: "owner role required" });
      await db.role.delete({ where: { id: req.params.id } });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export const rolesRouter = createRolesRouter();

function validateRolePayload(payload: { organizationId?: string; name?: string; description?: string }) {
  const errors: Array<{ field: string; message: string }> = [];
  if (!payload.organizationId) errors.push({ field: "organizationId", message: "organizationId is required" });
  if (!payload.name || !roleSet.has(payload.name)) errors.push({ field: "name", message: "role name is invalid" });
  if (!payload.description) errors.push({ field: "description", message: "description is required" });
  return errors;
}

function serializeRole(role: any) {
  return {
    id: role.id,
    organizationId: role.organizationId,
    name: role.name,
    description: role.description,
    createdAt: iso(role.createdAt),
    updatedAt: iso(role.updatedAt)
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

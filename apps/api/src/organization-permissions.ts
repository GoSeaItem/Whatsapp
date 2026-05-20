import type { NextFunction, Request, Response } from "express";
import { ORGANIZATION_ROLES, type OrganizationRole } from "@wa-ai/shared";
import { prisma } from "./db.js";

export const defaultRoleDescriptions: Record<OrganizationRole, string> = {
  owner: "Full access to organization settings, members, roles and organization resources.",
  manager: "Can manage members and organization resources, but cannot delete organization or change owner.",
  sales: "Read-only access to organization resources in V3-B.",
  support: "Read-only access to organization resources in V3-B."
};

export type OrganizationPermissionDb = Pick<typeof prisma, "organizationMember"> & Partial<Pick<typeof prisma, "role">>;
type OrganizationRoleDb = Pick<typeof prisma, "organizationMember" | "role">;

export function organizationIdFromRequest(req: Request) {
  const header = req.header("x-organization-id");
  const query = typeof req.query.organizationId === "string" ? req.query.organizationId : "";
  const body = typeof req.body?.organizationId === "string" ? req.body.organizationId : "";
  return clean(header || query || body);
}

export async function ensureDefaultRoles(db: OrganizationRoleDb, organizationId: string) {
  const existing = await db.role.findMany({ where: { organizationId } });
  const existingNames = new Set(existing.map((role: any) => role.name));
  await Promise.all(
    ORGANIZATION_ROLES
      .filter((name) => !existingNames.has(name))
      .map((name) =>
        db.role.create({
          data: {
            organizationId,
            name,
            description: defaultRoleDescriptions[name]
          }
        })
      )
  );
}

export async function getActiveOrganizationRole(db: OrganizationPermissionDb, organizationId: string, userId: string) {
  const member = await db.organizationMember.findFirst({
    where: { organizationId, userId, status: "active" }
  });
  return (member?.role as OrganizationRole | undefined) || null;
}

export function canReadOrganization(role: OrganizationRole | null) {
  return Boolean(role && ORGANIZATION_ROLES.includes(role));
}

export function canWriteOrganizationResource(role: OrganizationRole | null) {
  return role === "owner" || role === "manager";
}

export function canManageOrganizationRoles(role: OrganizationRole | null) {
  return role === "owner";
}

export function requireOrganizationResourcePermission(db: OrganizationPermissionDb = prisma) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = organizationIdFromRequest(req);
      if (!organizationId) {
        next();
        return;
      }

      const role = await getActiveOrganizationRole(db, organizationId, req.user!.id);
      if (!canReadOrganization(role)) {
        res.status(403).json({ message: "organization membership required" });
        return;
      }

      const isWrite = !["GET", "HEAD", "OPTIONS"].includes(req.method);
      if (isWrite && !canWriteOrganizationResource(role)) {
        res.status(403).json({ message: "owner or manager role required" });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

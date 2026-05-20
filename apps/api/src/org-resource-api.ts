import { Router } from "express";
import { Prisma } from "@prisma/client";
import type { MaterialUpsertRequest, ProductUpsertRequest } from "@wa-ai/shared";
import { prisma } from "./db.js";
import { writeAuditLog } from "./audit-log-utils.js";
import { serializeMaterial, toMaterialUpdateData, validateMaterialPayload } from "./material-utils.js";
import {
  canReadOrganization,
  canWriteOrganizationResource,
  getActiveOrganizationRole,
  organizationIdFromRequest
} from "./organization-permissions.js";
import { serializeProduct, toProductUpdateData, validateProductPayload } from "./product-utils.js";

type OrgResourceDb = Pick<
  typeof prisma,
  "organizationMember" | "organizationProduct" | "organizationMaterial" | "product" | "material" | "auditLog"
>;

export function createOrganizationProductsRouter(db: OrgResourceDb = prisma) {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const organizationId = organizationIdFromRequest(req);
      if (!(await canAccessOrganization(db, organizationId, req.user!.id, false))) {
        res.status(403).json({ message: "organization membership required" });
        return;
      }
      const q = clean(req.query.q);
      const category = clean(req.query.category);
      const where: Record<string, unknown> = { organizationId };
      if (category || q) {
        where.product = {
          ...(category ? { category: { contains: category, mode: "insensitive" } } : {}),
          ...(q
            ? {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { sku: { contains: q, mode: "insensitive" } },
                  { category: { contains: q, mode: "insensitive" } }
                ]
              }
            : {})
        };
      }

      const links = await db.organizationProduct.findMany({
        where,
        include: { product: true },
        orderBy: { updatedAt: "desc" },
        take: 200
      });
      res.json(links.map(serializeOrganizationProduct));
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const link = await db.organizationProduct.findUnique({ where: { id: req.params.id }, include: { product: true } });
      if (!link) {
        res.status(404).json({ message: "organization product not found" });
        return;
      }
      if (!(await canAccessOrganization(db, link.organizationId, req.user!.id, false))) {
        res.status(403).json({ message: "organization membership required" });
        return;
      }
      res.json(serializeOrganizationProduct(link));
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      const organizationId = clean(req.body.organizationId);
      const productId = clean(req.body.productId);
      if (!productId) {
        res.status(400).json({ message: "productId is required" });
        return;
      }
      if (!(await canAccessOrganization(db, organizationId, req.user!.id, true))) {
        res.status(403).json({ message: "owner or manager role required" });
        return;
      }
      const product = await db.product.findFirst({ where: { id: productId, ownerId: req.user!.id } });
      if (!product) {
        res.status(404).json({ message: "product not found or not owned by current user" });
        return;
      }
      const link = await db.organizationProduct.create({
        data: { organizationId, productId, createdBy: req.user!.id },
        include: { product: true }
      });
      await writeAuditLog(db, { organizationId, userId: req.user!.id, action: "create", entityType: "Product", entityId: productId, before: null, after: product });
      res.status(201).json(serializeOrganizationProduct(link));
    } catch (error) {
      if (isPrismaError(error, "P2002")) {
        res.status(409).json({ message: "product already shared to this organization" });
        return;
      }
      next(error);
    }
  });

  router.patch("/:id", async (req, res, next) => {
    try {
      const link = await db.organizationProduct.findUnique({ where: { id: req.params.id }, include: { product: true } });
      if (!link) {
        res.status(404).json({ message: "organization product not found" });
        return;
      }
      if (!(await canAccessOrganization(db, link.organizationId, req.user!.id, true))) {
        res.status(403).json({ message: "owner or manager role required" });
        return;
      }
      const errors = validateProductPayload(req.body as Partial<ProductUpsertRequest>, { partial: true });
      if (errors.length > 0) {
        res.status(400).json({ message: "validation failed", errors });
        return;
      }
      const product = await db.product.update({ where: { id: link.productId }, data: toProductUpdateData(req.body) });
      await db.organizationProduct.update({ where: { id: link.id }, data: {} }).catch(() => undefined);
      await writeAuditLog(db, { organizationId: link.organizationId, userId: req.user!.id, action: "update", entityType: "Product", entityId: link.productId, before: link.product, after: product });
      res.json(serializeOrganizationProduct({ ...link, product }));
    } catch (error) {
      if (isPrismaError(error, "P2002")) {
        res.status(409).json({ message: "SKU already exists for product owner" });
        return;
      }
      next(error);
    }
  });

  router.delete("/:id", async (req, res, next) => {
    try {
      const link = await db.organizationProduct.findUnique({ where: { id: req.params.id }, include: { product: true } });
      if (!link) {
        res.status(404).json({ message: "organization product not found" });
        return;
      }
      if (!(await canAccessOrganization(db, link.organizationId, req.user!.id, true))) {
        res.status(403).json({ message: "owner or manager role required" });
        return;
      }
      await db.organizationProduct.delete({ where: { id: req.params.id } });
      await writeAuditLog(db, { organizationId: link.organizationId, userId: req.user!.id, action: "delete", entityType: "Product", entityId: link.productId, before: link.product, after: null });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export function createOrganizationMaterialsRouter(db: OrgResourceDb = prisma) {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const organizationId = organizationIdFromRequest(req);
      if (!(await canAccessOrganization(db, organizationId, req.user!.id, false))) {
        res.status(403).json({ message: "organization membership required" });
        return;
      }
      const q = clean(req.query.q);
      const type = clean(req.query.type);
      const productSku = clean(req.query.productSku);
      const where: Record<string, unknown> = { organizationId };
      if (type || q || productSku) {
        where.material = {
          ...(type ? { type } : {}),
          ...(productSku ? { product: { sku: { contains: productSku, mode: "insensitive" } } } : {}),
          ...(q
            ? {
                OR: [
                  { title: { contains: q, mode: "insensitive" } },
                  { description: { contains: q, mode: "insensitive" } },
                  { type: { contains: q, mode: "insensitive" } },
                  { product: { sku: { contains: q, mode: "insensitive" } } }
                ]
              }
            : {})
        };
      }

      const links = await db.organizationMaterial.findMany({
        where,
        include: { material: true },
        orderBy: { updatedAt: "desc" },
        take: 200
      });
      res.json(links.map(serializeOrganizationMaterial));
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const link = await db.organizationMaterial.findUnique({ where: { id: req.params.id }, include: { material: true } });
      if (!link) {
        res.status(404).json({ message: "organization material not found" });
        return;
      }
      if (!(await canAccessOrganization(db, link.organizationId, req.user!.id, false))) {
        res.status(403).json({ message: "organization membership required" });
        return;
      }
      res.json(serializeOrganizationMaterial(link));
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      const organizationId = clean(req.body.organizationId);
      const materialId = clean(req.body.materialId);
      if (!materialId) {
        res.status(400).json({ message: "materialId is required" });
        return;
      }
      if (!(await canAccessOrganization(db, organizationId, req.user!.id, true))) {
        res.status(403).json({ message: "owner or manager role required" });
        return;
      }
      const material = await db.material.findFirst({ where: { id: materialId, ownerId: req.user!.id } });
      if (!material) {
        res.status(404).json({ message: "material not found or not owned by current user" });
        return;
      }
      const link = await db.organizationMaterial.create({
        data: { organizationId, materialId, createdBy: req.user!.id },
        include: { material: true }
      });
      await writeAuditLog(db, { organizationId, userId: req.user!.id, action: "create", entityType: "Material", entityId: materialId, before: null, after: material });
      res.status(201).json(serializeOrganizationMaterial(link));
    } catch (error) {
      if (isPrismaError(error, "P2002")) {
        res.status(409).json({ message: "material already shared to this organization" });
        return;
      }
      next(error);
    }
  });

  router.patch("/:id", async (req, res, next) => {
    try {
      const link = await db.organizationMaterial.findUnique({ where: { id: req.params.id }, include: { material: true } });
      if (!link) {
        res.status(404).json({ message: "organization material not found" });
        return;
      }
      if (!(await canAccessOrganization(db, link.organizationId, req.user!.id, true))) {
        res.status(403).json({ message: "owner or manager role required" });
        return;
      }
      const errors = validateMaterialPayload(req.body as Partial<MaterialUpsertRequest>, { partial: true });
      if (errors.length > 0) {
        res.status(400).json({ message: "validation failed", errors });
        return;
      }
      const data = toMaterialUpdateData(req.body);
      if (typeof data.productId === "string" && !(await canUseProduct(db, data.productId, link.organizationId, req.user!.id))) {
        res.status(404).json({ message: "product not found" });
        return;
      }
      const material = await db.material.update({ where: { id: link.materialId }, data });
      await db.organizationMaterial.update({ where: { id: link.id }, data: {} }).catch(() => undefined);
      await writeAuditLog(db, { organizationId: link.organizationId, userId: req.user!.id, action: "update", entityType: "Material", entityId: link.materialId, before: link.material, after: material });
      res.json(serializeOrganizationMaterial({ ...link, material }));
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", async (req, res, next) => {
    try {
      const link = await db.organizationMaterial.findUnique({ where: { id: req.params.id }, include: { material: true } });
      if (!link) {
        res.status(404).json({ message: "organization material not found" });
        return;
      }
      if (!(await canAccessOrganization(db, link.organizationId, req.user!.id, true))) {
        res.status(403).json({ message: "owner or manager role required" });
        return;
      }
      await db.organizationMaterial.delete({ where: { id: req.params.id } });
      await writeAuditLog(db, { organizationId: link.organizationId, userId: req.user!.id, action: "delete", entityType: "Material", entityId: link.materialId, before: link.material, after: null });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export const organizationProductsRouter = createOrganizationProductsRouter();
export const organizationMaterialsRouter = createOrganizationMaterialsRouter();

async function canAccessOrganization(db: OrgResourceDb, organizationId: string, userId: string, write: boolean) {
  if (!organizationId) return false;
  const role = await getActiveOrganizationRole(db, organizationId, userId);
  return write ? canWriteOrganizationResource(role) : canReadOrganization(role);
}

async function canUseProduct(db: OrgResourceDb, productId: string, organizationId: string, userId: string) {
  const owned = await db.product.findFirst({ where: { id: productId, ownerId: userId } });
  if (owned) return true;
  return Boolean(await db.organizationProduct.findFirst({ where: { organizationId, productId } }));
}

function serializeOrganizationProduct(link: any) {
  return {
    id: link.id,
    organizationId: link.organizationId,
    productId: link.productId,
    createdBy: link.createdBy || null,
    createdAt: link.createdAt.toISOString(),
    updatedAt: link.updatedAt.toISOString(),
    product: serializeProduct(link.product)
  };
}

function serializeOrganizationMaterial(link: any) {
  return {
    id: link.id,
    organizationId: link.organizationId,
    materialId: link.materialId,
    createdBy: link.createdBy || null,
    createdAt: link.createdAt.toISOString(),
    updatedAt: link.updatedAt.toISOString(),
    material: serializeMaterial(link.material)
  };
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isPrismaError(error: unknown, code: string) {
  return error instanceof Prisma.PrismaClientKnownRequestError
    ? error.code === code
    : typeof error === "object" && error !== null && (error as { code?: string }).code === code;
}

import { Router } from "express";
import { prisma } from "./db.js";
import { writeAuditLog } from "./audit-log-utils.js";
import { getActiveOrganizationRole } from "./organization-permissions.js";
import { hasPermission, requireConfirm } from "./permissions.js";
import {
  brandRiskWarnings,
  brandRulesAsKnowledge,
  clean,
  nullableString,
  serializeBrand,
  serializeBrandAssignment,
  serializeBrandLink,
  serializeBrandRule,
  toBrandData,
  toBrandRuleData,
  validateBrandAssignmentPayload,
  validateBrandPayload,
  validateBrandRulePayload,
  validateBrandScriptPayload
} from "./brand-utils.js";
import { buildKnowledgeContext } from "./knowledge-base-service.js";

type BrandDb = typeof prisma;

export function createBrandsRouter(db: BrandDb = prisma) {
  const router = Router();

  router.get("/context", async (req, res, next) => {
    try {
      const context = await resolveBrandContext(db as any, req.user!.id, {
        brandId: clean(req.query.brandId),
        customerId: clean(req.query.customerId),
        productId: clean(req.query.productId),
        scenario: clean(req.query.scenario)
      });
      res.json(context);
    } catch (error) {
      next(error);
    }
  });

  router.get("/", async (req, res, next) => {
    try {
      const organizationId = clean(req.query.organizationId);
      if (!organizationId) return res.status(400).json({ message: "organizationId is required" });
      const role = await getActiveOrganizationRole(db as any, organizationId, req.user!.id);
      if (!hasPermission(role as any, "brand.view")) return res.status(403).json({ message: "brand view permission required" });
      const where: any = { organizationId };
      const status = clean(req.query.status);
      where.status = status || (role === "owner" || role === "manager" ? undefined : "active");
      if (!where.status) delete where.status;
      const keyword = clean(req.query.keyword);
      if (keyword) {
        where.OR = [
          { name: { contains: keyword, mode: "insensitive" } },
          { displayName: { contains: keyword, mode: "insensitive" } },
          { description: { contains: keyword, mode: "insensitive" } },
          { country: { contains: keyword, mode: "insensitive" } }
        ];
      }
      const page = Math.max(Number(req.query.page) || 1, 1);
      const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 50, 1), 100);
      const rows = await (db as any).brand.findMany({ where, orderBy: [{ status: "asc" }, { updatedAt: "desc" }], skip: (page - 1) * pageSize, take: pageSize });
      const counts = await countsForBrands(db as any, rows.map((row: any) => row.id));
      res.json(rows.map((row: any) => serializeBrand(row, counts[row.id])));
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      const organizationId = clean(req.body.organizationId);
      if (!organizationId) return res.status(400).json({ message: "organizationId is required" });
      const role = await getActiveOrganizationRole(db as any, organizationId, req.user!.id);
      if (!hasPermission(role as any, "brand.create")) return res.status(403).json({ message: "brand create permission required" });
      const errors = validateBrandPayload(req.body);
      if (errors.length) return res.status(400).json({ message: "validation failed", errors });
      const row = await (db as any).brand.create({ data: toBrandData(req.body, organizationId, req.user!.id) });
      await audit(db, req.user!.id, organizationId, "create", "Brand", row.id, null, row, { operation: "brand_create" });
      res.status(201).json(serializeBrand(row));
    } catch (error: any) {
      if (error?.code === "P2002") return res.status(409).json({ message: "brand name already exists in this organization" });
      next(error);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const brand = await findAccessibleBrand(db, req.user!.id, req.params.id, "view");
      if (!brand) return res.status(404).json({ message: "brand not found" });
      const [products, materials, knowledgeBases, scripts, rules, assignments] = await Promise.all([
        (db as any).brandProduct.findMany({ where: { brandId: brand.id }, orderBy: { createdAt: "desc" } }),
        (db as any).brandMaterial.findMany({ where: { brandId: brand.id }, orderBy: { createdAt: "desc" } }),
        (db as any).brandKnowledgeBase.findMany({ where: { brandId: brand.id }, orderBy: { createdAt: "desc" } }),
        (db as any).brandScript.findMany({ where: { brandId: brand.id }, orderBy: { createdAt: "desc" } }),
        (db as any).brandRule.findMany({ where: { brandId: brand.id }, orderBy: { updatedAt: "desc" } }),
        (db as any).brandAssignment.findMany({ where: { brandId: brand.id }, orderBy: { createdAt: "desc" } })
      ]);
      const assignmentsSummary = assignments.reduce((acc: Record<string, number>, item: any) => {
        acc[item.entityType] = (acc[item.entityType] || 0) + 1;
        return acc;
      }, {});
      res.json({
        ...serializeBrand(brand, { productCount: products.length, materialCount: materials.length, ruleCount: rules.length }),
        products: products.map(serializeBrandLink),
        materials: materials.map(serializeBrandLink),
        knowledgeBases: knowledgeBases.map(serializeBrandLink),
        scripts: scripts.map(serializeBrandLink),
        rules: rules.map(serializeBrandRule),
        assignmentsSummary
      });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id", async (req, res, next) => {
    try {
      const existing = await findAccessibleBrand(db, req.user!.id, req.params.id, "update");
      if (!existing) return res.status(404).json({ message: "brand not found" });
      const errors = validateBrandPayload(req.body, { partial: true });
      if (errors.length) return res.status(400).json({ message: "validation failed", errors });
      if (req.body.status === "archived" && existing.status !== "archived") {
        const confirmError = requireConfirm(req, "brand.archive");
        if (confirmError) return res.status(409).json(confirmError);
      }
      const updated = await (db as any).brand.update({ where: { id: existing.id }, data: toBrandData(req.body, existing.organizationId, req.user!.id, existing) });
      await audit(db, req.user!.id, existing.organizationId, "update", "Brand", updated.id, existing, updated, { operation: "brand_update" }, updated.status === "archived" ? "high" : "low");
      res.json(serializeBrand(updated));
    } catch (error: any) {
      if (error?.code === "P2002") return res.status(409).json({ message: "brand name already exists in this organization" });
      next(error);
    }
  });

  router.delete("/:id", async (req, res, next) => {
    try {
      const existing = await findAccessibleBrand(db, req.user!.id, req.params.id, "update");
      if (!existing) return res.status(404).json({ message: "brand not found" });
      const confirmError = requireConfirm(req, "brand.archive");
      if (confirmError) return res.status(409).json(confirmError);
      const updated = await (db as any).brand.update({ where: { id: existing.id }, data: { status: "archived" } });
      await audit(db, req.user!.id, existing.organizationId, "delete", "Brand", updated.id, existing, updated, { operation: "brand_archive", confirmed: true }, "high");
      res.json(serializeBrand(updated));
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/products", async (req, res, next) => {
    try {
      const brand = await findAccessibleBrand(db, req.user!.id, req.params.id, "manageProducts");
      if (!brand) return res.status(404).json({ message: "brand not found" });
      const productId = clean(req.body.productId);
      if (!productId) return res.status(400).json({ message: "productId is required" });
      if (!(await canUseProduct(db as any, req.user!.id, brand.organizationId, productId))) return res.status(403).json({ message: "product access denied" });
      const row = await (db as any).brandProduct.create({ data: { organizationId: brand.organizationId, brandId: brand.id, productId, createdBy: req.user!.id } });
      await audit(db, req.user!.id, brand.organizationId, "create", "BrandProduct", row.id, null, row, { operation: "brand_product_link", brandId: brand.id }, "medium");
      res.status(201).json(serializeBrandLink(row));
    } catch (error: any) {
      if (error?.code === "P2002") return res.status(409).json({ message: "product already linked to brand" });
      next(error);
    }
  });

  router.post("/:id/materials", async (req, res, next) => {
    try {
      const brand = await findAccessibleBrand(db, req.user!.id, req.params.id, "manageMaterials");
      if (!brand) return res.status(404).json({ message: "brand not found" });
      const materialId = clean(req.body.materialId);
      if (!materialId) return res.status(400).json({ message: "materialId is required" });
      if (!(await canUseMaterial(db as any, req.user!.id, brand.organizationId, materialId))) return res.status(403).json({ message: "material access denied" });
      const row = await (db as any).brandMaterial.create({ data: { organizationId: brand.organizationId, brandId: brand.id, materialId, createdBy: req.user!.id } });
      await audit(db, req.user!.id, brand.organizationId, "create", "BrandMaterial", row.id, null, row, { operation: "brand_material_link", brandId: brand.id }, "medium");
      res.status(201).json(serializeBrandLink(row));
    } catch (error: any) {
      if (error?.code === "P2002") return res.status(409).json({ message: "material already linked to brand" });
      next(error);
    }
  });

  router.post("/:id/knowledge-bases", async (req, res, next) => {
    try {
      const brand = await findAccessibleBrand(db, req.user!.id, req.params.id, "manageKnowledge");
      if (!brand) return res.status(404).json({ message: "brand not found" });
      const knowledgeBaseId = clean(req.body.knowledgeBaseId);
      if (!knowledgeBaseId) return res.status(400).json({ message: "knowledgeBaseId is required" });
      if (!(await canUseKnowledge(db as any, req.user!.id, brand.organizationId, knowledgeBaseId))) return res.status(403).json({ message: "knowledge access denied" });
      const row = await (db as any).brandKnowledgeBase.create({ data: { organizationId: brand.organizationId, brandId: brand.id, knowledgeBaseId, createdBy: req.user!.id } });
      await audit(db, req.user!.id, brand.organizationId, "create", "BrandKnowledgeBase", row.id, null, row, { operation: "brand_knowledge_link", brandId: brand.id }, "medium");
      res.status(201).json(serializeBrandLink(row));
    } catch (error: any) {
      if (error?.code === "P2002") return res.status(409).json({ message: "knowledge already linked to brand" });
      next(error);
    }
  });

  router.post("/:id/scripts", async (req, res, next) => {
    try {
      const brand = await findAccessibleBrand(db, req.user!.id, req.params.id, "manageScripts");
      if (!brand) return res.status(404).json({ message: "brand not found" });
      const errors = validateBrandScriptPayload(req.body);
      if (errors.length) return res.status(400).json({ message: "validation failed", errors });
      await assertScriptAccess(db as any, brand.organizationId, clean(req.body.scriptId), clean(req.body.scriptType));
      const row = await (db as any).brandScript.create({ data: { organizationId: brand.organizationId, brandId: brand.id, scriptId: clean(req.body.scriptId), scriptType: clean(req.body.scriptType), createdBy: req.user!.id } });
      await audit(db, req.user!.id, brand.organizationId, "create", "BrandScript", row.id, null, row, { operation: "brand_script_link", brandId: brand.id }, "medium");
      res.status(201).json(serializeBrandLink(row));
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id/rules", async (req, res, next) => {
    try {
      const brand = await findAccessibleBrand(db, req.user!.id, req.params.id, "view");
      if (!brand) return res.status(404).json({ message: "brand not found" });
      const rows = await (db as any).brandRule.findMany({ where: { brandId: brand.id }, orderBy: { updatedAt: "desc" } });
      res.json(rows.map(serializeBrandRule));
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/rules", async (req, res, next) => {
    try {
      const brand = await findAccessibleBrand(db, req.user!.id, req.params.id, "manageRules");
      if (!brand) return res.status(404).json({ message: "brand not found" });
      const errors = validateBrandRulePayload(req.body);
      if (errors.length) return res.status(400).json({ message: "validation failed", errors });
      const row = await (db as any).brandRule.create({ data: toBrandRuleData(req.body, brand, req.user!.id) });
      await audit(db, req.user!.id, brand.organizationId, "create", "BrandRule", row.id, null, row, { operation: "brand_rule_create", brandId: brand.id }, "medium");
      res.status(201).json(serializeBrandRule(row));
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/assign", async (req, res, next) => {
    try {
      const brand = await findAccessibleBrand(db, req.user!.id, req.params.id, "assignEntity");
      if (!brand) return res.status(404).json({ message: "brand not found" });
      const errors = validateBrandAssignmentPayload(req.body);
      if (errors.length) return res.status(400).json({ message: "validation failed", errors });
      const confirmError = requireConfirm(req, "brand.assignEntity");
      if (confirmError) return res.status(409).json(confirmError);
      await assertAccessibleEntity(db as any, req.user!.id, brand.organizationId, clean(req.body.entityType), clean(req.body.entityId));
      const row = await (db as any).brandAssignment.create({
        data: { organizationId: brand.organizationId, brandId: brand.id, entityType: clean(req.body.entityType), entityId: clean(req.body.entityId), assignedBy: req.user!.id }
      });
      await audit(db, req.user!.id, brand.organizationId, "create", "BrandAssignment", row.id, null, row, { operation: "brand_assign_entity", brandId: brand.id, confirmed: true }, "medium");
      res.status(201).json(serializeBrandAssignment(row));
    } catch (error: any) {
      if (error?.code === "P2002") return res.status(409).json({ message: "brand already assigned to this entity" });
      next(error);
    }
  });

  return router;
}

export function createBrandLinksRouter(tableName: "brandProduct" | "brandMaterial" | "brandKnowledgeBase" | "brandScript") {
  const router = Router();
  router.delete("/:id", async (req, res, next) => {
    try {
      const existing = await (prisma as any)[tableName].findUnique({ where: { id: req.params.id } });
      if (!existing) return res.status(404).json({ message: "brand link not found" });
      const brand = await findAccessibleBrand(prisma as any, req.user!.id, existing.brandId, tablePermission(tableName));
      if (!brand) return res.status(404).json({ message: "brand link not found" });
      const confirmError = requireConfirm(req, "brand.assignEntity");
      if (confirmError) return res.status(409).json(confirmError);
      await (prisma as any)[tableName].delete({ where: { id: existing.id } });
      await audit(prisma as any, req.user!.id, existing.organizationId, "delete", tableName, existing.id, existing, null, { operation: `${tableName}_unlink`, confirmed: true }, "medium");
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });
  return router;
}

export function createBrandRulesRouter(db: BrandDb = prisma) {
  const router = Router();
  router.patch("/:id", async (req, res, next) => {
    try {
      const existing = await (db as any).brandRule.findUnique({ where: { id: req.params.id } });
      if (!existing) return res.status(404).json({ message: "brand rule not found" });
      const brand = await findAccessibleBrand(db, req.user!.id, existing.brandId, "manageRules");
      if (!brand) return res.status(404).json({ message: "brand rule not found" });
      const errors = validateBrandRulePayload(req.body, { partial: true });
      if (errors.length) return res.status(400).json({ message: "validation failed", errors });
      const updated = await (db as any).brandRule.update({ where: { id: existing.id }, data: toBrandRuleData(req.body, brand, req.user!.id, existing) });
      await audit(db, req.user!.id, existing.organizationId, "update", "BrandRule", updated.id, existing, updated, { operation: "brand_rule_update", brandId: brand.id }, "medium");
      res.json(serializeBrandRule(updated));
    } catch (error) {
      next(error);
    }
  });
  router.delete("/:id", async (req, res, next) => {
    try {
      const existing = await (db as any).brandRule.findUnique({ where: { id: req.params.id } });
      if (!existing) return res.status(404).json({ message: "brand rule not found" });
      const brand = await findAccessibleBrand(db, req.user!.id, existing.brandId, "manageRules");
      if (!brand) return res.status(404).json({ message: "brand rule not found" });
      const confirmError = requireConfirm(req, "brand.manageRules");
      if (confirmError) return res.status(409).json(confirmError);
      const updated = await (db as any).brandRule.update({ where: { id: existing.id }, data: { enabled: false } });
      await audit(db, req.user!.id, existing.organizationId, "delete", "BrandRule", updated.id, existing, updated, { operation: "brand_rule_disable", confirmed: true }, "medium");
      res.json(serializeBrandRule(updated));
    } catch (error) {
      next(error);
    }
  });
  return router;
}

export async function resolveBrandContext(
  db: any,
  userId: string,
  input: { brandId?: string | null; customerId?: string | null; productId?: string | null; scenario?: string | null }
) {
  const entityBrand = input.customerId ? await brandForEntity(db, "customer", input.customerId) : null;
  const brandId = clean(input.brandId) || entityBrand?.brandId || "";
  const brand = brandId ? await findAccessibleBrand(db, userId, brandId, "useInAI") : null;
  if (brandId && !brand) {
    const error: any = new Error("brand not found");
    error.status = 404;
    throw error;
  }
  const rules = brand
    ? await db.brandRule.findMany({ where: { brandId: brand.id, enabled: true, ruleType: { in: ruleTypesForScenario(input.scenario) } }, orderBy: { updatedAt: "desc" }, take: 10 })
    : [];
  const brandKbLinks = brand
    ? await db.brandKnowledgeBase.findMany({ where: { brandId: brand.id }, take: 10 })
    : [];
  const knowledgeBaseIds = brandKbLinks.map((link: any) => link.knowledgeBaseId);
  const orgKnowledge = knowledgeBaseIds.length
    ? await db.knowledgeBaseOrg.findMany({ where: { id: { in: knowledgeBaseIds }, organizationId: brand.organizationId, enabled: true }, take: 10 })
    : [];
  const products = brand
    ? await db.brandProduct.findMany({ where: { brandId: brand.id }, take: 20 })
    : [];
  const materials = brand
    ? await db.brandMaterial.findMany({ where: { brandId: brand.id }, take: 20 })
    : [];
  const mismatch = Boolean(input.brandId && entityBrand && entityBrand.brandId !== input.brandId);
  const warnings = brandRiskWarnings({ brand, rules, scenario: input.scenario, mismatch });
  return {
    brand: brand ? serializeBrand(brand) : null,
    rules: rules.map(serializeBrandRule),
    knowledge: [
      ...rules.map((rule: any) => ({ id: rule.id, title: rule.title, category: rule.ruleType, source: "brand" as const, content: rule.content })),
      ...orgKnowledge.map((item: any) => ({ id: item.id, title: item.title, category: item.category, source: "brand" as const, content: item.content }))
    ],
    products: products.map((item: any) => ({ id: item.productId })),
    materials: materials.map((item: any) => ({ id: item.materialId })),
    brandUsed: brand?.name || null,
    brandRulesUsed: rules.map((rule: any) => rule.title),
    riskWarnings: warnings,
    knowledgeContext: buildKnowledgeContext([...(brandRulesAsKnowledge(rules) as any)]).knowledgeContext,
    knowledgeUsed: [...rules.map((rule: any) => `[Brand] ${rule.title}`), ...orgKnowledge.map((item: any) => `[Brand] ${item.title}`)]
  };
}

export async function findAccessibleBrand(db: any, userId: string, brandId: string, action: "view" | "update" | "manageProducts" | "manageMaterials" | "manageKnowledge" | "manageScripts" | "manageRules" | "assignEntity" | "useInAI") {
  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand) return null;
  const role = await getActiveOrganizationRole(db, brand.organizationId, userId);
  const permission = action === "view" ? "brand.view" : action === "useInAI" ? "brand.useInAI" : action === "update" ? "brand.update" : `brand.${action}`;
  if (!hasPermission(role as any, permission as any)) return null;
  if ((role === "sales" || role === "support") && brand.status !== "active") return null;
  return brand;
}

async function countsForBrands(db: any, brandIds: string[]) {
  const result: Record<string, { productCount: number; materialCount: number; ruleCount: number }> = {};
  brandIds.forEach((id) => (result[id] = { productCount: 0, materialCount: 0, ruleCount: 0 }));
  const [products, materials, rules] = await Promise.all([
    db.brandProduct.groupBy({ by: ["brandId"], where: { brandId: { in: brandIds } }, _count: { _all: true } }),
    db.brandMaterial.groupBy({ by: ["brandId"], where: { brandId: { in: brandIds } }, _count: { _all: true } }),
    db.brandRule.groupBy({ by: ["brandId"], where: { brandId: { in: brandIds } }, _count: { _all: true } })
  ]);
  products.forEach((row: any) => (result[row.brandId].productCount = row._count._all));
  materials.forEach((row: any) => (result[row.brandId].materialCount = row._count._all));
  rules.forEach((row: any) => (result[row.brandId].ruleCount = row._count._all));
  return result;
}

async function canUseProduct(db: any, userId: string, organizationId: string, productId: string) {
  return Boolean(await db.product.findFirst({ where: { id: productId, OR: [{ ownerId: userId }, { organizationProducts: { some: { organizationId } } }] } }));
}

async function canUseMaterial(db: any, userId: string, organizationId: string, materialId: string) {
  return Boolean(await db.material.findFirst({ where: { id: materialId, OR: [{ ownerId: userId }, { organizationMaterials: { some: { organizationId } } }] } }));
}

async function canUseKnowledge(db: any, userId: string, organizationId: string, knowledgeBaseId: string) {
  return Boolean(
    (await db.knowledgeBaseOrg.findFirst({ where: { id: knowledgeBaseId, organizationId } })) ||
      (await db.knowledgeBase.findFirst({ where: { id: knowledgeBaseId, ownerId: userId } }))
  );
}

async function assertScriptAccess(db: any, organizationId: string, scriptId: string, scriptType: string) {
  const exists = scriptType === "script_variant"
    ? await db.scriptVariant.findFirst({ where: { id: scriptId, organizationId } })
    : scriptType === "script_org"
      ? await db.scriptOrg.findFirst({ where: { id: scriptId, organizationId } })
      : true;
  if (!exists) {
    const error: any = new Error("script access denied");
    error.status = 403;
    throw error;
  }
}

async function assertAccessibleEntity(db: any, userId: string, organizationId: string, entityType: string, entityId: string) {
  const role = await getActiveOrganizationRole(db, organizationId, userId);
  if (!role) throw Object.assign(new Error("organization access denied"), { status: 403 });
  const whereByType: Record<string, any> = {
    customer: { id: entityId, organizationId },
    order: { id: entityId, organizationId },
    after_sales: { id: entityId, organizationId },
    reorder_opportunity: { id: entityId, organizationId },
    supplier: { id: entityId, organizationId },
    sample_order: { id: entityId, customer: { organizationId } },
    custom_request: { id: entityId, customer: { organizationId } },
    quote: { id: entityId, customer: { organizationId } }
  };
  const tableByType: Record<string, string> = {
    customer: "customer",
    order: "order",
    after_sales: "afterSalesCase",
    reorder_opportunity: "reorderOpportunity",
    supplier: "supplier",
    sample_order: "sampleOrder",
    custom_request: "customRequest",
    quote: "quote"
  };
  const table = tableByType[entityType];
  if (!table) throw Object.assign(new Error("entity type denied"), { status: 403 });
  const found = await db[table].findFirst({ where: whereByType[entityType] });
  if (!found) throw Object.assign(new Error("entity access denied"), { status: 403 });
}

async function brandForEntity(db: any, entityType: string, entityId: string) {
  return db.brandAssignment.findFirst({ where: { entityType, entityId }, orderBy: { createdAt: "desc" } });
}

function ruleTypesForScenario(scenario?: string | null) {
  const set = new Set(["forbidden_expression", "faq"]);
  const text = (scenario || "").toLowerCase();
  if (text.includes("price") || text.includes("quote")) set.add("quote_rule");
  if (text.includes("payment")) set.add("payment_method");
  if (text.includes("shipping") || text.includes("delivery") || text.includes("logistics")) set.add("logistics");
  if (text.includes("after") || text.includes("refund") || text.includes("reship")) set.add("after_sales_policy");
  if (!scenario) ["quote_rule", "payment_method", "logistics", "after_sales_policy"].forEach((item) => set.add(item));
  return Array.from(set);
}

function tablePermission(tableName: string) {
  if (tableName === "brandProduct") return "manageProducts";
  if (tableName === "brandMaterial") return "manageMaterials";
  if (tableName === "brandKnowledgeBase") return "manageKnowledge";
  return "manageScripts";
}

async function audit(db: BrandDb, userId: string, organizationId: string, action: "create" | "update" | "delete", entityType: string, entityId: string, before: unknown, after: unknown, metadata: Record<string, unknown>, riskLevel: "low" | "medium" | "high" = "low") {
  await writeAuditLog(db as any, { organizationId, userId, action, entityType, entityId, before, after, metadata, riskLevel });
}

export const brandsRouter = createBrandsRouter();
export const brandProductsRouter = createBrandLinksRouter("brandProduct");
export const brandMaterialsRouter = createBrandLinksRouter("brandMaterial");
export const brandKnowledgeBasesRouter = createBrandLinksRouter("brandKnowledgeBase");
export const brandScriptsRouter = createBrandLinksRouter("brandScript");
export const brandRulesRouter = createBrandRulesRouter();

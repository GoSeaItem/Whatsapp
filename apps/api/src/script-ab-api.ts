import { Router } from "express";
import { prisma } from "./db.js";
import { writeAuditLog } from "./audit-log-utils.js";
import { resolveBrandContext } from "./brands-api.js";
import { getActiveOrganizationRole } from "./organization-permissions.js";
import { hasPermission, recordSecurityAudit, requireConfirm } from "./permissions.js";
import {
  calculateExperimentStats,
  generateScriptVariants,
  serializeExperiment,
  serializeUsage,
  serializeVariant,
  validateExperimentPayload,
  validateOutcomePayload,
  validateUsagePayload,
  validateVariantPayload
} from "./script-ab-utils.js";

type ScriptAbDb = typeof prisma;

export function createScriptAbRouter(db: ScriptAbDb = prisma) {
  const router = Router();

  router.get("/script-experiments", async (req, res, next) => {
    try {
      const { organizationId, role } = await organizationContext(db, req);
      const where: any = experimentListScope(req.user!.id, organizationId, role);
      if (clean(req.query.scenario)) where.scenario = clean(req.query.scenario);
      if (clean(req.query.status)) where.status = clean(req.query.status);
      if (clean(req.query.targetLanguage)) where.targetLanguage = clean(req.query.targetLanguage);
      if (clean(req.query.createdBy)) where.createdBy = clean(req.query.createdBy);
      const rows = await (db as any).scriptExperiment.findMany({
        where,
        include: { _count: { select: { variants: true, usages: true } } },
        orderBy: [{ updatedAt: "desc" }],
        take: Math.min(Number(req.query.pageSize) || 100, 200)
      });
      res.json(rows.map((row: any) => serializeExperiment(row)));
    } catch (error) {
      next(error);
    }
  });

  router.post("/script-experiments", async (req, res, next) => {
    try {
      const errors = validateExperimentPayload(req.body);
      if (errors.length) return res.status(400).json({ message: "validation failed", errors });
      const organizationId = clean(req.body.organizationId) || organizationIdFromRequest(req) || null;
      const role = organizationId ? await getActiveOrganizationRole(db as any, organizationId, req.user!.id) : null;
      if (organizationId && !hasPermission(role, "scriptExperiment.createOrg")) return res.status(403).json({ message: "create organization experiment permission required" });
      if (!organizationId && !hasPermission(role || "sales", "scriptExperiment.createOwn" as any)) {
        // Personal experiments are allowed for logged-in sales-like users even without an organization.
      }
      const created = await (db as any).scriptExperiment.create({
        data: {
          organizationId,
          name: clean(req.body.name),
          scenario: clean(req.body.scenario),
          description: clean(req.body.description) || null,
          status: clean(req.body.status) || "draft",
          targetLanguage: clean(req.body.targetLanguage) || null,
          targetCustomerStage: clean(req.body.targetCustomerStage) || null,
          createdBy: req.user!.id
        }
      });
      await audit(db, req, organizationId, "create", "ScriptExperiment", created.id, null, created, "low");
      res.status(201).json(serializeExperiment(created));
    } catch (error) {
      next(error);
    }
  });

  router.get("/script-experiments/:id", async (req, res, next) => {
    try {
      const experiment = await findAccessibleExperiment(db, req, req.params.id);
      const usages = await (db as any).scriptUsage.findMany({ where: { experimentId: experiment.id }, include: { variant: true } });
      const stats = calculateExperimentStats(experiment, usages);
      res.json({ ...serializeExperiment(experiment, stats), variants: experiment.variants.map(serializeVariant), stats, riskWarnings: stats.riskWarnings });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/script-experiments/:id", async (req, res, next) => {
    try {
      const existing = await findAccessibleExperiment(db, req, req.params.id, "update");
      const errors = validateExperimentPayload(req.body, { partial: true });
      if (errors.length) return res.status(400).json({ message: "validation failed", errors });
      const updated = await (db as any).scriptExperiment.update({
        where: { id: existing.id },
        data: {
          ...(req.body.name !== undefined ? { name: clean(req.body.name) } : {}),
          ...(req.body.description !== undefined ? { description: clean(req.body.description) || null } : {}),
          ...(req.body.status !== undefined ? { status: clean(req.body.status) } : {}),
          ...(req.body.targetLanguage !== undefined ? { targetLanguage: clean(req.body.targetLanguage) || null } : {}),
          ...(req.body.targetCustomerStage !== undefined ? { targetCustomerStage: clean(req.body.targetCustomerStage) || null } : {})
        }
      });
      await audit(db, req, existing.organizationId, "update", "ScriptExperiment", existing.id, existing, updated, "low");
      res.json(serializeExperiment(updated));
    } catch (error) {
      next(error);
    }
  });

  router.delete("/script-experiments/:id", async (req, res, next) => {
    try {
      const confirmError = requireConfirm(req, "scriptExperiment.delete");
      if (confirmError) return res.status(409).json(confirmError);
      const existing = await findAccessibleExperiment(db, req, req.params.id, "delete");
      const archived = await (db as any).scriptExperiment.update({ where: { id: existing.id }, data: { status: "archived" } });
      await audit(db, req, existing.organizationId, "delete", "ScriptExperiment", existing.id, existing, archived, "medium");
      res.json(serializeExperiment(archived));
    } catch (error) {
      next(error);
    }
  });

  router.post("/script-experiments/:id/variants", async (req, res, next) => {
    try {
      const experiment = await findAccessibleExperiment(db, req, req.params.id, "variant");
      const errors = validateVariantPayload(req.body);
      if (errors.length) return res.status(400).json({ message: "validation failed", errors });
      const created = await (db as any).scriptVariant.create({
        data: {
          experimentId: experiment.id,
          organizationId: experiment.organizationId || null,
          title: clean(req.body.title),
          versionLabel: clean(req.body.versionLabel).toUpperCase(),
          content: clean(req.body.content),
          language: clean(req.body.language) || experiment.targetLanguage || null,
          tone: clean(req.body.tone) || null,
          enabled: req.body.enabled !== false,
          createdBy: req.user!.id
        }
      });
      await audit(db, req, experiment.organizationId, "create", "ScriptVariant", created.id, null, created, "low");
      res.status(201).json(serializeVariant(created));
    } catch (error: any) {
      if (String(error?.code) === "P2002") return res.status(409).json({ message: "versionLabel already exists in this experiment" });
      next(error);
    }
  });

  router.patch("/script-variants/:id", async (req, res, next) => {
    try {
      const existing = await findAccessibleVariant(db, req, req.params.id, "variant");
      const errors = validateVariantPayload(req.body, { partial: true });
      if (errors.length) return res.status(400).json({ message: "validation failed", errors });
      const updated = await (db as any).scriptVariant.update({
        where: { id: existing.id },
        data: {
          ...(req.body.title !== undefined ? { title: clean(req.body.title) } : {}),
          ...(req.body.content !== undefined ? { content: clean(req.body.content) } : {}),
          ...(req.body.language !== undefined ? { language: clean(req.body.language) || null } : {}),
          ...(req.body.tone !== undefined ? { tone: clean(req.body.tone) || null } : {}),
          ...(req.body.enabled !== undefined ? { enabled: Boolean(req.body.enabled) } : {})
        }
      });
      await audit(db, req, existing.organizationId, "update", "ScriptVariant", existing.id, existing, updated, "low");
      res.json(serializeVariant(updated));
    } catch (error) {
      next(error);
    }
  });

  router.delete("/script-variants/:id", async (req, res, next) => {
    try {
      const confirmError = requireConfirm(req, "scriptExperiment.manageVariants");
      if (confirmError) return res.status(409).json(confirmError);
      const existing = await findAccessibleVariant(db, req, req.params.id, "variant");
      const usageCount = await (db as any).scriptUsage.count({ where: { variantId: existing.id } });
      const result = usageCount > 0
        ? await (db as any).scriptVariant.update({ where: { id: existing.id }, data: { enabled: false } })
        : await (db as any).scriptVariant.delete({ where: { id: existing.id } });
      await audit(db, req, existing.organizationId, "delete", "ScriptVariant", existing.id, existing, result, "medium");
      res.json(usageCount > 0 ? serializeVariant(result) : { deleted: true });
    } catch (error) {
      next(error);
    }
  });

  router.post("/script-usages", async (req, res, next) => {
    try {
      const errors = validateUsagePayload(req.body);
      if (errors.length) return res.status(400).json({ message: "validation failed", errors });
      const experiment = await findAccessibleExperiment(db, req, clean(req.body.experimentId), "usage");
      const variant = await (db as any).scriptVariant.findFirst({ where: { id: clean(req.body.variantId), experimentId: experiment.id, enabled: true } });
      if (!variant) return res.status(404).json({ message: "variant not found" });
      const customer = clean(req.body.customerId) ? await findAccessibleCustomer(db, req, clean(req.body.customerId)) : null;
      const created = await (db as any).scriptUsage.create({
        data: {
          organizationId: experiment.organizationId || null,
          experimentId: experiment.id,
          variantId: variant.id,
          customerId: customer?.id || null,
          userId: req.user!.id,
          scenario: clean(req.body.scenario) || experiment.scenario,
          channel: clean(req.body.channel) || "web",
          usedText: clean(req.body.usedText) || variant.content,
          outcome: "used_draft"
        }
      });
      await audit(db, req, experiment.organizationId, "create", "ScriptUsage", created.id, null, { usageId: created.id, outcome: "used_draft" }, "low");
      res.status(201).json({ usageId: created.id, ...serializeUsage(created) });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/script-usages/:id/outcome", async (req, res, next) => {
    try {
      const errors = validateOutcomePayload(req.body);
      if (errors.length) return res.status(400).json({ message: "validation failed", errors });
      const existing = await findAccessibleUsage(db, req, req.params.id);
      const updated = await (db as any).scriptUsage.update({
        where: { id: existing.id },
        data: {
          outcome: clean(req.body.outcome),
          quoteId: clean(req.body.quoteId) || null,
          orderId: clean(req.body.orderId) || null,
          followUpTaskId: clean(req.body.followUpTaskId) || null,
          notes: clean(req.body.notes) || null,
          outcomeAt: new Date()
        },
        include: { customer: true }
      });
      await audit(db, req, existing.organizationId, "update", "ScriptUsage", existing.id, existing, updated, "low");
      res.json(serializeUsage(updated));
    } catch (error) {
      next(error);
    }
  });

  router.get("/script-experiments/:id/stats", async (req, res, next) => {
    try {
      const experiment = await findAccessibleExperiment(db, req, req.params.id);
      const usages = await (db as any).scriptUsage.findMany({ where: { experimentId: experiment.id }, include: { variant: true } });
      res.json(calculateExperimentStats(experiment, usages));
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export function createScriptAbAiRouter(db: ScriptAbDb = prisma) {
  const router = Router();
  router.post("/script-experiments/generate-variants", async (req, res, next) => {
    try {
      const role = clean(req.body.organizationId) ? await getActiveOrganizationRole(db as any, clean(req.body.organizationId), req.user!.id) : null;
      if (role && !hasPermission(role, "scriptExperiment.aiGenerateVariants")) return res.status(403).json({ message: "AI variant generation permission required" });
      const brandContext = clean(req.body.brandId)
        ? await resolveBrandContext(db as any, req.user!.id, {
            brandId: clean(req.body.brandId),
            productId: clean(req.body.productId),
            scenario: clean(req.body.scenario) || "first_reply"
          })
        : null;
      const result = generateScriptVariants({
        scenario: clean(req.body.scenario) || "first_reply",
        targetLanguage: clean(req.body.targetLanguage) || null,
        baseContent: [clean(req.body.baseContent), brandContext?.rules?.length ? `Brand rules: ${brandContext.rules.map((rule: any) => `${rule.title}: ${rule.content}`).join(" | ")}` : ""].filter(Boolean).join("\n") || null,
        tone: clean(req.body.tone) || null,
        count: Number(req.body.count) || 3
      });
      if (brandContext?.riskWarnings?.length) {
        result.riskWarnings = Array.from(new Set([...(result.riskWarnings || []), ...brandContext.riskWarnings]));
      }
      if (brandContext?.knowledgeUsed?.length) {
        result.knowledgeUsed = Array.from(new Set([...(brandContext.knowledgeUsed || []), ...(result.knowledgeUsed || [])]));
      }
      const log = await (db as any).aiActionSuggestionLog?.create?.({
        data: {
          organizationId: clean(req.body.organizationId) || brandContext?.brand?.organizationId || null,
          customerId: null,
          userId: req.user!.id,
          actionType: "script_ab_generate_variants",
          scenario: clean(req.body.scenario) || "first_reply",
          inputSnapshot: { scenario: clean(req.body.scenario), targetLanguage: clean(req.body.targetLanguage), tone: clean(req.body.tone) },
          outputSnapshot: result,
          riskLevel: "low",
          brandId: brandContext?.brand?.id || null,
          brandUsed: brandContext?.brandUsed || null,
          brandRulesUsed: brandContext?.brandRulesUsed || undefined
        }
      }).catch(() => null);
      res.json({ ...result, brandUsed: brandContext?.brandUsed || null, brandRulesUsed: brandContext?.brandRulesUsed || [], createdLogId: log?.id || null });
    } catch (error) {
      next(error);
    }
  });
  return router;
}

async function organizationContext(db: any, req: any) {
  const organizationId = organizationIdFromRequest(req);
  const role = organizationId ? await getActiveOrganizationRole(db as any, organizationId, req.user!.id) : null;
  if (organizationId && !role) {
    await recordSecurityAudit(db as any, req, { organizationId, action: "permission_denied", entityType: "ScriptExperiment", riskLevel: "high", failureReason: "organization membership required" });
    const error = new Error("organization membership required") as Error & { status?: number };
    error.status = 403;
    throw error;
  }
  return { organizationId, role };
}

function experimentListScope(userId: string, organizationId: string | null, role: any) {
  if (organizationId && ["owner", "manager"].includes(role)) return { organizationId };
  if (organizationId) return { OR: [{ organizationId, status: "active" }, { createdBy: userId }] };
  return { OR: [{ createdBy: userId }, { status: "active" }] };
}

async function findAccessibleExperiment(db: any, req: any, id: string, action: "read" | "update" | "delete" | "variant" | "usage" = "read") {
  const experiment = await db.scriptExperiment.findFirst({ where: { id }, include: { variants: true } });
  if (!experiment) throw notFound("experiment not found");
  const role = experiment.organizationId ? await getActiveOrganizationRole(db as any, experiment.organizationId, req.user!.id) : null;
  const isCreator = experiment.createdBy === req.user!.id;
  const allowed = action === "read"
    ? (isCreator || (role && (["owner", "manager"].includes(role) || experiment.status === "active")))
    : action === "usage"
      ? (isCreator || (role && (["owner", "manager"].includes(role) || experiment.status === "active")))
      : action === "delete"
        ? (isCreator || hasPermission(role, "scriptExperiment.delete"))
        : (isCreator || hasPermission(role, "scriptExperiment.updateOrg") || hasPermission(role, "scriptExperiment.manageVariants"));
  if (!allowed) {
    await recordSecurityAudit(db as any, req, { organizationId: experiment.organizationId, action: "permission_denied", entityType: "ScriptExperiment", entityId: id, riskLevel: "high", failureReason: `${action} denied` });
    throw forbidden("script experiment access denied");
  }
  return experiment;
}

async function findAccessibleVariant(db: any, req: any, id: string, action: "variant" = "variant") {
  const variant = await db.scriptVariant.findFirst({ where: { id }, include: { experiment: true } });
  if (!variant) throw notFound("variant not found");
  await findAccessibleExperiment(db, req, variant.experimentId, action);
  return variant;
}

async function findAccessibleUsage(db: any, req: any, id: string) {
  const usage = await db.scriptUsage.findFirst({ where: { id }, include: { customer: true } });
  if (!usage) throw notFound("usage not found");
  if (usage.userId === req.user!.id) return usage;
  if (usage.customerId) await findAccessibleCustomer(db, req, usage.customerId);
  const role = usage.organizationId ? await getActiveOrganizationRole(db as any, usage.organizationId, req.user!.id) : null;
  if (!hasPermission(role, "scriptExperiment.markOutcome")) throw forbidden("usage access denied");
  return usage;
}

async function findAccessibleCustomer(db: any, req: any, customerId: string) {
  const customer = await db.customer.findFirst({ where: { id: customerId } });
  if (!customer) throw notFound("customer not found");
  const role = customer.organizationId ? await getActiveOrganizationRole(db as any, customer.organizationId, req.user!.id) : null;
  const own = customer.ownerId === req.user!.id || customer.assignedTo === req.user!.id || (customer.collaborators || []).includes(req.user!.id);
  if (own || ["owner", "manager"].includes(role || "")) return customer;
  await recordSecurityAudit(db as any, req, { organizationId: customer.organizationId, action: "permission_denied", entityType: "Customer", entityId: customerId, riskLevel: "high", failureReason: "script usage customer access denied" });
  throw forbidden("customer access denied");
}

async function audit(db: any, req: any, organizationId: string | null, action: "create" | "update" | "delete", entityType: string, entityId: string, before: unknown, after: unknown, riskLevel: "low" | "medium" | "high") {
  await writeAuditLog(db as any, {
    organizationId,
    userId: req.user!.id,
    action,
    entityType,
    entityId,
    before,
    after,
    metadata: { module: "script_ab_testing", requestPath: req.originalUrl || req.url },
    riskLevel
  });
}

function organizationIdFromRequest(req: any) {
  return clean(req.query.organizationId) || clean(req.body?.organizationId) || null;
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function forbidden(message: string) {
  const error = new Error(message) as Error & { status?: number };
  error.status = 403;
  return error;
}

function notFound(message: string) {
  const error = new Error(message) as Error & { status?: number };
  error.status = 404;
  return error;
}

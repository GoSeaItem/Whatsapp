import type { NextFunction, Request, Response } from "express";
import type { OrganizationRole } from "@wa-ai/shared";
import { prisma } from "./db.js";
import { getActiveOrganizationRole } from "./organization-permissions.js";
import { writeAuditLog } from "./audit-log-utils.js";

export const PERMISSION_KEYS = [
  "organization.view",
  "organization.update",
  "organization.delete",
  "member.view",
  "member.invite",
  "member.updateRole",
  "member.disable",
  "member.remove",
  "customer.viewOwn",
  "customer.viewTeam",
  "customer.create",
  "customer.updateOwn",
  "customer.updateTeam",
  "customer.deleteOwn",
  "customer.deleteTeam",
  "customer.assign",
  "customer.transfer",
  "customer.export",
  "product.viewOwn",
  "product.viewOrg",
  "product.createOwn",
  "product.createOrg",
  "product.updateOwn",
  "product.updateOrg",
  "product.deleteOwn",
  "product.deleteOrg",
  "material.viewOwn",
  "material.viewOrg",
  "material.createOwn",
  "material.createOrg",
  "material.updateOwn",
  "material.updateOrg",
  "material.deleteOwn",
  "material.deleteOrg",
  "knowledge.viewOwn",
  "knowledge.viewOrg",
  "knowledge.createOwn",
  "knowledge.createOrg",
  "knowledge.updateOwn",
  "knowledge.updateOrg",
  "knowledge.deleteOwn",
  "knowledge.deleteOrg",
  "script.viewOrg",
  "script.createOrg",
  "script.updateOrg",
  "script.deleteOrg",
  "quote.viewOwn",
  "quote.viewTeam",
  "quote.create",
  "quote.updateOwn",
  "quote.updateTeam",
  "quote.deleteOwn",
  "quote.deleteTeam",
  "followup.viewOwn",
  "followup.viewTeam",
  "followup.create",
  "followup.updateOwn",
  "followup.updateTeam",
  "sample.viewOwn",
  "sample.viewTeam",
  "sample.create",
  "sample.updateOwn",
  "sample.updateTeam",
  "customRequest.viewOwn",
  "customRequest.viewTeam",
  "customRequest.create",
  "customRequest.updateOwn",
  "customRequest.updateTeam",
  "dashboard.viewOwn",
  "dashboard.viewTeam",
  "report.viewTeam",
  "report.export",
  "import.create",
  "export.create",
  "export.sensitiveFields",
  "audit.viewOwn",
  "audit.viewTeam",
  "audit.export",
  "ai.reply",
  "ai.nextAction",
  "ai.riskCheck",
  "ai.followupPlan",
  "ai.salesSummary",
  "ai.useOrgKnowledge",
  "ai.useOrgMaterial",
  "prediction.viewOwn",
  "prediction.viewTeam",
  "prediction.recalculateOwn",
  "prediction.recalculateTeam",
  "prediction.updateOwn",
  "prediction.updateTeam",
  "reorderReminder.viewOwn",
  "reorderReminder.viewTeam",
  "reorderReminder.create",
  "reorderReminder.updateOwn",
  "reorderReminder.updateTeam",
  "order.viewOwn",
  "order.viewTeam",
  "order.create",
  "order.updateOwn",
  "order.updateTeam",
  "order.deleteOwn",
  "order.deleteTeam",
  "ai.reorderScript",
  "ai.orderScript",
  "profit.viewOwn",
  "profit.viewTeam",
  "profit.editCost",
  "profit.confirmCost",
  "profit.deleteCost",
  "profit.export",
  "profit.aiReview",
  "reorder.viewOwn",
  "reorder.viewTeam",
  "reorder.recalculateOwn",
  "reorder.recalculateTeam",
  "reorder.createCampaignOwn",
  "reorder.createCampaignTeam",
  "reorder.updateCampaign",
  "reorder.deleteCampaign",
  "reorder.createTask",
  "reorder.generateScript",
  "reorder.managePlaybookOwn",
  "reorder.managePlaybookOrg",
  "afterSales.viewOwn",
  "afterSales.viewTeam",
  "afterSales.create",
  "afterSales.updateOwn",
  "afterSales.updateTeam",
  "afterSales.close",
  "afterSales.delete",
  "afterSales.assign",
  "afterSales.updateResponsibility",
  "afterSales.updateSolution",
  "afterSales.createTask",
  "afterSales.generateScript",
  "afterSales.export",
  "scriptExperiment.viewOwn",
  "scriptExperiment.viewTeam",
  "scriptExperiment.createOwn",
  "scriptExperiment.createOrg",
  "scriptExperiment.updateOwn",
  "scriptExperiment.updateOrg",
  "scriptExperiment.delete",
  "scriptExperiment.manageVariants",
  "scriptExperiment.recordUsage",
  "scriptExperiment.markOutcome",
  "scriptExperiment.viewStats",
  "scriptExperiment.aiGenerateVariants",
  "supplier.viewOwn",
  "supplier.viewTeam",
  "supplier.create",
  "supplier.update",
  "supplier.delete",
  "supplier.viewSensitiveContact",
  "supplier.export",
  "supplierQuote.view",
  "supplierQuote.create",
  "supplierQuote.update",
  "supplierQuote.delete",
  "supplierQuote.applyToCost",
  "purchaseNote.view",
  "purchaseNote.create",
  "purchaseNote.update",
  "purchaseNote.delete",
  "supplierRisk.view",
  "supplierRisk.create",
  "supplierRisk.update",
  "supplierLink.manage",
  "supplier.aiScript",
  "brand.view",
  "brand.create",
  "brand.update",
  "brand.archive",
  "brand.manageProducts",
  "brand.manageMaterials",
  "brand.manageKnowledge",
  "brand.manageScripts",
  "brand.manageRules",
  "brand.assignEntity",
  "brand.useInAI",
  "brand.export",
  "enterprise.organization.view",
  "enterprise.organization.manage",
  "enterprise.member.manage",
  "enterprise.role.manage",
  "enterprise.report.view",
  "enterprise.report.export",
  "enterprise.audit.view",
  "enterprise.brandContext.use"
] as const;

export type PermissionKey = typeof PERMISSION_KEYS[number];
export type RiskLevel = "low" | "medium" | "high";

const allPermissions = new Set<PermissionKey>(PERMISSION_KEYS);

export const ROLE_PERMISSION_MATRIX: Record<OrganizationRole, Set<PermissionKey>> = {
  owner: allPermissions,
  manager: new Set(PERMISSION_KEYS.filter((key) => ![
    "organization.delete",
    "member.updateRole",
    "member.remove",
    "export.sensitiveFields",
    "profit.deleteCost"
  ].includes(key))),
  sales: new Set([
    "organization.view",
    "customer.viewOwn",
    "customer.create",
    "customer.updateOwn",
    "product.viewOwn",
    "product.viewOrg",
    "product.createOwn",
    "product.updateOwn",
    "material.viewOwn",
    "material.viewOrg",
    "material.createOwn",
    "material.updateOwn",
    "knowledge.viewOwn",
    "knowledge.viewOrg",
    "knowledge.createOwn",
    "knowledge.updateOwn",
    "script.viewOrg",
    "quote.viewOwn",
    "quote.create",
    "quote.updateOwn",
    "followup.viewOwn",
    "followup.create",
    "followup.updateOwn",
    "sample.viewOwn",
    "sample.create",
    "sample.updateOwn",
    "customRequest.viewOwn",
    "customRequest.create",
    "customRequest.updateOwn",
    "dashboard.viewOwn",
    "audit.viewOwn",
    "ai.reply",
    "ai.nextAction",
    "ai.riskCheck",
    "ai.followupPlan",
    "ai.salesSummary",
    "ai.useOrgKnowledge",
    "ai.useOrgMaterial",
    "prediction.viewOwn",
    "prediction.recalculateOwn",
    "prediction.updateOwn",
    "reorderReminder.viewOwn",
    "reorderReminder.create",
    "reorderReminder.updateOwn",
    "order.viewOwn",
    "order.create",
    "order.updateOwn",
    "order.deleteOwn",
    "ai.reorderScript",
    "ai.orderScript",
    "profit.viewOwn",
    "profit.aiReview",
    "reorder.viewOwn",
    "reorder.recalculateOwn",
    "reorder.createCampaignOwn",
    "reorder.createTask",
    "reorder.generateScript",
    "reorder.managePlaybookOwn",
    "afterSales.viewOwn",
    "afterSales.create",
    "afterSales.updateOwn",
    "afterSales.createTask",
    "afterSales.generateScript",
    "scriptExperiment.viewOwn",
    "scriptExperiment.createOwn",
    "scriptExperiment.updateOwn",
    "scriptExperiment.recordUsage",
    "scriptExperiment.markOutcome",
    "scriptExperiment.viewStats",
    "scriptExperiment.aiGenerateVariants",
    "supplier.viewOwn",
    "supplier.create",
    "supplierQuote.view",
    "purchaseNote.view",
    "purchaseNote.create",
    "purchaseNote.update",
    "supplierRisk.view",
    "supplier.aiScript",
    "brand.view",
    "brand.useInAI"
  ]),
  support: new Set([
    "organization.view",
    "customer.viewOwn",
    "followup.viewOwn",
    "followup.create",
    "followup.updateOwn",
    "material.viewOrg",
    "knowledge.viewOrg",
    "script.viewOrg",
    "audit.viewOwn",
    "ai.reply",
    "ai.riskCheck",
    "ai.salesSummary",
    "ai.useOrgKnowledge",
    "ai.useOrgMaterial",
    "prediction.viewOwn",
    "reorderReminder.viewOwn",
    "order.viewOwn",
    "ai.orderScript",
    "reorder.viewOwn",
    "reorder.generateScript",
    "afterSales.viewOwn",
    "afterSales.create",
    "afterSales.updateOwn",
    "afterSales.createTask",
    "afterSales.generateScript",
    "scriptExperiment.viewOwn",
    "scriptExperiment.recordUsage",
    "scriptExperiment.markOutcome",
    "scriptExperiment.viewStats",
    "supplier.viewOwn",
    "purchaseNote.view",
    "purchaseNote.create",
    "supplierRisk.view",
    "supplier.aiScript",
    "brand.view",
    "brand.useInAI"
  ])
};

export const SENSITIVE_ACTION_RISK: Record<string, RiskLevel> = {
  "organization.delete": "high",
  "member.updateRole": "high",
  "member.disable": "high",
  "member.remove": "high",
  "customer.deleteOwn": "high",
  "customer.deleteTeam": "high",
  "product.deleteOwn": "high",
  "product.deleteOrg": "high",
  "material.deleteOrg": "high",
  "knowledge.deleteOrg": "high",
  "script.deleteOrg": "high",
  "quote.deleteOwn": "high",
  "quote.deleteTeam": "high",
  "order.deleteOwn": "high",
  "order.deleteTeam": "high",
  "profit.deleteCost": "high",
  "profit.confirmCost": "medium",
  "profit.export": "medium",
  "reorder.deleteCampaign": "high",
  "reorder.createTask": "medium",
  "reorder.recalculateTeam": "medium",
  "afterSales.delete": "high",
  "afterSales.close": "high",
  "afterSales.updateResponsibility": "medium",
  "afterSales.updateSolution": "high",
  "afterSales.export": "medium",
  "scriptExperiment.delete": "medium",
  "scriptExperiment.manageVariants": "medium",
  "scriptExperiment.aiGenerateVariants": "low",
  "supplier.delete": "high",
  "supplier.update": "medium",
  "supplierQuote.delete": "medium",
  "supplierQuote.applyToCost": "high",
  "purchaseNote.delete": "medium",
  "supplierRisk.update": "medium",
  "supplierLink.manage": "medium",
  "brand.archive": "high",
  "brand.manageProducts": "medium",
  "brand.manageMaterials": "medium",
  "brand.manageKnowledge": "medium",
  "brand.manageScripts": "medium",
  "brand.manageRules": "medium",
  "brand.assignEntity": "medium",
  "sample.updateOwn": "medium",
  "customRequest.updateOwn": "medium",
  "export.create": "medium",
  "export.sensitiveFields": "high",
  "audit.export": "medium"
};

export function hasPermission(role: OrganizationRole | null | undefined, permission: PermissionKey) {
  return Boolean(role && ROLE_PERMISSION_MATRIX[role]?.has(permission));
}

export function requirePermission(permission: PermissionKey, options: { organizationIdParam?: string } = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const organizationId = organizationIdFromRequestPart(req, options.organizationIdParam);
    if (!organizationId) return res.status(400).json({ message: "organizationId is required" });
    const role = await getActiveOrganizationRole(prisma as any, organizationId, req.user!.id);
    if (!hasPermission(role, permission)) {
      await recordSecurityAudit(prisma as any, req, {
        organizationId,
        permissionKey: permission,
        action: "permission_denied",
        entityType: "Permission",
        riskLevel: "high",
        failureReason: "permission denied"
      });
      return res.status(403).json({ message: "permission denied", permissionKey: permission });
    }
    next();
  };
}

export async function requireOrganizationRole(db: any, organizationId: string, userId: string, allowedRoles: OrganizationRole[]) {
  const role = await getActiveOrganizationRole(db, organizationId, userId);
  if (!role || !allowedRoles.includes(role)) throw new PermissionError(403, "organization role required");
  return role;
}

export async function assertCanExportData(db: any, userId: string, organizationId: string, fieldsScope: "normal" | "sensitive") {
  const role = await getActiveOrganizationRole(db, organizationId, userId);
  if (!hasPermission(role, "export.create")) throw new PermissionError(403, "export permission required");
  if (fieldsScope === "sensitive" && !hasPermission(role, "export.sensitiveFields")) {
    throw new PermissionError(403, "sensitive export requires owner permission");
  }
  return role;
}

export async function assertCanViewAuditLog(db: any, userId: string, organizationId: string, scope: "own" | "team" | "export") {
  const role = await getActiveOrganizationRole(db, organizationId, userId);
  const permission = scope === "export" ? "audit.export" : scope === "team" ? "audit.viewTeam" : "audit.viewOwn";
  if (!hasPermission(role, permission)) throw new PermissionError(403, "audit permission required");
  return role;
}

export function requireConfirm(req: Request, action: string) {
  if (req.body?.confirm === true || req.query.confirm === "true") return null;
  return {
    error: "CONFIRM_REQUIRED",
    message: "This action requires confirmation.",
    action,
    riskLevel: SENSITIVE_ACTION_RISK[action] || "high"
  };
}

export async function recordSecurityAudit(
  db: any,
  req: Request,
  input: {
    organizationId?: string | null;
    permissionKey?: string;
    action: string;
    entityType: string;
    entityId?: string | null;
    riskLevel?: RiskLevel;
    failureReason?: string;
    metadata?: Record<string, unknown>;
  }
) {
  await writeAuditLog(db, {
    organizationId: input.organizationId || null,
    userId: req.user?.id || "anonymous",
    action: input.action as any,
    entityType: input.entityType,
    entityId: input.entityId || null,
    before: null,
    after: null,
    metadata: {
      permissionKey: input.permissionKey || null,
      requestPath: req.originalUrl || req.url,
      requestMethod: req.method,
      failureReason: input.failureReason || null,
      ...input.metadata
    },
    riskLevel: input.riskLevel || "medium",
    ipAddress: req.ip || req.socket?.remoteAddress || null,
    userAgent: req.header("user-agent") || null
  } as any);
}

export function redactAuditMetadata(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactAuditMetadata);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        /(whatsapp|email|social|phone|payment|account|note|secret|token|cookie|api[_-]?key)/i.test(key) ? "[redacted]" : redactAuditMetadata(item)
      ])
    );
  }
  return value;
}

export class PermissionError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function organizationIdFromRequestPart(req: Request, paramName?: string) {
  const param = paramName && typeof req.params[paramName] === "string" ? req.params[paramName] : "";
  const query = typeof req.query.organizationId === "string" ? req.query.organizationId : "";
  const body = typeof req.body?.organizationId === "string" ? req.body.organizationId : "";
  const header = req.header("x-organization-id") || "";
  return (param || query || body || header).trim();
}

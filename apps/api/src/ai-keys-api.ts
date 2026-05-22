import express from "express";
import { prisma } from "./db.js";
import { canWriteOrganizationResource, getActiveOrganizationRole } from "./organization-permissions.js";
import { writeAuditLog } from "./audit-log-utils.js";
import {
  AI_KEY_MODES,
  AI_KEY_STATUSES,
  encryptProviderKey,
  keyLast4,
  normalizeAiKeyMode,
  normalizeAiKeyStatus,
  serializeAiProviderKey
} from "./ai-key-utils.js";

export const aiKeysRouter = express.Router();

aiKeysRouter.get("/", async (req, res, next) => {
  try {
    const organizationId = clean(req.query.organizationId);
    if (!organizationId) return res.status(400).json({ message: "organizationId is required" });
    await requireOwnerOrManager(req.user!.id, organizationId);

    const mode = clean(req.query.mode);
    const status = clean(req.query.status);
    const keys = await (prisma as any).aiProviderKey.findMany({
      where: {
        organizationId,
        provider: "openai",
        ...(AI_KEY_MODES.includes(mode as any) ? { mode } : {}),
        ...(AI_KEY_STATUSES.includes(status as any) ? { status } : {})
      },
      orderBy: [{ mode: "asc" }, { priority: "asc" }, { createdAt: "asc" }]
    });

    res.json(keys.map(serializeAiProviderKey));
  } catch (error) {
    next(error);
  }
});

aiKeysRouter.post("/", async (req, res, next) => {
  try {
    const organizationId = clean(req.body.organizationId);
    const apiKey = clean(req.body.apiKey);
    if (!organizationId) return res.status(400).json({ message: "organizationId is required" });
    if (!apiKey) return res.status(400).json({ message: "apiKey is required" });
    await requireOwnerOrManager(req.user!.id, organizationId);

    const mode = normalizeAiKeyMode(req.body.mode);
    const data = {
      organizationId,
      provider: "openai",
      name: clean(req.body.name) || `${mode} key ${keyLast4(apiKey)}`,
      mode,
      encryptedKey: encryptProviderKey(apiKey),
      keyLast4: keyLast4(apiKey),
      status: normalizeAiKeyStatus(req.body.status),
      priority: Number.isFinite(Number(req.body.priority)) ? Number(req.body.priority) : 100,
      createdBy: req.user!.id
    };

    const created = await (prisma as any).aiProviderKey.create({ data });
    await writeAuditLog(prisma as any, {
      organizationId,
      userId: req.user!.id,
      action: "create",
      entityType: "AiProviderKey",
      entityId: created.id,
      after: { ...serializeAiProviderKey(created), apiKey: undefined },
      metadata: { mode, provider: "openai" },
      riskLevel: "medium"
    });

    res.status(201).json(serializeAiProviderKey(created));
  } catch (error) {
    next(error);
  }
});

aiKeysRouter.patch("/:id", async (req, res, next) => {
  try {
    const existing = await findManagedKey(req.params.id, req.user!.id);
    const apiKey = clean(req.body.apiKey);
    const data: Record<string, unknown> = {};

    if (req.body.name !== undefined) data.name = clean(req.body.name) || existing.name;
    if (req.body.mode !== undefined) data.mode = normalizeAiKeyMode(req.body.mode);
    if (req.body.status !== undefined) data.status = normalizeAiKeyStatus(req.body.status);
    if (req.body.priority !== undefined && Number.isFinite(Number(req.body.priority))) data.priority = Number(req.body.priority);
    if (apiKey) {
      data.encryptedKey = encryptProviderKey(apiKey);
      data.keyLast4 = keyLast4(apiKey);
      data.errorCount = 0;
      data.rateLimitCount = 0;
      data.quotaErrorCount = 0;
      data.lastErrorMessage = null;
    }

    const updated = await (prisma as any).aiProviderKey.update({ where: { id: existing.id }, data });
    await writeAuditLog(prisma as any, {
      organizationId: existing.organizationId,
      userId: req.user!.id,
      action: "update",
      entityType: "AiProviderKey",
      entityId: existing.id,
      before: serializeAiProviderKey(existing),
      after: serializeAiProviderKey(updated),
      metadata: { provider: "openai", replacedKey: Boolean(apiKey) },
      riskLevel: apiKey ? "high" : "medium"
    });

    res.json(serializeAiProviderKey(updated));
  } catch (error) {
    next(error);
  }
});

aiKeysRouter.delete("/:id", async (req, res, next) => {
  try {
    if (req.body?.confirm !== true) return res.status(400).json({ error: "CONFIRM_REQUIRED", message: "This action requires confirmation." });
    const existing = await findManagedKey(req.params.id, req.user!.id);
    const updated = await (prisma as any).aiProviderKey.update({ where: { id: existing.id }, data: { status: "disabled" } });
    await writeAuditLog(prisma as any, {
      organizationId: existing.organizationId,
      userId: req.user!.id,
      action: "delete",
      entityType: "AiProviderKey",
      entityId: existing.id,
      before: serializeAiProviderKey(existing),
      after: serializeAiProviderKey(updated),
      metadata: { softDelete: true, provider: "openai" },
      riskLevel: "high"
    });
    res.json(serializeAiProviderKey(updated));
  } catch (error) {
    next(error);
  }
});

async function findManagedKey(id: string, userId: string) {
  const key = await (prisma as any).aiProviderKey.findUnique({ where: { id } });
  if (!key) throw Object.assign(new Error("AI provider key not found"), { status: 404 });
  await requireOwnerOrManager(userId, key.organizationId);
  return key;
}

async function requireOwnerOrManager(userId: string, organizationId: string) {
  const role = await getActiveOrganizationRole(prisma as any, organizationId, userId);
  if (!canWriteOrganizationResource(role)) throw Object.assign(new Error("owner or manager role required"), { status: 403 });
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}


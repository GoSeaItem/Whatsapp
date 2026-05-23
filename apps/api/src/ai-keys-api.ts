import express from "express";
import { prisma } from "./db.js";
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
import { aiModelRegistry, defaultModelForMode, findAiModel } from "./ai-model-registry.js";

const AI_KEY_ADMIN_EMAIL = "goseashop@gmail.com";

type ImportedAiKey = {
  key?: string;
  apiKey?: string;
  key_name?: string;
  name?: string;
  model?: string;
  provider?: string;
  mode?: string;
  user_email?: string;
  userEmail?: string;
  baseUrl?: string;
  base_url?: string;
  organizationId?: string;
  priority?: number | string;
};

export const aiKeysRouter = express.Router();

aiKeysRouter.get("/models", async (req, res, next) => {
  try {
    requireAiKeyAdmin(req);
    res.json(aiModelRegistry());
  } catch (error) {
    next(error);
  }
});

aiKeysRouter.get("/export", async (req, res, next) => {
  try {
    requireAiKeyAdmin(req);
    const organizationId = clean(req.query.organizationId);
    if (!organizationId) return res.status(400).json({ message: "organizationId is required" });
    const keys = await loadKeys({ organizationId, mode: clean(req.query.mode), status: clean(req.query.status), model: clean(req.query.model) });
    await writeAuditLog(prisma as any, {
      organizationId,
      userId: req.user!.id,
      action: "create",
      entityType: "AiProviderKeyUsageExport",
      entityId: organizationId,
      metadata: { fields: "masked_usage_only", count: keys.length },
      riskLevel: "medium"
    });
    res.setHeader("content-type", "text/csv; charset=utf-8");
    res.setHeader("content-disposition", `attachment; filename="ai-key-usage-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(aiKeysToCsv(keys));
  } catch (error) {
    next(error);
  }
});

aiKeysRouter.get("/", async (req, res, next) => {
  try {
    requireAiKeyAdmin(req);
    const organizationId = clean(req.query.organizationId);
    if (!organizationId) return res.status(400).json({ message: "organizationId is required" });
    const keys = await loadKeys({ organizationId, mode: clean(req.query.mode), status: clean(req.query.status), model: clean(req.query.model) });
    res.json(keys.map(serializeAiProviderKey));
  } catch (error) {
    next(error);
  }
});

aiKeysRouter.post("/import", async (req, res, next) => {
  try {
    requireAiKeyAdmin(req);
    const organizationId = clean(req.body.organizationId);
    if (!organizationId) return res.status(400).json({ message: "organizationId is required" });
    const imported = parseImportDocument(req.body.items || req.body.content || req.body.document || req.body);
    if (imported.length === 0) return res.status(400).json({ message: "No AI keys found in document" });

    const created: any[] = [];
    const errors: Array<{ index: number; message: string }> = [];
    for (const [index, item] of imported.entries()) {
      try {
        const apiKey = clean(item.key || item.apiKey);
        if (!apiKey) throw new Error("key is required");
        const data = buildKeyData({
          organizationId: clean(item.organizationId) || organizationId,
          apiKey,
          name: clean(item.key_name || item.name),
          mode: item.mode,
          model: item.model,
          provider: item.provider,
          baseUrl: clean(item.baseUrl || item.base_url),
          userEmail: clean(item.user_email || item.userEmail) || req.user!.email,
          status: "active",
          priority: item.priority,
          createdBy: req.user!.id
        });
        const row = await (prisma as any).aiProviderKey.create({ data });
        created.push(row);
      } catch (error) {
        errors.push({ index: index + 1, message: error instanceof Error ? error.message : "import failed" });
      }
    }

    await writeAuditLog(prisma as any, {
      organizationId,
      userId: req.user!.id,
      action: "create",
      entityType: "AiProviderKeyImport",
      entityId: organizationId,
      after: { createdCount: created.length, failedCount: errors.length },
      metadata: { filename: clean(req.body.filename), source: "document_upload" },
      riskLevel: "medium"
    });

    res.status(201).json({
      createdCount: created.length,
      failedCount: errors.length,
      errors,
      keys: created.map(serializeAiProviderKey)
    });
  } catch (error) {
    next(error);
  }
});

aiKeysRouter.post("/", async (req, res, next) => {
  try {
    requireAiKeyAdmin(req);
    const organizationId = clean(req.body.organizationId);
    const apiKey = clean(req.body.apiKey);
    if (!organizationId) return res.status(400).json({ message: "organizationId is required" });
    if (!apiKey) return res.status(400).json({ message: "apiKey is required" });

    const data = buildKeyData({
      organizationId,
      apiKey,
      name: clean(req.body.name),
      mode: req.body.mode,
      model: clean(req.body.model),
      provider: clean(req.body.provider),
      baseUrl: clean(req.body.baseUrl),
      userEmail: clean(req.body.userEmail) || req.user!.email,
      status: req.body.status,
      priority: req.body.priority,
      createdBy: req.user!.id
    });

    const created = await (prisma as any).aiProviderKey.create({ data });
    await writeAuditLog(prisma as any, {
      organizationId,
      userId: req.user!.id,
      action: "create",
      entityType: "AiProviderKey",
      entityId: created.id,
      after: serializeAiProviderKey(created),
      metadata: { provider: created.provider, model: created.model, mode: created.mode },
      riskLevel: "medium"
    });

    res.status(201).json(serializeAiProviderKey(created));
  } catch (error) {
    next(error);
  }
});

aiKeysRouter.get("/:id/usage", async (req, res, next) => {
  try {
    requireAiKeyAdmin(req);
    const key = await findManagedKey(req.params.id);
    const logs = await (prisma as any).aIKeyUsageLog?.findMany
      ? await (prisma as any).aIKeyUsageLog.findMany({
          where: { aiProviderKeyId: key.id },
          orderBy: { createdAt: "desc" },
          take: 100
        })
      : [];
    res.json({
      key: serializeAiProviderKey(key),
      usage: {
        totalRequests: key.totalRequests,
        totalTokens: key.totalTokens,
        successCount: key.successCount,
        errorCount: key.errorCount,
        rateLimitCount: key.rateLimitCount,
        quotaErrorCount: key.quotaErrorCount,
        lastUsedAt: key.lastUsedAt,
        lastSuccessAt: key.lastSuccessAt,
        lastErrorAt: key.lastErrorAt,
        logs: logs.map(serializeAiKeyUsageLog)
      }
    });
  } catch (error) {
    next(error);
  }
});

aiKeysRouter.patch("/:id", async (req, res, next) => {
  try {
    requireAiKeyAdmin(req);
    const existing = await findManagedKey(req.params.id);
    const apiKey = clean(req.body.apiKey);
    const data: Record<string, unknown> = {};

    if (req.body.name !== undefined) data.name = clean(req.body.name) || existing.name;
    if (req.body.mode !== undefined) data.mode = normalizeAiKeyMode(req.body.mode);
    if (req.body.status !== undefined) data.status = normalizeAiKeyStatus(req.body.status);
    if (req.body.priority !== undefined && Number.isFinite(Number(req.body.priority))) data.priority = Number(req.body.priority);
    if (req.body.userEmail !== undefined) data.userEmail = clean(req.body.userEmail) || null;
    if (req.body.baseUrl !== undefined) data.baseUrl = clean(req.body.baseUrl) || null;
    if (req.body.model !== undefined || req.body.provider !== undefined || req.body.mode !== undefined) {
      const requestedModel = clean(req.body.model);
      const definition = findAiModel(requestedModel) || defaultModelForMode(typeof req.body.mode === "string" ? req.body.mode : existing.mode);
      data.provider = clean(req.body.provider) || definition.provider;
      data.model = requestedModel && requestedModel !== definition.id ? requestedModel : definition.model;
      data.baseUrl = clean(req.body.baseUrl) || existing.baseUrl || definition.baseUrl;
      data.mode = normalizeAiKeyMode(req.body.mode || definition.mode);
    }
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
      metadata: { replacedKey: Boolean(apiKey), provider: updated.provider, model: updated.model },
      riskLevel: apiKey ? "high" : "medium"
    });

    res.json(serializeAiProviderKey(updated));
  } catch (error) {
    next(error);
  }
});

aiKeysRouter.delete("/:id", async (req, res, next) => {
  try {
    requireAiKeyAdmin(req);
    if (req.body?.confirm !== true) return res.status(400).json({ error: "CONFIRM_REQUIRED", message: "This action requires confirmation." });
    const existing = await findManagedKey(req.params.id);
    const updated = await (prisma as any).aiProviderKey.update({ where: { id: existing.id }, data: { status: "disabled" } });
    await writeAuditLog(prisma as any, {
      organizationId: existing.organizationId,
      userId: req.user!.id,
      action: "delete",
      entityType: "AiProviderKey",
      entityId: existing.id,
      before: serializeAiProviderKey(existing),
      after: serializeAiProviderKey(updated),
      metadata: { softDelete: true },
      riskLevel: "high"
    });
    res.json(serializeAiProviderKey(updated));
  } catch (error) {
    next(error);
  }
});

async function loadKeys(input: { organizationId: string; mode?: string; status?: string; model?: string }) {
  return (prisma as any).aiProviderKey.findMany({
    where: {
      organizationId: input.organizationId,
      ...(AI_KEY_MODES.includes(input.mode as any) ? { mode: input.mode } : {}),
      ...(AI_KEY_STATUSES.includes(input.status as any) ? { status: input.status } : {}),
      ...(input.model ? { model: input.model } : {})
    },
    orderBy: [{ provider: "asc" }, { mode: "asc" }, { priority: "asc" }, { createdAt: "asc" }]
  });
}

async function findManagedKey(id: string) {
  const key = await (prisma as any).aiProviderKey.findUnique({ where: { id } });
  if (!key) throw Object.assign(new Error("AI provider key not found"), { status: 404 });
  return key;
}

function buildKeyData(input: {
  organizationId: string;
  apiKey: string;
  name?: string;
  mode?: unknown;
  model?: string;
  provider?: string;
  baseUrl?: string;
  userEmail?: string;
  status?: unknown;
  priority?: unknown;
  createdBy: string;
}) {
  const requestedMode = typeof input.mode === "string" ? input.mode : null;
  const definition = findAiModel(input.model) || defaultModelForMode(requestedMode);
  const provider = input.provider || definition.provider;
  const mode = normalizeAiKeyMode(input.mode || definition.mode);
  const model = input.model && input.model !== definition.id ? input.model : definition.model;
  return {
    organizationId: input.organizationId,
    provider,
    name: input.name || `${provider} ${mode} key ${keyLast4(input.apiKey)}`,
    mode,
    model,
    baseUrl: input.baseUrl || definition.baseUrl,
    userEmail: input.userEmail || null,
    encryptedKey: encryptProviderKey(input.apiKey),
    keyLast4: keyLast4(input.apiKey),
    status: normalizeAiKeyStatus(input.status),
    priority: Number.isFinite(Number(input.priority)) ? Number(input.priority) : definition.priority,
    createdBy: input.createdBy
  };
}

function parseImportDocument(input: unknown): ImportedAiKey[] {
  if (Array.isArray(input)) return input as ImportedAiKey[];
  if (typeof input === "object" && input && Array.isArray((input as { keys?: unknown }).keys)) return (input as { keys: ImportedAiKey[] }).keys;
  if (typeof input === "object" && input && (input as ImportedAiKey).key) return [input as ImportedAiKey];
  if (typeof input !== "string") return [];
  const text = input.trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.keys)) return parsed.keys;
    if (parsed.key) return [parsed];
  } catch {
    // Fall through to the small YAML parser below.
  }
  return parseSimpleYamlKeys(text);
}

function parseSimpleYamlKeys(text: string): ImportedAiKey[] {
  const lines = text.split(/\r?\n/);
  const items: ImportedAiKey[] = [];
  let current: ImportedAiKey | null = null;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("- ")) {
      if (current) items.push(current);
      current = {};
      assignYamlPair(current, line.slice(2));
      continue;
    }
    if (!current) current = {};
    assignYamlPair(current, line);
  }
  if (current && Object.keys(current).length > 0) items.push(current);
  return items.filter((item) => item.key || item.apiKey);
}

function assignYamlPair(target: ImportedAiKey, line: string) {
  const index = line.indexOf(":");
  if (index <= 0) return;
  const key = line.slice(0, index).trim();
  const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
  (target as Record<string, unknown>)[key] = value;
}

function requireAiKeyAdmin(req: express.Request) {
  const email = req.user?.email?.toLowerCase();
  if (email !== AI_KEY_ADMIN_EMAIL) throw Object.assign(new Error("AI key management is restricted"), { status: 403 });
}

function serializeAiKeyUsageLog(row: any) {
  return {
    id: row.id,
    organizationId: row.organizationId || null,
    aiProviderKeyId: row.aiProviderKeyId || null,
    provider: row.provider || null,
    mode: row.mode || null,
    model: row.model || null,
    requestSource: row.requestSource || null,
    promptTokens: row.promptTokens || 0,
    completionTokens: row.completionTokens || 0,
    totalTokens: row.totalTokens || 0,
    success: row.success !== false,
    errorMessage: row.errorMessage || null,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt)
  };
}

function aiKeysToCsv(keys: any[]) {
  const header = ["id", "organizationId", "provider", "model", "mode", "name", "maskedKey", "status", "totalRequests", "totalTokens", "successCount", "errorCount", "lastUsedAt"];
  const rows = keys.map((key) => {
    const item = serializeAiProviderKey(key);
    return [
      item.id,
      item.organizationId,
      item.provider,
      item.model,
      item.mode,
      item.name,
      item.maskedKey,
      item.status,
      item.totalRequests,
      item.totalTokens,
      item.successCount,
      item.errorCount,
      item.lastUsedAt || ""
    ];
  });
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

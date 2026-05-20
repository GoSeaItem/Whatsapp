import { Router } from "express";
import {
  KNOWLEDGE_BASE_CATEGORIES,
  KNOWLEDGE_BASE_LANGUAGES,
  SCRIPT_ORG_CATEGORIES,
  type KnowledgeBaseCategory,
  type KnowledgeBaseLanguage,
  type ScriptOrgCategory
} from "@wa-ai/shared";
import { prisma } from "./db.js";
import { writeAuditLog } from "./audit-log-utils.js";
import {
  canReadOrganization,
  canWriteOrganizationResource,
  getActiveOrganizationRole,
  organizationIdFromRequest
} from "./organization-permissions.js";

type OrgContentDb = Pick<typeof prisma, "organizationMember" | "knowledgeBaseOrg" | "scriptOrg" | "auditLog">;
type ContentKind = "knowledgeBaseOrg" | "scriptOrg";
type OrgContentRow = {
  id: string;
  organizationId: string;
  title: string;
  category: string;
  content: string;
  language: string;
  enabled: boolean;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const languageSet = new Set<string>(KNOWLEDGE_BASE_LANGUAGES);
const knowledgeCategorySet = new Set<string>(KNOWLEDGE_BASE_CATEGORIES);
const scriptCategorySet = new Set<string>(SCRIPT_ORG_CATEGORIES);

export function createKnowledgeBaseOrgRouter(db: OrgContentDb = prisma) {
  return createOrgContentRouter(db, {
    kind: "knowledgeBaseOrg",
    entityType: "KnowledgeBaseOrg",
    categorySet: knowledgeCategorySet,
    notFoundMessage: "organization knowledge not found"
  });
}

export function createScriptOrgRouter(db: OrgContentDb = prisma) {
  return createOrgContentRouter(db, {
    kind: "scriptOrg",
    entityType: "ScriptOrg",
    categorySet: scriptCategorySet,
    notFoundMessage: "organization script not found"
  });
}

function createOrgContentRouter(
  db: OrgContentDb,
  options: { kind: ContentKind; entityType: "KnowledgeBaseOrg" | "ScriptOrg"; categorySet: Set<string>; notFoundMessage: string }
) {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const organizationId = organizationIdFromRequest(req);
      if (!organizationId) {
        res.status(400).json({ message: "organizationId is required" });
        return;
      }
      const role = await getActiveOrganizationRole(db, organizationId, req.user!.id);
      if (!canReadOrganization(role)) {
        res.status(403).json({ message: "organization membership required" });
        return;
      }

      const category = clean(req.query.category);
      const language = clean(req.query.language);
      const q = clean(req.query.q);
      const where: Record<string, unknown> = { organizationId };
      if (category) where.category = category;
      if (language) where.language = language;
      if (q) {
        where.OR = [
          { title: { contains: q, mode: "insensitive" } },
          { content: { contains: q, mode: "insensitive" } },
          { category: { contains: q, mode: "insensitive" } },
          { language: { contains: q, mode: "insensitive" } }
        ];
      }

      const items = await model(db, options.kind).findMany({ where, orderBy: { updatedAt: "desc" }, take: 200 });
      res.json(items.map(serializeOrgContent));
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const existing = await model(db, options.kind).findUnique({ where: { id: req.params.id } });
      if (!existing) {
        res.status(404).json({ message: options.notFoundMessage });
        return;
      }
      if (!(await canAccessRecord(db, existing.organizationId, req.user!.id, false))) {
        res.status(403).json({ message: "organization membership required" });
        return;
      }
      res.json(serializeOrgContent(existing));
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      const errors = validateOrgContentPayload(req.body, options.categorySet);
      if (errors.length > 0) {
        res.status(400).json({ message: "validation failed", errors });
        return;
      }
      const organizationId = clean(req.body.organizationId);
      if (!(await canAccessRecord(db, organizationId, req.user!.id, true))) {
        res.status(403).json({ message: "owner or manager role required" });
        return;
      }
      if (await hasDuplicateTitle(db, options.kind, organizationId, clean(req.body.title), clean(req.body.category))) {
        res.status(409).json({ message: "duplicate title in this organization and category" });
        return;
      }

      const item = await model(db, options.kind).create({
        data: {
          ...toOrgContentData(req.body),
          organizationId,
          createdBy: req.user!.id
        }
      });
      await writeAuditLog(db, {
        organizationId,
        userId: req.user!.id,
        action: "create",
        entityType: options.entityType === "KnowledgeBaseOrg" ? "KnowledgeBase" : "ScriptOrg",
        entityId: item.id,
        before: null,
        after: item
      });
      res.status(201).json(serializeOrgContent(item));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id", async (req, res, next) => {
    try {
      const errors = validateOrgContentPayload(req.body, options.categorySet, { partial: true });
      if (errors.length > 0) {
        res.status(400).json({ message: "validation failed", errors });
        return;
      }
      const existing = await model(db, options.kind).findUnique({ where: { id: req.params.id } });
      if (!existing) {
        res.status(404).json({ message: options.notFoundMessage });
        return;
      }
      if (!(await canAccessRecord(db, existing.organizationId, req.user!.id, true))) {
        res.status(403).json({ message: "owner or manager role required" });
        return;
      }

      const nextTitle = req.body.title === undefined ? existing.title : clean(req.body.title);
      const nextCategory = req.body.category === undefined ? existing.category : clean(req.body.category);
      const duplicate = await hasDuplicateTitle(db, options.kind, existing.organizationId, nextTitle, nextCategory);
      if (duplicate && duplicate.id !== existing.id) {
        res.status(409).json({ message: "duplicate title in this organization and category" });
        return;
      }

      const item = await model(db, options.kind).update({
        where: { id: req.params.id },
        data: toOrgContentUpdateData(req.body)
      });
      await writeAuditLog(db, {
        organizationId: existing.organizationId,
        userId: req.user!.id,
        action: "update",
        entityType: options.entityType === "KnowledgeBaseOrg" ? "KnowledgeBase" : "ScriptOrg",
        entityId: item.id,
        before: existing,
        after: item
      });
      res.json(serializeOrgContent(item));
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", async (req, res, next) => {
    try {
      const existing = await model(db, options.kind).findUnique({ where: { id: req.params.id } });
      if (!existing) {
        res.status(404).json({ message: options.notFoundMessage });
        return;
      }
      if (!(await canAccessRecord(db, existing.organizationId, req.user!.id, true))) {
        res.status(403).json({ message: "owner or manager role required" });
        return;
      }
      await model(db, options.kind).delete({ where: { id: req.params.id } });
      await writeAuditLog(db, {
        organizationId: existing.organizationId,
        userId: req.user!.id,
        action: "delete",
        entityType: options.entityType === "KnowledgeBaseOrg" ? "KnowledgeBase" : "ScriptOrg",
        entityId: existing.id,
        before: existing,
        after: null
      });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export const knowledgeBaseOrgRouter = createKnowledgeBaseOrgRouter();
export const scriptOrgRouter = createScriptOrgRouter();

function serializeOrgContent(item: OrgContentRow) {
  return {
    id: item.id,
    organizationId: item.organizationId,
    title: item.title,
    category: item.category,
    content: item.content,
    language: normalizeLanguage(item.language),
    enabled: item.enabled,
    createdBy: item.createdBy || null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  };
}

function validateOrgContentPayload(input: Record<string, unknown>, categorySet: Set<string>, options: { partial?: boolean } = {}) {
  const errors: Array<{ field: string; message: string }> = [];
  const title = clean(input.title);
  const content = clean(input.content);
  const category = clean(input.category);
  const language = clean(input.language);
  const organizationId = clean(input.organizationId);

  if (!options.partial && !organizationId) errors.push({ field: "organizationId", message: "organizationId is required" });
  if (!options.partial && !title) errors.push({ field: "title", message: "title is required" });
  if (options.partial && input.title !== undefined && !title) errors.push({ field: "title", message: "title is required" });
  if (!options.partial && !content) errors.push({ field: "content", message: "content is required" });
  if (options.partial && input.content !== undefined && !content) errors.push({ field: "content", message: "content is required" });
  if (!options.partial && !category) errors.push({ field: "category", message: "category is required" });
  if (category && !categorySet.has(category)) errors.push({ field: "category", message: "unsupported category" });
  if (language && !languageSet.has(language)) errors.push({ field: "language", message: "unsupported language" });
  if (title.length > 160) errors.push({ field: "title", message: "title must be 160 characters or less" });
  if (content.length > 8000) errors.push({ field: "content", message: "content must be 8000 characters or less" });

  return errors;
}

function toOrgContentData(input: Record<string, unknown>) {
  return {
    title: clean(input.title),
    category: clean(input.category),
    content: clean(input.content),
    language: normalizeLanguage(clean(input.language) || "other"),
    enabled: input.enabled === undefined ? true : Boolean(input.enabled)
  };
}

function toOrgContentUpdateData(input: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  if (input.title !== undefined) data.title = clean(input.title);
  if (input.category !== undefined) data.category = clean(input.category);
  if (input.content !== undefined) data.content = clean(input.content);
  if (input.language !== undefined) data.language = normalizeLanguage(clean(input.language) || "other");
  if (input.enabled !== undefined) data.enabled = Boolean(input.enabled);
  return data;
}

async function canAccessRecord(db: OrgContentDb, organizationId: string, userId: string, write: boolean) {
  if (!organizationId) return false;
  const role = await getActiveOrganizationRole(db, organizationId, userId);
  return write ? canWriteOrganizationResource(role) : canReadOrganization(role);
}

async function hasDuplicateTitle(db: OrgContentDb, kind: ContentKind, organizationId: string, title: string, category: string) {
  if (!organizationId || !title || !category) return null;
  return model(db, kind).findFirst({ where: { organizationId, title, category } });
}

function model(db: OrgContentDb, kind: ContentKind) {
  return db[kind] as any;
}

function normalizeLanguage(value: unknown): KnowledgeBaseLanguage {
  const text = clean(value) || "other";
  return languageSet.has(text) ? (text as KnowledgeBaseLanguage) : "other";
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export type OrgKnowledgeCategory = KnowledgeBaseCategory;
export type OrgScriptCategory = ScriptOrgCategory;

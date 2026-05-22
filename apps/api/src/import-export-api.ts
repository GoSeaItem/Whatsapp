import { Router } from "express";
import type { Request } from "express";
import { prisma } from "./db.js";
import { writeAuditLog } from "./audit-log-utils.js";
import {
  csvForTemplate,
  exportCsv,
  importCsv,
  isImportExportType,
  MAX_CSV_BYTES,
  type ImportExportDb
} from "./import-export-utils.js";
import { canReadOrganization, canWriteOrganizationResource, getActiveOrganizationRole, organizationIdFromRequest } from "./organization-permissions.js";
import { exportOrganizationCsv, importOrganizationCsv, isOrgImportExportType, orgTypeLabel } from "./org-import-export-utils.js";
import { assertCanExportData, recordSecurityAudit, requireConfirm } from "./permissions.js";

type UploadedCsv = { filename: string; contentType: string; text: string; size: number };
const defaultDb = prisma as unknown as ImportExportDb;

export function createExportRouter(db: ImportExportDb = defaultDb) {
  const router = Router();

  router.get("/:id/status", async (req, res, next) => {
    try {
      const job = await (db as any).exportJob?.findUnique({ where: { id: req.params.id } });
      if (!job) return res.status(404).json({ message: "export job not found" });
      const role = await getActiveOrganizationRole(db as any, job.organizationId, req.user!.id);
      if (!canReadOrganization(role)) return res.status(403).json({ message: "organization membership required" });
      res.json(serializeExportJob(job));
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id/download", async (req, res, next) => {
    try {
      const job = await (db as any).exportJob?.findUnique({ where: { id: req.params.id } });
      if (!job) return res.status(404).json({ message: "export job not found" });
      const role = await getActiveOrganizationRole(db as any, job.organizationId, req.user!.id);
      if (!canReadOrganization(role)) return res.status(403).json({ message: "organization membership required" });
      const fieldsScope = job.filters?.fieldsScope === "sensitive" ? "sensitive" : "normal";
      await assertCanExportData(db as any, req.user!.id, job.organizationId, fieldsScope);
      if (job.status !== "completed") return res.status(409).json({ message: "export job is not completed" });
      const csv = await exportOrganizationCsv(db as any, job.type, job.organizationId, job.filters || {});
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="organization-${job.type}-${new Date().toISOString().slice(0, 10)}.csv"`);
      res.send(csv);
    } catch (error) {
      next(error);
    }
  });

  router.post("/:type", async (req, res, next) => {
    try {
      const type = req.params.type;
      if (!isOrgImportExportType(type)) return res.status(404).json({ message: "export type not found" });
      const organizationId = organizationIdFromRequest(req);
      if (!organizationId) return res.status(400).json({ message: "organizationId is required" });
      const fieldsScope = req.body?.fieldsScope === "sensitive" ? "sensitive" : "normal";
      try {
        await assertCanExportData(db as any, req.user!.id, organizationId, fieldsScope);
      } catch (error: any) {
        await recordSecurityAudit(db as any, req, {
          organizationId,
          action: "export_denied",
          entityType: "ExportJob",
          riskLevel: fieldsScope === "sensitive" ? "high" : "medium",
          failureReason: error?.message || "export denied",
          metadata: { exportType: type, fieldsScope }
        });
        return res.status(error?.status || 403).json({ message: error?.message || "export permission required" });
      }
      if (fieldsScope === "sensitive") {
        const confirmError = requireConfirm(req, "export.sensitiveFields");
        if (confirmError) {
          await recordSecurityAudit(db as any, req, {
            organizationId,
            action: "confirm_required",
            entityType: "ExportJob",
            riskLevel: "high",
            metadata: { exportType: type, fieldsScope, confirmRequired: true }
          });
          return res.status(409).json(confirmError);
        }
      }

      const filters = typeof req.body === "object" && req.body ? { ...(req.body.filters || {}), fieldsScope } : { fieldsScope };
      const pending = await (db as any).exportJob.create({
        data: {
          organizationId,
          type,
          filePath: "",
          status: "processing",
          filters,
          createdBy: req.user!.id
        }
      });

      try {
        const csv = await exportOrganizationCsv(db as any, type, organizationId, filters);
        const filePath = `/api/export/${pending.id}/download`;
        const job = await (db as any).exportJob.update({ where: { id: pending.id }, data: { status: "completed", filePath } });
        await writeAuditLog(db as any, {
          organizationId,
          userId: req.user!.id,
          action: "create",
          entityType: "ExportJob",
          entityId: job.id,
          after: { type, status: "completed", filters },
          metadata: { rowCount: Math.max(0, csv.trim().split(/\r?\n/).length - 1), exportType: type, fieldsScope, confirmed: fieldsScope === "sensitive" },
          riskLevel: fieldsScope === "sensitive" ? "high" : "medium"
        });
        res.json({ job: serializeExportJob(job), downloadUrl: filePath, fieldsScope, riskWarnings: exportRiskWarnings(fieldsScope) });
      } catch (error) {
        const job = await (db as any).exportJob.update({ where: { id: pending.id }, data: { status: "failed", filePath: "" } });
        await writeAuditLog(db as any, {
          organizationId,
          userId: req.user!.id,
          action: "create",
          entityType: "ExportJob",
          entityId: job.id,
          after: { type, status: "failed", message: error instanceof Error ? error.message : "export failed" },
          riskLevel: "medium"
        });
        throw error;
      }
    } catch (error) {
      next(error);
    }
  });

  router.get("/:type", async (req, res, next) => {
    try {
      const type = req.params.type;
      if (!isImportExportType(type)) return res.status(404).json({ message: "export type not found" });
      const csv = await exportCsv(db, type, req.user!.id);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${type}-${new Date().toISOString().slice(0, 10)}.csv"`);
      res.send(csv);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export function createImportRouter(db: ImportExportDb = defaultDb) {
  const router = Router();

  router.get("/templates/:type", (req, res) => {
    const type = req.params.type;
    if (!isImportExportType(type)) return res.status(404).json({ message: "template type not found" });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${type}-template.csv"`);
    res.send(csvForTemplate(type));
  });

  router.get("/:id/status", async (req, res, next) => {
    try {
      const job = await (db as any).importJob?.findUnique({ where: { id: req.params.id } });
      if (!job) return res.status(404).json({ message: "import job not found" });
      const role = await getActiveOrganizationRole(db as any, job.organizationId, req.user!.id);
      if (!canReadOrganization(role)) return res.status(403).json({ message: "organization membership required" });
      res.json(serializeImportJob(job));
    } catch (error) {
      next(error);
    }
  });

  router.post("/:type", async (req, res, next) => {
    try {
      const type = req.params.type;
      if (isOrgImportExportType(type)) {
        const organizationId = organizationIdFromRequest(req);
        if (!organizationId) return res.status(400).json({ message: "organizationId is required" });
        const role = await getActiveOrganizationRole(db as any, organizationId, req.user!.id);
        if (!canWriteOrganizationResource(role)) return res.status(403).json({ message: "owner or manager role required" });
        const upload = await readMultipartCsv(req);
        const validationError = validateUpload(upload);
        if (validationError) return res.status(validationError.status).json({ message: validationError.message });

        const dryRun = String(req.query.dryRun || "false") === "true";
        const pending = await (db as any).importJob.create({
          data: {
            organizationId,
            type,
            filePath: upload.filename,
            dryRun,
            status: "processing",
            createdBy: req.user!.id
          }
        });

        try {
          const result = await importOrganizationCsv(db as any, type, organizationId, req.user!.id, upload.text, {
            dryRun,
            skipDuplicates: String(req.query.skipDuplicates || "true") !== "false"
          });
          const job = await (db as any).importJob.update({ where: { id: pending.id }, data: { status: "completed", result } });
          await writeAuditLog(db as any, {
            organizationId,
            userId: req.user!.id,
            action: "create",
            entityType: "ImportJob",
            entityId: job.id,
            after: { type, status: "completed", dryRun, result },
            metadata: { importedEntityType: orgTypeLabel(type) }
          });
          return res.json({ job: serializeImportJob(job), result });
        } catch (error) {
          const result = { message: error instanceof Error ? error.message : "import failed" };
          const job = await (db as any).importJob.update({ where: { id: pending.id }, data: { status: "failed", result } });
          await writeAuditLog(db as any, {
            organizationId,
            userId: req.user!.id,
            action: "create",
            entityType: "ImportJob",
            entityId: job.id,
            after: { type, status: "failed", dryRun, result }
          });
          return res.status(400).json({ job: serializeImportJob(job), result });
        }
      }

      if (!isImportExportType(type)) return res.status(404).json({ message: "import type not found" });
      const upload = await readMultipartCsv(req);
      const validationError = validateUpload(upload);
      if (validationError) return res.status(validationError.status).json({ message: validationError.message });
      const organizationId = type === "customers" ? organizationIdFromRequest(req) : "";
      if (organizationId) {
        const role = await getActiveOrganizationRole(db as any, organizationId, req.user!.id);
        if (!canReadOrganization(role)) return res.status(403).json({ message: "organization membership required" });
        if (role === "support") return res.status(403).json({ message: "support role is read-only for customer import" });
      }
      const result = await importCsv(db, type, req.user!.id, upload.text, {
        dryRun: String(req.query.dryRun || "false") === "true",
        skipDuplicates: String(req.query.skipDuplicates || "true") !== "false",
        organizationId: organizationId || undefined
      });
      res.json(result);
    } catch (error) {
      if (error instanceof UploadError) return res.status(error.status).json({ message: error.message });
      next(error);
    }
  });

  return router;
}

export const exportRouter = createExportRouter();
export const importRouter = createImportRouter();

class UploadError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function readMultipartCsv(req: Request): Promise<UploadedCsv> {
  const contentType = req.headers["content-type"] || "";
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(Array.isArray(contentType) ? contentType[0] : contentType);
  if (!boundaryMatch) throw new UploadError(400, "multipart/form-data with a CSV file is required");
  const boundary = boundaryMatch[1] || boundaryMatch[2];
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_CSV_BYTES + 1024 * 256) throw new UploadError(413, "CSV file is too large");
    chunks.push(buffer);
  }
  const body = Buffer.concat(chunks).toString("utf8");
  const part = body
    .split(`--${boundary}`)
    .find((candidate) => /Content-Disposition: form-data/i.test(candidate) && /filename=/i.test(candidate));
  if (!part) throw new UploadError(400, "CSV file is required");
  const [rawHeaders, ...contentParts] = part.split(/\r?\n\r?\n/);
  const disposition = /filename="([^"]*)"/i.exec(rawHeaders);
  const typeMatch = /Content-Type:\s*([^\r\n]+)/i.exec(rawHeaders);
  const filename = disposition?.[1] || "";
  const content = contentParts.join("\n\n").replace(/\r?\n--$/, "").replace(/\r?\n$/, "");
  return {
    filename,
    contentType: (typeMatch?.[1] || "").trim(),
    text: content,
    size: Buffer.byteLength(content)
  };
}

function validateUpload(upload: UploadedCsv) {
  if (!upload.filename.toLowerCase().endsWith(".csv")) return { status: 400, message: "only .csv files are allowed" };
  if (upload.size > MAX_CSV_BYTES) return { status: 413, message: "CSV file is too large" };
  if (upload.contentType && !["text/csv", "application/vnd.ms-excel", "application/octet-stream"].includes(upload.contentType.toLowerCase())) {
    return { status: 400, message: "invalid CSV MIME type" };
  }
  return null;
}

function serializeImportJob(job: any) {
  return {
    id: job.id,
    organizationId: job.organizationId,
    type: job.type,
    filePath: job.filePath,
    dryRun: Boolean(job.dryRun),
    status: job.status,
    result: job.result || null,
    createdBy: job.createdBy,
    createdAt: job.createdAt instanceof Date ? job.createdAt.toISOString() : String(job.createdAt),
    updatedAt: job.updatedAt instanceof Date ? job.updatedAt.toISOString() : String(job.updatedAt)
  };
}

function serializeExportJob(job: any) {
  return {
    id: job.id,
    organizationId: job.organizationId,
    type: job.type,
    filePath: job.filePath,
    status: job.status,
    filters: job.filters || null,
    createdBy: job.createdBy,
    createdAt: job.createdAt instanceof Date ? job.createdAt.toISOString() : String(job.createdAt),
    updatedAt: job.updatedAt instanceof Date ? job.updatedAt.toISOString() : String(job.updatedAt)
  };
}

function exportRiskWarnings(fieldsScope: "normal" | "sensitive") {
  const warnings = [
    "Export contains only current organization data visible to the current user.",
    "Passwords, tokens, secrets, API keys, sessions, cookies and .env values are never exported."
  ];
  if (fieldsScope === "sensitive") warnings.push("Sensitive export may contain contact fields. Confirm business need and keep the file secure.");
  return warnings;
}

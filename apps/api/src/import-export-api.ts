import { Router } from "express";
import type { Request } from "express";
import { prisma } from "./db.js";
import {
  csvForTemplate,
  exportCsv,
  importCsv,
  isImportExportType,
  MAX_CSV_BYTES,
  type ImportExportDb
} from "./import-export-utils.js";
import { canReadOrganization, getActiveOrganizationRole, organizationIdFromRequest } from "./organization-permissions.js";

type UploadedCsv = { filename: string; contentType: string; text: string; size: number };
const defaultDb = prisma as unknown as ImportExportDb;

export function createExportRouter(db: ImportExportDb = defaultDb) {
  const router = Router();

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

  router.post("/:type", async (req, res, next) => {
    try {
      const type = req.params.type;
      if (!isImportExportType(type)) return res.status(404).json({ message: "import type not found" });
      const upload = await readMultipartCsv(req);
      if (!upload.filename.toLowerCase().endsWith(".csv")) {
        return res.status(400).json({ message: "only .csv files are allowed" });
      }
      if (upload.size > MAX_CSV_BYTES) {
        return res.status(413).json({ message: "CSV file is too large" });
      }
      if (upload.contentType && !["text/csv", "application/vnd.ms-excel", "application/octet-stream"].includes(upload.contentType.toLowerCase())) {
        return res.status(400).json({ message: "invalid CSV MIME type" });
      }
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

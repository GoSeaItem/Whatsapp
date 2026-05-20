import { prisma } from "./db.js";

type AuditLogDb = Partial<Pick<typeof prisma, "auditLog">>;

export type AuditAction = "create" | "update" | "delete";

export type AuditLogInput = {
  organizationId?: string | null;
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
};

const sensitiveKeyPattern = /(password|secret|token|cookie|api[_-]?key|session)/i;
const formulaPrefixPattern = /^[=+\-@]/;

export async function writeAuditLog(db: AuditLogDb, input: AuditLogInput) {
  if (!db.auditLog || !input.organizationId) return null;
  return db.auditLog.create({
    data: {
      organizationId: input.organizationId,
      actorId: input.userId,
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId || null,
      before: toAuditJson(input.before),
      after: toAuditJson(input.after),
      metadata: toAuditJson(input.metadata)
    } as any
  });
}

export function serializeAuditLog(log: any) {
  return {
    id: log.id,
    organizationId: log.organizationId || null,
    userId: log.userId || log.actorId || null,
    actorId: log.actorId || log.userId || null,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId || null,
    before: log.before || null,
    after: log.after || null,
    metadata: log.metadata || null,
    createdAt: log.createdAt instanceof Date ? log.createdAt.toISOString() : String(log.createdAt)
  };
}

export function auditLogsToCsv(logs: any[]) {
  const header = ["createdAt", "organizationId", "userId", "action", "entityType", "entityId", "before", "after"];
  const rows = logs.map((log) => {
    const item = serializeAuditLog(log);
    return [
      item.createdAt,
      item.organizationId,
      item.userId,
      item.action,
      item.entityType,
      item.entityId,
      item.before ? JSON.stringify(item.before) : "",
      item.after ? JSON.stringify(item.after) : ""
    ];
  });
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function toAuditJson(value: unknown): any {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toAuditJson);
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof (record as { toJSON?: unknown }).toJSON === "function") {
      return toAuditJson((record as { toJSON: () => unknown }).toJSON());
    }
    if (typeof (record as { toString?: unknown }).toString === "function" && record.constructor?.name === "Decimal") {
      return String(record);
    }
    return Object.fromEntries(
      Object.entries(record)
        .filter(([key]) => !sensitiveKeyPattern.test(key))
        .map(([key, item]) => [key, toAuditJson(item)])
    );
  }
  if (typeof value === "bigint") return value.toString();
  return value;
}

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  const safeText = formulaPrefixPattern.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

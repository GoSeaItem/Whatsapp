import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createExportRouter, createImportRouter } from "./import-export-api.js";

type Row = Record<string, any>;

function createTestApp(seed: Partial<MemoryDb> = {}) {
  const db = createMemoryDb(seed);
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const userId = req.header("x-user-id") || "manager";
    req.user = { id: userId, email: `${userId}@example.com`, name: userId };
    next();
  });
  app.use("/api/export", createExportRouter(db as any));
  app.use("/api/import", createImportRouter(db as any));
  return { app, db };
}

describe("V4-A organization import/export jobs", () => {
  it("creates dryRun import jobs without writing data and records audit logs", async () => {
    const { app, db } = createTestApp();
    const response = await uploadOrgCsv(app, "customer", "name,whatsappNumber\nMaria,+52155", true).expect(200);

    expect(response.body.job).toMatchObject({ organizationId: "org-a", type: "customer", dryRun: true, status: "completed" });
    expect(response.body.result).toMatchObject({ dryRun: true, successCount: 1, failureCount: 0 });
    expect(db._store.customers).toHaveLength(0);
    expect(db._store.importJobs[0].result).toMatchObject({ successCount: 1 });
    expect(db._store.auditLogs[0]).toMatchObject({ entityType: "ImportJob", organizationId: "org-a", userId: "manager" });
  });

  it("imports organization customers and blocks same-organization duplicates", async () => {
    const { app, db } = createTestApp({
      customers: [makeCustomer({ id: "existing", organizationId: "org-a", whatsappNumber: "+52155" })]
    });

    const duplicate = await uploadOrgCsv(app, "customer", "name,whatsappNumber\nMaria,+52155", true).expect(200);
    expect(duplicate.body.result).toMatchObject({ successCount: 0, failureCount: 1 });

    const imported = await uploadOrgCsv(app, "customer", "name,whatsappNumber,email,socialLinks\nAna,+52156,ana@example.com,https://instagram.com/ana", false).expect(200);
    expect(imported.body.result).toMatchObject({ successCount: 1, failureCount: 0 });
    expect(db._store.customers.find((item) => item.whatsappNumber === "+52156")).toMatchObject({
      ownerId: "manager",
      organizationId: "org-a",
      assignedTo: "manager"
    });
  });

  it("imports shared products, materials, organization knowledge and scripts", async () => {
    const { app, db } = createTestApp();

    await uploadOrgCsv(app, "product", "name,sku,category,moq,minPrice\nBlue Dress,BD-001,Dress,100,10", false).expect(200);
    await uploadOrgCsv(app, "material", "title,type,url,productSku\nReal photo,image,https://example.com/a.jpg,BD-001", false).expect(200);
    await uploadOrgCsv(app, "knowledge", "title,category,content,language\nMexico logistics,logistics,Confirm city,en", false).expect(200);
    await uploadOrgCsv(app, "script", "title,category,content,language\nPrice reply,price,Please confirm quantity,en", false).expect(200);

    expect(db._store.products[0]).toMatchObject({ sku: "BD-001", ownerId: "manager" });
    expect(db._store.orgProducts[0]).toMatchObject({ organizationId: "org-a", createdBy: "manager" });
    expect(db._store.materials[0]).toMatchObject({ title: "Real photo", productId: db._store.products[0].id });
    expect(db._store.orgMaterials[0]).toMatchObject({ organizationId: "org-a" });
    expect(db._store.knowledge[0]).toMatchObject({ title: "Mexico logistics", organizationId: "org-a" });
    expect(db._store.scripts[0]).toMatchObject({ title: "Price reply", organizationId: "org-a" });
  });

  it("allows owner and manager export jobs but rejects sales/support writes", async () => {
    const { app, db } = createTestApp({
      customers: [
        makeCustomer({ id: "c1", organizationId: "org-a", name: "Org A buyer" }),
        makeCustomer({ id: "c2", organizationId: "org-b", name: "Org B buyer" })
      ]
    });

    await uploadOrgCsv(app, "customer", "name\nBlocked", false, "sales").expect(403);
    const exportResponse = await request(app)
      .post("/api/export/customer?organizationId=org-a")
      .set("x-user-id", "manager")
      .send({ filters: { q: "buyer" } })
      .expect(200);

    expect(exportResponse.body.job).toMatchObject({ organizationId: "org-a", type: "customer", status: "completed" });
    expect(db._store.exportJobs[0].filePath).toContain("/api/export/");
    expect(db._store.auditLogs.some((log) => log.entityType === "ExportJob")).toBe(true);

    await request(app).get(`/api/export/${exportResponse.body.job.id}/status`).set("x-user-id", "manager").expect(200);
    const download = await request(app).get(`/api/export/${exportResponse.body.job.id}/download`).set("x-user-id", "manager").expect(200);
    expect(download.headers["content-type"]).toContain("text/csv");
    expect(download.text).toContain("Org A buyer");
    expect(download.text).not.toContain("Org B buyer");
    await request(app).get(`/api/export/${exportResponse.body.job.id}/status`).set("x-user-id", "other").expect(403);
  });
});

function uploadOrgCsv(app: express.Express, type: string, csv: string, dryRun: boolean, userId = "manager") {
  return request(app)
    .post(`/api/import/${type}?organizationId=org-a&dryRun=${String(dryRun)}`)
    .set("x-user-id", userId)
    .attach("file", Buffer.from(csv, "utf8"), { filename: `${type}.csv`, contentType: "text/csv" });
}

type MemoryDb = {
  customers: Row[];
  products: Row[];
  orgProducts: Row[];
  materials: Row[];
  orgMaterials: Row[];
  knowledge: Row[];
  scripts: Row[];
  importJobs: Row[];
  exportJobs: Row[];
  auditLogs: Row[];
};

function createMemoryDb(seed: Partial<MemoryDb>) {
  const store: MemoryDb = {
    customers: [...(seed.customers || [])],
    products: [...(seed.products || [])],
    orgProducts: [...(seed.orgProducts || [])],
    materials: [...(seed.materials || [])],
    orgMaterials: [...(seed.orgMaterials || [])],
    knowledge: [...(seed.knowledge || [])],
    scripts: [...(seed.scripts || [])],
    importJobs: [...(seed.importJobs || [])],
    exportJobs: [...(seed.exportJobs || [])],
    auditLogs: [...(seed.auditLogs || [])]
  };
  let nextId = 1;
  const now = new Date("2026-05-20T00:00:00.000Z");

  const createRow = (items: Row[], prefix: string, data: Row) => {
    const row = { id: `${prefix}-${nextId++}`, createdAt: now, updatedAt: now, ...data };
    items.push(row);
    return row;
  };

  return {
    _store: store,
    organizationMember: {
      async findFirst(args: any) {
        const members = [
          { organizationId: "org-a", userId: "owner", role: "owner", status: "active" },
          { organizationId: "org-a", userId: "manager", role: "manager", status: "active" },
          { organizationId: "org-a", userId: "sales", role: "sales", status: "active" },
          { organizationId: "org-a", userId: "support", role: "support", status: "active" },
          { organizationId: "org-b", userId: "other", role: "owner", status: "active" }
        ];
        return members.find((row) => matchesWhere(row, args.where)) || null;
      }
    },
    importJob: {
      async create(args: any) {
        return createRow(store.importJobs, "import", args.data);
      },
      async update(args: any) {
        return updateById(store.importJobs, args.where.id, args.data);
      },
      async findUnique(args: any) {
        return store.importJobs.find((row) => row.id === args.where.id) || null;
      }
    },
    exportJob: {
      async create(args: any) {
        return createRow(store.exportJobs, "export", args.data);
      },
      async update(args: any) {
        return updateById(store.exportJobs, args.where.id, args.data);
      },
      async findUnique(args: any) {
        return store.exportJobs.find((row) => row.id === args.where.id) || null;
      }
    },
    auditLog: {
      async create(args: any) {
        return createRow(store.auditLogs, "audit", args.data);
      }
    },
    customer: {
      async findMany(args: any) {
        return store.customers.filter((row) => matchesWhere(row, args.where));
      },
      async findFirst(args: any) {
        return store.customers.find((row) => matchesWhere(row, args.where)) || null;
      },
      async create(args: any) {
        return createRow(store.customers, "customer", args.data);
      }
    },
    product: {
      async create(args: any) {
        return createRow(store.products, "product", args.data);
      }
    },
    organizationProduct: {
      async findMany(args: any) {
        return store.orgProducts.filter((row) => matchesWhere(row, args.where)).map((row) => ({ ...row, product: store.products.find((product) => product.id === row.productId) || null }));
      },
      async create(args: any) {
        return createRow(store.orgProducts, "org-product", args.data);
      }
    },
    material: {
      async create(args: any) {
        return createRow(store.materials, "material", args.data);
      }
    },
    organizationMaterial: {
      async findMany(args: any) {
        return store.orgMaterials.filter((row) => matchesWhere(row, args.where)).map((row) => ({
          ...row,
          material: withProduct(store.materials.find((material) => material.id === row.materialId), store.products)
        }));
      },
      async create(args: any) {
        return createRow(store.orgMaterials, "org-material", args.data);
      }
    },
    knowledgeBaseOrg: {
      async findMany(args: any) {
        return store.knowledge.filter((row) => matchesWhere(row, args.where));
      },
      async create(args: any) {
        return createRow(store.knowledge, "knowledge", args.data);
      }
    },
    scriptOrg: {
      async findMany(args: any) {
        return store.scripts.filter((row) => matchesWhere(row, args.where));
      },
      async create(args: any) {
        return createRow(store.scripts, "script", args.data);
      }
    }
  };
}

function updateById(items: Row[], id: string, data: Row) {
  const index = items.findIndex((row) => row.id === id);
  items[index] = { ...items[index], ...data, updatedAt: new Date("2026-05-20T00:00:00.000Z") };
  return items[index];
}

function matchesWhere(row: Row, where: Row = {}) {
  return Object.entries(where || {}).every(([key, value]) => {
    if (key === "OR" && Array.isArray(value)) return value.some((condition) => matchesWhere(row, condition));
    if (value && typeof value === "object" && "hasSome" in value) return Array.isArray(row[key]) && value.hasSome.some((item: string) => row[key].includes(item));
    if (value && typeof value === "object" && "createdAt" in value) return true;
    return row[key] === value;
  });
}

function withProduct(material: Row | undefined, products: Row[]) {
  if (!material) return null;
  return { ...material, product: products.find((product) => product.id === material.productId) || null };
}

function makeCustomer(overrides: Row = {}) {
  return {
    id: "c",
    name: "Maria",
    whatsappNumber: "+52155",
    email: "maria@example.com",
    socialLinks: [],
    tags: [],
    stage: "new",
    ownerId: "manager",
    organizationId: "org-a",
    assignedTo: "manager",
    collaborators: [],
    createdAt: new Date("2026-05-20T00:00:00.000Z"),
    updatedAt: new Date("2026-05-20T00:00:00.000Z"),
    ...overrides
  };
}

import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createQuotesRouter } from "./quotes-api.js";
import { createOrganizationMaterialsRouter, createOrganizationProductsRouter } from "./org-resource-api.js";

type MemberRow = { id: string; organizationId: string; userId: string; role: string; status: string };
type ProductRow = {
  id: string;
  ownerId: string;
  name: string;
  sku: string;
  category: string | null;
  images: string[];
  videos: string[];
  colors: string[];
  sizes: string[];
  material: string | null;
  moq: number | null;
  suggestedPrice: any;
  minPrice: any;
  leadTime: string | null;
  sellingPoints: string[];
  introEn: string | null;
  introEs: string | null;
  introPt: string | null;
  introAr: string | null;
  createdAt: Date;
  updatedAt: Date;
};
type MaterialRow = {
  id: string;
  ownerId: string;
  title: string;
  type: string;
  url: string;
  description: string | null;
  language: string;
  productId: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
};
type OrgProductRow = { id: string; organizationId: string; productId: string; createdBy: string; createdAt: Date; updatedAt: Date };
type OrgMaterialRow = { id: string; organizationId: string; materialId: string; createdBy: string; createdAt: Date; updatedAt: Date };

function createTestApp() {
  const members: MemberRow[] = [
    { id: "m-owner", organizationId: "org-a", userId: "owner", role: "owner", status: "active" },
    { id: "m-manager", organizationId: "org-a", userId: "manager", role: "manager", status: "active" },
    { id: "m-sales", organizationId: "org-a", userId: "sales", role: "sales", status: "active" },
    { id: "m-support", organizationId: "org-a", userId: "support", role: "support", status: "active" },
    { id: "m-other", organizationId: "org-b", userId: "other", role: "owner", status: "active" }
  ];
  const products = [
    makeProduct({ id: "product-owner", ownerId: "owner", name: "Blue Dress", sku: "BD-001", category: "dress" }),
    makeProduct({ id: "product-other", ownerId: "other", name: "Other Dress", sku: "OD-001", category: "dress" })
  ];
  const materials = [
    makeMaterial({ id: "material-owner", ownerId: "owner", title: "Blue Dress photo", type: "image", productId: "product-owner" }),
    makeMaterial({ id: "material-other", ownerId: "other", title: "Other photo", type: "image", productId: "product-other" })
  ];
  const orgProducts: OrgProductRow[] = [
    makeOrgProduct({ id: "share-product", organizationId: "org-a", productId: "product-owner", createdBy: "owner" }),
    makeOrgProduct({ id: "share-product-b", organizationId: "org-b", productId: "product-other", createdBy: "other" })
  ];
  const orgMaterials: OrgMaterialRow[] = [
    makeOrgMaterial({ id: "share-material", organizationId: "org-a", materialId: "material-owner", createdBy: "owner" }),
    makeOrgMaterial({ id: "share-material-b", organizationId: "org-b", materialId: "material-other", createdBy: "other" })
  ];
  const auditLogs: any[] = [];

  const db = {
    organizationMember: {
      async findFirst(args: any) {
        return members.find((member) => matchesWhere(member, args.where)) || null;
      }
    },
    product: {
      async findFirst(args: any) {
        return products.find((product) => matchesWhere(product, args.where)) || null;
      },
      async update(args: any) {
        const index = products.findIndex((product) => product.id === args.where.id);
        products[index] = { ...products[index], ...args.data, updatedAt: new Date("2026-05-20T10:00:00.000Z") };
        return products[index];
      }
    },
    material: {
      async findFirst(args: any) {
        return materials.find((material) => matchesWhere(material, args.where)) || null;
      },
      async update(args: any) {
        const index = materials.findIndex((material) => material.id === args.where.id);
        materials[index] = { ...materials[index], ...args.data, updatedAt: new Date("2026-05-20T10:00:00.000Z") };
        return materials[index];
      }
    },
    organizationProduct: createOrgProductModel(orgProducts, products),
    organizationMaterial: createOrgMaterialModel(orgMaterials, materials),
    knowledgeBase: { async findMany() { return []; } },
    knowledgeBaseOrg: { async findMany() { return []; } },
    scriptOrg: { async findMany() { return []; } },
    quote: { async create() { throw new Error("not used"); } },
    customer: { async findFirst() { return null; } },
    auditLog: {
      async create(args: any) {
        auditLogs.push({ id: `audit-${auditLogs.length + 1}`, ...args.data });
        return auditLogs[auditLogs.length - 1];
      }
    }
  };

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const id = req.header("x-user-id") || "owner";
    req.user = { id, email: `${id}@example.com`, name: id };
    next();
  });
  app.use("/api/products/org", createOrganizationProductsRouter(db as any));
  app.use("/api/materials/org", createOrganizationMaterialsRouter(db as any));
  app.use("/api/quotes", createQuotesRouter(db as any));
  return { app, auditLogs };
}

describe("V3-F organization shared products and materials", () => {
  it("lists organization products, supports search, and rejects cross-organization access", async () => {
    const { app } = createTestApp();

    const list = await request(app).get("/api/products/org?organizationId=org-a&q=blue").set("x-user-id", "sales").expect(200);
    expect(list.body.map((item: any) => item.id)).toEqual(["share-product"]);
    expect(list.body[0].product).toMatchObject({ name: "Blue Dress", sku: "BD-001" });

    await request(app).get("/api/products/org/share-product-b").set("x-user-id", "sales").expect(403);
  });

  it("allows owner/manager to share, update, and remove products while sales/support stay read-only", async () => {
    const { app, auditLogs } = createTestApp();

    await request(app).post("/api/products/org").set("x-user-id", "sales").send({ organizationId: "org-a", productId: "product-owner" }).expect(403);
    await request(app).post("/api/products/org").set("x-user-id", "owner").send({ organizationId: "org-a", productId: "product-other" }).expect(404);

    const created = await request(app).post("/api/products/org").set("x-user-id", "owner").send({ organizationId: "org-a", productId: "product-owner" }).expect(409);
    expect(created.body.message).toContain("already shared");

    const updated = await request(app).patch("/api/products/org/share-product").set("x-user-id", "manager").send({ name: "Blue Dress Pro" }).expect(200);
    expect(updated.body.product.name).toBe("Blue Dress Pro");
    await request(app).delete("/api/products/org/share-product").set("x-user-id", "support").expect(403);
    await request(app).delete("/api/products/org/share-product").set("x-user-id", "manager").expect(204);
    expect(auditLogs.some((log) => log.action === "update" && log.entityType === "Product" && log.before && log.after)).toBe(true);
    expect(auditLogs.some((log) => log.action === "delete" && log.entityType === "Product" && log.before && log.after === null)).toBe(true);
  });

  it("lists and protects organization materials", async () => {
    const { app, auditLogs } = createTestApp();

    const list = await request(app).get("/api/materials/org?organizationId=org-a&q=photo").set("x-user-id", "sales").expect(200);
    expect(list.body[0].material).toMatchObject({ title: "Blue Dress photo", type: "image" });
    await request(app).get("/api/materials/org/share-material-b").set("x-user-id", "sales").expect(403);
    await request(app).patch("/api/materials/org/share-material").set("x-user-id", "sales").send({ title: "Nope" }).expect(403);
    const updated = await request(app).patch("/api/materials/org/share-material").set("x-user-id", "manager").send({ title: "Factory photo" }).expect(200);
    expect(updated.body.material.title).toBe("Factory photo");
    await request(app).delete("/api/materials/org/share-material").set("x-user-id", "owner").expect(204);
    expect(auditLogs.some((log) => log.action === "update" && log.entityType === "Material" && log.before && log.after)).toBe(true);
  });

  it("lets quote assistant generate quotes from organization shared products", async () => {
    const { app } = createTestApp();

    const response = await request(app)
      .post("/api/quotes/generate")
      .set("x-user-id", "sales")
      .send({ organizationId: "org-a", productId: "product-owner", quantity: 100, unitPrice: 12.5, currency: "USD", includeShipping: false })
      .expect(200);

    expect(response.body.productId).toBe("product-owner");
    expect(response.body.quoteText).toContain("Blue Dress");
    expect(response.body.riskWarnings.join(" ")).toContain("草稿");
  });
});

function createOrgProductModel(rows: OrgProductRow[], products: ProductRow[]) {
  return {
    async findMany(args: any) {
      return rows.filter((row) => matchesOrgProduct(row, args.where, products)).map((row) => withProduct(row, products));
    },
    async findFirst(args: any) {
      const row = rows.find((item) => matchesWhere(item, args.where));
      return row ? withProduct(row, products) : null;
    },
    async findUnique(args: any) {
      const row = rows.find((item) => item.id === args.where.id);
      return row ? withProduct(row, products) : null;
    },
    async create(args: any) {
      if (rows.some((row) => row.organizationId === args.data.organizationId && row.productId === args.data.productId)) throw uniqueError();
      const row = makeOrgProduct({ id: `share-${rows.length + 1}`, ...args.data });
      rows.push(row);
      return withProduct(row, products);
    },
    async update(args: any) {
      const index = rows.findIndex((row) => row.id === args.where.id);
      rows[index] = { ...rows[index], updatedAt: new Date("2026-05-20T10:00:00.000Z") };
      return withProduct(rows[index], products);
    },
    async delete(args: any) {
      const index = rows.findIndex((row) => row.id === args.where.id);
      const [deleted] = rows.splice(index, 1);
      return deleted;
    }
  };
}

function createOrgMaterialModel(rows: OrgMaterialRow[], materials: MaterialRow[]) {
  return {
    async findMany(args: any) {
      return rows.filter((row) => matchesOrgMaterial(row, args.where, materials)).map((row) => withMaterial(row, materials));
    },
    async findFirst(args: any) {
      const row = rows.find((item) => matchesWhere(item, args.where));
      return row ? withMaterial(row, materials) : null;
    },
    async findUnique(args: any) {
      const row = rows.find((item) => item.id === args.where.id);
      return row ? withMaterial(row, materials) : null;
    },
    async create(args: any) {
      if (rows.some((row) => row.organizationId === args.data.organizationId && row.materialId === args.data.materialId)) throw uniqueError();
      const row = makeOrgMaterial({ id: `share-material-${rows.length + 1}`, ...args.data });
      rows.push(row);
      return withMaterial(row, materials);
    },
    async update(args: any) {
      const index = rows.findIndex((row) => row.id === args.where.id);
      rows[index] = { ...rows[index], updatedAt: new Date("2026-05-20T10:00:00.000Z") };
      return withMaterial(rows[index], materials);
    },
    async delete(args: any) {
      const index = rows.findIndex((row) => row.id === args.where.id);
      const [deleted] = rows.splice(index, 1);
      return deleted;
    }
  };
}

function matchesOrgProduct(row: OrgProductRow, where: any, products: ProductRow[]) {
  if (!matchesWhere(row, { organizationId: where.organizationId })) return false;
  if (!where.product) return true;
  const product = products.find((item) => item.id === row.productId);
  return Boolean(product && matchesNestedProduct(product, where.product));
}

function matchesOrgMaterial(row: OrgMaterialRow, where: any, materials: MaterialRow[]) {
  if (!matchesWhere(row, { organizationId: where.organizationId })) return false;
  if (!where.material) return true;
  const material = materials.find((item) => item.id === row.materialId);
  return Boolean(material && matchesNestedMaterial(material, where.material));
}

function matchesNestedProduct(product: ProductRow, where: any) {
  return matchesWhere(product, where);
}

function matchesNestedMaterial(material: MaterialRow, where: any) {
  return matchesWhere(material, where);
}

function withProduct(row: OrgProductRow, products: ProductRow[]) {
  return { ...row, product: products.find((product) => product.id === row.productId)! };
}

function withMaterial(row: OrgMaterialRow, materials: MaterialRow[]) {
  return { ...row, material: materials.find((material) => material.id === row.materialId)! };
}

function makeProduct(overrides: Partial<ProductRow> = {}): ProductRow {
  return {
    id: "product-owner",
    ownerId: "owner",
    name: "Blue Dress",
    sku: "BD-001",
    category: "dress",
    images: ["https://example.com/blue.jpg"],
    videos: [],
    colors: [],
    sizes: [],
    material: null,
    moq: 50,
    suggestedPrice: decimal("14.00"),
    minPrice: decimal("10.00"),
    leadTime: "7 days",
    sellingPoints: ["Summer style"],
    introEn: null,
    introEs: null,
    introPt: null,
    introAr: null,
    createdAt: new Date("2026-05-20T09:00:00.000Z"),
    updatedAt: new Date("2026-05-20T09:00:00.000Z"),
    ...overrides
  };
}

function makeMaterial(overrides: Partial<MaterialRow> = {}): MaterialRow {
  return {
    id: "material-owner",
    ownerId: "owner",
    title: "Blue Dress photo",
    type: "image",
    url: "https://example.com/blue.jpg",
    description: "Real photo",
    language: "en",
    productId: "product-owner",
    tags: ["photo"],
    createdAt: new Date("2026-05-20T09:00:00.000Z"),
    updatedAt: new Date("2026-05-20T09:00:00.000Z"),
    ...overrides
  };
}

function makeOrgProduct(overrides: Partial<OrgProductRow> = {}): OrgProductRow {
  return {
    id: "share-product",
    organizationId: "org-a",
    productId: "product-owner",
    createdBy: "owner",
    createdAt: new Date("2026-05-20T09:00:00.000Z"),
    updatedAt: new Date("2026-05-20T09:00:00.000Z"),
    ...overrides
  };
}

function makeOrgMaterial(overrides: Partial<OrgMaterialRow> = {}): OrgMaterialRow {
  return {
    id: "share-material",
    organizationId: "org-a",
    materialId: "material-owner",
    createdBy: "owner",
    createdAt: new Date("2026-05-20T09:00:00.000Z"),
    updatedAt: new Date("2026-05-20T09:00:00.000Z"),
    ...overrides
  };
}

function matchesWhere<T extends Record<string, any>>(item: T, where: Record<string, any> = {}): boolean {
  return Object.entries(where).every(([key, expected]) => {
    if (expected === undefined) return true;
    if (key === "OR" && Array.isArray(expected)) return expected.some((candidate) => matchesWhere(item, candidate));
    if (expected && typeof expected === "object" && "contains" in expected) return String(item[key] || "").toLowerCase().includes(String(expected.contains).toLowerCase());
    return item[key] === expected;
  });
}

function decimal(value: string) {
  return { toString: () => value, toFixed: () => value };
}

function uniqueError() {
  const error = new Error("unique") as any;
  error.code = "P2002";
  return error;
}

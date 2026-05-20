import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createExportRouter, createImportRouter } from "./import-export-api.js";
import { EXPORT_HEADERS, IMPORT_EXPORT_TYPES, MAX_CSV_BYTES, type ImportExportType } from "./import-export-utils.js";

type Row = Record<string, any>;

function createTestApp(seed: Partial<MemoryDb> = {}) {
  const db = createMemoryDb(seed);
  const app = express();
  app.use((req, _res, next) => {
    const userId = req.header("x-user-id") || "sales-1";
    req.user = { id: userId, email: `${userId}@example.com`, name: userId };
    next();
  });
  app.use("/api/export", createExportRouter(db as any));
  app.use("/api/import", createImportRouter(db as any));
  return { app, db };
}

describe("CSV import/export API", () => {
  it("exports every supported type with current-user data only, safe cells, headers, and no sensitive fields", async () => {
    const { app } = createTestApp(fullSeed());

    for (const type of IMPORT_EXPORT_TYPES) {
      const response = await request(app).get(`/api/export/${type}`).set("x-user-id", "sales-1").expect(200);
      expect(response.headers["content-type"]).toContain("text/csv");
      expect(response.headers["content-disposition"]).toContain(`${type}-`);
      const csv = response.text;
      expect(csv.split("\n")[0]).toBe(EXPORT_HEADERS[type].join(","));
      expect(csv).toContain("sales-1");
      expect(csv).not.toContain("sales-2");
      expect(csv).not.toMatch(/ownerId|createdBy|password|secret|token|OPENAI_API_KEY/i);
    }

    const customers = await request(app).get("/api/export/customers").set("x-user-id", "sales-1").expect(200);
    expect(customers.text).toContain("'=cmd");

    for (const type of ["knowledge-base", "materials", "sample-orders", "custom-requests"] as const) {
      const response = await request(app).get(`/api/export/${type}`).set("x-user-id", "sales-1").expect(200);
      expect(response.text).not.toContain("P2");
      expect(response.text).not.toContain("+52999");
    }
  });

  it("returns CSV templates for every type without real user data", async () => {
    const { app } = createTestApp(fullSeed());

    for (const type of IMPORT_EXPORT_TYPES) {
      const response = await request(app).get(`/api/import/templates/${type}`).set("x-user-id", "sales-1").expect(200);
      expect(response.headers["content-type"]).toContain("text/csv");
      expect(response.text.split("\n")[0]).toContain(EXPORT_HEADERS[type][0]);
      expect(response.text).not.toContain("sales-1");
      expect(response.text).not.toContain("sales-2");
    }
  });

  it("supports dryRun preview without writing and then imports customers and products", async () => {
    const { app, db } = createTestApp();
    const customerCsv = [
      "name,whatsappNumber,email,socialLinks,country,language,tags,nextFollowUpAt,ownerId,owner_id,created_by,OPENAI_API_KEY,api_key",
      "Maria,+52155,maria@example.com,https://instagram.com/maria,Mexico,en,high|quote,2026-05-21T00:00:00.000Z,hacker,hacker2,hacker3,secret,secret2"
    ].join("\n");

    const dryRun = await uploadCsv(app, "customers", customerCsv, "sales-1", true).expect(200);
    expect(dryRun.body).toMatchObject({ dryRun: true, totalRows: 1, successCount: 1, failureCount: 0 });
    expect(db._store.customers).toHaveLength(0);

    const importedCustomer = await uploadCsv(app, "customers", customerCsv, "sales-1", false).expect(200);
    expect(importedCustomer.body).toMatchObject({ dryRun: false, successCount: 1, failureCount: 0 });
    expect(db._store.customers[0]).toMatchObject({ name: "Maria", ownerId: "sales-1" });
    expect(db._store.customers[0].ownerId).not.toBe("hacker");

    const productCsv = "name,sku,moq,suggestedPrice,minPrice,images,colors\nBlue Dress,BD-001,100,12.5,10,https://example.com/a.jpg,blue|black";
    await uploadCsv(app, "products", productCsv, "sales-1", false).expect(200);
    expect(db._store.products[0]).toMatchObject({ name: "Blue Dress", sku: "BD-001", ownerId: "sales-1" });
  });

  it("imports knowledge, materials, sample orders, and custom requests with current-user product/customer matching", async () => {
    const { app, db } = createTestApp({
      customers: [makeCustomer({ id: "c1", ownerId: "sales-1", name: "Maria", whatsappNumber: "+52155" })],
      products: [makeProduct({ id: "p1", ownerId: "sales-1", name: "Blue Dress", sku: "BD-001" })]
    });

    await uploadCsv(app, "knowledge-base", "title,category,content,language,productSku,enabled\nMexico shipping,logistics,Confirm city,en,BD-001,true", "sales-1", false).expect(200);
    await uploadCsv(app, "materials", "title,type,url,language,productSku,tags\nReal photo,image,https://example.com/p.jpg,en,BD-001,real|dress", "sales-1", false).expect(200);
    await uploadCsv(app, "sample-orders", "customerWhatsappNumber,sampleName,productSku,sampleFee,shippingCost,paymentStatus,shippingStatus,feedbackStatus\n+52155,Blue Sample,BD-001,20,8,unpaid,pending,pending", "sales-1", false).expect(200);
    await uploadCsv(app, "custom-requests", "customerWhatsappNumber,requestType,productSku,logoRequired,quantity,moq,sampleFee,status\n+52155,logo,BD-001,true,500,300,30,draft", "sales-1", false).expect(200);

    expect(db._store.knowledgeBase[0]).toMatchObject({ title: "Mexico shipping", ownerId: "sales-1", productId: "p1" });
    expect(db._store.materials[0]).toMatchObject({ title: "Real photo", ownerId: "sales-1", productId: "p1" });
    expect(db._store.sampleOrders[0]).toMatchObject({ sampleName: "Blue Sample", ownerId: "sales-1", customerId: "c1", productId: "p1" });
    expect(db._store.customRequests[0]).toMatchObject({ requestType: "logo", ownerId: "sales-1", customerId: "c1", productId: "p1" });
  });

  it("reports dryRun duplicates and skips duplicate whatsappNumber, email, social links, and SKU for the current user", async () => {
    const { app, db } = createTestApp({
      customers: [makeCustomer({ id: "c1", ownerId: "sales-1", whatsappNumber: "+52155", email: "dup@example.com", socialLinks: ["https://instagram.com/dup"] })],
      products: [makeProduct({ id: "p1", ownerId: "sales-1", sku: "BD-001" })]
    });

    const dryRun = await uploadCsv(app, "customers", "name,socialLinks\nRepeat,https://instagram.com/dup", "sales-1", true).expect(200);
    const customer = await uploadCsv(app, "customers", "name,whatsappNumber,email,socialLinks\nRepeat,+52155,dup@example.com,https://instagram.com/dup", "sales-1", false).expect(200);
    const customerNoSkip = await uploadCsv(app, "customers", "name,email\nRepeat,dup@example.com", "sales-1", false, "", false).expect(200);
    const product = await uploadCsv(app, "products", "name,sku\nRepeat,BD-001", "sales-1", false).expect(200);

    expect(dryRun.body).toMatchObject({ successCount: 0, failureCount: 1, skippedCount: 0, dryRun: true });
    expect(dryRun.body.errors[0].field).toContain("socialLinks");
    expect(customer.body).toMatchObject({ successCount: 0, skippedCount: 1, failureCount: 0 });
    expect(customerNoSkip.body).toMatchObject({ successCount: 0, skippedCount: 0, failureCount: 1 });
    expect(product.body).toMatchObject({ successCount: 0, skippedCount: 1, failureCount: 0 });
    expect(db._store.customers).toHaveLength(1);
    expect(db._store.products).toHaveLength(1);
    expect(db._store.duplicateLogs[0]).toMatchObject({ matchedCustomerId: "c1", source: "import-customers", action: "skipped" });
  });

  it("allows duplicate customers across organizations but rejects them inside the same organization", async () => {
    const { app, db } = createTestApp({
      customers: [makeCustomer({ id: "org-customer", ownerId: "manager", organizationId: "org-a", whatsappNumber: "+52155", socialLinks: ["https://facebook.com/maria"] })]
    });

    const sameOrg = await uploadCsv(app, "customers", "name,socialLinks\nRepeat,https://facebook.com/maria", "manager", true, "org-a").expect(200);
    const otherOrg = await uploadCsv(app, "customers", "name,whatsappNumber,socialLinks\nRepeat,+52155,https://facebook.com/maria", "other", false, "org-b").expect(200);

    expect(sameOrg.body).toMatchObject({ successCount: 0, failureCount: 1 });
    expect(otherOrg.body).toMatchObject({ successCount: 1, failureCount: 0 });
    expect(db._store.customers.find((customer) => customer.organizationId === "org-b")).toMatchObject({ ownerId: "other", assignedTo: "other" });
  });

  it("returns clear row errors for invalid enums, dates, numbers, and cross-user associations", async () => {
    const { app } = createTestApp({
      customers: [makeCustomer({ id: "other-customer", ownerId: "sales-2", name: "Other", whatsappNumber: "+52999" })],
      products: [makeProduct({ id: "other-product", ownerId: "sales-2", sku: "OTHER" })]
    });

    const customer = await uploadCsv(app, "customers", "name,nextFollowUpAt\nBad,not-a-date", "sales-1", false).expect(200);
    const product = await uploadCsv(app, "products", "name,sku,moq,minPrice\nBad,P-1,abc,free", "sales-1", false).expect(200);
    const knowledge = await uploadCsv(app, "knowledge-base", "title,category,content,language\nBad,unknown,Text,xx", "sales-1", false).expect(200);
    const sample = await uploadCsv(app, "sample-orders", "customerWhatsappNumber,sampleName,productSku\n+52999,Sample,OTHER", "sales-1", false).expect(200);

    expect(customer.body.errors.map((error: any) => error.field)).toContain("nextFollowUpAt");
    expect(product.body.errors.map((error: any) => error.field)).toEqual(expect.arrayContaining(["moq", "minPrice"]));
    expect(knowledge.body.errors.map((error: any) => error.field)).toEqual(expect.arrayContaining(["category", "language"]));
    expect(sample.body.errors.map((error: any) => error.field)).toEqual(expect.arrayContaining(["customerName", "productSku"]));
  });

  it("rejects non-csv, oversized files, and invalid MIME types", async () => {
    const { app } = createTestApp();

    await request(app)
      .post("/api/import/customers")
      .set("x-user-id", "sales-1")
      .attach("file", Buffer.from("name\nMaria"), { filename: "customers.txt", contentType: "text/csv" })
      .expect(400);

    await request(app)
      .post("/api/import/customers")
      .set("x-user-id", "sales-1")
      .attach("file", Buffer.from("name\nMaria"), { filename: "customers.csv", contentType: "application/json" })
      .expect(400);

    await request(app)
      .post("/api/import/customers")
      .set("x-user-id", "sales-1")
      .attach("file", Buffer.alloc(MAX_CSV_BYTES + 1, "a"), { filename: "customers.csv", contentType: "text/csv" })
      .expect(413);
  });
});

function uploadCsv(app: express.Express, type: ImportExportType, csv: string, userId: string, dryRun: boolean, organizationId = "", skipDuplicates = true) {
  const query = new URLSearchParams({ dryRun: String(dryRun) });
  if (organizationId) query.set("organizationId", organizationId);
  if (!skipDuplicates) query.set("skipDuplicates", "false");
  return request(app)
    .post(`/api/import/${type}?${query.toString()}`)
    .set("x-user-id", userId)
    .attach("file", Buffer.from(csv, "utf8"), { filename: `${type}.csv`, contentType: "text/csv" });
}

type MemoryDb = {
  customers: Row[];
  products: Row[];
  knowledgeBase: Row[];
  materials: Row[];
  sampleOrders: Row[];
  customRequests: Row[];
  duplicateLogs: Row[];
};

function createMemoryDb(seed: Partial<MemoryDb>) {
  const store: MemoryDb = {
    customers: [...(seed.customers || [])],
    products: [...(seed.products || [])],
    knowledgeBase: [...(seed.knowledgeBase || [])],
    materials: [...(seed.materials || [])],
    sampleOrders: [...(seed.sampleOrders || [])],
    customRequests: [...(seed.customRequests || [])],
    duplicateLogs: [...(seed.duplicateLogs || [])]
  };
  let nextId = 1;
  const now = new Date("2026-05-20T00:00:00.000Z");

  return {
    _store: store,
    customer: {
      async findMany(args: any) {
        return store.customers.filter((row) => matchesWhere(row, args.where));
      },
      async findFirst(args: any) {
        return store.customers.find((row) => matchesWhere(row, args.where)) || null;
      },
      async create(args: any) {
        const row = { id: `customer-${nextId++}`, createdAt: now, updatedAt: now, ...args.data };
        store.customers.push(row);
        return row;
      }
    },
    organizationMember: {
      async findFirst(args: any) {
        const members = [
          { organizationId: "org-a", userId: "manager", role: "manager", status: "active" },
          { organizationId: "org-a", userId: "sales-1", role: "sales", status: "active" },
          { organizationId: "org-a", userId: "support", role: "support", status: "active" },
          { organizationId: "org-b", userId: "other", role: "owner", status: "active" }
        ];
        return members.find((row) => matchesWhere(row, args.where)) || null;
      }
    },
    customerDuplicateEventLog: {
      async create(args: any) {
        const row = { id: `duplicate-${nextId++}`, createdAt: now, ...args.data };
        store.duplicateLogs.push(row);
        return row;
      }
    },
    product: {
      async findMany(args: any) {
        return store.products.filter((row) => matchesWhere(row, args.where));
      },
      async findFirst(args: any) {
        return store.products.find((row) => matchesWhere(row, args.where)) || null;
      },
      async create(args: any) {
        const row = { id: `product-${nextId++}`, createdAt: now, updatedAt: now, ...args.data };
        store.products.push(row);
        return row;
      }
    },
    knowledgeBase: {
      async findMany(args: any) {
        return withProduct(store.knowledgeBase.filter((row) => matchesWhere(row, args.where)), store.products);
      },
      async create(args: any) {
        const row = { id: `knowledge-${nextId++}`, createdAt: now, updatedAt: now, ...args.data };
        store.knowledgeBase.push(row);
        return row;
      }
    },
    material: {
      async findMany(args: any) {
        return withProduct(store.materials.filter((row) => matchesWhere(row, args.where)), store.products);
      },
      async create(args: any) {
        const row = { id: `material-${nextId++}`, createdAt: now, updatedAt: now, ...args.data };
        store.materials.push(row);
        return row;
      }
    },
    sampleOrder: {
      async findMany(args: any) {
        return withCustomerAndProduct(store.sampleOrders.filter((row) => matchesWhere(row, args.where)), store.customers, store.products);
      },
      async create(args: any) {
        const row = { id: `sample-${nextId++}`, createdAt: now, updatedAt: now, ...args.data };
        store.sampleOrders.push(row);
        return row;
      }
    },
    customRequest: {
      async findMany(args: any) {
        return withCustomerAndProduct(store.customRequests.filter((row) => matchesWhere(row, args.where)), store.customers, store.products);
      },
      async create(args: any) {
        const row = { id: `custom-${nextId++}`, createdAt: now, updatedAt: now, ...args.data };
        store.customRequests.push(row);
        return row;
      }
    }
  };
}

function fullSeed(): Partial<MemoryDb> {
  return {
    customers: [
      makeCustomer({ id: "c1", ownerId: "sales-1", name: "sales-1 buyer", latestSummary: "=cmd" }),
      makeCustomer({ id: "c2", ownerId: "sales-2", name: "sales-2 buyer" })
    ],
    products: [
      makeProduct({ id: "p1", ownerId: "sales-1", name: "sales-1 product", sku: "P1" }),
      makeProduct({ id: "p2", ownerId: "sales-2", name: "sales-2 product", sku: "P2" })
    ],
    knowledgeBase: [
      makeKnowledge({ id: "k1", ownerId: "sales-1", title: "sales-1 knowledge", productId: "p1" }),
      makeKnowledge({ id: "k2", ownerId: "sales-2", title: "sales-2 knowledge", productId: "p2" }),
      makeKnowledge({ id: "k3", ownerId: "sales-1", title: "corrupted knowledge", productId: "p2" })
    ],
    materials: [
      makeMaterial({ id: "m1", ownerId: "sales-1", title: "sales-1 material", productId: "p1" }),
      makeMaterial({ id: "m2", ownerId: "sales-2", title: "sales-2 material", productId: "p2" }),
      makeMaterial({ id: "m3", ownerId: "sales-1", title: "corrupted material", productId: "p2" })
    ],
    sampleOrders: [
      makeSample({ id: "s1", ownerId: "sales-1", customerId: "c1", productId: "p1", sampleName: "sales-1 sample" }),
      makeSample({ id: "s2", ownerId: "sales-2", customerId: "c2", productId: "p2", sampleName: "sales-2 sample" }),
      makeSample({ id: "s3", ownerId: "sales-1", customerId: "c2", productId: "p2", sampleName: "corrupted sample" })
    ],
    customRequests: [
      makeCustom({ id: "r1", ownerId: "sales-1", customerId: "c1", productId: "p1", notes: "sales-1 custom" }),
      makeCustom({ id: "r2", ownerId: "sales-2", customerId: "c2", productId: "p2", notes: "sales-2 custom" }),
      makeCustom({ id: "r3", ownerId: "sales-1", customerId: "c2", productId: "p2", notes: "corrupted custom" })
    ]
  };
}

function matchesWhere(row: Row, where: Row = {}) {
  return Object.entries(where).every(([key, value]) => {
    if (key === "OR" && Array.isArray(value)) {
      return value.some((condition) => matchesWhere(row, condition));
    }
    if (value && typeof value === "object" && "hasSome" in value) {
      return Array.isArray(row[key]) && value.hasSome.some((item: string) => row[key].includes(item));
    }
    return row[key] === value;
  });
}

function withProduct(rows: Row[], products: Row[]) {
  return rows.map((row) => ({ ...row, product: products.find((product) => product.id === row.productId) || null }));
}

function withCustomerAndProduct(rows: Row[], customers: Row[], products: Row[]) {
  return rows.map((row) => ({
    ...row,
    customer: customers.find((customer) => customer.id === row.customerId) || null,
    product: products.find((product) => product.id === row.productId) || null
  }));
}

function makeCustomer(overrides: Row = {}) {
  return {
    id: "c",
    name: "Maria",
    whatsappNumber: "+52155",
    email: "maria@example.com",
    socialLinks: [],
    country: "Mexico",
    language: "en",
    tags: ["high"],
    stage: "quoted",
    interestedProduct: "Dress",
    latestSummary: "Asked price",
    nextFollowUpAt: new Date("2026-05-21T00:00:00.000Z"),
    notes: "note",
    ownerId: "sales-1",
    organizationId: null,
    assignedTo: null,
    collaborators: [],
    createdAt: new Date("2026-05-20T00:00:00.000Z"),
    updatedAt: new Date("2026-05-20T00:00:00.000Z"),
    ...overrides
  };
}

function makeProduct(overrides: Row = {}) {
  return {
    id: "p",
    name: "Blue Dress",
    sku: "BD-001",
    category: "Dress",
    images: ["https://example.com/a.jpg"],
    videos: [],
    colors: ["blue"],
    sizes: ["M"],
    material: "cotton",
    moq: 100,
    suggestedPrice: 12,
    minPrice: 10,
    leadTime: "15 days",
    sellingPoints: ["soft"],
    introEn: "",
    introEs: "",
    introPt: "",
    introAr: "",
    ownerId: "sales-1",
    createdAt: new Date("2026-05-20T00:00:00.000Z"),
    updatedAt: new Date("2026-05-20T00:00:00.000Z"),
    ...overrides
  };
}

function makeKnowledge(overrides: Row = {}) {
  return {
    id: "k",
    title: "Shipping",
    category: "logistics",
    content: "Confirm city",
    language: "en",
    productId: null,
    enabled: true,
    ownerId: "sales-1",
    createdAt: new Date("2026-05-20T00:00:00.000Z"),
    updatedAt: new Date("2026-05-20T00:00:00.000Z"),
    ...overrides
  };
}

function makeMaterial(overrides: Row = {}) {
  return {
    id: "m",
    title: "Photo",
    type: "image",
    url: "https://example.com/a.jpg",
    description: "desc",
    language: "en",
    productId: null,
    tags: ["real"],
    ownerId: "sales-1",
    createdAt: new Date("2026-05-20T00:00:00.000Z"),
    updatedAt: new Date("2026-05-20T00:00:00.000Z"),
    ...overrides
  };
}

function makeSample(overrides: Row = {}) {
  return {
    id: "s",
    customerId: "c1",
    productId: "p1",
    sampleName: "Sample",
    sampleFee: 20,
    shippingCost: 8,
    currency: "USD",
    paymentStatus: "unpaid",
    shippingStatus: "pending",
    trackingNumber: "",
    feedbackStatus: "pending",
    expectedShipDate: new Date("2026-05-22T00:00:00.000Z"),
    expectedDeliveryDate: new Date("2026-05-29T00:00:00.000Z"),
    notes: "sample note",
    ownerId: "sales-1",
    createdAt: new Date("2026-05-20T00:00:00.000Z"),
    updatedAt: new Date("2026-05-20T00:00:00.000Z"),
    ...overrides
  };
}

function makeCustom(overrides: Row = {}) {
  return {
    id: "r",
    customerId: "c1",
    productId: "p1",
    requestType: "logo",
    logoRequired: true,
    packagingRequired: false,
    colorRequirement: "blue",
    sizeRequirement: "",
    materialRequirement: "",
    quantity: 500,
    moq: 300,
    sampleFee: 30,
    sampleLeadTime: "7 days",
    bulkLeadTime: "25 days",
    files: ["https://example.com/logo.ai"],
    status: "draft",
    notes: "custom note",
    ownerId: "sales-1",
    createdAt: new Date("2026-05-20T00:00:00.000Z"),
    updatedAt: new Date("2026-05-20T00:00:00.000Z"),
    ...overrides
  };
}

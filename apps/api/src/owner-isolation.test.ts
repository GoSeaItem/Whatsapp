import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("personal account isolation", () => {
  it("models customer, product, quote, follow-up, and drafts with user ownership", async () => {
    const schema = await readFile(new URL("../../../prisma/schema.prisma", import.meta.url), "utf8");

    expect(schema).toContain("model User");
    expect(schema).toContain("model AuthSession");
    expect(schema).toMatch(/model Customer[\s\S]*ownerId\s+String/);
    expect(schema).toMatch(/model Product[\s\S]*ownerId\s+String/);
    expect(schema).toMatch(/model Quote[\s\S]*ownerId\s+String/);
    expect(schema).toMatch(/model FollowUpTask[\s\S]*ownerId\s+String/);
    expect(schema).toMatch(/model FollowUpTask[\s\S]*remindAt\s+DateTime/);
    expect(schema).toMatch(/model MessageDraft[\s\S]*ownerId\s+String\?/);
    expect(schema).toContain("@@unique([ownerId, sku])");
  });

  it("protects core routers and filters records by the current user", async () => {
    const server = await readFile(new URL("./server.ts", import.meta.url), "utf8");
    const customersApi = await readFile(new URL("./customers-api.ts", import.meta.url), "utf8");
    const productsApi = await readFile(new URL("./products-api.ts", import.meta.url), "utf8");
    const quotesApi = await readFile(new URL("./quotes-api.ts", import.meta.url), "utf8");
    const followUpsApi = await readFile(new URL("./follow-ups-api.ts", import.meta.url), "utf8");

    expect(server).toContain('app.use("/api/customers", requireAuth, customersRouter)');
    expect(server).toContain('app.use("/api/products", requireAuth, productsRouter)');
    expect(server).toContain('app.use("/api/quotes", requireAuth, quotesRouter)');
    expect(server).toContain('app.use("/api/follow-ups", requireAuth, followUpsRouter)');

    expect(customersApi).toContain("const where: Prisma.CustomerWhereInput = { ownerId: req.user!.id }");
    expect(customersApi).toContain("where: { id: req.params.id, ownerId: req.user!.id }");
    expect(customersApi).toContain("ownerId: req.user!.id");
    expect(productsApi).toContain("const where: Prisma.ProductWhereInput = { ownerId: req.user!.id }");
    expect(productsApi).toContain("where: { id: req.params.id, ownerId: req.user!.id }");
    expect(quotesApi).toContain("where: { customerId: req.params.customerId, ownerId: req.user!.id, createdBy: req.user!.id }");
    expect(quotesApi).toContain("findOwnedCustomer(db, body.customerId, req.user!.id)");
    expect(quotesApi).toContain("findOwnedProduct(db, body.productId, req.user!.id)");
    expect(quotesApi).toContain("where: { id: quoteId, ownerId, createdBy: ownerId }");
    expect(followUpsApi).toContain("const where: Record<string, unknown> = { ownerId: req.user!.id }");
    expect(followUpsApi).toContain("findOwnedCustomer(db, body.customerId, req.user!.id)");
    expect(followUpsApi).toContain("where: { id: taskId, ownerId }");
    expect(followUpsApi).toContain("deleteMany({ where: { id: req.params.id, ownerId: req.user!.id } })");
  });

  it("keeps extension API calls credentialed and auth-aware", async () => {
    const contentScript = await readFile(new URL("../../extension/src/content.ts", import.meta.url), "utf8");
    const backgroundScript = await readFile(new URL("../../extension/src/background.ts", import.meta.url), "utf8");

    expect(backgroundScript).toContain('credentials: "include"');
    expect(backgroundScript).toContain("VITE_API_BASE_URL");
    expect(contentScript).toContain("chrome.runtime.sendMessage");
    expect(contentScript).toContain("WA_AI_API_FETCH");
    expect(contentScript).toContain("/api/auth/me");
    expect(contentScript).toContain("请先登录 Web 后台");
    expect(contentScript).toContain("打开 Web 后台登录");
    expect(contentScript).toContain("authState.user.name");
    expect(contentScript).not.toMatch(/fetch\(`\$\{API_BASE_URL\}\/api\/(customers|products|quotes)/);
  });
});

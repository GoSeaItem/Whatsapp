import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import request from "supertest";
import { AI_SAFETY_NOTE, PRODUCT_BOUNDARIES, V1_FEATURE_SCOPE } from "@wa-ai/shared";
import { app, isAllowedCorsOrigin } from "./server.js";

describe("safety boundaries", () => {
  it("keeps the extension in draft/copy mode without programmatic WhatsApp sending", async () => {
    const contentScript = await readFile(new URL("../../extension/src/content.ts", import.meta.url), "utf8");

    expect(AI_SAFETY_NOTE).toBe("AI 仅生成建议内容，请确认价格、库存、交期、付款、退款信息后再发送。");
    expect(contentScript).toContain("AI_SAFETY_NOTE");
    expect(contentScript).toContain("识别正常");
    expect(contentScript).toContain("识别异常，已切换复制粘贴模式");
    expect(contentScript).toContain("当前不是聊天窗口");
    expect(contentScript).toContain("WhatsApp 页面未打开");
    expect(contentScript).toContain("插入 WhatsApp 输入框（预留）");
    expect(contentScript).toContain("推荐动作只作为销售建议，不会自动发送消息");

    expect(contentScript).not.toMatch(/\.click\(\)/);
    expect(contentScript).not.toMatch(/querySelector\([^)]*(send|发送|data-icon=["']send)/i);
    expect(contentScript).not.toMatch(/setInterval\(/);
    expect(contentScript).toContain("getBoundingClientRect().width");
  });

  it("uses a narrowly scoped Manifest V3 content script", async () => {
    const manifest = JSON.parse(await readFile(new URL("../../extension/public/manifest.json", import.meta.url), "utf8"));

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.content_scripts[0].matches).toEqual(["https://web.whatsapp.com/*"]);
    expect(manifest.content_scripts[0].run_at).toBe("document_idle");
    expect(manifest.permissions).toEqual(expect.arrayContaining(["clipboardWrite", "storage"]));
    expect(manifest.permissions).not.toContain("tabs");
    expect(manifest.host_permissions).toEqual(expect.arrayContaining(["http://187.77.138.174/*", "https://api.yourdomain.com/*"]));
  });

  it("exposes product boundaries and V1 scope as shared constants", async () => {
    const response = await request(app).get("/api/health").expect(200);

    expect(PRODUCT_BOUNDARIES).toContain("不接入 WhatsApp 官方 API");
    expect(PRODUCT_BOUNDARIES).toContain("不模拟用户批量轰炸陌生号码");
    expect(PRODUCT_BOUNDARIES).toContain("信息不足时先询问客户，不得编造");
    expect(V1_FEATURE_SCOPE).toContain("WhatsApp Web 侧边栏");
    expect(V1_FEATURE_SCOPE).toContain("报价助手");
    expect(response.body.boundaries).toContain("不绕过 WhatsApp 风控");
  });

  it("does not allow arbitrary Chrome extension origins in production CORS", () => {
    expect(isAllowedCorsOrigin("chrome-extension://known-id", { NODE_ENV: "production", CHROME_EXTENSION_ORIGIN: "chrome-extension://known-id" })).toBe(true);
    expect(isAllowedCorsOrigin("chrome-extension://unknown-id", { NODE_ENV: "production", CHROME_EXTENSION_ORIGIN: "chrome-extension://known-id" })).toBe(false);
    expect(isAllowedCorsOrigin("chrome-extension://unknown-id", { NODE_ENV: "production" })).toBe(false);
    expect(isAllowedCorsOrigin("chrome-extension://dev-id", { NODE_ENV: "development" })).toBe(true);
    expect(isAllowedCorsOrigin("http://187.77.138.174", { NODE_ENV: "production", CORS_ORIGINS: "http://187.77.138.174,https://yourdomain.com" })).toBe(true);
  });

  it("shows the safety note in the web quote reply area", async () => {
    const app = await readFile(new URL("../../web/src/App.tsx", import.meta.url), "utf8");

    expect(app).toContain("AI_SAFETY_NOTE");
    expect(app).toContain("复制后由业务员手动发送");
    expect(app).not.toContain('createdBy: "demo-owner"');
  });
});

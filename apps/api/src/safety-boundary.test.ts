import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import request from "supertest";
import { AI_SAFETY_NOTE, PRODUCT_BOUNDARIES, V1_FEATURE_SCOPE } from "@wa-ai/shared";
import { app, isAllowedCorsOrigin } from "./server.js";

describe("safety boundaries", () => {
  it("keeps the extension in draft/copy mode without programmatic WhatsApp sending", async () => {
    const contentScript = await readFile(new URL("../../extension/src/content.ts", import.meta.url), "utf8");

    expect(AI_SAFETY_NOTE).toBeTruthy();
    expect(contentScript).toContain("AI_SAFETY_NOTE");
    expect(contentScript).toContain("\\u5df2\\u8bc6\\u522b\\u5f53\\u524d\\u804a\\u5929");
    expect(contentScript).toContain("\\u8bc6\\u522b\\u5f02\\u5e38");
    expect(contentScript).toContain("\\u5f53\\u524d\\u4e0d\\u662f\\u804a\\u5929\\u7a97\\u53e3");
    expect(contentScript).toContain("WhatsApp \\u9875\\u9762\\u672a\\u6253\\u5f00");
    expect(contentScript).toContain("insertTextAreaIntoWhatsApp");
    expect(contentScript).toContain("wa-ai-info-note");
    expect(contentScript).toContain("wa-ai-bottom-bar");

    expect(contentScript).not.toMatch(/\.click\(\)/);
    expect(contentScript).not.toMatch(/querySelector\([^)]*(send|data-icon=["']send)/i);
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

    expect(PRODUCT_BOUNDARIES.length).toBeGreaterThan(0);
    expect(V1_FEATURE_SCOPE.length).toBeGreaterThan(0);
    expect(response.body.boundaries.length).toBeGreaterThan(0);
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
    expect(app).toContain("drafts are copied and sent manually by the salesperson");
    expect(app).not.toContain('createdBy: "demo-owner"');
  });
});

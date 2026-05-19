import { describe, expect, it } from "vitest";
import { generateCustomScript, serializeCustomRequest, validateCustomRequestPayload } from "./custom-request-utils.js";

const custom = serializeCustomRequest({
  id: "custom-1",
  customerId: "customer-1",
  productId: "product-1",
  requestType: "logo",
  logoRequired: true,
  packagingRequired: true,
  colorRequirement: "blue",
  sizeRequirement: "M/L",
  materialRequirement: "cotton",
  quantity: 500,
  moq: null,
  sampleFee: null,
  sampleLeadTime: null,
  bulkLeadTime: null,
  files: [],
  status: "draft",
  notes: null,
  ownerId: "sales-1",
  customer: { name: "Maria" },
  product: { name: "Blue Dress" },
  createdAt: new Date("2026-05-20T00:00:00.000Z"),
  updatedAt: new Date("2026-05-20T00:00:00.000Z")
});

describe("custom request utilities", () => {
  it("validates required fields and numeric values", () => {
    expect(validateCustomRequestPayload({ customerId: "", requestType: "bad" as any, quantity: -1, sampleFee: -2 } as any)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "customerId" }),
        expect.objectContaining({ field: "requestType" }),
        expect.objectContaining({ field: "quantity" }),
        expect.objectContaining({ field: "sampleFee" })
      ])
    );
  });

  it("generates structured custom confirmation script with missing data warnings", () => {
    const result = generateCustomScript(custom, { scenario: "custom_confirm" });
    expect(result.scriptText).toContain("custom type: logo");
    expect(result.scriptText).toContain("Blue Dress");
    const warnings = result.riskWarnings.join(" ");
    expect(warnings).toContain("Missing logo");
    expect(warnings).toContain("Missing MOQ");
    expect(warnings).toContain("Missing sample fee");
    expect(warnings).toContain("Missing sample lead time");
    expect(warnings).toContain("Missing bulk lead time");
  });

  it("generates file request and risk confirmation scripts safely", () => {
    expect(generateCustomScript(custom, { scenario: "custom_request_files" }).scriptText).toContain("clear logo files");
    const risk = generateCustomScript(custom, { scenario: "custom_risk_confirm" });
    expect(risk.riskWarnings.join(" ")).toContain("Custom after-sales risk");
  });

  it("does not include auto-send behavior", () => {
    const result = generateCustomScript(custom, { scenario: "custom_sample_fee" });
    expect(result.riskWarnings).toContain("Custom scripts are drafts only and will not automatically send WhatsApp messages.");
    expect(JSON.stringify(result).toLowerCase()).not.toMatch(/click.*send|send button|automatic send|auto-send|bulk send/);
  });
});

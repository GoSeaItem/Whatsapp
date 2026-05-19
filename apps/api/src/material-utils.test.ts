import { describe, expect, it } from "vitest";
import { generateMaterialIntro, serializeMaterial, validateMaterialPayload } from "./material-utils.js";

const baseMaterial = serializeMaterial({
  id: "mat-1",
  title: "Blue Dress Real Picture",
  type: "image",
  url: "https://example.com/blue-dress.jpg",
  description: "Real product picture",
  language: "en",
  productId: "product-1",
  tags: ["实拍", "夏季"],
  ownerId: "sales-1",
  createdAt: new Date("2026-05-20T00:00:00.000Z"),
  updatedAt: new Date("2026-05-20T00:00:00.000Z")
});

describe("material utils", () => {
  it("validates required fields and safe URL", () => {
    expect(validateMaterialPayload({ title: "", type: "image", url: "" } as any)).toEqual(
      expect.arrayContaining([
        { field: "title", message: "title is required" },
        { field: "url", message: "url is required" }
      ])
    );
    expect(validateMaterialPayload({ title: "x", type: "image", url: "javascript:alert(1)" } as any)).toContainEqual({
      field: "url",
      message: "url must start with http:// or https://"
    });
  });

  it("generates image material intro without auto-send behavior", () => {
    const result = generateMaterialIntro(baseMaterial, { customerLanguage: "English" });
    expect(result.introText).toContain("real product pictures");
    expect(result.introText).toContain(baseMaterial.url);
    expect(result.riskWarnings).toContain("素材说明仅作为草稿，不会自动发送 WhatsApp 消息。");
    expect(JSON.stringify(result).toLowerCase()).not.toMatch(/click.*send|send button|automatic send|auto-send|bulk send/);
  });

  it("adds payment and shipping proof risk warnings", () => {
    const payment = generateMaterialIntro({ ...baseMaterial, type: "payment_proof" });
    expect(payment.riskWarnings.join(" ")).toContain("确认收款账户");

    const shipping = generateMaterialIntro({ ...baseMaterial, type: "shipping_proof" });
    expect(shipping.riskWarnings.join(" ")).toContain("确认物流方式");
  });

  it("adds certificate authenticity warning", () => {
    const result = generateMaterialIntro({ ...baseMaterial, type: "certificate" });
    expect(result.riskWarnings.join(" ")).toContain("证书/资质材料真实性必须由业务员确认");
  });
});

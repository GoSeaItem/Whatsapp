import { describe, expect, it } from "vitest";
import { generateSampleScript, serializeSampleOrder, validateSampleOrderPayload } from "./sample-order-utils.js";

const sample = serializeSampleOrder({
  id: "sample-1",
  customerId: "customer-1",
  productId: "product-1",
  sampleName: "Blue Dress Sample",
  sampleFee: "20",
  shippingCost: "8",
  currency: "USD",
  paymentStatus: "unpaid",
  shippingStatus: "pending",
  trackingNumber: null,
  feedbackStatus: "pending",
  expectedShipDate: null,
  expectedDeliveryDate: null,
  notes: null,
  ownerId: "sales-1",
  createdAt: new Date("2026-05-20T00:00:00.000Z"),
  updatedAt: new Date("2026-05-20T00:00:00.000Z")
});

describe("sample order utils", () => {
  it("validates required fields and non-negative costs", () => {
    expect(validateSampleOrderPayload({ customerId: "", sampleName: "", sampleFee: -1 } as any)).toEqual(
      expect.arrayContaining([
        { field: "customerId", message: "customerId is required" },
        { field: "sampleName", message: "sampleName is required" },
        { field: "sampleFee", message: "sampleFee must be a non-negative number" }
      ])
    );
  });

  it("generates sample quote without inventing missing payment method or deduction rule", () => {
    const result = generateSampleScript(sample, { scenario: "sample_quote" });
    expect(result.scriptText).toContain("sample fee USD 20");
    expect(result.scriptText).toContain("shipping USD 8");
    expect(result.scriptText).toContain("confirm whether the sample fee can be deducted");
    expect(result.riskWarnings.join(" ")).toContain("收款账户");
    expect(result.riskWarnings.join(" ")).toContain("不允许系统编造样品费、运费、交期、付款方式");
  });

  it("adds logistics warning for shipped script", () => {
    const result = generateSampleScript({ ...sample, trackingNumber: "TRK123" }, { scenario: "sample_shipped" });
    expect(result.scriptText).toContain("TRK123");
    expect(result.riskWarnings.join(" ")).toContain("物流单号");
  });

  it("does not include auto-send behavior", () => {
    const result = generateSampleScript(sample, { scenario: "sample_feedback_follow_up" });
    expect(result.riskWarnings).toContain("样品话术仅作为草稿，不会自动发送 WhatsApp 消息。");
    expect(JSON.stringify(result).toLowerCase()).not.toMatch(/click.*send|send button|automatic send|auto-send|bulk send/);
  });
});

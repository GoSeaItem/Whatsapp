import { describe, expect, it } from "vitest";
import { parsePhoneNumberFromText } from "./phone-utils.js";

describe("phone parsing for WhatsApp context", () => {
  it("parses common international WhatsApp titles", () => {
    expect(parsePhoneNumberFromText("+62 812-3456-789")).toMatchObject({
      e164: "+628123456789",
      countryCode: "ID",
      countryName: "Indonesia",
      confidence: "high"
    });
    expect(parsePhoneNumberFromText("+91 98765 43210")).toMatchObject({
      countryCode: "IN",
      countryName: "India",
      confidence: "high"
    });
    expect(parsePhoneNumberFromText("+86 156 7286 875")).toMatchObject({
      countryCode: "CN",
      countryName: "China",
      confidence: "high"
    });
    expect(parsePhoneNumberFromText("+52 1 81 4226 1394")).toMatchObject({
      countryCode: "MX",
      countryName: "Mexico"
    });
  });

  it("does not overstate ambiguous or missing country signals", () => {
    expect(parsePhoneNumberFromText("Amina Trading")).toMatchObject({ confidence: "none", e164: null });
    expect(["medium", "low"]).toContain(parsePhoneNumberFromText("+1 415 555 2671").confidence);
  });
});

import { findPhoneNumbersInText, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

export type PhoneParseConfidence = "high" | "medium" | "low" | "none";

export type ParsedPhoneFromText = {
  raw: string | null;
  e164: string | null;
  nationalNumber: string | null;
  countryCallingCode: string | null;
  countryCode: string | null;
  countryName: string | null;
  isValid: boolean;
  confidence: PhoneParseConfidence;
};

const ambiguousCallingCodes = new Set(["1", "7"]);

export function parsePhoneNumberFromText(input: string): ParsedPhoneFromText {
  const text = clean(input);
  if (!text) return emptyParsedPhone();

  const candidates = findPhoneNumbersInText(text);
  const phone = candidates[0]?.number || parsePhoneNumberFromString(text);
  if (!phone) return emptyParsedPhone();

  const e164 = phone.number || null;
  const isValid = phone.isValid();
  const countryCode = phone.country || null;
  const callingCode = phone.countryCallingCode || null;
  return {
    raw: candidates[0]?.startsAt !== undefined && candidates[0]?.endsAt !== undefined
      ? text.slice(candidates[0].startsAt, candidates[0].endsAt)
      : text,
    e164,
    nationalNumber: phone.nationalNumber || null,
    countryCallingCode: callingCode,
    countryCode,
    countryName: countryCode ? countryName(countryCode) : null,
    isValid,
    confidence: confidenceForPhone(Boolean(e164), isValid, countryCode, callingCode)
  };
}

export function normalizePhoneForMatch(input: string) {
  const parsed = parsePhoneNumberFromText(input);
  if (parsed.e164) return parsed.e164;
  const digits = onlyDigits(input);
  return digits ? `+${digits}` : "";
}

export function normalizedPhoneDigits(input: string) {
  return onlyDigits(normalizePhoneForMatch(input) || input);
}

export function looksLikePhone(input: string) {
  const text = clean(input);
  if (!text) return false;
  if (parsePhoneNumberFromText(text).confidence !== "none") return true;
  return onlyDigits(text).length >= 6;
}

function emptyParsedPhone(): ParsedPhoneFromText {
  return {
    raw: null,
    e164: null,
    nationalNumber: null,
    countryCallingCode: null,
    countryCode: null,
    countryName: null,
    isValid: false,
    confidence: "none"
  };
}

function confidenceForPhone(hasE164: boolean, isValid: boolean, countryCode: string | null, callingCode: string | null): PhoneParseConfidence {
  if (!hasE164) return "none";
  if (isValid && countryCode && callingCode && !ambiguousCallingCodes.has(callingCode)) return "high";
  if (isValid && (countryCode || callingCode)) return "medium";
  return "low";
}

function countryName(code: CountryCode) {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

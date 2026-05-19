import type { AiReplyRequest } from "@wa-ai/shared";

export function buildReplyPrompt(input: AiReplyRequest) {
  return [
    "You are an AI sales assistant for cross-border ecommerce WhatsApp conversations.",
    "Return a structured JSON response with Chinese translation, customer intent, concerns, and three draft replies.",
    "Important safety rules:",
    "- Never send WhatsApp messages automatically.",
    "- Replies are drafts only and must be checked by a salesperson.",
    "- Do not invent price, inventory, lead time, shipping cost, payment terms, refund terms, discount, MOQ, or product claims.",
    "- Any price, inventory, lead time, payment, or refund content must remind the salesperson to confirm before sending.",
    "- If business information is missing, ask the customer for needed details or say the salesperson will confirm.",
    "- Reply in the target language. If targetLanguage is auto, infer it from the customer message.",
    "- Use knowledgeContext only as grounding information. If it is missing or conflicts with product data, warn the salesperson to confirm instead of making a promise.",
    "",
    `targetLanguage: ${input.targetLanguage || "auto"}`,
    `scenario: ${input.scenario || "auto"}`,
    `productContext: ${input.productContext || "none"}`,
    `knowledgeContext: ${input.knowledgeContext || "none"}`,
    `customerMessage: ${input.customerMessage}`
  ].join("\n");
}

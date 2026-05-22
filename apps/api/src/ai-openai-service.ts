import type { AiReplyRequest, AiReplyResponse, GenerateDraftRequest, GenerateDraftResponse } from "@wa-ai/shared";
import { generateAiReply } from "./ai-reply.js";
import { generateDraft } from "./ai-draft.js";
import { createOpenAiChatCompletion } from "./openai-client.js";

type AiReplyJson = {
  translationZh?: string;
  intent?: string;
  concerns?: string[];
  shortReply?: string;
  professionalReply?: string;
  closingReply?: string;
  riskWarnings?: string[];
};

const COMMON_SAFETY_RULES = [
  "All outputs are drafts only. Never claim a WhatsApp message was sent.",
  "Do not invent price, inventory, lead time, shipping cost, payment account, logistics status, refund terms, supplier cost, certificate authenticity, or after-sales policy.",
  "If details are missing, ask the customer or remind the salesperson to confirm before sending.",
  "For price, stock, lead time, shipping, payment, logistics, refund, warranty, cost, or supplier details, include riskWarnings.",
  "Keep WhatsApp wording natural, concise, and professional."
];

export async function generateAiReplySmart(input: AiReplyRequest): Promise<AiReplyResponse> {
  const fallback = generateAiReply(input);
  const aiMode = (input as any).aiMode === "thinking" || (input as any).mode === "thinking" ? "thinking" : "instant";
  const aiModel = typeof (input as any).aiModel === "string" ? (input as any).aiModel : typeof (input as any).model === "string" ? (input as any).model : null;

  try {
    const completion = await createOpenAiChatCompletion({
      organizationId: input.organizationId || null,
      mode: aiMode,
      model: aiModel,
      messages: [
        {
          role: "system",
          content: [
            "You are a cross-border ecommerce sales assistant.",
            "Return valid JSON only with these keys: translationZh, intent, concerns, shortReply, professionalReply, closingReply, riskWarnings.",
            ...COMMON_SAFETY_RULES
          ].join("\n")
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Translate the customer message into Chinese, identify sales intent and concerns, then generate three WhatsApp reply drafts.",
            targetLanguage: input.targetLanguage || "auto",
            scenario: input.scenario || "auto",
            customerMessage: input.customerMessage,
            productContext: input.productContext || null,
            knowledgeContext: input.knowledgeContext || null,
            knowledgeUsed: input.knowledgeUsed || []
          })
        }
      ],
      temperature: 0.2,
      maxTokens: 1200
    });

    if (!completion) return fallback;
    const parsed = parseJsonFromModel<AiReplyJson>(completion.content);

    return {
      ...fallback,
      translationZh: nonEmpty(parsed.translationZh) || fallback.translationZh,
      intent: nonEmpty(parsed.intent) || fallback.intent,
      concerns: stringArray(parsed.concerns).length > 0 ? stringArray(parsed.concerns) : fallback.concerns,
      shortReply: nonEmpty(parsed.shortReply) || fallback.shortReply,
      professionalReply: nonEmpty(parsed.professionalReply) || fallback.professionalReply,
      closingReply: nonEmpty(parsed.closingReply) || fallback.closingReply,
      riskWarnings: mergeUnique([
        ...fallback.riskWarnings,
        ...stringArray(parsed.riskWarnings),
        `AI draft generated with ${completion.model}; salesperson must manually confirm before sending.`
      ])
    };
  } catch (error) {
    return {
      ...fallback,
      riskWarnings: mergeUnique([
        ...fallback.riskWarnings,
        `AI provider unavailable, used local fallback draft. ${error instanceof Error ? error.message : ""}`.trim()
      ])
    };
  }
}

export async function generateDraftSmart(input: GenerateDraftRequest): Promise<GenerateDraftResponse> {
  const fallback = generateDraft(input);
  if (!input.sourceText?.trim()) return fallback;
  const aiMode = (input as any).aiMode === "thinking" || (input as any).mode === "thinking" ? "thinking" : "instant";
  const aiModel = typeof (input as any).aiModel === "string" ? (input as any).aiModel : typeof (input as any).model === "string" ? (input as any).model : null;

  try {
    const targetLanguage = input.languageTo || (input.intent === "translate" ? "Chinese" : "English");
    const completion = await createOpenAiChatCompletion({
      organizationId: (input as any).organizationId || null,
      mode: aiMode,
      model: aiModel,
      messages: [
        {
          role: "system",
          content: [
            "You are a cross-border ecommerce WhatsApp sales assistant.",
            "Return only the draft text, no markdown fences.",
            ...COMMON_SAFETY_RULES
          ].join("\n")
        },
        {
          role: "user",
          content: JSON.stringify({
            task: input.intent === "translate" ? "Translate accurately." : "Generate a WhatsApp draft reply.",
            intent: input.intent,
            targetLanguage,
            tone: input.tone || "professional",
            sourceText: input.sourceText
          })
        }
      ],
      temperature: 0.15,
      maxTokens: 700
    });

    if (!completion) return fallback;
    return {
      draft: completion.content.trim(),
      safetyNote: `AI draft generated with ${completion.model}. Draft only; salesperson must manually confirm and send.`
    };
  } catch (error) {
    return {
      ...fallback,
      safetyNote: `AI provider unavailable, used local fallback. ${fallback.safetyNote}`
    };
  }
}

function parseJsonFromModel<T>(content: string): T {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced || trimmed.match(/\{[\s\S]*\}/)?.[0] || trimmed;
  return JSON.parse(candidate) as T;
}

function nonEmpty(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()) : [];
}

function mergeUnique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

import type { GenerateDraftRequest, GenerateDraftResponse } from "@wa-ai/shared";

const toneMap = {
  friendly: "友好",
  professional: "专业",
  concise: "简洁"
} as const;

export function generateDraft(input: GenerateDraftRequest): GenerateDraftResponse {
  const tone = input.tone ? toneMap[input.tone] : "专业";
  const targetLanguage = input.languageTo || "English";
  const source = input.sourceText.trim();

  if (!source) {
    return {
      draft: "",
      safetyNote: "请输入客户消息后再生成草稿。"
    };
  }

  if (input.intent === "translate") {
    return {
      draft: `[${targetLanguage} translation draft]\n${source}`,
      safetyNote: "当前为本地占位翻译，后续可替换为真实 AI 翻译服务。"
    };
  }

  if (input.intent === "quote") {
    return {
      draft: [
        "Hi, thanks for your interest.",
        "I will confirm the latest stock, MOQ, lead time, and best price for you shortly.",
        "Could you please share your target quantity and destination country?"
      ].join("\n"),
      safetyNote: "报价类草稿需要业务员核对价格、库存和交期后手动发送。"
    };
  }

  return {
    draft: [
      `Hi, thank you for your message. I understand your request: "${source}".`,
      `I will check the details and get back to you with a ${tone} reply as soon as possible.`,
      "Before we proceed, may I confirm your required quantity, destination country, and expected delivery time?"
    ].join("\n"),
    safetyNote: "AI 只生成回复草稿，不会自动发送 WhatsApp 消息。"
  };
}

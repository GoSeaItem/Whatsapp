import {
  SCRIPT_EXPERIMENT_SCENARIOS,
  SCRIPT_EXPERIMENT_STATUSES,
  SCRIPT_USAGE_OUTCOMES
} from "@wa-ai/shared";

export const SCRIPT_VARIANT_LABELS = ["A", "B", "C", "D", "E"] as const;
export const SCRIPT_USAGE_CHANNELS = new Set(["whatsapp_web", "web", "extension", "other"]);

const safetyWarning = "A/B script testing only records draft usage and manual outcomes. It never sends WhatsApp messages, never bulk sends, and never clicks the WhatsApp send button.";
const sampleWarning = "Sample size is small; results are directional only and not statistically significant.";
const infoWarning = "Confirm price, stock, lead time, shipping, payment, discount, after-sales policy, and customer context before sending.";

export function validateExperimentPayload(body: any, options: { partial?: boolean } = {}) {
  const errors: Array<{ field: string; message: string }> = [];
  if (!options.partial && !clean(body?.name)) errors.push({ field: "name", message: "name is required" });
  if (!options.partial && !clean(body?.scenario)) errors.push({ field: "scenario", message: "scenario is required" });
  if (body?.scenario !== undefined && !SCRIPT_EXPERIMENT_SCENARIOS.includes(clean(body.scenario) as any)) errors.push({ field: "scenario", message: "scenario is invalid" });
  if (body?.status !== undefined && clean(body.status) && !SCRIPT_EXPERIMENT_STATUSES.includes(clean(body.status) as any)) errors.push({ field: "status", message: "status is invalid" });
  return errors;
}

export function validateVariantPayload(body: any, options: { partial?: boolean } = {}) {
  const errors: Array<{ field: string; message: string }> = [];
  if (!options.partial && !clean(body?.title)) errors.push({ field: "title", message: "title is required" });
  if (!options.partial && !clean(body?.versionLabel)) errors.push({ field: "versionLabel", message: "versionLabel is required" });
  if (!options.partial && !clean(body?.content)) errors.push({ field: "content", message: "content is required" });
  if (body?.versionLabel !== undefined && !SCRIPT_VARIANT_LABELS.includes(clean(body.versionLabel).toUpperCase() as any)) errors.push({ field: "versionLabel", message: "versionLabel must be A, B, C, D, or E" });
  return errors;
}

export function validateUsagePayload(body: any) {
  const errors: Array<{ field: string; message: string }> = [];
  if (!clean(body?.experimentId)) errors.push({ field: "experimentId", message: "experimentId is required" });
  if (!clean(body?.variantId)) errors.push({ field: "variantId", message: "variantId is required" });
  if (body?.scenario !== undefined && clean(body.scenario) && !SCRIPT_EXPERIMENT_SCENARIOS.includes(clean(body.scenario) as any)) errors.push({ field: "scenario", message: "scenario is invalid" });
  if (body?.channel !== undefined && clean(body.channel) && !SCRIPT_USAGE_CHANNELS.has(clean(body.channel))) errors.push({ field: "channel", message: "channel is invalid" });
  return errors;
}

export function validateOutcomePayload(body: any) {
  const outcome = clean(body?.outcome);
  if (!SCRIPT_USAGE_OUTCOMES.includes(outcome as any)) return [{ field: "outcome", message: "outcome is invalid" }];
  return [];
}

export function serializeExperiment(row: any, stats?: any) {
  return {
    id: row.id,
    organizationId: row.organizationId || null,
    name: row.name,
    scenario: row.scenario,
    description: row.description || null,
    status: row.status,
    targetLanguage: row.targetLanguage || null,
    targetCustomerStage: row.targetCustomerStage || null,
    createdBy: row.createdBy,
    variantsCount: row._count?.variants ?? row.variants?.length ?? 0,
    totalUsage: stats?.totalUsage ?? row._count?.usages ?? 0,
    bestVariant: stats?.bestVariant || null,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt)
  };
}

export function serializeVariant(row: any) {
  return {
    id: row.id,
    experimentId: row.experimentId,
    organizationId: row.organizationId || null,
    title: row.title,
    versionLabel: row.versionLabel,
    content: row.content,
    language: row.language || null,
    tone: row.tone || null,
    enabled: Boolean(row.enabled),
    createdBy: row.createdBy,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt)
  };
}

export function serializeUsage(row: any) {
  return {
    id: row.id,
    organizationId: row.organizationId || null,
    experimentId: row.experimentId,
    variantId: row.variantId,
    customerId: row.customerId || null,
    customerName: row.customer?.name || null,
    userId: row.userId,
    scenario: row.scenario,
    channel: row.channel,
    usedText: row.usedText || null,
    outcome: row.outcome,
    quoteId: row.quoteId || null,
    orderId: row.orderId || null,
    followUpTaskId: row.followUpTaskId || null,
    notes: row.notes || null,
    usedAt: toIso(row.usedAt),
    outcomeAt: toIso(row.outcomeAt)
  };
}

export function calculateExperimentStats(experiment: any, usages: any[]) {
  const variants = experiment.variants || [];
  const usageByVariant: Record<string, any> = {};
  for (const variant of variants) {
    usageByVariant[variant.id] = {
      versionLabel: variant.versionLabel,
      title: variant.title,
      total: 0,
      used_draft: 0,
      customer_replied: 0,
      quote_created: 0,
      order_created: 0,
      payment_received: 0,
      reorder_created: 0,
      no_response: 0,
      manually_marked: 0
    };
  }
  for (const usage of usages) {
    usageByVariant[usage.variantId] ||= { versionLabel: usage.variant?.versionLabel || "-", title: usage.variant?.title || "-", total: 0 };
    usageByVariant[usage.variantId].total += 1;
    usageByVariant[usage.variantId][usage.outcome] = (usageByVariant[usage.variantId][usage.outcome] || 0) + 1;
  }
  const usedDraft = usages.filter((usage) => usage.outcome === "used_draft").length;
  const rates = {
    replyRate: rate(usages, "customer_replied", usedDraft),
    quoteConversionRate: rate(usages, "quote_created", usedDraft),
    orderConversionRate: rate(usages, "order_created", usedDraft),
    paymentConversionRate: rate(usages, "payment_received", usedDraft),
    reorderConversionRate: rate(usages, "reorder_created", usedDraft),
    noResponseRate: rate(usages, "no_response", usedDraft)
  };
  let bestVariant: string | null = null;
  let bestScore = -1;
  for (const [variantId, value] of Object.entries(usageByVariant)) {
    const draftCount = value.used_draft || 0;
    if (draftCount < 10) continue;
    const score = ((value.order_created || 0) * 3 + (value.payment_received || 0) * 4 + (value.quote_created || 0) * 2 + (value.customer_replied || 0)) / draftCount;
    if (score > bestScore) {
      bestScore = score;
      bestVariant = variantId;
    }
  }
  const riskWarnings = [safetyWarning, infoWarning];
  if (usedDraft < 10 || !bestVariant) riskWarnings.push(sampleWarning);
  return { totalUsage: usages.length, usageByVariant, rates, bestVariant, riskWarnings };
}

export function generateScriptVariants(input: { scenario: string; targetLanguage?: string | null; baseContent?: string | null; tone?: string | null; count?: number }) {
  const count = Math.min(Math.max(Number(input.count) || 3, 1), 3);
  const language = input.targetLanguage || "customer language";
  const context = input.baseContent?.trim() || `Scenario: ${input.scenario}`;
  const variants = [
    {
      versionLabel: "A",
      title: "Short direct version",
      content: `Hi, thanks for your message. ${context} Could you confirm the key details so I can help you faster? This is a draft; please confirm price, stock, lead time, shipping and payment details before sending. Language: ${language}.`
    },
    {
      versionLabel: "B",
      title: "Professional explanation version",
      content: `Hi, thank you for checking with us. Based on your request, I can help confirm the product details, quantity, shipping information and next step. Please let me verify price, stock, lead time and payment terms before giving a final answer. Language: ${language}.`
    },
    {
      versionLabel: "C",
      title: "Closing guidance version",
      content: `Hi, this option may fit your request. If you can confirm quantity, destination city and preferred shipping method, I can prepare the next quotation or follow-up for you. This is only a draft and must be manually checked before sending. Language: ${language}.`
    }
  ].slice(0, count);
  return {
    variants,
    riskWarnings: [safetyWarning, infoWarning, "Generated variants do not invent price, stock, lead time, shipping, discount, or urgency."],
    knowledgeUsed: [] as string[]
  };
}

function rate(usages: any[], outcome: string, denominator: number) {
  if (!denominator) return null;
  return Number((usages.filter((usage) => usage.outcome === outcome).length / denominator).toFixed(4));
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toIso(value: unknown) {
  return value instanceof Date ? value.toISOString() : typeof value === "string" ? value : null;
}

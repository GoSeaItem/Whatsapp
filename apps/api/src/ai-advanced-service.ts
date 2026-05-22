import type {
  AiActionPriority,
  AiCustomerSalesSummaryRequest,
  AiCustomerSalesSummaryResponse,
  AiFollowUpPlanItem,
  AiFollowUpPlanRequest,
  AiFollowUpPlanResponse,
  AiNextActionRequest,
  AiNextActionResponse,
  AiRiskCheckRequest,
  AiRiskCheckResponse,
  AiRiskLevel,
  AiSalesScriptRequest,
  AiSalesScriptResponse,
  OrganizationRole
} from "@wa-ai/shared";
import { AI_ADVANCED_BASE_RISK_WARNINGS } from "./ai-prompt-boundary.js";
import { buildAiFollowUpPlanPrompt } from "./ai-follow-up-plan-prompt.js";
import { buildAiNextActionPrompt } from "./ai-next-action-prompt.js";
import { buildAiRiskCheckPrompt } from "./ai-risk-check-prompt.js";
import { buildAiSalesScriptPrompt } from "./ai-sales-script-prompt.js";
import { buildAiSalesSummaryPrompt } from "./ai-sales-summary-prompt.js";
import { writeAuditLog } from "./audit-log-utils.js";
import { calculateCustomerIntent } from "./customer-intent-rules.js";
import { findKnowledgeForAi, buildKnowledgeContext } from "./knowledge-base-service.js";
import { canWriteOrganizationResource, getActiveOrganizationRole } from "./organization-permissions.js";
import { prisma } from "./db.js";

type Row = Record<string, any>;
type AiAdvancedDb = typeof prisma;
type CurrentUser = { id: string; email?: string; name?: string };

const MISSING = "未确认";
const MAX_SNAPSHOT_TEXT = 500;

export class AiAdvancedError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function generateNextAction(db: AiAdvancedDb, user: CurrentUser, input: AiNextActionRequest): Promise<AiNextActionResponse> {
  const context = await loadCustomerContext(db, user, input.customerId, {
    includeQuotes: input.includeQuotes !== false,
    includeFollowUps: input.includeFollowUps !== false,
    includeSamples: input.includeSamples !== false,
    includeCustomRequests: input.includeCustomRequests !== false,
    productId: input.productId || undefined,
    includeKnowledgeBase: input.includeKnowledgeBase !== false,
    scenario: input.scenario || undefined
  });

  const intent = calculateCustomerIntent(context.customer as any, {
    quotes: context.quotes as any,
    followUps: context.followUps as any,
    sampleOrders: context.sampleOrders as any,
    customRequests: context.customRequests as any
  });
  const action = chooseNextAction(context, intent.intentLevel);
  const response: AiNextActionResponse = {
    customerId: context.customer.id,
    recommendedAction: action.recommendedAction,
    reason: action.reason,
    suggestedScript: action.suggestedScript,
    actionPriority: action.actionPriority,
    relatedData: {
      quoteCount: context.quotes.length,
      pendingFollowUpCount: context.followUps.filter((item) => item.status === "pending").length,
      sampleOrderCount: context.sampleOrders.length,
      customRequestCount: context.customRequests.length,
      intentScore: intent.intentScore,
      intentLevel: intent.intentLevel
    },
    knowledgeUsed: context.knowledgeUsed,
    riskWarnings: addKnowledgeWarning(context.knowledgeUsed, [
      ...AI_ADVANCED_BASE_RISK_WARNINGS,
      ...action.riskWarnings,
      ...intent.riskWarnings
    ])
  };
  response.createdLogId = await logAiAction(db, user, context, "next_action", input.scenario || action.scenario, {
    prompt: buildAiNextActionPrompt(),
    customerId: input.customerId,
    scenario: input.scenario || null,
    productId: input.productId || null
  }, response);
  return response;
}

export async function generateCustomerSalesSummary(
  db: AiAdvancedDb,
  user: CurrentUser,
  input: AiCustomerSalesSummaryRequest
): Promise<AiCustomerSalesSummaryResponse> {
  const context = await loadCustomerContext(db, user, input.customerId, {
    includeQuotes: input.includeQuotes !== false,
    includeFollowUps: input.includeFollowUps !== false,
    includeSamples: input.includeSamples !== false,
    includeCustomRequests: input.includeCustomRequests !== false,
    includeKnowledgeBase: false
  });
  const text = joinedCustomerText(context.customer);
  const latestQuote = latestByDate(context.quotes, "createdAt");
  const latestSample = latestByDate(context.sampleOrders, "updatedAt") || latestByDate(context.sampleOrders, "createdAt");
  const latestCustom = latestByDate(context.customRequests, "updatedAt") || latestByDate(context.customRequests, "createdAt");
  const intent = input.includeIntentScore === false
    ? null
    : calculateCustomerIntent(context.customer as any, {
        quotes: context.quotes as any,
        followUps: context.followUps as any,
        sampleOrders: context.sampleOrders as any,
        customRequests: context.customRequests as any
      });
  const quantity = extractQuantity(text) || firstPresent(context.quotes.map((quote) => quote.quantity && `${quote.quantity} pcs`)) || MISSING;
  const interestedProducts = unique([
    context.customer.interestedProduct,
    ...context.quotes.map((quote) => quote.product?.name),
    ...context.sampleOrders.map((sample) => sample.sampleName),
    ...context.customRequests.map((item) => item.product?.name)
  ]);
  const shippingAsked = hasAny(text, ["shipping", "freight", "delivery", "envio", "envío", "运费", "物流", "交期"]);
  const paymentAsked = hasAny(text, ["payment", "paypal", "bank transfer", "付款", "收款"]);
  const currentBlocker = currentBlockerFor(context);
  const response: AiCustomerSalesSummaryResponse = {
    customerNeed: context.customer.latestSummary || context.customer.notes || MISSING,
    interestedProducts: interestedProducts.length ? interestedProducts : [MISSING],
    quantity,
    countryOrCity: context.customer.country || extractLocation(text) || MISSING,
    budgetSensitivity: hasAny(text, ["too expensive", "high price", "discount", "贵", "太高"]) ? "price-sensitive" : MISSING,
    quotedStatus: latestQuote ? `quoted on ${toIsoDate(latestQuote.createdAt)}` : MISSING,
    shippingAsked,
    paymentAsked,
    sampleStatus: latestSample ? `${latestSample.paymentStatus}/${latestSample.shippingStatus}/${latestSample.feedbackStatus}` : MISSING,
    customRequestStatus: latestCustom ? `${latestCustom.requestType}/${latestCustom.status}` : MISSING,
    currentBlocker,
    nextBestAction: currentBlocker === MISSING ? (intent?.recommendedAction || "Keep qualifying needs and confirm quantity, city, price range, and timeline.") : actionFromBlocker(currentBlocker),
    summaryText: "",
    riskWarnings: [...AI_ADVANCED_BASE_RISK_WARNINGS]
  };
  response.summaryText = [
    `Need: ${response.customerNeed}`,
    `Products: ${response.interestedProducts.join(", ")}`,
    `Quantity: ${response.quantity}`,
    `Country/City: ${response.countryOrCity}`,
    `Blocker: ${response.currentBlocker}`,
    `Next: ${response.nextBestAction}`
  ].join("\n");
  response.createdLogId = await logAiAction(db, user, context, "customer_summary", null, {
    prompt: buildAiSalesSummaryPrompt(),
    customerId: input.customerId,
    includes: {
      quotes: input.includeQuotes !== false,
      followUps: input.includeFollowUps !== false,
      samples: input.includeSamples !== false,
      customRequests: input.includeCustomRequests !== false
    }
  }, response);
  return response;
}

export async function generateSalesScript(db: AiAdvancedDb, user: CurrentUser, input: AiSalesScriptRequest): Promise<AiSalesScriptResponse> {
  const context = input.customerId
    ? await loadCustomerContext(db, user, input.customerId, {
        includeQuotes: true,
        includeFollowUps: true,
        includeSamples: true,
        includeCustomRequests: true,
        productId: input.productId || undefined,
        materialId: input.materialId || undefined,
        quoteId: input.quoteId || undefined,
        sampleOrderId: input.sampleOrderId || undefined,
        customRequestId: input.customRequestId || undefined,
        includeKnowledgeBase: true,
        scenario: input.scenario
      })
    : await loadLooseContext(db, user, input);

  const missingInfo = missingInfoForScript(context, input.scenario);
  const scriptText = scriptForScenario(context, input);
  const riskWarnings = addKnowledgeWarning(context.knowledgeUsed, [
    ...AI_ADVANCED_BASE_RISK_WARNINGS,
    ...warningsForScenario(input.scenario),
    ...missingInfo.map((item) => `Missing information: ${item}. Confirm before sending.`)
  ]);
  const response: AiSalesScriptResponse = {
    scriptText,
    alternativeScripts: alternativesForScenario(context, input).slice(0, 3),
    knowledgeUsed: context.knowledgeUsed,
    riskWarnings,
    missingInfo
  };
  response.createdLogId = await logAiAction(db, user, context, "sales_script", input.scenario, {
    prompt: buildAiSalesScriptPrompt(),
    customerId: input.customerId || null,
    productId: input.productId || null,
    materialId: input.materialId || null,
    quoteId: input.quoteId || null,
    sampleOrderId: input.sampleOrderId || null,
    customRequestId: input.customRequestId || null,
    scenario: input.scenario,
    tone: input.tone || "professional",
    extraContext: truncate(input.extraContext)
  }, response);
  return response;
}

export async function checkSalesRisk(db: AiAdvancedDb, user: CurrentUser, input: AiRiskCheckRequest): Promise<AiRiskCheckResponse> {
  if (!input.text || !String(input.text).trim()) {
    throw new AiAdvancedError(400, "text is required");
  }
  const context = input.customerId
    ? await loadCustomerContext(db, user, input.customerId, { includeKnowledgeBase: true, scenario: input.scenario || undefined })
    : await loadLooseContext(db, user, input);
  const text = String(input.text);
  const forbidden = forbiddenPhrases(context.knowledgeItems);
  const high = [
    "lowest price",
    "最低价",
    "always in stock",
    "一直有货",
    "100% guaranteed delivery",
    "100% 到货",
    "free return for all wholesale orders",
    "所有批发订单免费退换",
    "today shipping",
    "今天一定发货",
    "payment confirmed without proof",
    "fake certificate",
    ...forbidden
  ];
  const medium = [
    "shipping cost is",
    "freight is",
    "delivery in",
    "lead time is",
    "in stock",
    "paypal only",
    "bank account",
    "no problem return",
    "don't worry just pay"
  ];
  const highMatches = matchPhrases(text, high);
  const mediumMatches = matchPhrases(text, medium);
  const riskLevel: AiRiskLevel = highMatches.length ? "high" : mediumMatches.length ? "medium" : "low";
  const riskyPhrases = unique([...highMatches, ...mediumMatches]);
  const riskWarnings = [
    ...AI_ADVANCED_BASE_RISK_WARNINGS,
    ...(highMatches.length ? ["High risk: draft may promise lowest price, guaranteed delivery, inventory, payment, certificate, or forbidden expressions."] : []),
    ...(mediumMatches.length ? ["Medium risk: confirm shipping city, inventory source, lead time, payment account, and after-sales policy before sending."] : []),
    ...(forbidden.length && highMatches.some((phrase) => forbidden.map((item) => item.toLowerCase()).includes(phrase.toLowerCase()))
      ? ["Forbidden expression matched from knowledge base. Please revise before sending."]
      : [])
  ];
  const response: AiRiskCheckResponse = {
    riskLevel,
    riskWarnings,
    riskyPhrases,
    rewriteSuggestion: riskLevel === "low"
      ? "The draft is generally safe. Keep the confirmation reminder before sending."
      : "Remove absolute promises and add confirmation language for price, inventory, lead time, shipping, payment, logistics, certificates, and after-sales terms.",
    safeVersion: safeRewrite(text, riskyPhrases),
    createdLogId: null
  };
  response.createdLogId = await logAiAction(db, user, context, "risk_check", input.scenario || null, {
    prompt: buildAiRiskCheckPrompt(),
    customerId: input.customerId || null,
    scenario: input.scenario || null,
    text: truncate(text)
  }, response, riskLevel);
  return response;
}

export async function generateFollowUpPlan(db: AiAdvancedDb, user: CurrentUser, input: AiFollowUpPlanRequest): Promise<AiFollowUpPlanResponse> {
  const days = Math.max(7, Math.min(14, Number(input.days || 14)));
  const context = await loadCustomerContext(db, user, input.customerId, {
    includeQuotes: true,
    includeFollowUps: true,
    includeSamples: true,
    includeCustomRequests: true,
    includeKnowledgeBase: true,
    scenario: input.planType || undefined
  });
  const offsets = [1, 3, 7, days].filter((value, index, arr) => value <= days && arr.indexOf(value) === index);
  const plan = offsets.map((dayOffset) => planItemFor(context, input.planType || "general", dayOffset));
  const canCreateTasks = Boolean(input.createTasks);
  const createdTasks = canCreateTasks ? await createFollowUpTasks(db, context, plan) : undefined;
  const response: AiFollowUpPlanResponse = { plan, canCreateTasks, createdTasks };
  response.createdLogId = await logAiAction(db, user, context, "followup_plan", input.planType || "general", {
    prompt: buildAiFollowUpPlanPrompt(),
    customerId: input.customerId,
    days,
    planType: input.planType || "general",
    createTasks: Boolean(input.createTasks)
  }, response);
  if (createdTasks?.length) {
    await writeAuditLog(db as any, {
      organizationId: context.customer.organizationId || null,
      userId: user.id,
      action: "create",
      entityType: "FollowUpTask",
      entityId: context.customer.id,
      before: null,
      after: { taskCount: createdTasks.length, source: "ai_followup_plan" }
    });
  }
  return response;
}

type LoadOptions = {
  includeQuotes?: boolean;
  includeFollowUps?: boolean;
  includeSamples?: boolean;
  includeCustomRequests?: boolean;
  includeKnowledgeBase?: boolean;
  productId?: string;
  materialId?: string;
  quoteId?: string;
  sampleOrderId?: string;
  customRequestId?: string;
  scenario?: string;
};

type AiContext = {
  customer: Row;
  role: OrganizationRole | null;
  quotes: Row[];
  followUps: Row[];
  sampleOrders: Row[];
  customRequests: Row[];
  product?: Row | null;
  material?: Row | null;
  quote?: Row | null;
  sampleOrder?: Row | null;
  customRequest?: Row | null;
  knowledgeItems: Row[];
  knowledgeUsed: string[];
};

async function loadCustomerContext(db: AiAdvancedDb, user: CurrentUser, customerId: string, options: LoadOptions = {}): Promise<AiContext> {
  if (!customerId) throw new AiAdvancedError(400, "customerId is required");
  const customer = await db.customer.findFirst({ where: { id: customerId } }) as Row | null;
  if (!customer) throw new AiAdvancedError(404, "customer not found");
  const role = await roleForCustomer(db, user.id, customer);
  if (!canAccessCustomer(customer, user.id, role)) throw new AiAdvancedError(403, "customer access denied");

  const [quotes, followUps, sampleOrders, customRequests] = await Promise.all([
    options.includeQuotes === false ? [] : db.quote.findMany({ where: { customerId: customer.id } }),
    options.includeFollowUps === false ? [] : db.followUpTask.findMany({ where: { customerId: customer.id } }),
    options.includeSamples === false ? [] : db.sampleOrder.findMany({ where: { customerId: customer.id }, include: { product: true } as any }),
    options.includeCustomRequests === false ? [] : db.customRequest.findMany({ where: { customerId: customer.id }, include: { product: true } as any })
  ]);

  const product = options.productId ? await findAccessibleProduct(db, user, options.productId, customer.organizationId || null) : null;
  const material = options.materialId ? await findAccessibleMaterial(db, user, options.materialId, customer.organizationId || null) : null;
  const quote = options.quoteId ? findOwnedRelated(quotes, options.quoteId, "quote") : null;
  const sampleOrder = options.sampleOrderId ? findOwnedRelated(sampleOrders, options.sampleOrderId, "sample order") : null;
  const customRequest = options.customRequestId ? findOwnedRelated(customRequests, options.customRequestId, "custom request") : null;
  const knowledge = options.includeKnowledgeBase === false
    ? { items: [] as Row[], productNotFound: false }
    : await findKnowledgeForAi(db as any, {
        ownerId: customer.ownerId || user.id,
        organizationId: customer.organizationId || null,
        targetLanguage: customer.language || undefined,
        productId: product?.id || options.productId || null,
        mode: "reply",
        keyword: joinedCustomerText(customer),
        scenario: scenarioToReplyScenario(options.scenario) as any
      });
  const knowledgeContext = buildKnowledgeContext(knowledge.items as any);
  return {
    customer,
    role,
    quotes,
    followUps,
    sampleOrders,
    customRequests,
    product,
    material,
    quote,
    sampleOrder,
    customRequest,
    knowledgeItems: knowledge.items as Row[],
    knowledgeUsed: knowledgeContext.knowledgeUsed
  };
}

async function loadLooseContext(db: AiAdvancedDb, user: CurrentUser, input: { customerId?: string | null; productId?: string | null; materialId?: string | null; scenario?: string | null; targetLanguage?: string | null }): Promise<AiContext> {
  const product = input.productId ? await findAccessibleProduct(db, user, input.productId, null) : null;
  const material = input.materialId ? await findAccessibleMaterial(db, user, input.materialId, null) : null;
  const knowledge = await findKnowledgeForAi(db as any, {
    ownerId: user.id,
    organizationId: null,
    targetLanguage: input.targetLanguage || undefined,
    productId: product?.id || null,
    mode: "reply",
    keyword: input.scenario || undefined,
    scenario: scenarioToReplyScenario(input.scenario || undefined) as any
  });
  return {
    customer: { id: "", ownerId: user.id, organizationId: null, tags: [], stage: "", language: input.targetLanguage || "English" },
    role: null,
    quotes: [],
    followUps: [],
    sampleOrders: [],
    customRequests: [],
    product,
    material,
    knowledgeItems: knowledge.items as Row[],
    knowledgeUsed: buildKnowledgeContext(knowledge.items as any).knowledgeUsed
  };
}

async function roleForCustomer(db: AiAdvancedDb, userId: string, customer: Row) {
  return customer.organizationId ? await getActiveOrganizationRole(db as any, customer.organizationId, userId) : null;
}

function canAccessCustomer(customer: Row, userId: string, role: OrganizationRole | null) {
  if (!customer.organizationId) return customer.ownerId === userId;
  if (canWriteOrganizationResource(role)) return true;
  return customer.ownerId === userId || customer.assignedTo === userId || (customer.collaborators || []).includes(userId);
}

async function findAccessibleProduct(db: AiAdvancedDb, user: CurrentUser, productId: string, organizationId: string | null) {
  const product = await db.product.findFirst({ where: { id: productId } }) as Row | null;
  if (!product) throw new AiAdvancedError(404, "product not found");
  if (product.ownerId === user.id) return product;
  if (organizationId) {
    const role = await getActiveOrganizationRole(db as any, organizationId, user.id);
    const shared = await (db as any).organizationProduct?.findFirst?.({ where: { organizationId, productId } });
    if (shared && role) return product;
  }
  throw new AiAdvancedError(403, "product access denied");
}

async function findAccessibleMaterial(db: AiAdvancedDb, user: CurrentUser, materialId: string, organizationId: string | null) {
  const material = await db.material.findFirst({ where: { id: materialId } }) as Row | null;
  if (!material) throw new AiAdvancedError(404, "material not found");
  if (material.ownerId === user.id) return material;
  if (organizationId) {
    const role = await getActiveOrganizationRole(db as any, organizationId, user.id);
    const shared = await (db as any).organizationMaterial?.findFirst?.({ where: { organizationId, materialId } });
    if (shared && role) return material;
  }
  throw new AiAdvancedError(403, "material access denied");
}

function findOwnedRelated(items: Row[], id: string, label: string) {
  const item = items.find((row) => row.id === id);
  if (!item) throw new AiAdvancedError(404, `${label} not found`);
  return item;
}

function chooseNextAction(context: AiContext, intentLevel: string) {
  const now = new Date();
  const latestQuote = latestByDate(context.quotes, "createdAt");
  const pendingFollowUps = context.followUps.filter((item) => item.status === "pending");
  const unpaidSample = context.sampleOrders.find((item) => item.paymentStatus === "unpaid");
  const deliveredSample = context.sampleOrders.find((item) => item.shippingStatus === "delivered" && item.feedbackStatus === "pending");
  const waitingCustom = context.customRequests.find((item) => item.status === "waiting_customer_confirm");
  const missingLogo = context.customRequests.find((item) => item.logoRequired && !(item.files || []).length);
  const text = joinedCustomerText(context.customer);
  if (unpaidSample) return action("sample_payment_reminder", "Sample payment reminder", "The customer has a pending sample order that is still unpaid.", "Hi, the sample details are ready. Please confirm whether you would like to proceed with the sample payment. I will confirm the payment account before sending.", "high", ["Confirm sample fee, shipping cost, and receiving account before sending."]);
  if (deliveredSample) return action("sample_feedback_follow_up", "Sample feedback follow-up", "The sample is marked delivered and feedback is still pending.", "Hi, have you received and checked the sample? Please share your feedback so we can adjust details or prepare the next bulk quotation.", "high", ["Confirm real delivery status before mentioning delivery."]);
  if (missingLogo) return action("custom_request_files", "Request logo file", "The custom request needs a logo file but no file URL is recorded.", "Could you please send a clear logo file, preferably AI/PDF/PNG format? I will confirm with our team before saying it can be used for production.", "high", ["Do not promise the file can be directly used for production before checking."]);
  if (waitingCustom) return action("custom_confirm", "Confirm custom requirements", "The custom request is waiting for customer confirmation.", "Please confirm the logo, packaging, color, size, material, quantity, MOQ, sample fee, and lead time details. I will double-check all production details before final confirmation.", "medium", ["Confirm MOQ, sample fee, and lead time before sending."]);
  if (isPaymentStage(context.customer)) return action("payment_reminder", "Payment reminder", "The customer is in pending payment stage.", "Hi, would you like to proceed with the payment? I will confirm the final amount and receiving account before sending payment details.", "high", ["Confirm payment account and amount before sending."]);
  if (latestQuote && hoursBetween(latestQuote.createdAt, now) >= 24 && hoursBetween(latestQuote.createdAt, now) <= 72 && pendingFollowUps.length === 0) {
    return action("quote_follow_up", "Quote follow-up", "A quote was created 24-72 hours ago and there is no pending follow-up.", "Hi, have you had a chance to review the quotation? If needed, I can help adjust quantity, shipping plan, or product details after confirming them.", "high", ["Confirm quoted price, stock, lead time, and shipping cost before sending."]);
  }
  if (intentLevel === "high" && pendingFollowUps.length === 0) return action("priority_follow_up", "Set priority follow-up", "The customer has high intent and no pending follow-up task.", "Hi, I wanted to follow up on your requirements. Could you confirm quantity, delivery city, and preferred payment method so I can prepare the next step?", "high", ["High intent is only an assistant signal and does not mean the customer will close."]);
  if (hasAny(text, ["shipping", "freight", "delivery", "envio", "envío"])) return action("shipping_confirm", "Confirm country, city, and freight", "The customer discussed shipping or delivery.", "Could you please share the destination country, city, and postal code? I will confirm the shipping cost and lead time before sending a final quote.", "medium", ["Do not invent shipping cost or delivery time."]);
  if (hasAny(text, ["payment", "paypal", "bank transfer"])) return action("payment_confirm", "Confirm payment method and account", "The customer discussed payment.", "We can discuss the payment method, but I will confirm the official receiving account and final amount before sending payment details.", "medium", ["Confirm payment method and account before sending."]);
  if (hasAny(text, ["too expensive", "price is too high"])) return action("value_explain", "Explain value before discount", "The customer is price-sensitive.", "I understand. May I know which part concerns you most: price, quantity, shipping, or product details? I can review the best suitable option after confirming the details.", "medium", ["Do not promise a discount or lowest price without approval."]);
  return action("general_follow_up", "Clarify needs", "No urgent action was detected from existing records.", "Could you share the quantity, target market, delivery city, and any product requirements? I will prepare a suitable option after confirming the details.", "medium", []);
}

function action(scenario: string, recommendedAction: string, reason: string, suggestedScript: string, actionPriority: AiActionPriority, riskWarnings: string[]) {
  return { scenario, recommendedAction, reason, suggestedScript, actionPriority, riskWarnings };
}

function scriptForScenario(context: AiContext, input: AiSalesScriptRequest) {
  const productName = context.product?.name || context.quote?.product?.name || context.customer.interestedProduct || "the product";
  const materialTitle = context.material?.title || "the material";
  const customerName = context.customer.name || "there";
  const templates: Record<string, string> = {
    first_reply: `Hi ${customerName}, thanks for your message. Could you share the product, quantity, destination city, and any special requirements? I will confirm the details before preparing a recommendation.`,
    price_reply: `For ${productName}, I need to confirm quantity, destination city, shipping option, stock, and latest price before sending a final quotation.`,
    quote_follow_up: `Hi, have you reviewed the quotation? If you want, I can help confirm quantity, shipping plan, lead time, and stock before we move to the next step.`,
    payment_reminder: `Hi, would you like to proceed with payment? I will confirm the final amount and official receiving account before sending payment details.`,
    sample_quote: `For the sample, I will confirm the sample fee, shipping cost, payment method, and lead time before sending the final sample quotation.`,
    sample_feedback_follow_up: `Hi, have you checked the sample? Your feedback will help us confirm whether to adjust details or prepare the bulk order plan.`,
    custom_confirm: `Please confirm the custom requirements: logo, packaging, color, size, material, quantity, MOQ, sample fee, sample lead time, and bulk lead time. I will double-check feasibility before final confirmation.`,
    custom_request_files: `Could you please send the logo/design/packaging file in clear format? I will ask our team to check whether it can be used for production before confirming.`,
    material_intro: `Here is ${materialTitle}: ${context.material?.url || ""}. Please use it as a reference only; I will confirm product details before making any commitment.`,
    customer_thinks_about_it: `No problem. May I know what you would like to compare or think about: price, shipping, MOQ, product details, or payment? I can help clarify the key points.`,
    too_expensive: `I understand the price concern. The final option depends on quantity, material, packaging, and shipping. May I know your target quantity and budget range so I can review a suitable solution?`,
    shipping_explain: `Shipping cost and delivery time depend on country, city, postal code, and logistics method. Please share the destination details and I will confirm before quoting.`,
    after_sales_soothing: `I understand your concern. Please share photos/videos and order details first. I will check our after-sales policy and confirm the solution before replying officially.`,
    old_customer_reorder: `Hi, would you like to reorder the previous product or check new styles? I can confirm current stock, price, lead time, and shipping before sending details.`,
    delivery_delay_explain: `I am sorry for the delay concern. I will verify the latest logistics or production status first, then update you with confirmed information.`
  };
  return templates[input.scenario] || templates.first_reply;
}

function alternativesForScenario(context: AiContext, input: AiSalesScriptRequest) {
  return [
    scriptForScenario(context, { ...input, tone: "short" }),
    `Professional version: ${scriptForScenario(context, { ...input, tone: "professional" })}`,
    `Closing version: ${scriptForScenario(context, { ...input, tone: "closing" })}`
  ];
}

function warningsForScenario(scenario: string) {
  const warnings: string[] = [];
  if (/price|quote|payment|sample|custom|shipping|delivery/i.test(scenario)) {
    warnings.push("Confirm price, inventory, lead time, shipping cost, payment details, and policy before sending.");
  }
  if (/material|certificate/i.test(scenario)) warnings.push("Do not promise certificate authenticity or material details before checking source files.");
  return warnings;
}

function missingInfoForScript(context: AiContext, scenario: string) {
  const missing: string[] = [];
  if (/price|quote|too_expensive/.test(scenario) && !context.quote && !context.product?.suggestedPrice) missing.push("price");
  if (/shipping|quote|delivery/.test(scenario)) missing.push("destination city and logistics method");
  if (/payment/.test(scenario)) missing.push("payment method and receiving account");
  if (/sample/.test(scenario) && !context.sampleOrder) missing.push("sample fee, shipping cost, and sample lead time");
  if (/custom/.test(scenario)) {
    const custom = context.customRequest || context.customRequests[0];
    if (!custom?.moq) missing.push("custom MOQ");
    if (!custom?.sampleFee) missing.push("sample fee");
    if (!custom?.sampleLeadTime && !custom?.bulkLeadTime) missing.push("sample/bulk lead time");
    if (custom?.logoRequired && !(custom.files || []).length) missing.push("logo file");
  }
  return unique(missing);
}

function currentBlockerFor(context: AiContext) {
  const latestCustom = latestByDate(context.customRequests, "updatedAt");
  const latestSample = latestByDate(context.sampleOrders, "updatedAt");
  if (latestCustom?.logoRequired && !(latestCustom.files || []).length) return "missing logo file";
  if (latestCustom?.status === "waiting_customer_confirm") return "waiting for custom requirement confirmation";
  if (latestSample?.paymentStatus === "unpaid") return "sample payment not confirmed";
  if (latestSample?.shippingStatus === "delivered" && latestSample?.feedbackStatus === "pending") return "waiting for sample feedback";
  if (isPaymentStage(context.customer)) return "payment not confirmed";
  if (!context.quotes.length && hasAny(joinedCustomerText(context.customer), ["price", "quote", "how much"])) return "quotation not prepared";
  return MISSING;
}

function actionFromBlocker(blocker: string) {
  if (blocker.includes("logo")) return "Ask customer to provide a clear logo/design file and confirm feasibility.";
  if (blocker.includes("payment")) return "Confirm final amount and receiving account, then send a manual payment reminder draft.";
  if (blocker.includes("sample feedback")) return "Ask for sample feedback and guide next bulk order discussion.";
  if (blocker.includes("quotation")) return "Confirm quantity, city, stock, price, and lead time before quoting.";
  return "Follow up manually with a clear draft and confirmation reminders.";
}

function planItemFor(context: AiContext, planType: string, dayOffset: number): AiFollowUpPlanItem {
  const baseWarnings = [...AI_ADVANCED_BASE_RISK_WARNINGS, "Do not create false urgency, fake discounts, or fake inventory pressure."];
  if (dayOffset === 1) {
    return {
      dayOffset,
      taskType: planType === "sample_follow_up" ? "样品反馈" : "报价后跟进",
      suggestedMessage: chooseNextAction(context, "medium").suggestedScript,
      reason: "Short-term follow-up to keep the conversation warm.",
      riskWarnings: baseWarnings
    };
  }
  if (dayOffset === 3) {
    return {
      dayOffset,
      taskType: "普通提醒",
      suggestedMessage: "Hi, I can also share product details, real photos, or shipping options after confirming your requirements.",
      reason: "Add helpful information instead of pushing too hard.",
      riskWarnings: baseWarnings
    };
  }
  if (dayOffset === 7) {
    return {
      dayOffset,
      taskType: "普通提醒",
      suggestedMessage: "Would you like me to review another quantity or shipping option for you? I will confirm details before updating the quotation.",
      reason: "Offer an adjustment path after one week.",
      riskWarnings: baseWarnings
    };
  }
  return {
    dayOffset,
    taskType: "普通提醒",
    suggestedMessage: "Just checking whether this project is still active. If timing is not urgent, I can keep you updated with suitable options later.",
    reason: "Low-frequency maintenance after the main follow-up window.",
    riskWarnings: baseWarnings
  };
}

async function createFollowUpTasks(db: AiAdvancedDb, context: AiContext, plan: AiFollowUpPlanItem[]) {
  const now = new Date();
  const created: Row[] = [];
  for (const item of plan) {
    const remindAt = new Date(now);
    remindAt.setDate(remindAt.getDate() + item.dayOffset);
    const row = await db.followUpTask.create({
      data: {
        customerId: context.customer.id,
        taskType: item.taskType,
        remindAt,
        recommendedScript: item.suggestedMessage,
        status: "pending",
        ownerId: context.customer.ownerId
      }
    });
    created.push({
      id: row.id,
      customerId: row.customerId,
      customerName: context.customer.name || "",
      whatsappNumber: context.customer.whatsappNumber || null,
      tags: context.customer.tags || [],
      stage: context.customer.stage || "",
      taskType: row.taskType,
      remindAt: row.remindAt.toISOString(),
      recommendedScript: row.recommendedScript,
      status: row.status,
      ownerId: row.ownerId,
      createdAt: row.createdAt.toISOString(),
      completedAt: row.completedAt?.toISOString() || null
    });
  }
  return created as any;
}

async function logAiAction(
  db: AiAdvancedDb,
  user: CurrentUser,
  context: AiContext,
  actionType: string,
  scenario: string | null,
  inputSnapshot: unknown,
  outputSnapshot: unknown,
  riskLevel?: AiRiskLevel
) {
  const sanitizedInput = sanitizeSnapshot(inputSnapshot);
  const sanitizedOutput = sanitizeSnapshot(outputSnapshot);
  const log = await (db as any).aiActionSuggestionLog?.create?.({
    data: {
      organizationId: context.customer.organizationId || null,
      customerId: context.customer.id || null,
      userId: user.id,
      actionType,
      scenario,
      inputSnapshot: sanitizedInput,
      outputSnapshot: sanitizedOutput,
      riskLevel: riskLevel || (Array.isArray((outputSnapshot as any)?.riskWarnings) && (outputSnapshot as any).riskWarnings.length > 3 ? "medium" : "low")
    }
  });
  await writeAuditLog(db as any, {
    organizationId: context.customer.organizationId || null,
    userId: user.id,
    action: "create",
    entityType: "AIActionSuggestionLog",
    entityId: log?.id || context.customer.id || null,
    before: null,
    after: { actionType, scenario, riskLevel: riskLevel || null, customerId: context.customer.id || null }
  });
  return log?.id || null;
}

function sanitizeSnapshot(value: unknown): any {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(sanitizeSnapshot);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !/(password|secret|token|cookie|api[_-]?key|session|env|server)/i.test(key))
        .map(([key, item]) => [key, sanitizeSnapshot(item)])
    );
  }
  if (typeof value === "string") return truncate(value);
  return value;
}

function safeRewrite(text: string, riskyPhrases: string[]) {
  let safe = text;
  for (const phrase of riskyPhrases) {
    safe = safe.replace(new RegExp(escapeRegExp(phrase), "gi"), "[please confirm]");
  }
  if (riskyPhrases.length) {
    safe += " I will confirm the exact details before sending final information.";
  }
  return safe;
}

function forbiddenPhrases(items: Row[]) {
  return unique(items.filter((item) => item.category === "forbidden_expressions").flatMap((item) => splitPhrases(item.content)));
}

function splitPhrases(value: string) {
  return String(value || "").split(/[\n,;|]+/).map((item) => item.trim()).filter(Boolean);
}

function matchPhrases(text: string, phrases: string[]) {
  const lower = text.toLowerCase();
  return unique(phrases.filter((phrase) => phrase && lower.includes(phrase.toLowerCase())));
}

function addKnowledgeWarning(knowledgeUsed: string[], warnings: string[]) {
  const result = unique(warnings.filter(Boolean));
  if (!knowledgeUsed.length) {
    result.push("No relevant knowledge base content was found. Confirm company policy, price, inventory, lead time, payment, shipping, and after-sales rules.");
  }
  return result;
}

function isPaymentStage(customer: Row) {
  const text = `${customer.stage || ""} ${(customer.tags || []).join(" ")}`;
  return /待付款|pending payment|payment/i.test(text);
}

function joinedCustomerText(customer: Row) {
  return [customer.latestSummary, customer.notes, customer.interestedProduct, customer.country, ...(customer.tags || [])].filter(Boolean).join(" ");
}

function firstPresent(values: Array<unknown>) {
  return values.map((item) => (item === null || item === undefined ? "" : String(item).trim())).find(Boolean) || "";
}

function extractQuantity(text: string) {
  const match = text.match(/(\d{1,6})\s*(pcs|pieces|件|个)?/i);
  return match ? `${match[1]} pcs` : "";
}

function extractLocation(text: string) {
  const match = text.match(/\b(Mexico|USA|United States|Brazil|Spain|Chile|Peru|Colombia|city\s+\w+)\b/i);
  return match?.[0] || "";
}

function hasAny(text: string, patterns: string[]) {
  const lower = text.toLowerCase();
  return patterns.some((pattern) => lower.includes(pattern.toLowerCase()));
}

function latestByDate(items: Row[], key: string) {
  return [...items].filter((item) => item[key]).sort((left, right) => new Date(right[key]).getTime() - new Date(left[key]).getTime())[0] || null;
}

function hoursBetween(date: Date | string, now: Date) {
  return (now.getTime() - new Date(date).getTime()) / 3_600_000;
}

function toIsoDate(value: Date | string) {
  return new Date(value).toISOString().slice(0, 10);
}

function truncate(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return text.length > MAX_SNAPSHOT_TEXT ? `${text.slice(0, MAX_SNAPSHOT_TEXT)}...` : text;
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items.filter(Boolean))) as T[];
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function scenarioToReplyScenario(scenario?: string) {
  const map: Record<string, string> = {
    price_reply: "price",
    quote_follow_up: "follow_up",
    payment_reminder: "payment",
    sample_quote: "sample",
    sample_feedback_follow_up: "sample",
    custom_confirm: "moq",
    custom_request_files: "product_proof",
    material_intro: "product_proof",
    too_expensive: "discount",
    shipping_explain: "shipping",
    delivery_delay_explain: "lead_time"
  };
  return scenario ? map[scenario] : undefined;
}

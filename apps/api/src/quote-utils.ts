import {
  AI_SAFETY_NOTE,
  type ProductDetail,
  type QuoteGenerateRequest,
  type QuoteResponse,
  type QuoteSaveRequest
} from "@wa-ai/shared";

type QuoteInput = QuoteGenerateRequest | QuoteSaveRequest;

const QUOTE_DRAFT_NOTE = "AI/系统仅生成草稿，请业务员确认价格、库存、交期、运费后再发送。";
const NO_AUTO_SEND_NOTE = "报价话术是草稿，不会自动发送 WhatsApp 消息。";
const NO_FABRICATION_NOTE = "不允许系统编造库存、运费、交期、折扣或付款条件。";
const INVENTORY_NOT_MODELED_NOTE = "库存未建模，请业务员确认库存后再承诺";

export function validateQuotePayload(
  input: Partial<QuoteInput>,
  options: { requireCustomer?: boolean; partial?: boolean } = {}
) {
  const errors: Array<{ field: string; message: string }> = [];
  const shouldValidate = (field: keyof QuoteInput) => !options.partial || field in input;

  if ((options.requireCustomer || (!options.partial && input.customerId !== undefined && input.customerId !== null)) && !cleanString(input.customerId)) {
    errors.push({ field: "customerId", message: "客户不能为空" });
  }
  if (shouldValidate("productId") && !cleanString(input.productId)) {
    errors.push({ field: "productId", message: "产品不能为空" });
  }
  if (shouldValidate("quantity") && !isPositiveNumber(input.quantity)) {
    errors.push({ field: "quantity", message: "数量必须大于 0" });
  }
  if (shouldValidate("unitPrice") && !isPositiveNumber(input.unitPrice)) {
    errors.push({ field: "unitPrice", message: "单价必须大于 0" });
  }
  if (shouldValidate("currency") && !cleanString(input.currency)) {
    errors.push({ field: "currency", message: "币种不能为空" });
  }
  if (
    input.shippingCost !== undefined &&
    input.shippingCost !== null &&
    input.shippingCost !== "" &&
    Number(input.shippingCost) < 0
  ) {
    errors.push({ field: "shippingCost", message: "运费不能为负数" });
  }
  if (input.tiers?.some((tier) => !isPositiveNumber(tier.quantity) || !isPositiveNumber(tier.unitPrice))) {
    errors.push({ field: "tiers", message: "阶梯报价的数量和单价必须大于 0" });
  }
  return errors;
}

export function buildQuoteResponse(input: QuoteInput, product: ProductDetail): QuoteResponse {
  const currency = cleanString(input.currency) || "USD";
  const quantity = Number(input.quantity);
  const unitPrice = Number(input.unitPrice);
  const shippingCost =
    input.shippingCost === undefined || input.shippingCost === null || input.shippingCost === ""
      ? null
      : Number(input.shippingCost);
  const includeShipping = Boolean(input.includeShipping);
  const tiers = normalizeTiers(input.tiers);
  const language = normalizeLanguage(input.targetLanguage || "English");
  const moq = input.moq ?? product.moq ?? null;
  const leadTime = cleanString(input.leadTime) || product.leadTime || null;
  const quoteText =
    "quoteText" in input && input.quoteText?.trim()
      ? input.quoteText.trim()
      : buildQuoteText({
          product,
          language,
          quantity,
          unitPrice,
          currency,
          shippingCost,
          moq,
          leadTime,
          includeShipping,
          tiers
        });
  const riskWarnings = buildRiskWarnings(input, product, unitPrice, shippingCost, quoteText);

  return {
    customerId: input.customerId || null,
    productId: product.id,
    quantity,
    unitPrice: money(unitPrice),
    currency,
    shippingCost: shippingCost === null ? null : money(shippingCost),
    moq,
    leadTime,
    includeShipping,
    quoteText,
    createdBy: cleanString(input.createdBy) || null,
    riskWarnings,
    followUpPrompt: "报价已生成。是否设置跟进提醒？建议 24 小时内确认客户是否接受价格、运费和交期。"
  };
}

export function buildQuoteCreateData(response: QuoteResponse) {
  return {
    customerId: response.customerId || "",
    productId: response.productId,
    quantity: response.quantity,
    unitPrice: Number(response.unitPrice),
    currency: response.currency,
    shippingCost: response.shippingCost === null || response.shippingCost === undefined ? null : Number(response.shippingCost),
    moq: response.moq ?? null,
    leadTime: response.leadTime || null,
    includeShipping: response.includeShipping,
    quoteText: response.quoteText,
    createdBy: response.createdBy || null
  };
}

export function serializeQuote(quote: {
  id: string;
  customerId: string;
  productId: string;
  quantity: number;
  unitPrice: { toFixed(decimalPlaces?: number): string };
  currency: string;
  shippingCost: { toFixed(decimalPlaces?: number): string } | null;
  moq: number | null;
  leadTime: string | null;
  includeShipping: boolean;
  quoteText: string;
  createdBy: string | null;
  createdAt: Date;
}): QuoteResponse {
  return {
    id: quote.id,
    customerId: quote.customerId,
    productId: quote.productId,
    quantity: quote.quantity,
    unitPrice: quote.unitPrice.toFixed(2),
    currency: quote.currency,
    shippingCost: quote.shippingCost?.toFixed(2) || null,
    moq: quote.moq,
    leadTime: quote.leadTime,
    includeShipping: quote.includeShipping,
    quoteText: quote.quoteText,
    createdBy: quote.createdBy,
    createdAt: quote.createdAt.toISOString(),
    riskWarnings: [],
    followUpPrompt: "报价已保存到客户记录。是否设置跟进提醒？"
  };
}

function buildQuoteText(input: {
  product: ProductDetail;
  language: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  shippingCost: number | null;
  moq: number | null;
  leadTime: string | null;
  includeShipping: boolean;
  tiers: Array<{ quantity: number; unitPrice: number }>;
}) {
  if (input.language === "Spanish") return buildSpanishQuote(input);
  if (input.language === "Portuguese") return buildPortugueseQuote(input);
  if (input.language === "Arabic") return buildArabicQuote(input);
  return buildEnglishQuote(input);
}

function buildEnglishQuote(input: Parameters<typeof buildQuoteText>[0]) {
  const tierText =
    input.tiers.length > 0
      ? `\nTier price:\n${input.tiers
          .map((tier) => `- ${tier.quantity} pcs: ${input.currency} ${money(tier.unitPrice)} / pc`)
          .join("\n")}`
      : "";
  const shipping =
    input.shippingCost === null
      ? "Shipping cost: to be confirmed based on destination city and shipping method."
      : `Shipping cost: ${input.currency} ${money(input.shippingCost)}${
          input.includeShipping ? " (included in total offer)" : " (not included in unit price)"
        }.`;
  return [
    `Hi, here is the quotation for ${input.product.name} (${input.product.sku}):`,
    `Quantity: ${input.quantity} pcs`,
    `Unit price: ${input.currency} ${money(input.unitPrice)} / pc`,
    input.moq ? `MOQ: ${input.moq} pcs` : "MOQ: to be confirmed",
    shipping,
    input.leadTime ? `Lead time: ${input.leadTime}` : "Lead time: to be confirmed",
    tierText,
    "Please confirm your destination country, city, and preferred shipping method before final confirmation.",
    "This is a draft quotation. We will confirm price, stock, lead time, and shipping before sending the final offer."
  ]
    .filter(Boolean)
    .join("\n");
}

function buildSpanishQuote(input: Parameters<typeof buildQuoteText>[0]) {
  return buildEnglishQuote(input)
    .replace("Hi, here is the quotation for", "Hola, esta es la cotizacion para")
    .replace("Quantity:", "Cantidad:")
    .replace("Unit price:", "Precio unitario:")
    .replace("Shipping cost:", "Costo de envio:")
    .replace("Lead time:", "Plazo de entrega:")
    .replace("Tier price:", "Precios por cantidad:")
    .replace(
      "Please confirm your destination country, city, and preferred shipping method before final confirmation.",
      "Por favor confirma el pais, la ciudad de destino y el metodo de envio antes de la confirmacion final."
    )
    .replace(
      "This is a draft quotation. We will confirm price, stock, lead time, and shipping before sending the final offer.",
      "Esta es una cotizacion en borrador. Confirmaremos precio, stock, plazo de entrega y envio antes de enviar la oferta final."
    );
}

function buildPortugueseQuote(input: Parameters<typeof buildQuoteText>[0]) {
  return buildEnglishQuote(input)
    .replace("Hi, here is the quotation for", "Ola, segue a cotacao para")
    .replace("Quantity:", "Quantidade:")
    .replace("Unit price:", "Preco unitario:")
    .replace("Shipping cost:", "Frete:")
    .replace("Lead time:", "Prazo de producao:")
    .replace("Tier price:", "Preco por quantidade:")
    .replace(
      "Please confirm your destination country, city, and preferred shipping method before final confirmation.",
      "Por favor confirme o pais, a cidade de destino e o metodo de envio antes da confirmacao final."
    )
    .replace(
      "This is a draft quotation. We will confirm price, stock, lead time, and shipping before sending the final offer.",
      "Esta e uma cotacao em rascunho. Vamos confirmar preco, estoque, prazo e frete antes de enviar a oferta final."
    );
}

function buildArabicQuote(input: Parameters<typeof buildQuoteText>[0]) {
  return buildEnglishQuote(input);
}

function buildRiskWarnings(
  input: QuoteInput,
  product: ProductDetail,
  unitPrice: number,
  shippingCost: number | null,
  quoteText: string
) {
  const warnings = [AI_SAFETY_NOTE, QUOTE_DRAFT_NOTE, NO_AUTO_SEND_NOTE, INVENTORY_NOT_MODELED_NOTE, NO_FABRICATION_NOTE];
  const minPrice = product.minPrice ? Number(product.minPrice) : null;
  if (minPrice !== null && unitPrice < minPrice) warnings.push("当前报价低于最低价，请确认");
  if (shippingCost === null) warnings.push("未填写运费，请确认客户国家、城市和物流方式");
  if (!cleanString(input.leadTime) && !product.leadTime) warnings.push("未填写交期，请确认后再发送");
  if (input.promiseStock && !input.stockKnown) warnings.push("文案承诺现货但库存未知，请先确认库存。");
  if (quoteText.toLowerCase().includes("attached") && !input.attachmentSelected) {
    warnings.push("文案中出现 attached，但未选择附件，请删除该表述或先确认附件。");
  }
  return Array.from(new Set(warnings));
}

function normalizeTiers(tiers?: QuoteInput["tiers"]) {
  return (tiers || [])
    .filter((tier) => isPositiveNumber(tier.quantity) && isPositiveNumber(tier.unitPrice))
    .map((tier) => ({ quantity: Number(tier.quantity), unitPrice: Number(tier.unitPrice) }))
    .sort((a, b) => a.quantity - b.quantity);
}

function normalizeLanguage(value: string) {
  const text = value.toLowerCase();
  if (text.includes("spanish") || text.includes("es")) return "Spanish";
  if (text.includes("portuguese") || text.includes("pt")) return "Portuguese";
  if (text.includes("arabic") || text.includes("ar")) return "Arabic";
  return "English";
}

function isPositiveNumber(value: unknown) {
  return value !== undefined && value !== null && value !== "" && Number(value) > 0;
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function money(value: number) {
  return value.toFixed(2);
}

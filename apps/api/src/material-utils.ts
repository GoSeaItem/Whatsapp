import {
  AI_SAFETY_NOTE,
  MATERIAL_LANGUAGES,
  MATERIAL_TYPES,
  type MaterialDetail,
  type MaterialIntroRequest,
  type MaterialIntroResponse,
  type MaterialLanguage,
  type MaterialType,
  type MaterialUpsertRequest
} from "@wa-ai/shared";
import { noKnowledgeWarning, type KnowledgeContextItem } from "./knowledge-base-utils.js";
import { normalizeList } from "./product-utils.js";

type RawMaterial = {
  id: string;
  title: string;
  type: string;
  url: string;
  description: string | null;
  language: string;
  productId: string | null;
  tags: string[];
  ownerId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const materialTypeSet = new Set<string>(MATERIAL_TYPES);
const materialLanguageSet = new Set<string>(MATERIAL_LANGUAGES);

export function serializeMaterial(material: RawMaterial): MaterialDetail {
  return {
    id: material.id,
    title: material.title,
    type: normalizeMaterialType(material.type),
    url: material.url,
    description: material.description,
    language: normalizeMaterialLanguage(material.language),
    productId: material.productId,
    tags: material.tags,
    ownerId: material.ownerId || null,
    createdAt: material.createdAt.toISOString(),
    updatedAt: material.updatedAt.toISOString()
  };
}

export function validateMaterialPayload(input: Partial<MaterialUpsertRequest>, options: { partial?: boolean } = {}) {
  const errors: Array<{ field: string; message: string }> = [];
  const title = cleanString(input.title);
  const type = cleanString(input.type);
  const url = cleanString(input.url);
  const language = input.language === null ? "" : cleanString(input.language);

  if (!options.partial && !title) errors.push({ field: "title", message: "title is required" });
  if (options.partial && input.title !== undefined && !title) errors.push({ field: "title", message: "title is required" });
  if (!options.partial && !type) errors.push({ field: "type", message: "type is required" });
  if (type && !materialTypeSet.has(type)) errors.push({ field: "type", message: "unsupported type" });
  if (!options.partial && !url) errors.push({ field: "url", message: "url is required" });
  if (options.partial && input.url !== undefined && !url) errors.push({ field: "url", message: "url is required" });
  if (url && !isSafeUrl(url)) errors.push({ field: "url", message: "url must start with http:// or https://" });
  if (language && !materialLanguageSet.has(language)) errors.push({ field: "language", message: "unsupported language" });
  if (title.length > 160) errors.push({ field: "title", message: "title must be 160 characters or less" });
  if (cleanString(input.description).length > 2000) errors.push({ field: "description", message: "description must be 2000 characters or less" });
  if (normalizeList(input.tags).length > 30) errors.push({ field: "tags", message: "tags can contain at most 30 items" });

  return errors;
}

export function toMaterialCreateData(input: MaterialUpsertRequest) {
  return {
    title: cleanString(input.title),
    type: normalizeMaterialType(input.type),
    url: cleanString(input.url),
    description: nullableString(input.description),
    language: normalizeMaterialLanguage(input.language || "other"),
    productId: nullableString(input.productId),
    tags: normalizeList(input.tags)
  };
}

export function toMaterialUpdateData(input: Partial<MaterialUpsertRequest>) {
  const data: Record<string, unknown> = {};
  if (input.title !== undefined) data.title = cleanString(input.title);
  if (input.type !== undefined) data.type = normalizeMaterialType(input.type);
  if (input.url !== undefined) data.url = cleanString(input.url);
  if (input.description !== undefined) data.description = nullableString(input.description);
  if (input.language !== undefined) data.language = normalizeMaterialLanguage(input.language || "other");
  if (input.productId !== undefined) data.productId = nullableString(input.productId);
  if (input.tags !== undefined) data.tags = normalizeList(input.tags);
  return data;
}

export function generateMaterialIntro(
  material: MaterialDetail,
  input: MaterialIntroRequest = {},
  knowledgeItems: KnowledgeContextItem[] = []
): MaterialIntroResponse {
  const language = normalizeCustomerLanguage(input.customerLanguage || material.language || "en");
  const knowledgeUsed = knowledgeItems.map((item) => item.title);
  return {
    materialId: material.id,
    introText: withKnowledgeLine(buildIntroText(material, language, input.productContext || ""), knowledgeUsed),
    riskWarnings: buildMaterialWarnings(material, knowledgeItems),
    knowledgeUsed
  };
}

function buildIntroText(material: MaterialDetail, language: "English" | "Spanish" | "Chinese", productContext: string) {
  const context = productContext.trim();
  if (language === "Spanish") {
    const base = spanishMaterialLine(material);
    return `${base} Puedes revisar este enlace: ${material.url}.${context ? " Tambien confirmare los detalles del producto antes de enviarlo." : ""} Es solo un borrador; revisare la informacion antes de enviarla.`;
  }
  if (language === "Chinese") {
    return `${chineseMaterialLine(material)}链接：${material.url}。${context ? "我会结合产品信息确认后再发送。" : ""}这只是草稿，请确认素材和关键信息后再发送。`;
  }
  return `${englishMaterialLine(material)} You can check it here: ${material.url}.${context ? " I will also confirm the product details before sending it." : ""} This is only a draft; I will verify the material and key details before sending.`;
}

function englishMaterialLine(material: MaterialDetail) {
  const name = material.title;
  const map: Record<MaterialType, string> = {
    image: `Here are real product pictures for ${name}.`,
    buyer_show: `Here are buyer show/reference pictures for ${name}.`,
    video: `Here is a product display video for ${name}.`,
    factory_video: `Here is a factory or production reference video for ${name}.`,
    catalog: `Here is the product catalog for ${name}; you can review more styles.`,
    size_chart: `Here is the size chart for ${name}; please confirm the size before ordering.`,
    certificate: `Here is the certificate or qualification material for ${name}; please review it, and I will verify the details before making any promise.`,
    shipping_proof: `Here is shipping/logistics reference material for ${name}; it does not guarantee a specific delivery time.`,
    payment_proof: `Here is payment or receiving-account reference material for ${name}; I will confirm the receiving account before sending final details.`,
    other: `Here is reference material for ${name}.`
  };
  return map[material.type] || map.other;
}

function spanishMaterialLine(material: MaterialDetail) {
  const name = material.title;
  const map: Record<MaterialType, string> = {
    image: `Te comparto fotos reales del producto ${name}.`,
    buyer_show: `Te comparto fotos de referencia de compradores para ${name}.`,
    video: `Te comparto un video de muestra del producto ${name}.`,
    factory_video: `Te comparto un video de fabrica o produccion para ${name}.`,
    catalog: `Te comparto el catalogo de ${name}; puedes revisar mas modelos.`,
    size_chart: `Te comparto la tabla de tallas de ${name}; por favor confirma la talla antes de ordenar.`,
    certificate: `Te comparto el certificado o material de calificacion de ${name}; revisare los detalles antes de prometer algo.`,
    shipping_proof: `Te comparto una referencia de envio/logistica de ${name}; no garantiza un tiempo exacto de entrega.`,
    payment_proof: `Te comparto una referencia de pago o cuenta receptora de ${name}; confirmare la cuenta antes de enviar detalles finales.`,
    other: `Te comparto material de referencia de ${name}.`
  };
  return map[material.type] || map.other;
}

function chineseMaterialLine(material: MaterialDetail) {
  const name = material.title;
  const map: Record<MaterialType, string> = {
    image: `这是 ${name} 的实拍图/产品图片。`,
    buyer_show: `这是 ${name} 的买家秀/真实效果参考。`,
    video: `这是 ${name} 的产品展示视频。`,
    factory_video: `这是 ${name} 的工厂或生产参考视频。`,
    catalog: `这是 ${name} 的产品目录，可查看更多款式。`,
    size_chart: `这是 ${name} 的尺码表，请先确认尺码。`,
    certificate: `这是 ${name} 的证书/资质材料，发送前我会确认资料细节。`,
    shipping_proof: `这是 ${name} 的发货/物流参考，不承诺具体时效。`,
    payment_proof: `这是 ${name} 的付款/收款说明材料，发送前必须确认收款账户。`,
    other: `这是 ${name} 的参考素材。`
  };
  return map[material.type] || map.other;
}

function buildMaterialWarnings(material: MaterialDetail, knowledgeItems: KnowledgeContextItem[]) {
  const warnings = [
    AI_SAFETY_NOTE,
    "素材说明仅作为草稿，不会自动发送 WhatsApp 消息。",
    "不允许系统编造价格、库存、交期、证书真实性、物流时效、付款账户或售后承诺。",
    "不得承诺 100% 到货，不得承诺所有订单免费退换。"
  ];
  if (knowledgeItems.length === 0) warnings.push(noKnowledgeWarning());
  if (material.type === "payment_proof") warnings.push("付款/收款素材必须由业务员确认收款账户、付款方式和手续费后再发送。");
  if (material.type === "shipping_proof") warnings.push("物流素材仅作参考，请业务员确认物流方式、目的地和时效后再发送。");
  if (material.type === "certificate") warnings.push("证书/资质材料真实性必须由业务员确认，不得编造认证范围或有效期。");
  return warnings;
}

function withKnowledgeLine(text: string, knowledgeUsed: string[]) {
  if (knowledgeUsed.length === 0) return text;
  return `${text}\nReference checked: ${knowledgeUsed.join(", ")}. Please confirm the material, product details, price, stock, lead time, logistics, payment, and after-sales promise before sending.`;
}

function normalizeCustomerLanguage(value: string) {
  const text = value.toLowerCase();
  if (text.includes("spanish") || text === "es") return "Spanish";
  if (text.includes("chinese") || text === "zh") return "Chinese";
  return "English";
}

function normalizeMaterialType(value: unknown): MaterialType {
  const text = cleanString(value);
  return materialTypeSet.has(text) ? (text as MaterialType) : "other";
}

function normalizeMaterialLanguage(value: unknown): MaterialLanguage {
  const text = cleanString(value) || "other";
  return materialLanguageSet.has(text) ? (text as MaterialLanguage) : "other";
}

function isSafeUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function nullableString(value: unknown) {
  return cleanString(value) || null;
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

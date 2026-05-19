export type QuoteStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED";
export type FollowUpStatus = "pending" | "completed" | "cancelled";
export type FollowUpTaskType = "报价后跟进" | "催付款" | "样品反馈" | "老客户复购" | "售后跟进" | "普通提醒";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = LoginRequest & {
  name: string;
};

export type AuthResponse = {
  user: AuthUser;
};

export const AI_SAFETY_NOTE = "AI 仅生成建议内容，请确认价格、库存、交期、付款、退款信息后再发送。";

export const PRODUCT_BOUNDARIES = [
  "不接入 WhatsApp 官方 API",
  "不自动群发消息",
  "不自动发送 WhatsApp 消息",
  "不模拟用户批量轰炸陌生号码",
  "不绕过 WhatsApp 风控",
  "AI 只生成草稿，最终由业务员手动确认发送",
  "价格、库存、交期、付款、退款信息必须由业务员确认",
  "信息不足时先询问客户，不得编造"
] as const;

export const V1_FEATURE_SCOPE = [
  "WhatsApp Web 侧边栏",
  "Desktop 复制粘贴模式",
  "AI 多语言回复",
  "翻译助手",
  "快捷话术库",
  "聊天摘要",
  "客户标签 / 销售阶段",
  "跟进提醒",
  "产品资料库",
  "报价助手"
] as const;

export const DEFAULT_CUSTOMER_TAGS = [
  "新客户",
  "高意向",
  "已报价",
  "待付款",
  "已成交",
  "售后中",
  "老客户",
  "无效客户",
  "需要跟进"
] as const;

export const DEFAULT_CUSTOMER_STAGES = [
  "新线索",
  "已沟通需求",
  "已推荐产品",
  "已报价",
  "待付款",
  "已成交",
  "待复购",
  "无效客户"
] as const;

export type CustomerSummary = {
  id: string;
  name: string;
  whatsappNumber?: string | null;
  country?: string | null;
  language?: string | null;
  tags: string[];
  stage: string;
  interestedProduct?: string | null;
  latestSummary?: string | null;
  nextFollowUpAt?: string | null;
  ownerId?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CustomerDetail = CustomerSummary;
export type CustomerListQuery = { tag?: string; stage?: string; q?: string };

export type CustomerUpsertRequest = {
  name: string;
  whatsappNumber?: string | null;
  country?: string | null;
  language?: string | null;
  tags?: string[];
  stage?: string | null;
  interestedProduct?: string | null;
  latestSummary?: string | null;
  nextFollowUpAt?: string | null;
  notes?: string | null;
};

export type CustomerValidationError = { field: string; message: string };

export type ProductSummary = {
  id: string;
  name: string;
  sku: string;
  category?: string | null;
  images: string[];
  videos: string[];
  colors: string[];
  sizes: string[];
  material?: string | null;
  moq?: number | null;
  suggestedPrice?: string | null;
  minPrice?: string | null;
  leadTime?: string | null;
  sellingPoints: string[];
  introEn?: string | null;
  introEs?: string | null;
  introPt?: string | null;
  introAr?: string | null;
  ownerId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductDetail = ProductSummary;
export type ProductListQuery = { q?: string; category?: string };

export type ProductUpsertRequest = {
  name: string;
  sku: string;
  category?: string | null;
  images?: string[];
  videos?: string[];
  colors?: string[];
  sizes?: string[];
  material?: string | null;
  moq?: number | null;
  suggestedPrice?: number | string | null;
  minPrice?: number | string | null;
  leadTime?: string | null;
  sellingPoints?: string[];
  introEn?: string | null;
  introEs?: string | null;
  introPt?: string | null;
  introAr?: string | null;
};

export type ProductIntroRequest = {
  targetLanguage?: string;
  customerMessage?: string;
};

export type ProductIntroResponse = {
  productId: string;
  language: string;
  intro: string;
  source: "stored" | "generated";
  copyReminder: string;
  riskWarnings: string[];
};

export type QuoteTierInput = {
  quantity: number;
  unitPrice: number | string;
};

export type QuoteGenerateRequest = {
  customerId?: string | null;
  productId: string;
  quantity: number;
  unitPrice: number | string;
  currency: string;
  shippingCost?: number | string | null;
  moq?: number | null;
  leadTime?: string | null;
  includeShipping?: boolean;
  targetLanguage?: string | null;
  tiers?: QuoteTierInput[];
  createdBy?: string | null;
  stockKnown?: boolean;
  promiseStock?: boolean;
  attachmentSelected?: boolean;
};

export type QuoteSaveRequest = QuoteGenerateRequest & {
  customerId: string;
  quoteText?: string;
};

export type QuoteResponse = {
  id?: string;
  customerId?: string | null;
  productId: string;
  quantity: number;
  unitPrice: string;
  currency: string;
  shippingCost?: string | null;
  moq?: number | null;
  leadTime?: string | null;
  includeShipping: boolean;
  quoteText: string;
  createdBy?: string | null;
  createdAt?: string;
  riskWarnings: string[];
  followUpPrompt: string;
};

export type FollowUpSummary = {
  id: string;
  customerId: string;
  customerName: string;
  whatsappNumber?: string | null;
  tags: string[];
  stage: string;
  taskType: FollowUpTaskType;
  remindAt: string;
  recommendedScript: string;
  status: FollowUpStatus;
  ownerId?: string | null;
  createdAt: string;
  completedAt?: string | null;
};

export type FollowUpDetail = FollowUpSummary;

export type FollowUpUpsertRequest = {
  customerId: string;
  taskType: FollowUpTaskType;
  remindAt: string;
  recommendedScript?: string | null;
  status?: FollowUpStatus;
};

export type FollowUpListQuery = {
  customerId?: string;
  status?: FollowUpStatus;
  scope?: "today" | "overdue" | "future" | "pending";
};

export type WorkbenchDashboard = {
  today: FollowUpSummary[];
  overdue: FollowUpSummary[];
  future: FollowUpSummary[];
  quotedWithoutFollowUp: CustomerSummary[];
  highIntent: CustomerSummary[];
  recentCustomers: CustomerSummary[];
};

export type DraftIntent = "reply" | "translate" | "quote";

export type GenerateDraftRequest = {
  customerId?: string;
  sourceText: string;
  intent: DraftIntent;
  tone?: "friendly" | "professional" | "concise";
  languageFrom?: string;
  languageTo?: string;
};

export type GenerateDraftResponse = {
  draft: string;
  safetyNote: string;
};

export type AiReplyScenario =
  | "price"
  | "moq"
  | "shipping"
  | "discount"
  | "sample"
  | "lead_time"
  | "product_proof"
  | "follow_up"
  | "payment"
  | "order_status";

export type AiReplyRequest = {
  customerMessage: string;
  targetLanguage?: string;
  scenario?: AiReplyScenario;
  productContext?: string;
};

export type AiReplyResponse = {
  translationZh: string;
  scenario: AiReplyScenario;
  intent: string;
  concerns: string[];
  shortReply: string;
  professionalReply: string;
  closingReply: string;
  riskWarnings: string[];
};

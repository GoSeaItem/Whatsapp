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
  email?: string | null;
  socialLinks?: string[];
  country?: string | null;
  language?: string | null;
  tags: string[];
  stage: string;
  interestedProduct?: string | null;
  latestSummary?: string | null;
  nextFollowUpAt?: string | null;
  ownerId?: string | null;
  organizationId?: string | null;
  assignedTo?: string | null;
  collaborators?: string[];
  notes?: string | null;
  intentScore?: number;
  intentLevel?: IntentLevel;
  recommendedAction?: string;
  createdAt: string;
  updatedAt: string;
};

export type CustomerAssignmentLogSummary = {
  id: string;
  customerId: string;
  organizationId: string;
  fromUserId?: string | null;
  toUserId?: string | null;
  operatedBy: string;
  note?: string | null;
  createdAt: string;
};

export type CustomerDetail = CustomerSummary & {
  assignmentLogs?: CustomerAssignmentLogSummary[];
};
export type CustomerListQuery = { tag?: string; stage?: string; q?: string; sort?: "intentScore" | ""; intentLevel?: IntentLevel | ""; organizationId?: string };

export type CustomerDuplicateCheckRequest = Partial<CustomerUpsertRequest> & {
  customerId?: string | null;
};

export type CustomerDuplicateMatch = {
  customerId: string;
  name: string;
  ownerId?: string | null;
  assignedTo?: string | null;
  organizationId?: string | null;
  matchedFields: string[];
};

export type CustomerDuplicateCheckResponse = {
  hasDuplicate: boolean;
  matches: CustomerDuplicateMatch[];
};

export type IntentLevel = "low" | "medium" | "high";

export type CustomerIntentResponse = {
  customerId: string;
  intentScore: number;
  intentLevel: IntentLevel;
  intentReasons: string[];
  recommendedAction: string;
  riskWarnings: string[];
};

export type CustomerUpsertRequest = {
  name: string;
  whatsappNumber?: string | null;
  email?: string | null;
  socialLinks?: string[];
  organizationId?: string | null;
  assignedTo?: string | null;
  collaborators?: string[];
  country?: string | null;
  language?: string | null;
  tags?: string[];
  stage?: string | null;
  interestedProduct?: string | null;
  latestSummary?: string | null;
  nextFollowUpAt?: string | null;
  notes?: string | null;
};

export type CustomerAssignRequest = {
  assignedTo: string;
  note?: string | null;
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

export type OrganizationProductSummary = {
  id: string;
  organizationId: string;
  productId: string;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  product: ProductSummary;
};

export type OrganizationProductDetail = OrganizationProductSummary;

export type OrganizationProductListQuery = {
  organizationId: string;
  q?: string;
  category?: string;
};

export type OrganizationProductCreateRequest = {
  organizationId: string;
  productId: string;
};

export type ProductIntroRequest = {
  targetLanguage?: string;
  customerMessage?: string;
  useKnowledgeBase?: boolean;
};

export type ProductIntroResponse = {
  productId: string;
  language: string;
  intro: string;
  source: "stored" | "generated";
  copyReminder: string;
  riskWarnings: string[];
  knowledgeUsed?: string[];
};

export const MATERIAL_TYPES = [
  "image",
  "video",
  "catalog",
  "size_chart",
  "buyer_show",
  "factory_video",
  "shipping_proof",
  "payment_proof",
  "certificate",
  "other"
] as const;

export type MaterialType = typeof MATERIAL_TYPES[number];

export const MATERIAL_LANGUAGES = ["zh", "en", "es", "pt", "ar", "fr", "ru", "other"] as const;

export type MaterialLanguage = typeof MATERIAL_LANGUAGES[number];

export type MaterialSummary = {
  id: string;
  title: string;
  type: MaterialType;
  url: string;
  description?: string | null;
  language: MaterialLanguage;
  productId?: string | null;
  tags: string[];
  ownerId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MaterialDetail = MaterialSummary;

export type MaterialListQuery = {
  q?: string;
  type?: MaterialType | "";
  language?: MaterialLanguage | "";
  productId?: string;
  tag?: string;
};

export type MaterialUpsertRequest = {
  title: string;
  type: MaterialType;
  url: string;
  description?: string | null;
  language?: MaterialLanguage | null;
  productId?: string | null;
  tags?: string[];
};

export type OrganizationMaterialSummary = {
  id: string;
  organizationId: string;
  materialId: string;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  material: MaterialSummary;
};

export type OrganizationMaterialDetail = OrganizationMaterialSummary;

export type OrganizationMaterialListQuery = {
  organizationId: string;
  q?: string;
  type?: MaterialType | "";
  productSku?: string;
};

export type OrganizationMaterialCreateRequest = {
  organizationId: string;
  materialId: string;
};

export type MaterialIntroRequest = {
  productContext?: string | null;
  customerLanguage?: string | null;
  scenario?: string | null;
  useKnowledgeBase?: boolean;
};

export type MaterialIntroResponse = {
  materialId: string;
  introText: string;
  riskWarnings: string[];
  knowledgeUsed?: string[];
};

export type QuoteTierInput = {
  quantity: number;
  unitPrice: number | string;
};

export type QuoteGenerateRequest = {
  customerId?: string | null;
  productId: string;
  organizationId?: string | null;
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
  useKnowledgeBase?: boolean;
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
  knowledgeUsed?: string[];
};

export const SAMPLE_PAYMENT_STATUSES = ["unpaid", "paid", "refunded", "deducted"] as const;
export type SamplePaymentStatus = typeof SAMPLE_PAYMENT_STATUSES[number];

export const SAMPLE_SHIPPING_STATUSES = ["pending", "preparing", "shipped", "delivered", "delayed"] as const;
export type SampleShippingStatus = typeof SAMPLE_SHIPPING_STATUSES[number];

export const SAMPLE_FEEDBACK_STATUSES = ["pending", "satisfied", "unsatisfied", "converted_to_bulk", "no_response"] as const;
export type SampleFeedbackStatus = typeof SAMPLE_FEEDBACK_STATUSES[number];

export const SAMPLE_SCRIPT_SCENARIOS = [
  "sample_quote",
  "sample_payment_reminder",
  "sample_shipped",
  "sample_feedback_follow_up",
  "sample_to_bulk_order"
] as const;
export type SampleScriptScenario = typeof SAMPLE_SCRIPT_SCENARIOS[number];

export type SampleOrderSummary = {
  id: string;
  customerId: string;
  productId?: string | null;
  sampleName: string;
  sampleFee?: string | null;
  shippingCost?: string | null;
  currency: string;
  paymentStatus: SamplePaymentStatus;
  shippingStatus: SampleShippingStatus;
  trackingNumber?: string | null;
  feedbackStatus: SampleFeedbackStatus;
  expectedShipDate?: string | null;
  expectedDeliveryDate?: string | null;
  notes?: string | null;
  ownerId?: string | null;
  customerName?: string | null;
  productName?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SampleOrderDetail = SampleOrderSummary;

export type SampleOrderListQuery = {
  q?: string;
  customerId?: string;
  productId?: string;
  paymentStatus?: SamplePaymentStatus | "";
  shippingStatus?: SampleShippingStatus | "";
  feedbackStatus?: SampleFeedbackStatus | "";
};

export type SampleOrderUpsertRequest = {
  customerId: string;
  productId?: string | null;
  sampleName: string;
  sampleFee?: number | string | null;
  shippingCost?: number | string | null;
  currency?: string | null;
  paymentStatus?: SamplePaymentStatus;
  shippingStatus?: SampleShippingStatus;
  trackingNumber?: string | null;
  feedbackStatus?: SampleFeedbackStatus;
  expectedShipDate?: string | null;
  expectedDeliveryDate?: string | null;
  notes?: string | null;
};

export type SampleScriptRequest = {
  scenario: SampleScriptScenario;
  customerLanguage?: string | null;
  productContext?: string | null;
};

export type SampleScriptResponse = {
  sampleOrderId: string;
  scenario: SampleScriptScenario;
  scriptText: string;
  riskWarnings: string[];
  knowledgeUsed?: string[];
};

export const CUSTOM_REQUEST_TYPES = ["logo", "packaging", "color", "size", "material", "oem", "odm", "mixed", "other"] as const;
export type CustomRequestType = typeof CUSTOM_REQUEST_TYPES[number];

export const CUSTOM_REQUEST_STATUSES = [
  "draft",
  "waiting_customer_confirm",
  "sample_making",
  "sample_confirmed",
  "bulk_production",
  "closed",
  "cancelled"
] as const;
export type CustomRequestStatus = typeof CUSTOM_REQUEST_STATUSES[number];

export const CUSTOM_SCRIPT_SCENARIOS = [
  "custom_confirm",
  "custom_request_files",
  "custom_moq_explain",
  "custom_sample_fee",
  "custom_sample_lead_time",
  "custom_bulk_lead_time",
  "custom_risk_confirm"
] as const;
export type CustomScriptScenario = typeof CUSTOM_SCRIPT_SCENARIOS[number];

export type CustomRequestSummary = {
  id: string;
  customerId: string;
  productId?: string | null;
  requestType: CustomRequestType;
  logoRequired: boolean;
  packagingRequired: boolean;
  colorRequirement?: string | null;
  sizeRequirement?: string | null;
  materialRequirement?: string | null;
  quantity?: number | null;
  moq?: number | null;
  sampleFee?: string | null;
  sampleLeadTime?: string | null;
  bulkLeadTime?: string | null;
  files: string[];
  status: CustomRequestStatus;
  notes?: string | null;
  ownerId?: string | null;
  customerName?: string | null;
  productName?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CustomRequestDetail = CustomRequestSummary;

export type CustomRequestListQuery = {
  q?: string;
  customerId?: string;
  productId?: string;
  requestType?: CustomRequestType | "";
  status?: CustomRequestStatus | "";
};

export type CustomRequestUpsertRequest = {
  customerId: string;
  productId?: string | null;
  requestType: CustomRequestType;
  logoRequired?: boolean;
  packagingRequired?: boolean;
  colorRequirement?: string | null;
  sizeRequirement?: string | null;
  materialRequirement?: string | null;
  quantity?: number | string | null;
  moq?: number | string | null;
  sampleFee?: number | string | null;
  sampleLeadTime?: string | null;
  bulkLeadTime?: string | null;
  files?: string[];
  status?: CustomRequestStatus;
  notes?: string | null;
};

export type CustomScriptRequest = {
  scenario: CustomScriptScenario;
  customerLanguage?: string | null;
  productContext?: string | null;
};

export type CustomScriptResponse = {
  customRequestId: string;
  scenario: CustomScriptScenario;
  scriptText: string;
  riskWarnings: string[];
  knowledgeUsed?: string[];
};

export const ORGANIZATION_ROLES = ["owner", "manager", "sales", "support"] as const;
export type OrganizationRole = typeof ORGANIZATION_ROLES[number];

export const ORGANIZATION_MEMBER_STATUSES = ["active", "inactive"] as const;
export type OrganizationMemberStatus = typeof ORGANIZATION_MEMBER_STATUSES[number];

export type OrganizationMemberSummary = {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  status: OrganizationMemberStatus;
  userName?: string | null;
  userEmail?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationSummary = {
  id: string;
  name: string;
  ownerId: string;
  currentUserRole?: OrganizationRole | null;
  currentUserStatus?: OrganizationMemberStatus | null;
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationDetail = OrganizationSummary & {
  members: OrganizationMemberSummary[];
};

export type OrganizationUpsertRequest = {
  name: string;
};

export type OrganizationMemberUpsertRequest = {
  userId: string;
  role: OrganizationRole;
  status?: OrganizationMemberStatus;
};

export type OrganizationMemberUpdateRequest = {
  role?: OrganizationRole;
  status?: OrganizationMemberStatus;
};

export type RoleSummary = {
  id: string;
  organizationId: string;
  name: OrganizationRole;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type RoleUpsertRequest = {
  organizationId: string;
  name: OrganizationRole;
  description: string;
};

export type RoleUpdateRequest = {
  description?: string;
};

export type AuditLogAction = "create" | "update" | "delete";

export type AuditLogSummary = {
  id: string;
  organizationId?: string | null;
  userId?: string | null;
  actorId?: string | null;
  action: AuditLogAction | string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
  createdAt: string;
};

export type AuditLogDetail = AuditLogSummary;

export type AuditLogListQuery = {
  organizationId: string;
  entityType?: string;
  userId?: string;
  action?: AuditLogAction | "";
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
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

export type TeamDashboardKpis = {
  todayNewCustomers: number;
  todayFollowUpCustomers: number;
  overdueFollowUpCustomers: number;
  highIntentCustomers: number;
  quotedNoFollowUpCustomers: number;
};

export type TeamMemberKpi = {
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  role: OrganizationRole;
  status: OrganizationMemberStatus;
  customerCount: number;
  completedFollowUps: number;
  quoteCount: number;
};

export type TeamDashboardCustomer = {
  id: string;
  name: string;
  tags: string[];
  stage: string;
  assignedTo?: string | null;
  ownerId?: string | null;
  intentScore: number;
  intentLevel: IntentLevel;
  recommendedAction: string;
};

export type TeamDashboardSummary = {
  organizationId: string;
  generatedAt: string;
  kpis: TeamDashboardKpis;
  memberStats: TeamMemberKpi[];
  highIntentCustomers: TeamDashboardCustomer[];
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
  customerId?: string | null;
  productId?: string | null;
  organizationId?: string | null;
  useKnowledgeBase?: boolean;
  knowledgeContext?: string;
  knowledgeUsed?: string[];
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
  knowledgeUsed: string[];
};

export const KNOWLEDGE_BASE_CATEGORIES = [
  "company_intro",
  "product_selling_points",
  "logistics",
  "after_sales_policy",
  "quote_rules",
  "payment_methods",
  "forbidden_expressions",
  "faq"
] as const;

export type KnowledgeBaseCategory = typeof KNOWLEDGE_BASE_CATEGORIES[number];

export const KNOWLEDGE_BASE_LANGUAGES = ["zh", "en", "es", "pt", "ar", "fr", "ru", "other"] as const;

export type KnowledgeBaseLanguage = typeof KNOWLEDGE_BASE_LANGUAGES[number];

export type KnowledgeBaseSummary = {
  id: string;
  title: string;
  category: KnowledgeBaseCategory;
  content: string;
  language: KnowledgeBaseLanguage;
  productId?: string | null;
  enabled: boolean;
  ownerId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeBaseDetail = KnowledgeBaseSummary;

export type KnowledgeBaseListQuery = {
  category?: KnowledgeBaseCategory | "";
  language?: KnowledgeBaseLanguage | "";
  productId?: string;
  q?: string;
};

export type KnowledgeBaseUpsertRequest = {
  title: string;
  category: KnowledgeBaseCategory;
  content: string;
  language?: KnowledgeBaseLanguage | null;
  productId?: string | null;
  enabled?: boolean;
};

export type KnowledgeBaseOrgSummary = {
  id: string;
  organizationId: string;
  title: string;
  category: KnowledgeBaseCategory;
  content: string;
  language: KnowledgeBaseLanguage;
  enabled: boolean;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeBaseOrgDetail = KnowledgeBaseOrgSummary;

export type KnowledgeBaseOrgListQuery = {
  organizationId: string;
  category?: KnowledgeBaseCategory | "";
  language?: KnowledgeBaseLanguage | "";
  q?: string;
};

export type KnowledgeBaseOrgUpsertRequest = {
  organizationId: string;
  title: string;
  category: KnowledgeBaseCategory;
  content: string;
  language?: KnowledgeBaseLanguage | null;
  enabled?: boolean;
};

export const SCRIPT_ORG_CATEGORIES = [
  "price",
  "moq",
  "shipping",
  "discount",
  "sample",
  "payment",
  "follow_up",
  "product_intro",
  "quote",
  "after_sales",
  "custom",
  "general"
] as const;

export type ScriptOrgCategory = typeof SCRIPT_ORG_CATEGORIES[number];

export type ScriptOrgSummary = {
  id: string;
  organizationId: string;
  title: string;
  category: ScriptOrgCategory;
  content: string;
  language: KnowledgeBaseLanguage;
  enabled: boolean;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ScriptOrgDetail = ScriptOrgSummary;

export type ScriptOrgListQuery = {
  organizationId: string;
  category?: ScriptOrgCategory | "";
  language?: KnowledgeBaseLanguage | "";
  q?: string;
};

export type ScriptOrgUpsertRequest = {
  organizationId: string;
  title: string;
  category: ScriptOrgCategory;
  content: string;
  language?: KnowledgeBaseLanguage | null;
  enabled?: boolean;
};

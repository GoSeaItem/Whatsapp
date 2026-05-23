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

export const ORGANIZATION_IMPORT_EXPORT_TYPES = ["customer", "product", "material", "knowledge", "script"] as const;
export type OrganizationImportExportType = typeof ORGANIZATION_IMPORT_EXPORT_TYPES[number];

export const IMPORT_EXPORT_JOB_STATUSES = ["pending", "processing", "completed", "failed"] as const;
export type ImportExportJobStatus = typeof IMPORT_EXPORT_JOB_STATUSES[number];

export type OrganizationImportJobSummary = {
  id: string;
  organizationId: string;
  type: OrganizationImportExportType;
  filePath: string;
  dryRun: boolean;
  status: ImportExportJobStatus;
  result?: unknown;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationExportJobSummary = {
  id: string;
  organizationId: string;
  type: OrganizationImportExportType;
  filePath: string;
  status: ImportExportJobStatus;
  filters?: unknown;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationImportResult = {
  job: OrganizationImportJobSummary;
  result: {
    totalRows: number;
    successCount: number;
    failureCount: number;
    skippedCount: number;
    dryRun: boolean;
    errors: Array<{ row: number; field: string; message: string }>;
  };
};

export type OrganizationExportResult = {
  job: OrganizationExportJobSummary;
  downloadUrl: string;
};

export const REPORT_JOB_TYPES = ["customer_summary", "quote_summary", "followup_summary"] as const;
export type ReportJobType = typeof REPORT_JOB_TYPES[number];

export type ReportJobSummary = {
  id: string;
  organizationId: string;
  type: ReportJobType;
  filters?: unknown;
  status: ImportExportJobStatus;
  result?: unknown;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ReportGenerateRequest = {
  organizationId: string;
  type: ReportJobType;
  filters?: Record<string, unknown>;
};

export type ReportGenerateResponse = {
  job: ReportJobSummary;
};

export const PERMISSION_KEYS = [
  "organization.view",
  "organization.update",
  "organization.delete",
  "member.view",
  "member.invite",
  "member.updateRole",
  "member.disable",
  "member.remove",
  "customer.viewOwn",
  "customer.viewTeam",
  "customer.create",
  "customer.updateOwn",
  "customer.updateTeam",
  "customer.deleteOwn",
  "customer.deleteTeam",
  "customer.assign",
  "customer.transfer",
  "customer.export",
  "product.viewOwn",
  "product.viewOrg",
  "product.createOwn",
  "product.createOrg",
  "product.updateOwn",
  "product.updateOrg",
  "product.deleteOwn",
  "product.deleteOrg",
  "material.viewOwn",
  "material.viewOrg",
  "material.createOwn",
  "material.createOrg",
  "material.updateOwn",
  "material.updateOrg",
  "material.deleteOwn",
  "material.deleteOrg",
  "knowledge.viewOwn",
  "knowledge.viewOrg",
  "knowledge.createOwn",
  "knowledge.createOrg",
  "knowledge.updateOwn",
  "knowledge.updateOrg",
  "knowledge.deleteOwn",
  "knowledge.deleteOrg",
  "script.viewOrg",
  "script.createOrg",
  "script.updateOrg",
  "script.deleteOrg",
  "quote.viewOwn",
  "quote.viewTeam",
  "quote.create",
  "quote.updateOwn",
  "quote.updateTeam",
  "quote.deleteOwn",
  "quote.deleteTeam",
  "followup.viewOwn",
  "followup.viewTeam",
  "followup.create",
  "followup.updateOwn",
  "followup.updateTeam",
  "sample.viewOwn",
  "sample.viewTeam",
  "sample.create",
  "sample.updateOwn",
  "sample.updateTeam",
  "customRequest.viewOwn",
  "customRequest.viewTeam",
  "customRequest.create",
  "customRequest.updateOwn",
  "customRequest.updateTeam",
  "dashboard.viewOwn",
  "dashboard.viewTeam",
  "report.viewTeam",
  "report.export",
  "import.create",
  "export.create",
  "export.sensitiveFields",
  "audit.viewOwn",
  "audit.viewTeam",
  "audit.export",
  "ai.reply",
  "ai.nextAction",
  "ai.riskCheck",
  "ai.followupPlan",
  "ai.salesSummary",
  "ai.useOrgKnowledge",
  "ai.useOrgMaterial",
  "prediction.viewOwn",
  "prediction.viewTeam",
  "prediction.recalculateOwn",
  "prediction.recalculateTeam",
  "prediction.updateOwn",
  "prediction.updateTeam",
  "reorderReminder.viewOwn",
  "reorderReminder.viewTeam",
  "reorderReminder.create",
  "reorderReminder.updateOwn",
  "reorderReminder.updateTeam",
  "order.viewOwn",
  "order.viewTeam",
  "order.create",
  "order.updateOwn",
  "order.updateTeam",
  "order.deleteOwn",
  "order.deleteTeam",
  "ai.reorderScript",
  "ai.orderScript",
  "profit.viewOwn",
  "profit.viewTeam",
  "profit.editCost",
  "profit.confirmCost",
  "profit.deleteCost",
  "profit.export",
  "profit.aiReview",
  "reorder.viewOwn",
  "reorder.viewTeam",
  "reorder.recalculateOwn",
  "reorder.recalculateTeam",
  "reorder.createCampaignOwn",
  "reorder.createCampaignTeam",
  "reorder.updateCampaign",
  "reorder.deleteCampaign",
  "reorder.createTask",
  "reorder.generateScript",
  "reorder.managePlaybookOwn",
  "reorder.managePlaybookOrg",
  "afterSales.viewOwn",
  "afterSales.viewTeam",
  "afterSales.create",
  "afterSales.updateOwn",
  "afterSales.updateTeam",
  "afterSales.close",
  "afterSales.delete",
  "afterSales.assign",
  "afterSales.updateResponsibility",
  "afterSales.updateSolution",
  "afterSales.createTask",
  "afterSales.generateScript",
  "afterSales.export",
  "brand.view",
  "brand.create",
  "brand.update",
  "brand.archive",
  "brand.manageProducts",
  "brand.manageMaterials",
  "brand.manageKnowledge",
  "brand.manageScripts",
  "brand.manageRules",
  "brand.assignEntity",
  "brand.useInAI",
  "brand.export",
  "enterprise.organization.view",
  "enterprise.organization.manage",
  "enterprise.member.manage",
  "enterprise.role.manage",
  "enterprise.report.view",
  "enterprise.report.export",
  "enterprise.audit.view",
  "enterprise.brandContext.use",
  "v6.multichannel.view",
  "v6.multichannel.manage",
  "v6.conversation.view",
  "v6.conversation.log",
  "v6.interaction.view",
  "v6.interaction.log",
  "v6.aiUsage.view",
  "v6.intelligentOps.view"
] as const;
export type PermissionKey = typeof PERMISSION_KEYS[number];
export type SecurityRiskLevel = "low" | "medium" | "high";

export const ORGANIZATION_UNIT_TYPES = ["organization", "subsidiary", "branch"] as const;
export type OrganizationUnitType = typeof ORGANIZATION_UNIT_TYPES[number];

export const ENTERPRISE_ENTITY_STATUSES = ["active", "inactive", "archived"] as const;
export type EnterpriseEntityStatus = typeof ENTERPRISE_ENTITY_STATUSES[number];

export const V6_CHANNEL_TYPES = ["whatsapp", "telegram", "wechat", "email", "instagram", "other"] as const;
export type V6ChannelType = typeof V6_CHANNEL_TYPES[number];

export type MultiChannelCustomerSummary = {
  id: string;
  organizationId?: string | null;
  customerId?: string | null;
  primaryName: string;
  primaryChannel: V6ChannelType | string;
  whatsappNumber?: string | null;
  telegramHandle?: string | null;
  wechatId?: string | null;
  email?: string | null;
  phoneCountry?: string | null;
  phoneCountryCode?: string | null;
  preferredLanguage?: string | null;
  preferredCurrency?: string | null;
  brandId?: string | null;
  ownerId?: string | null;
  assignedTo?: string | null;
  tags: string[];
  metadata?: unknown;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type DepartmentSummary = {
  id: string;
  organizationId: string;
  parentId?: string | null;
  name: string;
  status: EnterpriseEntityStatus | string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type TeamSummary = {
  id: string;
  organizationId: string;
  departmentId?: string | null;
  name: string;
  status: EnterpriseEntityStatus | string;
  managerId?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type PermissionSummary = {
  id: string;
  organizationId?: string | null;
  key: string;
  name: string;
  description?: string | null;
  scope: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ConversationHistorySummary = {
  id: string;
  organizationId?: string | null;
  multiChannelCustomerId?: string | null;
  customerId?: string | null;
  channel: V6ChannelType | string;
  externalConversationId?: string | null;
  direction: "in" | "out" | "unknown" | string;
  senderRole: "customer" | "agent" | "system" | "unknown" | string;
  messageText?: string | null;
  language?: string | null;
  translatedText?: string | null;
  messageAt: string;
  metadata?: unknown;
  createdBy?: string | null;
  createdAt: string;
};

export type InteractionLogSummary = {
  id: string;
  organizationId?: string | null;
  multiChannelCustomerId?: string | null;
  customerId?: string | null;
  channel?: V6ChannelType | string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  summary?: string | null;
  metadata?: unknown;
  createdBy: string;
  createdAt: string;
};

export type AIKeyUsageLogSummary = {
  id: string;
  organizationId?: string | null;
  aiProviderKeyId?: string | null;
  provider?: string | null;
  mode?: "instant" | "thinking" | string | null;
  model?: string | null;
  requestSource?: string | null;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  success: boolean;
  errorMessage?: string | null;
  createdAt: string;
};

export type V6EnterpriseOverview = {
  organizationId: string;
  generatedAt: string;
  kpis: {
    multiChannelCustomers: number;
    conversationMessages: number;
    interactionLogs: number;
    aiKeyTokens: number;
    aiKeyCalls: number;
    activeTeams: number;
    activeDepartments: number;
  };
  safetyBoundaries: string[];
};

export type OrganizationUnitSummary = {
  id: string;
  organizationId: string;
  parentId?: string | null;
  name: string;
  type: OrganizationUnitType | string;
  status: EnterpriseEntityStatus | string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type EnterpriseRoleSummary = {
  id: string;
  organizationId: string;
  roleName: string;
  permissions: string[];
  description?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type EnterpriseAuditLogSummary = {
  id: string;
  organizationId?: string | null;
  organizationUnitId?: string | null;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: unknown;
  riskLevel: SecurityRiskLevel | string;
  createdAt: string;
};

export type EnterpriseReportSummary = {
  id: string;
  organizationId?: string | null;
  reportType: string;
  filters?: unknown;
  result?: unknown;
  status: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type EnterpriseBrandContextResponse = {
  organizationId: string;
  enterpriseContext?: unknown;
  brandUsed?: string | null;
  brandRulesUsed: string[];
  knowledgeUsed: string[];
  riskWarnings: string[];
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
  ipAddress?: string | null;
  userAgent?: string | null;
  riskLevel?: SecurityRiskLevel | string | null;
  createdAt: string;
};

export type AuditLogDetail = AuditLogSummary;

export type AuditLogListQuery = {
  organizationId: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: AuditLogAction | "";
  riskLevel?: SecurityRiskLevel | "";
  keyword?: string;
  from?: string;
  to?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
};

export type FollowUpSummary = {
  id: string;
  customerId: string;
  orderId?: string | null;
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
  orderId?: string | null;
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
  organizationId?: string | null;
  aiMode?: "instant" | "thinking";
  aiModel?: string | null;
  model?: string | null;
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
  aiMode?: "instant" | "thinking";
  aiModel?: string | null;
  model?: string | null;
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

export const AI_ADVANCED_ACTION_TYPES = [
  "next_action",
  "customer_summary",
  "sales_script",
  "risk_check",
  "followup_plan"
] as const;
export type AiAdvancedActionType = typeof AI_ADVANCED_ACTION_TYPES[number];

export const AI_ACTION_PRIORITIES = ["low", "medium", "high"] as const;
export type AiActionPriority = typeof AI_ACTION_PRIORITIES[number];

export const AI_RISK_LEVELS = ["low", "medium", "high"] as const;
export type AiRiskLevel = typeof AI_RISK_LEVELS[number];

export const AI_SALES_SCRIPT_SCENARIOS = [
  "first_reply",
  "price_reply",
  "quote_follow_up",
  "payment_reminder",
  "sample_quote",
  "sample_feedback_follow_up",
  "custom_confirm",
  "custom_request_files",
  "material_intro",
  "customer_thinks_about_it",
  "too_expensive",
  "shipping_explain",
  "after_sales_soothing",
  "old_customer_reorder",
  "delivery_delay_explain"
] as const;
export type AiSalesScriptScenario = typeof AI_SALES_SCRIPT_SCENARIOS[number];

export const AI_SALES_SCRIPT_TONES = ["short", "professional", "friendly", "closing"] as const;
export type AiSalesScriptTone = typeof AI_SALES_SCRIPT_TONES[number];

export const AI_FOLLOW_UP_PLAN_TYPES = [
  "quote_follow_up",
  "sample_follow_up",
  "custom_request_follow_up",
  "reorder",
  "general"
] as const;
export type AiFollowUpPlanType = typeof AI_FOLLOW_UP_PLAN_TYPES[number];

export type AiNextActionRequest = {
  customerId: string;
  scenario?: string | null;
  productId?: string | null;
  includeKnowledgeBase?: boolean;
  includeQuotes?: boolean;
  includeFollowUps?: boolean;
  includeSamples?: boolean;
  includeCustomRequests?: boolean;
};

export type AiNextActionResponse = {
  customerId: string;
  recommendedAction: string;
  reason: string;
  suggestedScript: string;
  actionPriority: AiActionPriority;
  relatedData: Record<string, unknown>;
  knowledgeUsed: string[];
  riskWarnings: string[];
  createdLogId?: string | null;
};

export type AiCustomerSalesSummaryRequest = {
  customerId: string;
  includeQuotes?: boolean;
  includeFollowUps?: boolean;
  includeSamples?: boolean;
  includeCustomRequests?: boolean;
  includeIntentScore?: boolean;
};

export type AiCustomerSalesSummaryResponse = {
  customerNeed: string;
  interestedProducts: string[];
  quantity: string;
  countryOrCity: string;
  budgetSensitivity: string;
  quotedStatus: string;
  shippingAsked: boolean;
  paymentAsked: boolean;
  sampleStatus: string;
  customRequestStatus: string;
  currentBlocker: string;
  nextBestAction: string;
  summaryText: string;
  riskWarnings: string[];
  createdLogId?: string | null;
};

export type AiSalesScriptRequest = {
  customerId?: string | null;
  productId?: string | null;
  materialId?: string | null;
  quoteId?: string | null;
  sampleOrderId?: string | null;
  customRequestId?: string | null;
  scenario: AiSalesScriptScenario;
  targetLanguage?: string | null;
  tone?: AiSalesScriptTone | null;
  extraContext?: string | null;
};

export type AiSalesScriptResponse = {
  scriptText: string;
  alternativeScripts?: string[];
  knowledgeUsed: string[];
  riskWarnings: string[];
  missingInfo: string[];
  createdLogId?: string | null;
};

export type AiRiskCheckRequest = {
  customerId?: string | null;
  text: string;
  targetLanguage?: string | null;
  scenario?: string | null;
};

export type AiRiskCheckResponse = {
  riskLevel: AiRiskLevel;
  riskWarnings: string[];
  riskyPhrases: string[];
  rewriteSuggestion: string;
  safeVersion: string;
  createdLogId?: string | null;
};

export type AiFollowUpPlanRequest = {
  customerId: string;
  days?: number;
  planType?: AiFollowUpPlanType | null;
  createTasks?: boolean;
};

export type AiFollowUpPlanItem = {
  dayOffset: number;
  taskType: string;
  suggestedMessage: string;
  reason: string;
  riskWarnings: string[];
};

export type AiFollowUpPlanResponse = {
  plan: AiFollowUpPlanItem[];
  canCreateTasks: boolean;
  createdTasks?: FollowUpSummary[];
  createdLogId?: string | null;
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

export type PredictionType = "reorder" | "dormant" | "high_value" | "churn_risk" | "product_opportunity";
export type PredictionStatus = "open" | "dismissed" | "converted" | "task_created";
export type ReorderReminderType = "reorder" | "dormant_reactivation" | "product_recommendation";
export type ReorderReminderStatus = "pending" | "completed" | "dismissed" | "converted";

export type CustomerPredictionSummary = {
  id: string;
  organizationId?: string | null;
  customerId: string;
  customerName: string;
  assignedTo?: string | null;
  predictionType: PredictionType | string;
  score: number;
  level: IntentLevel;
  reasons: string[];
  recommendedAction?: string | null;
  suggestedScript?: string | null;
  status: PredictionStatus | string;
  createdAt: string;
  updatedAt: string;
};

export type CustomerPredictionListQuery = {
  predictionType?: string;
  level?: string;
  status?: string;
  assignedTo?: string;
  organizationId?: string;
  page?: string;
  pageSize?: string;
};

export type CustomerPredictionRecalculateRequest = {
  customerId?: string | null;
  organizationId?: string | null;
  predictionTypes?: PredictionType[];
};

export type CustomerPredictionRecalculateResponse = {
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errors: Array<{ customerId?: string; message: string }>;
};

export type ReorderReminderSummary = {
  id: string;
  organizationId?: string | null;
  customerId: string;
  customerName: string;
  productId?: string | null;
  productName?: string | null;
  reminderType: ReorderReminderType | string;
  remindAt: string;
  reason?: string | null;
  suggestedScript?: string | null;
  status: ReorderReminderStatus | string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
};

export type ReorderReminderListQuery = {
  status?: string;
  reminderType?: string;
  remindAtFrom?: string;
  remindAtTo?: string;
  assignedTo?: string;
  organizationId?: string;
  page?: string;
  pageSize?: string;
};

export type ReorderReminderUpsertRequest = {
  customerId: string;
  productId?: string | null;
  reminderType: ReorderReminderType | string;
  remindAt: string;
  reason?: string | null;
  suggestedScript?: string | null;
};

export type ReorderScriptRequest = {
  customerId: string;
  productId?: string | null;
  reminderType: "reorder" | "dormant_reactivation" | "product_recommendation" | "churn_risk_follow_up" | "high_value_follow_up";
  targetLanguage?: string | null;
  tone?: "short" | "professional" | "friendly" | "closing" | string;
};

export type ReorderScriptResponse = {
  scriptText: string;
  alternativeScripts: string[];
  riskWarnings: string[];
  missingInfo: string[];
  knowledgeUsed: string[];
  createdLogId?: string | null;
};

export const REORDER_OPERATION_TYPES = ["reorder", "dormant_reactivation", "new_product", "replenishment", "holiday", "high_value", "churn_risk"] as const;
export type ReorderOpportunityType = typeof REORDER_OPERATION_TYPES[number];

export const REORDER_OPPORTUNITY_STATUSES = ["open", "dismissed", "task_created", "contacted", "converted", "archived"] as const;
export type ReorderOpportunityStatus = typeof REORDER_OPPORTUNITY_STATUSES[number];

export const REORDER_CAMPAIGN_STATUSES = ["draft", "active", "paused", "completed", "archived"] as const;
export type ReorderCampaignStatus = typeof REORDER_CAMPAIGN_STATUSES[number];

export const REORDER_CAMPAIGN_SCOPES = ["own", "team", "organization"] as const;
export type ReorderCampaignScope = typeof REORDER_CAMPAIGN_SCOPES[number];

export const REORDER_OPERATION_SCRIPT_SCENARIOS = [
  "reorder_follow_up",
  "dormant_reactivation",
  "new_product_recommendation",
  "replenishment_check",
  "holiday_greeting",
  "high_value_customer_follow_up",
  "churn_risk_recovery"
] as const;
export type ReorderOperationScriptScenario = typeof REORDER_OPERATION_SCRIPT_SCENARIOS[number];

export type ReorderOpportunitySummary = {
  id: string;
  organizationId?: string | null;
  customerId: string;
  customerName: string;
  productId?: string | null;
  productName?: string | null;
  orderId?: string | null;
  campaignId?: string | null;
  opportunityType: ReorderOpportunityType | string;
  score: number;
  level: IntentLevel;
  reasons: string[];
  recommendedAction?: string | null;
  suggestedScript?: string | null;
  status: ReorderOpportunityStatus | string;
  ownerId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ReorderOpportunityListQuery = {
  organizationId?: string;
  opportunityType?: string;
  level?: string;
  status?: string;
  ownerId?: string;
  assignedTo?: string;
  productId?: string;
  campaignId?: string;
  customerId?: string;
  page?: string;
  pageSize?: string;
};

export type ReorderOpportunityRecalculateRequest = {
  customerId?: string | null;
  organizationId?: string | null;
  opportunityTypes?: ReorderOpportunityType[];
  onlyMyCustomers?: boolean;
};

export type ReorderOpportunityRecalculateResponse = {
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errors: Array<{ customerId?: string; message: string }>;
};

export type ReorderCampaignSummary = {
  id: string;
  organizationId?: string | null;
  name: string;
  campaignType: ReorderOpportunityType | string;
  targetScope: ReorderCampaignScope | string;
  status: ReorderCampaignStatus | string;
  filters?: unknown;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ReorderCampaignUpsertRequest = {
  organizationId?: string | null;
  name: string;
  campaignType: ReorderOpportunityType | string;
  targetScope: ReorderCampaignScope | string;
  status?: ReorderCampaignStatus | string;
  filters?: unknown;
};

export type ReorderPlaybookSummary = {
  id: string;
  organizationId?: string | null;
  title: string;
  scenario: ReorderOperationScriptScenario | string;
  language: string;
  content: string;
  enabled: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ReorderPlaybookUpsertRequest = {
  organizationId?: string | null;
  title: string;
  scenario: ReorderOperationScriptScenario | string;
  language: string;
  content: string;
  enabled?: boolean;
};

export type ReorderOperationScriptRequest = {
  customerId: string;
  productId?: string | null;
  opportunityId?: string | null;
  scenario: ReorderOperationScriptScenario | string;
  targetLanguage?: string | null;
  tone?: "short" | "professional" | "friendly" | "closing" | string;
};

export type ReorderOperationScriptResponse = ReorderScriptResponse;

export const AFTER_SALES_CASE_TYPES = ["quality_issue", "shipping_delay", "missing_item", "wrong_item", "refund_request", "return_request", "reship_request", "complaint", "other"] as const;
export type AfterSalesCaseType = typeof AFTER_SALES_CASE_TYPES[number];

export const AFTER_SALES_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type AfterSalesPriority = typeof AFTER_SALES_PRIORITIES[number];

export const AFTER_SALES_STATUSES = ["open", "waiting_customer", "waiting_internal", "processing", "resolved", "closed", "cancelled"] as const;
export type AfterSalesStatus = typeof AFTER_SALES_STATUSES[number];

export const AFTER_SALES_RESPONSIBILITIES = ["unknown", "company", "customer", "logistics", "supplier", "mixed"] as const;
export type AfterSalesResponsibility = typeof AFTER_SALES_RESPONSIBILITIES[number];

export const AFTER_SALES_SOLUTIONS = ["refund", "reship", "return", "discount", "replacement", "explanation", "no_compensation", "other"] as const;
export type AfterSalesSolution = typeof AFTER_SALES_SOLUTIONS[number];

export const AFTER_SALES_SCRIPT_SCENARIOS = [
  "ask_for_evidence",
  "apologize_and_acknowledge",
  "explain_shipping_delay",
  "explain_quality_check",
  "refund_policy_explain",
  "reship_arrangement",
  "solution_confirm",
  "follow_up_after_resolved",
  "calm_down_complaint",
  "request_internal_confirmation"
] as const;
export type AfterSalesScriptScenario = typeof AFTER_SALES_SCRIPT_SCENARIOS[number];

export type AfterSalesCaseSummary = {
  id: string;
  organizationId?: string | null;
  customerId: string;
  customerName?: string | null;
  orderId?: string | null;
  orderNo?: string | null;
  productId?: string | null;
  productName?: string | null;
  caseNo: string;
  caseType: AfterSalesCaseType | string;
  priority: AfterSalesPriority | string;
  status: AfterSalesStatus | string;
  responsibility?: AfterSalesResponsibility | string | null;
  requestedSolution?: AfterSalesSolution | string | null;
  finalSolution?: AfterSalesSolution | string | null;
  refundAmount?: string | null;
  reshipCost?: string | null;
  compensationAmount?: string | null;
  currency?: string | null;
  assignedTo?: string | null;
  ownerId: string;
  openedAt: string;
  resolvedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AfterSalesEventSummary = {
  id: string;
  organizationId?: string | null;
  afterSalesCaseId: string;
  eventType: string;
  oldValue?: unknown;
  newValue?: unknown;
  notes?: string | null;
  createdBy: string;
  createdAt: string;
};

export type AfterSalesCaseDetail = AfterSalesCaseSummary & {
  description?: string | null;
  customerClaim?: string | null;
  internalNotes?: string | null;
  evidenceUrls: string[];
  resolutionNotes?: string | null;
  events: AfterSalesEventSummary[];
  followUps?: FollowUpSummary[];
  riskWarnings: string[];
};

export type AfterSalesListQuery = {
  organizationId?: string;
  customerId?: string;
  orderId?: string;
  productId?: string;
  caseType?: string;
  priority?: string;
  status?: string;
  responsibility?: string;
  assignedTo?: string;
  dateFrom?: string;
  dateTo?: string;
  keyword?: string;
  page?: string;
  pageSize?: string;
};

export type AfterSalesUpsertRequest = {
  customerId: string;
  orderId?: string | null;
  productId?: string | null;
  caseType: AfterSalesCaseType | string;
  priority?: AfterSalesPriority | string;
  status?: AfterSalesStatus | string;
  responsibility?: AfterSalesResponsibility | string | null;
  requestedSolution?: AfterSalesSolution | string | null;
  finalSolution?: AfterSalesSolution | string | null;
  refundAmount?: string | number | null;
  reshipCost?: string | number | null;
  compensationAmount?: string | number | null;
  currency?: string | null;
  description?: string | null;
  customerClaim?: string | null;
  internalNotes?: string | null;
  evidenceUrls?: string[];
  resolutionNotes?: string | null;
  assignedTo?: string | null;
};

export type AfterSalesScriptRequest = {
  afterSalesCaseId: string;
  scenario: AfterSalesScriptScenario | string;
  targetLanguage?: string | null;
  tone?: "short" | "professional" | "friendly" | "closing" | string;
};

export type AfterSalesScriptResponse = {
  scriptText: string;
  alternativeScripts: string[];
  riskWarnings: string[];
  missingInfo: string[];
  knowledgeUsed: string[];
  createdLogId?: string | null;
};

export const ORDER_TYPES = ["normal", "sample_to_bulk", "custom", "reorder", "other"] as const;
export type OrderType = typeof ORDER_TYPES[number];

export const ORDER_PAYMENT_STATUSES = ["unpaid", "deposit_paid", "paid", "refunded", "cancelled"] as const;
export type OrderPaymentStatus = typeof ORDER_PAYMENT_STATUSES[number];

export const ORDER_PRODUCTION_STATUSES = ["not_started", "preparing", "in_production", "completed", "delayed", "cancelled"] as const;
export type OrderProductionStatus = typeof ORDER_PRODUCTION_STATUSES[number];

export const ORDER_SHIPPING_STATUSES = ["pending", "ready_to_ship", "shipped", "delivered", "delayed", "cancelled"] as const;
export type OrderShippingStatus = typeof ORDER_SHIPPING_STATUSES[number];

export const ORDER_AFTER_SALES_STATUSES = ["none", "pending", "processing", "resolved", "refunded", "closed"] as const;
export type OrderAfterSalesStatus = typeof ORDER_AFTER_SALES_STATUSES[number];

export const ORDER_STATUSES = ["draft", "confirmed", "pending_payment", "processing", "shipped", "completed", "cancelled"] as const;
export type OrderStatus = typeof ORDER_STATUSES[number];

export const ORDER_SCRIPT_SCENARIOS = [
  "payment_reminder",
  "deposit_confirm",
  "production_update",
  "shipping_notice",
  "delivery_follow_up",
  "delay_explain",
  "after_sales_soothing",
  "reorder_after_delivery",
  "order_confirm"
] as const;
export type OrderScriptScenario = typeof ORDER_SCRIPT_SCENARIOS[number];

export const ORDER_FULFILLMENT_GROUPS = [
  "pending_payment",
  "deposit_paid",
  "in_production",
  "production_delayed",
  "pending_shipment",
  "shipped_not_delivered",
  "shipping_delayed",
  "delivered_follow_up",
  "after_sales_pending",
  "completed",
  "cancelled"
] as const;
export type OrderFulfillmentGroup = typeof ORDER_FULFILLMENT_GROUPS[number];

export const ORDER_FULFILLMENT_ALERT_TYPES = [
  "payment_overdue",
  "production_delayed",
  "shipping_delayed",
  "missing_tracking_number",
  "after_sales_pending",
  "delivery_follow_up",
  "order_no_follow_up"
] as const;
export type OrderFulfillmentAlertType = typeof ORDER_FULFILLMENT_ALERT_TYPES[number];

export const ORDER_FULFILLMENT_ALERT_STATUSES = ["open", "dismissed", "resolved", "task_created"] as const;
export type OrderFulfillmentAlertStatus = typeof ORDER_FULFILLMENT_ALERT_STATUSES[number];

export const ORDER_FULFILLMENT_SCRIPT_SCENARIOS = [
  "payment_follow_up",
  "production_update",
  "production_delay_explain",
  "shipping_notice",
  "shipping_delay_explain",
  "delivery_follow_up",
  "after_sales_follow_up",
  "reorder_after_delivery"
] as const;
export type OrderFulfillmentScriptScenario = typeof ORDER_FULFILLMENT_SCRIPT_SCENARIOS[number];

export type OrderSummary = {
  id: string;
  organizationId?: string | null;
  customerId: string;
  customerName?: string | null;
  productId?: string | null;
  productName?: string | null;
  quoteId?: string | null;
  sampleOrderId?: string | null;
  customRequestId?: string | null;
  orderNo: string;
  orderType: OrderType | string;
  title?: string | null;
  amount?: string | null;
  currency?: string | null;
  quantity?: number | null;
  paymentStatus: OrderPaymentStatus | string;
  productionStatus: OrderProductionStatus | string;
  shippingStatus: OrderShippingStatus | string;
  afterSalesStatus: OrderAfterSalesStatus | string;
  orderStatus: OrderStatus | string;
  expectedShipDate?: string | null;
  expectedDeliveryDate?: string | null;
  trackingNumber?: string | null;
  notes?: string | null;
  files: string[];
  ownerId: string;
  assignedTo?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  riskWarnings?: string[];
};

export type OrderDetail = OrderSummary & {
  quote?: QuoteResponse | null;
  sampleOrder?: SampleOrderSummary | null;
  customRequest?: CustomRequestSummary | null;
  followUps?: FollowUpSummary[];
};

export type OrderFulfillmentAlertSummary = {
  id?: string;
  organizationId?: string | null;
  orderId: string;
  customerId: string;
  alertType: OrderFulfillmentAlertType | string;
  level: IntentLevel | string;
  reason?: string | null;
  recommendedAction?: string | null;
  status: OrderFulfillmentAlertStatus | string;
  ownerId: string;
  createdAt?: string;
  updatedAt?: string;
};

export type OrderFulfillmentItem = OrderSummary & {
  alerts: OrderFulfillmentAlertSummary[];
  fulfillmentGroup: OrderFulfillmentGroup | string;
  recommendedAction: string;
};

export type OrderFulfillmentBoardResponse = {
  summary: Record<string, number>;
  groups: Record<OrderFulfillmentGroup | string, OrderFulfillmentItem[]>;
};

export type OrderFulfillmentDetailResponse = {
  order: OrderDetail;
  alerts: OrderFulfillmentAlertSummary[];
  timeline: Array<{ label: string; value?: string | null; status?: string | null }>;
  followUpTasks: FollowUpSummary[];
  recommendedActions: string[];
  riskWarnings: string[];
};

export type OrderFulfillmentScriptRequest = {
  orderId: string;
  alertId?: string | null;
  scenario: OrderFulfillmentScriptScenario | string;
  targetLanguage?: string | null;
  tone?: string | null;
};

export type OrderListQuery = {
  organizationId?: string;
  customerId?: string;
  assignedTo?: string;
  orderType?: string;
  orderStatus?: string;
  paymentStatus?: string;
  productionStatus?: string;
  shippingStatus?: string;
  afterSalesStatus?: string;
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
  pageSize?: string;
};

export type OrderUpsertRequest = {
  customerId: string;
  productId?: string | null;
  orderType?: OrderType | string;
  title?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  quantity?: number | string | null;
  paymentStatus?: OrderPaymentStatus | string;
  productionStatus?: OrderProductionStatus | string;
  shippingStatus?: OrderShippingStatus | string;
  afterSalesStatus?: OrderAfterSalesStatus | string;
  orderStatus?: OrderStatus | string;
  expectedShipDate?: string | null;
  expectedDeliveryDate?: string | null;
  trackingNumber?: string | null;
  notes?: string | null;
  files?: string[];
  assignedTo?: string | null;
};

export type OrderScriptRequest = {
  orderId: string;
  scenario: OrderScriptScenario | string;
  targetLanguage?: string | null;
  tone?: string | null;
};

export type OrderScriptResponse = {
  scriptText: string;
  alternativeScripts: string[];
  riskWarnings: string[];
  missingInfo: string[];
  knowledgeUsed: string[];
  createdLogId?: string | null;
};

export const PROFIT_MARGIN_LEVELS = ["loss", "low", "normal", "high"] as const;
export type ProfitMarginLevel = typeof PROFIT_MARGIN_LEVELS[number];

export type OrderCostItems = {
  productCost?: string | null;
  packagingCost?: string | null;
  domesticShipping?: string | null;
  internationalShipping?: string | null;
  paymentFee?: string | null;
  platformFee?: string | null;
  refundAmount?: string | null;
  reshipCost?: string | null;
  otherCost?: string | null;
};

export type OrderCostSummary = {
  id?: string | null;
  orderId: string;
  orderNo?: string | null;
  revenue?: string | null;
  currency?: string | null;
  costCurrency?: string | null;
  costItems: OrderCostItems;
  totalCost?: string | null;
  grossProfit?: string | null;
  grossMargin?: string | null;
  marginLevel: ProfitMarginLevel | string;
  costConfirmed: boolean;
  confirmedBy?: string | null;
  confirmedAt?: string | null;
  riskLevel: IntentLevel | string;
  riskWarnings: string[];
  missingInfo: string[];
  notes?: string | null;
  updatedAt?: string | null;
};

export type OrderCostUpsertRequest = Partial<OrderCostItems> & {
  currency?: string | null;
  notes?: string | null;
};

export type ProfitOrderRow = {
  orderId: string;
  orderNo: string;
  customerName?: string | null;
  productName?: string | null;
  assignedTo?: string | null;
  revenue?: string | null;
  currency?: string | null;
  totalCost?: string | null;
  grossProfit?: string | null;
  grossMargin?: string | null;
  marginLevel: ProfitMarginLevel | string;
  costConfirmed: boolean;
  riskLevel: IntentLevel | string;
  createdAt: string;
};

export type ProfitSummary = {
  totalRevenue: string;
  totalCost: string;
  totalGrossProfit: string;
  avgGrossMargin: string | null;
  orderCount: number;
  lossOrderCount: number;
  lowMarginOrderCount: number;
  unconfirmedCostCount: number;
  byCurrency: Record<string, { revenue: string; totalCost: string; grossProfit: string; orderCount: number }>;
  riskWarnings: string[];
};

export type ProfitBreakdownRow = {
  id: string;
  name: string;
  sku?: string | null;
  country?: string | null;
  orderCount: number;
  revenue: string;
  totalCost: string;
  grossProfit: string;
  grossMargin: string | null;
};

export type ProfitReviewRequest = {
  orderId?: string;
  productId?: string;
  customerId?: string;
  scope: "order" | "product" | "customer" | "organization" | string;
  targetLanguage?: string | null;
};

export type ProfitReviewResponse = {
  reviewSummary: string;
  findings: string[];
  riskWarnings: string[];
  recommendedActions: string[];
  missingInfo: string[];
  createdLogId?: string | null;
};

export type ProductOpportunitySummary = {
  productId: string;
  productName: string;
  sku?: string | null;
  category?: string | null;
  score: number;
  level: IntentLevel;
  reasons: string[];
  recommendedAction: string;
};

export const SCRIPT_EXPERIMENT_SCENARIOS = [
  "first_reply",
  "price_reply",
  "too_expensive",
  "quote_follow_up",
  "payment_reminder",
  "sample_feedback_follow_up",
  "custom_confirm",
  "shipping_delay_explain",
  "after_sales_soothing",
  "reorder_follow_up",
  "dormant_reactivation",
  "new_product_recommendation"
] as const;
export type ScriptExperimentScenario = typeof SCRIPT_EXPERIMENT_SCENARIOS[number];

export const SCRIPT_EXPERIMENT_STATUSES = ["draft", "active", "paused", "completed", "archived"] as const;
export type ScriptExperimentStatus = typeof SCRIPT_EXPERIMENT_STATUSES[number];

export const SCRIPT_USAGE_OUTCOMES = [
  "used_draft",
  "customer_replied",
  "quote_created",
  "order_created",
  "payment_received",
  "reorder_created",
  "no_response",
  "manually_marked"
] as const;
export type ScriptUsageOutcome = typeof SCRIPT_USAGE_OUTCOMES[number];

export type ScriptVariantSummary = {
  id: string;
  experimentId: string;
  organizationId?: string | null;
  title: string;
  versionLabel: string;
  content: string;
  language?: string | null;
  tone?: string | null;
  enabled: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ScriptExperimentSummary = {
  id: string;
  organizationId?: string | null;
  name: string;
  scenario: ScriptExperimentScenario | string;
  description?: string | null;
  status: ScriptExperimentStatus | string;
  targetLanguage?: string | null;
  targetCustomerStage?: string | null;
  createdBy: string;
  variantsCount?: number;
  totalUsage?: number;
  bestVariant?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ScriptUsageSummary = {
  id: string;
  organizationId?: string | null;
  experimentId: string;
  variantId: string;
  customerId?: string | null;
  customerName?: string | null;
  userId: string;
  scenario: ScriptExperimentScenario | string;
  channel: string;
  usedText?: string | null;
  outcome: ScriptUsageOutcome | string;
  quoteId?: string | null;
  orderId?: string | null;
  followUpTaskId?: string | null;
  notes?: string | null;
  usedAt: string;
  outcomeAt?: string | null;
};

export type ScriptExperimentStats = {
  totalUsage: number;
  usageByVariant: Record<string, Record<string, number> & { total: number; versionLabel: string; title: string }>;
  rates: {
    replyRate: number | null;
    quoteConversionRate: number | null;
    orderConversionRate: number | null;
    paymentConversionRate: number | null;
    reorderConversionRate: number | null;
    noResponseRate: number | null;
  };
  bestVariant?: string | null;
  riskWarnings: string[];
};

export type ScriptExperimentDetail = ScriptExperimentSummary & {
  variants: ScriptVariantSummary[];
  usages: ScriptUsageSummary[];
  stats: ScriptExperimentStats;
  riskWarnings: string[];
};

export type ScriptExperimentUpsertRequest = {
  name?: string;
  scenario?: ScriptExperimentScenario | string;
  description?: string | null;
  status?: ScriptExperimentStatus | string;
  targetLanguage?: string | null;
  targetCustomerStage?: string | null;
  organizationId?: string | null;
};

export type ScriptVariantUpsertRequest = {
  title?: string;
  versionLabel?: string;
  content?: string;
  language?: string | null;
  tone?: string | null;
  enabled?: boolean;
};

export type ScriptUsageCreateRequest = {
  experimentId: string;
  variantId: string;
  customerId?: string | null;
  scenario?: ScriptExperimentScenario | string;
  channel?: "whatsapp_web" | "web" | "extension" | "other" | string;
  usedText?: string | null;
};

export type ScriptUsageOutcomeRequest = {
  outcome: ScriptUsageOutcome | string;
  quoteId?: string | null;
  orderId?: string | null;
  followUpTaskId?: string | null;
  notes?: string | null;
};

export type ScriptVariantGenerationRequest = {
  scenario: ScriptExperimentScenario | string;
  targetLanguage?: string | null;
  productId?: string | null;
  customerStage?: string | null;
  tone?: string | null;
  baseContent?: string | null;
  count?: number;
  createExperiment?: boolean;
  confirm?: boolean;
};

export type ScriptVariantGenerationResponse = {
  variants: Array<{ versionLabel: string; title: string; content: string }>;
  riskWarnings: string[];
  knowledgeUsed: string[];
  createdLogId?: string | null;
};

export const SUPPLIER_STATUSES = ["active", "inactive", "blocked", "candidate"] as const;
export type SupplierStatus = typeof SUPPLIER_STATUSES[number];

export const SUPPLIER_RISK_LEVELS = ["low", "medium", "high"] as const;
export type SupplierRiskLevel = typeof SUPPLIER_RISK_LEVELS[number];

export const SUPPLIER_QUOTE_STATUSES = ["active", "expired", "selected", "archived"] as const;
export type SupplierQuoteStatus = typeof SUPPLIER_QUOTE_STATUSES[number];

export const PURCHASE_NOTE_TYPES = ["general", "sample", "bulk_order", "custom", "cost", "risk", "delivery"] as const;
export type PurchaseNoteType = typeof PURCHASE_NOTE_TYPES[number];

export const SUPPLIER_RISK_TYPES = ["unstable_delivery", "unstable_quality", "high_price", "poor_cooperation", "payment_risk", "needs_review", "other"] as const;
export type SupplierRiskType = typeof SUPPLIER_RISK_TYPES[number];

export const SUPPLIER_RISK_STATUSES = ["open", "resolved", "dismissed"] as const;
export type SupplierRiskStatus = typeof SUPPLIER_RISK_STATUSES[number];

export const SUPPLIER_LINK_ENTITY_TYPES = ["product", "order", "sample_order", "custom_request", "after_sales"] as const;
export type SupplierLinkEntityType = typeof SUPPLIER_LINK_ENTITY_TYPES[number];

export const SUPPLIER_LINK_RELATION_TYPES = ["supplier", "manufacturer", "sample_supplier", "bulk_supplier", "backup_supplier", "after_sales_supplier"] as const;
export type SupplierLinkRelationType = typeof SUPPLIER_LINK_RELATION_TYPES[number];

export const SUPPLIER_SCRIPT_SCENARIOS = [
  "ask_price",
  "ask_moq",
  "ask_sample_fee",
  "ask_lead_time",
  "ask_bulk_order_cost",
  "ask_custom_feasibility",
  "ask_quality_issue",
  "ask_reship_cost",
  "negotiate_price",
  "confirm_purchase_details"
] as const;
export type SupplierScriptScenario = typeof SUPPLIER_SCRIPT_SCENARIOS[number];

export type SupplierSummary = {
  id: string;
  organizationId?: string | null;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  wechat?: string | null;
  country?: string | null;
  city?: string | null;
  website?: string | null;
  tags: string[];
  rating?: number | null;
  status: SupplierStatus | string;
  riskLevel?: SupplierRiskLevel | string | null;
  notes?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type SupplierContactSummary = {
  id: string;
  organizationId?: string | null;
  supplierId: string;
  name: string;
  role?: string | null;
  phone?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  wechat?: string | null;
  notes?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type SupplierQuoteSummary = {
  id: string;
  organizationId?: string | null;
  supplierId: string;
  productId?: string | null;
  productName?: string | null;
  sku?: string | null;
  moq?: number | null;
  unitCost?: string | null;
  currency?: string | null;
  leadTime?: string | null;
  sampleFee?: string | null;
  sampleLeadTime?: string | null;
  bulkLeadTime?: string | null;
  validUntil?: string | null;
  notes?: string | null;
  status: SupplierQuoteStatus | string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type PurchaseNoteSummary = {
  id: string;
  organizationId?: string | null;
  supplierId?: string | null;
  productId?: string | null;
  orderId?: string | null;
  sampleOrderId?: string | null;
  customRequestId?: string | null;
  noteType: PurchaseNoteType | string;
  content: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type SupplierRiskSummary = {
  id: string;
  organizationId?: string | null;
  supplierId: string;
  riskType: SupplierRiskType | string;
  level: SupplierRiskLevel | string;
  description?: string | null;
  status: SupplierRiskStatus | string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type SupplierLinkSummary = {
  id: string;
  organizationId?: string | null;
  supplierId: string;
  entityType: SupplierLinkEntityType | string;
  entityId: string;
  relationType: SupplierLinkRelationType | string;
  createdBy: string;
  createdAt: string;
};

export type SupplierDetail = SupplierSummary & {
  contacts: SupplierContactSummary[];
  quotes: SupplierQuoteSummary[];
  purchaseNotes: PurchaseNoteSummary[];
  risks: SupplierRiskSummary[];
  links: SupplierLinkSummary[];
};

export type SupplierListQuery = {
  organizationId?: string;
  status?: string;
  riskLevel?: string;
  tag?: string;
  keyword?: string;
  country?: string;
  city?: string;
  page?: string;
  pageSize?: string;
};

export type SupplierUpsertRequest = Partial<Omit<SupplierSummary, "id" | "createdBy" | "createdAt" | "updatedAt">> & {
  confirm?: boolean;
};

export type SupplierContactUpsertRequest = Partial<Omit<SupplierContactSummary, "id" | "supplierId" | "createdBy" | "createdAt" | "updatedAt">> & {
  confirm?: boolean;
};

export type SupplierQuoteUpsertRequest = Partial<Omit<SupplierQuoteSummary, "id" | "createdBy" | "createdAt" | "updatedAt" | "productName">> & {
  confirm?: boolean;
};

export type PurchaseNoteUpsertRequest = Partial<Omit<PurchaseNoteSummary, "id" | "createdBy" | "createdAt" | "updatedAt">> & {
  confirm?: boolean;
};

export type SupplierRiskUpsertRequest = Partial<Omit<SupplierRiskSummary, "id" | "createdBy" | "createdAt" | "updatedAt">> & {
  confirm?: boolean;
};

export type SupplierScriptRequest = {
  supplierId?: string | null;
  productId?: string | null;
  orderId?: string | null;
  sampleOrderId?: string | null;
  customRequestId?: string | null;
  scenario: SupplierScriptScenario | string;
  targetLanguage?: string | null;
  tone?: string | null;
};

export type SupplierScriptResponse = {
  scriptText: string;
  alternativeScripts: string[];
  riskWarnings: string[];
  missingInfo: string[];
  createdLogId?: string | null;
};

export const BRAND_STATUSES = ["active", "inactive", "archived"] as const;
export type BrandStatus = typeof BRAND_STATUSES[number];

export const BRAND_RULE_TYPES = ["quote_rule", "payment_method", "after_sales_policy", "logistics", "forbidden_expression", "faq"] as const;
export type BrandRuleType = typeof BRAND_RULE_TYPES[number];

export const BRAND_SCRIPT_TYPES = ["script_org", "script_variant", "knowledge_script", "other"] as const;
export type BrandScriptType = typeof BRAND_SCRIPT_TYPES[number];

export const BRAND_ASSIGNMENT_ENTITY_TYPES = ["customer", "quote", "order", "after_sales", "reorder_opportunity", "supplier", "sample_order", "custom_request"] as const;
export type BrandAssignmentEntityType = typeof BRAND_ASSIGNMENT_ENTITY_TYPES[number];

export type BrandSummary = {
  id: string;
  organizationId: string;
  name: string;
  displayName?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  website?: string | null;
  defaultLanguage?: string | null;
  defaultCurrency?: string | null;
  country?: string | null;
  status: BrandStatus | string;
  notes?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  productCount?: number;
  materialCount?: number;
  ruleCount?: number;
};

export type BrandRuleSummary = {
  id: string;
  organizationId: string;
  brandId: string;
  ruleType: BrandRuleType | string;
  title: string;
  content: string;
  language?: string | null;
  enabled: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type BrandResourceLinkSummary = {
  id: string;
  organizationId: string;
  brandId: string;
  productId?: string;
  materialId?: string;
  knowledgeBaseId?: string;
  scriptId?: string;
  scriptType?: BrandScriptType | string;
  createdBy: string;
  createdAt: string;
};

export type BrandAssignmentSummary = {
  id: string;
  organizationId: string;
  brandId: string;
  entityType: BrandAssignmentEntityType | string;
  entityId: string;
  assignedBy: string;
  createdAt: string;
};

export type BrandDetail = BrandSummary & {
  products: BrandResourceLinkSummary[];
  materials: BrandResourceLinkSummary[];
  knowledgeBases: BrandResourceLinkSummary[];
  scripts: BrandResourceLinkSummary[];
  rules: BrandRuleSummary[];
  assignmentsSummary: Record<string, number>;
};

export type BrandUpsertRequest = Partial<Omit<BrandSummary, "id" | "createdBy" | "createdAt" | "updatedAt" | "productCount" | "materialCount" | "ruleCount">> & {
  confirm?: boolean;
};

export type BrandRuleUpsertRequest = Partial<Omit<BrandRuleSummary, "id" | "organizationId" | "brandId" | "createdBy" | "createdAt" | "updatedAt">> & {
  confirm?: boolean;
};

export type BrandContextResponse = {
  brand?: BrandSummary | null;
  rules: BrandRuleSummary[];
  knowledge: Array<{ id: string; title: string; category?: string; source: "brand" | "organization" | "personal"; content?: string }>;
  products: Array<{ id: string; name?: string; sku?: string | null }>;
  materials: Array<{ id: string; title?: string; type?: string | null; url?: string | null }>;
  brandUsed?: string | null;
  brandRulesUsed: string[];
  riskWarnings: string[];
};

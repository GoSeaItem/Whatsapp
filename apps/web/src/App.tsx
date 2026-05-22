import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  AI_SAFETY_NOTE,
  AFTER_SALES_CASE_TYPES,
  AFTER_SALES_PRIORITIES,
  AFTER_SALES_RESPONSIBILITIES,
  AFTER_SALES_SCRIPT_SCENARIOS,
  AFTER_SALES_SOLUTIONS,
  AFTER_SALES_STATUSES,
  BRAND_ASSIGNMENT_ENTITY_TYPES,
  BRAND_RULE_TYPES,
  BRAND_STATUSES,
  type AuditLogAction,
  type AuditLogSummary,
  type AfterSalesCaseDetail,
  type AfterSalesCaseSummary,
  type AfterSalesScriptScenario,
  CUSTOM_REQUEST_STATUSES,
  CUSTOM_REQUEST_TYPES,
  CUSTOM_SCRIPT_SCENARIOS,
  ENTERPRISE_ENTITY_STATUSES,
  KNOWLEDGE_BASE_CATEGORIES,
  KNOWLEDGE_BASE_LANGUAGES,
  MATERIAL_LANGUAGES,
  MATERIAL_TYPES,
  ORGANIZATION_MEMBER_STATUSES,
  ORGANIZATION_UNIT_TYPES,
  ORDER_AFTER_SALES_STATUSES,
  ORDER_FULFILLMENT_SCRIPT_SCENARIOS,
  ORDER_PAYMENT_STATUSES,
  ORDER_PRODUCTION_STATUSES,
  ORDER_SCRIPT_SCENARIOS,
  ORDER_SHIPPING_STATUSES,
  ORDER_STATUSES,
  ORDER_TYPES,
  PERMISSION_KEYS,
  ORGANIZATION_ROLES,
  REORDER_CAMPAIGN_SCOPES,
  REORDER_CAMPAIGN_STATUSES,
  REORDER_OPERATION_SCRIPT_SCENARIOS,
  REORDER_OPERATION_TYPES,
  REORDER_OPPORTUNITY_STATUSES,
  REPORT_JOB_TYPES,
  SCRIPT_EXPERIMENT_SCENARIOS,
  SCRIPT_EXPERIMENT_STATUSES,
  SCRIPT_ORG_CATEGORIES,
  SCRIPT_USAGE_OUTCOMES,
  SAMPLE_FEEDBACK_STATUSES,
  SAMPLE_PAYMENT_STATUSES,
  SAMPLE_SCRIPT_SCENARIOS,
  SAMPLE_SHIPPING_STATUSES,
  type CustomRequestStatus,
  type CustomRequestSummary,
  type CustomRequestType,
  type CustomRequestUpsertRequest,
  type CustomScriptScenario,
  type CustomerAssignmentLogSummary,
  type CustomerDuplicateMatch,
  type CustomerIntentResponse,
  type CustomerPredictionSummary,
  type CustomerSummary,
  type CustomerUpsertRequest,
  type EnterpriseAuditLogSummary,
  type EnterpriseBrandContextResponse,
  type EnterpriseReportSummary,
  type EnterpriseRoleSummary,
  type FollowUpSummary,
  type FollowUpTaskType,
  type KnowledgeBaseCategory,
  type KnowledgeBaseLanguage,
  type KnowledgeBaseOrgSummary,
  type KnowledgeBaseSummary,
  type KnowledgeBaseUpsertRequest,
  type MaterialLanguage,
  type MaterialSummary,
  type MaterialType,
  type MaterialUpsertRequest,
  type OrganizationDetail,
  type OrganizationMaterialSummary,
  type OrganizationMemberStatus,
  type OrganizationMemberSummary,
  type OrganizationMemberUpdateRequest,
  type OrganizationRole,
  type OrganizationUnitSummary,
  type OrderFulfillmentBoardResponse,
  type OrderFulfillmentAlertSummary,
  type OrderFulfillmentScriptScenario,
  type OrganizationProductSummary,
  type OrganizationSummary,
  type OrganizationUpsertRequest,
  type OrderCostSummary,
  type OrderScriptScenario,
  type OrderSummary,
  type OrderUpsertRequest,
  type ProfitBreakdownRow,
  type ProfitOrderRow,
  type ProfitReviewResponse,
  type ProfitSummary,
  type ProductOpportunitySummary,
  type ProductSummary,
  type ProductUpsertRequest,
  type QuoteGenerateRequest,
  type QuoteResponse,
  type ReportJobSummary,
  type ReportJobType,
  type ReorderCampaignSummary,
  type ReorderOperationScriptScenario,
  type ReorderOpportunitySummary,
  type ReorderPlaybookSummary,
  type ReorderReminderSummary,
  type RoleSummary,
  type RoleUpsertRequest,
  type SampleFeedbackStatus,
  type SampleOrderSummary,
  type SampleOrderUpsertRequest,
  type SamplePaymentStatus,
  type SampleScriptScenario,
  type SampleShippingStatus,
  type ScriptOrgCategory,
  type ScriptOrgSummary,
  type ScriptExperimentDetail,
  type ScriptExperimentSummary,
  type ScriptUsageSummary,
  type ScriptVariantSummary,
  type TeamDashboardCustomer,
  type TeamDashboardSummary,
  type WorkbenchDashboard
} from "@wa-ai/shared";
import {
  completeFollowUp,
  addOrganizationMember,
  auditLogsCsvUrl,
  assignCustomer,
  checkCustomerDuplicate,
  createCustomRequest,
  createAfterSalesCase,
  createAfterSalesFollowUpTask,
  createEnterpriseOrganizationUnit,
  createEnterpriseReport,
  createEnterpriseRole,
  createCustomer,
  createFollowUp,
  createKnowledgeBaseItem,
  createMaterial,
  createOrgKnowledgeBaseItem,
  createOrgScript,
  createOrganization,
  createOrganizationMaterial,
  createOrganizationProduct,
  createOrder,
  createOrderFulfillmentFollowUp,
  createOrderFollowUpTask,
  createOrderFromCustomRequest,
  createOrderFromQuote,
  createOrderFromSample,
  createProduct,
  createReorderCampaign,
  createReorderFollowUpTask,
  createReorderReminder,
  createReorderOpportunityFollowUpTask,
  createReorderPlaybook,
  createRole,
  createSampleOrder,
  createScriptExperiment,
  createScriptUsage,
  createScriptVariant,
  createPurchaseNote,
  createSupplier,
  createSupplierContact,
  createSupplierQuote,
  createSupplierRisk,
  deleteCustomRequest,
  deleteAfterSalesCase,
  deleteCustomer,
  deleteKnowledgeBaseItem,
  deleteMaterial,
  deleteOrgKnowledgeBaseItem,
  deleteOrgScript,
  deleteOrganization,
  deleteOrganizationMaterial,
  deleteOrganizationMember,
  deleteOrganizationProduct,
  deleteOrder,
  deleteOrderCost,
  deleteProduct,
  deleteReorderCampaign,
  deleteReorderPlaybook,
  deleteRole,
  deleteSampleOrder,
  deleteScriptVariant,
  deleteSupplier,
  disableKnowledgeBaseItem,
  enableKnowledgeBaseItem,
  generateCustomScript,
  generateAfterSalesScript,
  generateMaterialIntro,
  generateOrderScript,
  generateOrderFulfillmentScript,
  generateProfitReview,
  generateQuote,
  generateReorderScript,
  generateReorderOperationScript,
  generateSampleScript,
  generateScriptExperimentVariants,
  generateSupplierScript,
  importCsv,
  importOrganizationCsv,
  createOrganizationExportJob,
  getCustomRequest,
  getCustomRequests,
  getAfterSalesCase,
  getAfterSalesCases,
  getAuditLog,
  getAuditLogs,
  getCustomer,
  getCustomerIntent,
  getCustomerPredictions,
  getCustomerQuotes,
  getCustomers,
  getEnterpriseAuditLogs,
  getEnterpriseBrandContext,
  getEnterpriseMembers,
  getEnterpriseOrganizationUnits,
  getEnterpriseReports,
  getEnterpriseRoles,
  getFollowUps,
  getHighIntentCustomers,
  getKnowledgeBase,
  getKnowledgeBaseItem,
  getMaterials,
  getMe,
  getOrgKnowledgeBase,
  getOrgKnowledgeBaseItem,
  getOrgScripts,
  getOrgScript,
  getOrganization,
  getOrganizationMaterial,
  getOrganizationMaterials,
  getOrganizationMembers,
  getOrganizationProduct,
  getOrganizationProducts,
  getOrganizations,
  getOrder,
  getOrderCost,
  getOrderFulfillment,
  getOrderFulfillmentBoard,
  getOrders,
  getProfitByCustomer,
  getProfitByProduct,
  getProfitBySalesperson,
  getProfitOrders,
  getProfitSummary,
  getProducts,
  getProductOpportunities,
  getReportHighIntentCustomers,
  getReportTeamSummary,
  getReorderCampaigns,
  getReorderOpportunities,
  getReorderPlaybooks,
  getReorderReminders,
  getRiskEvents,
  getRoles,
  getSampleOrder,
  getSampleOrders,
  getScriptExperiment,
  getScriptExperiments,
  getScriptExperimentStats,
  getSupplier,
  getSuppliers,
  getTeamSummary,
  getWorkbenchDashboard,
  generateReportJob,
  login,
  logout,
  recalculateOrganizationFulfillmentAlerts,
  recalculateOrderFulfillmentAlerts,
  recalculateCustomerIntent,
  recalculatePredictions,
  recalculateReorderOpportunities,
  saveQuote,
  updateCustomRequest,
  updateAfterSalesCase,
  updateAfterSalesResponsibility,
  updateAfterSalesSolution,
  updateAfterSalesStatus,
  updateCustomer,
  updateEnterpriseOrganizationUnit,
  updateEnterpriseMember,
  updateEnterpriseRole,
  upsertEnterpriseMember,
  updateKnowledgeBaseItem,
  updateMaterial,
  updateOrgKnowledgeBaseItem,
  updateOrgScript,
  updateOrganization,
  updateOrganizationMaterial,
  updateOrganizationMember,
  updateOrganizationProduct,
  updateOrder,
  updateOrderFulfillmentAlert,
  updateOrderAfterSalesStatus,
  updateOrderPaymentStatus,
  updateOrderProductionStatus,
  updateOrderShippingStatus,
  upsertOrderCost,
  confirmOrderCost,
  updateCustomerPrediction,
  updateProduct,
  updateReorderCampaign,
  updateReorderReminder,
  updateReorderOpportunity,
  updateReorderPlaybook,
  updateRole,
  updateSampleOrder,
  archiveScriptExperiment,
  updateScriptExperiment,
  updateScriptUsageOutcome,
  updateScriptVariant,
  updateSupplier,
  applySupplierQuoteToOrderCost,
  archiveBrand,
  assignBrand,
  aiKeyUsageExportUrl,
  createBrand,
  createBrandRule,
  createAiProviderKey,
  deleteBrandRule,
  disableAiProviderKey,
  getBrand,
  getBrandContext,
  getBrands,
  getAiModels,
  getAiProviderKeys,
  importAiProviderKeys,
  linkBrandKnowledgeBase,
  linkBrandMaterial,
  linkBrandProduct,
  linkBrandScript,
  teamSummaryCsvUrl,
  reportTeamSummaryUrl,
  unlinkBrandKnowledgeBase,
  unlinkBrandMaterial,
  unlinkBrandProduct,
  unlinkBrandScript,
  updateBrand,
  updateBrandRule,
  updateAiProviderKey,
  type AuthUser
} from "./api";
import type { AiModelDefinition, AiProviderKeySummary, CsvImportResult, ImportExportType, OrganizationExportJob, OrganizationImportExportType, OrganizationImportJob } from "./api";
import { exportCsvUrl, templateCsvUrl } from "./api";

// Release safety copy kept in source for regression checks: drafts are copied and sent manually by the salesperson.
// Navigation regression marker: navButton("roles", "Roles")

type View = "dashboard" | "enterprise" | "aiKeys" | "teamDashboard" | "reports" | "predictions" | "reorderOps" | "afterSales" | "scriptTests" | "suppliers" | "brands" | "organizations" | "roles" | "permissions" | "customers" | "products" | "orgProducts" | "quotes" | "orders" | "fulfillment" | "profit" | "knowledge" | "orgKnowledge" | "orgScripts" | "materials" | "orgMaterials" | "samples" | "custom" | "importExport" | "auditLogs" | "riskEvents";
type CustomerFilters = { q: string; tag: string; stage: string; sort: "" | "intentScore"; intentLevel: "" | "low" | "medium" | "high"; organizationId: string };
type ProductFilters = { q: string; category: string };
type KnowledgeFilters = { q: string; category: string; language: string; productId: string };
type OrgContentFilters = { organizationId: string; q: string; category: string; language: string };
type OrgProductFilters = { organizationId: string; q: string; category: string };
type OrgMaterialFilters = { organizationId: string; q: string; type: string; productSku: string };
type MaterialFilters = { q: string; type: string; language: string; productId: string; tag: string };
type SampleFilters = { q: string; customerId: string; productId: string; paymentStatus: string; shippingStatus: string; feedbackStatus: string };
type CustomFilters = { q: string; customerId: string; productId: string; requestType: string; status: string };
type OrderFilters = { organizationId: string; customerId: string; assignedTo: string; orderType: string; orderStatus: string; paymentStatus: string; productionStatus: string; shippingStatus: string; afterSalesStatus: string; keyword: string };
type ProfitFilters = { organizationId: string; assignedTo: string; marginLevel: string; costConfirmed: string };
type AuditLogFilters = { organizationId: string; entityType: string; entityId: string; userId: string; action: "" | AuditLogAction; riskLevel: "" | "low" | "medium" | "high"; keyword: string; from: string; to: string };
type ReportFilters = { organizationId: string; assignedTo: string; stage: string; intentLevel: "" | "low" | "medium" | "high"; reportType: ReportJobType };
type PredictionFilters = { organizationId: string; predictionType: string; level: string; status: string };
type ReorderOpsFilters = { organizationId: string; opportunityType: string; level: string; status: string };
type AfterSalesFilters = { organizationId: string; customerId: string; orderId: string; productId: string; caseType: string; priority: string; status: string; responsibility: string; assignedTo: string; keyword: string };
type ScriptTestFilters = { organizationId: string; scenario: string; status: string; targetLanguage: string };
type SupplierFilters = { organizationId: string; status: string; riskLevel: string; tag: string; keyword: string; country: string; city: string };
type BrandFilters = { organizationId: string; status: string; keyword: string };
type EnterpriseForm = { organizationId: string; parentId: string; name: string; type: string; status: string };
type EnterpriseRoleForm = { organizationId: string; roleName: string; permissions: string; description: string };
type EnterpriseReportForm = { organizationId: string; reportType: string };
type AiKeyForm = {
  organizationId: string;
  provider: string;
  name: string;
  apiKey: string;
  mode: "instant" | "thinking";
  model: string;
  userEmail: string;
  baseUrl: string;
  status: "active" | "disabled" | "exhausted";
  priority: string;
};

type OrganizationForm = {
  name: string;
};

type OrganizationMemberForm = {
  userId: string;
  role: OrganizationRole;
  status: OrganizationMemberStatus;
};

type RoleForm = {
  organizationId: string;
  name: OrganizationRole;
  description: string;
};

type CustomerForm = {
  name: string;
  whatsappNumber: string;
  email: string;
  socialLinks: string;
  organizationId: string;
  assignedTo: string;
  collaborators: string;
  country: string;
  language: string;
  tags: string;
  stage: string;
  interestedProduct: string;
  latestSummary: string;
  nextFollowUpAt: string;
  notes: string;
};

type ProductForm = {
  name: string;
  sku: string;
  category: string;
  moq: string;
  suggestedPrice: string;
  minPrice: string;
  leadTime: string;
  sellingPoints: string;
  images: string;
  videos: string;
};

type OrgProductForm = {
  organizationId: string;
  productId: string;
};

type QuoteForm = {
  customerId: string;
  productId: string;
  organizationId: string;
  quantity: string;
  unitPrice: string;
  currency: string;
  shippingCost: string;
  moq: string;
  leadTime: string;
  includeShipping: boolean;
  targetLanguage: string;
  tiers: string;
};

type KnowledgeForm = {
  title: string;
  category: KnowledgeBaseCategory;
  content: string;
  language: KnowledgeBaseLanguage;
  productId: string;
  enabled: boolean;
};

type OrgKnowledgeForm = {
  organizationId: string;
  title: string;
  category: KnowledgeBaseCategory;
  content: string;
  language: KnowledgeBaseLanguage;
  enabled: boolean;
};

type OrgScriptForm = {
  organizationId: string;
  title: string;
  category: ScriptOrgCategory;
  content: string;
  language: KnowledgeBaseLanguage;
  enabled: boolean;
};

type MaterialForm = {
  title: string;
  type: MaterialType;
  url: string;
  description: string;
  language: MaterialLanguage;
  productId: string;
  tags: string;
};

type OrgMaterialForm = {
  organizationId: string;
  materialId: string;
};

type SampleForm = {
  customerId: string;
  productId: string;
  sampleName: string;
  sampleFee: string;
  shippingCost: string;
  currency: string;
  paymentStatus: SamplePaymentStatus;
  shippingStatus: SampleShippingStatus;
  trackingNumber: string;
  feedbackStatus: SampleFeedbackStatus;
  expectedShipDate: string;
  expectedDeliveryDate: string;
  notes: string;
};

type CustomForm = {
  customerId: string;
  productId: string;
  requestType: CustomRequestType;
  logoRequired: boolean;
  packagingRequired: boolean;
  colorRequirement: string;
  sizeRequirement: string;
  materialRequirement: string;
  quantity: string;
  moq: string;
  sampleFee: string;
  sampleLeadTime: string;
  bulkLeadTime: string;
  files: string;
  status: CustomRequestStatus;
  notes: string;
};

type OrderForm = {
  customerId: string;
  productId: string;
  orderType: string;
  title: string;
  amount: string;
  currency: string;
  quantity: string;
  paymentStatus: string;
  productionStatus: string;
  shippingStatus: string;
  afterSalesStatus: string;
  orderStatus: string;
  expectedShipDate: string;
  expectedDeliveryDate: string;
  trackingNumber: string;
  notes: string;
  files: string;
  assignedTo: string;
};

const CUSTOMER_TAGS = ["New", "High intent", "Quoted", "Payment pending", "Won", "After sales", "Old customer", "Invalid", "Need follow-up"];
const CUSTOMER_STAGES = ["New lead", "Needs discussed", "Product recommended", "Quoted", "Payment pending", "Won", "Reorder pending", "Invalid"];
const FOLLOW_UP_TYPES = ["Quote follow-up", "Payment reminder", "Sample feedback", "Old customer reorder", "After-sales follow-up", "General reminder"] as unknown as FollowUpTaskType[];
const IMPORT_EXPORT_TYPES: ImportExportType[] = ["customers", "products", "knowledge-base", "materials", "sample-orders", "custom-requests"];
const ORGANIZATION_IMPORT_EXPORT_TYPES: OrganizationImportExportType[] = ["customer", "product", "material", "knowledge", "script"];

const emptyCustomerFilters: CustomerFilters = { q: "", tag: "", stage: "", sort: "", intentLevel: "", organizationId: "" };
const emptyProductFilters: ProductFilters = { q: "", category: "" };
const emptyKnowledgeFilters: KnowledgeFilters = { q: "", category: "", language: "", productId: "" };
const emptyOrgContentFilters: OrgContentFilters = { organizationId: "", q: "", category: "", language: "" };
const emptyOrgProductFilters: OrgProductFilters = { organizationId: "", q: "", category: "" };
const emptyOrgMaterialFilters: OrgMaterialFilters = { organizationId: "", q: "", type: "", productSku: "" };
const emptyMaterialFilters: MaterialFilters = { q: "", type: "", language: "", productId: "", tag: "" };
const emptySampleFilters: SampleFilters = { q: "", customerId: "", productId: "", paymentStatus: "", shippingStatus: "", feedbackStatus: "" };
const emptyCustomFilters: CustomFilters = { q: "", customerId: "", productId: "", requestType: "", status: "" };
const emptyOrderFilters: OrderFilters = { organizationId: "", customerId: "", assignedTo: "", orderType: "", orderStatus: "", paymentStatus: "", productionStatus: "", shippingStatus: "", afterSalesStatus: "", keyword: "" };
const emptyProfitFilters: ProfitFilters = { organizationId: "", assignedTo: "", marginLevel: "", costConfirmed: "" };
const emptyAuditLogFilters: AuditLogFilters = { organizationId: "", entityType: "", entityId: "", userId: "", action: "", riskLevel: "", keyword: "", from: "", to: "" };
const emptyReportFilters: ReportFilters = { organizationId: "", assignedTo: "", stage: "", intentLevel: "", reportType: "customer_summary" };
const emptyPredictionFilters: PredictionFilters = { organizationId: "", predictionType: "", level: "", status: "open" };
const emptyOrganizationForm: OrganizationForm = { name: "" };
const emptyOrganizationMemberForm: OrganizationMemberForm = { userId: "", role: "sales", status: "active" };
const emptyRoleForm: RoleForm = { organizationId: "", name: "sales", description: "" };
const emptyEnterpriseForm: EnterpriseForm = { organizationId: "", parentId: "", name: "", type: "subsidiary", status: "active" };
const emptyEnterpriseRoleForm: EnterpriseRoleForm = { organizationId: "", roleName: "enterprise_manager", permissions: "enterprise.organization.view\nenterprise.report.view\nenterprise.audit.view", description: "" };
const emptyEnterpriseReportForm: EnterpriseReportForm = { organizationId: "", reportType: "enterprise_summary" };
const emptyAiKeyForm: AiKeyForm = { organizationId: "", provider: "deepseek", name: "", apiKey: "", mode: "instant", model: "deepseek-v4-flash", userEmail: "goseashop@gmail.com", baseUrl: "", status: "active", priority: "10" };

const emptyCustomerForm: CustomerForm = {
  name: "",
  whatsappNumber: "",
  email: "",
  socialLinks: "",
  organizationId: "",
  assignedTo: "",
  collaborators: "",
  country: "",
  language: "English",
  tags: "New",
  stage: "New lead",
  interestedProduct: "",
  latestSummary: "",
  nextFollowUpAt: "",
  notes: ""
};

const emptyProductForm: ProductForm = {
  name: "",
  sku: "",
  category: "",
  moq: "",
  suggestedPrice: "",
  minPrice: "",
  leadTime: "",
  sellingPoints: "",
  images: "",
  videos: ""
};

const emptyOrgProductForm: OrgProductForm = { organizationId: "", productId: "" };

const emptyQuoteForm: QuoteForm = {
  customerId: "",
  productId: "",
  organizationId: "",
  quantity: "100",
  unitPrice: "",
  currency: "USD",
  shippingCost: "",
  moq: "",
  leadTime: "",
  includeShipping: false,
  targetLanguage: "English",
  tiers: "50,12.5\n100,11.8\n300,10.9"
};

const emptyKnowledgeForm: KnowledgeForm = {
  title: "",
  category: "company_intro",
  content: "",
  language: "zh",
  productId: "",
  enabled: true
};

const emptyOrgKnowledgeForm: OrgKnowledgeForm = {
  organizationId: "",
  title: "",
  category: "company_intro",
  content: "",
  language: "zh",
  enabled: true
};

const emptyOrgScriptForm: OrgScriptForm = {
  organizationId: "",
  title: "",
  category: "general",
  content: "",
  language: "zh",
  enabled: true
};

const emptyMaterialForm: MaterialForm = {
  title: "",
  type: "image",
  url: "",
  description: "",
  language: "other",
  productId: "",
  tags: ""
};

const emptyOrgMaterialForm: OrgMaterialForm = { organizationId: "", materialId: "" };

const emptySampleForm: SampleForm = {
  customerId: "",
  productId: "",
  sampleName: "",
  sampleFee: "",
  shippingCost: "",
  currency: "USD",
  paymentStatus: "unpaid",
  shippingStatus: "pending",
  trackingNumber: "",
  feedbackStatus: "pending",
  expectedShipDate: "",
  expectedDeliveryDate: "",
  notes: ""
};

const emptyCustomForm: CustomForm = {
  customerId: "",
  productId: "",
  requestType: "logo",
  logoRequired: false,
  packagingRequired: false,
  colorRequirement: "",
  sizeRequirement: "",
  materialRequirement: "",
  quantity: "",
  moq: "",
  sampleFee: "",
  sampleLeadTime: "",
  bulkLeadTime: "",
  files: "",
  status: "draft",
  notes: ""
};

const emptyOrderForm: OrderForm = {
  customerId: "",
  productId: "",
  orderType: "normal",
  title: "",
  amount: "",
  currency: "USD",
  quantity: "",
  paymentStatus: "unpaid",
  productionStatus: "not_started",
  shippingStatus: "pending",
  afterSalesStatus: "none",
  orderStatus: "draft",
  expectedShipDate: "",
  expectedDeliveryDate: "",
  trackingNumber: "",
  notes: "",
  files: "",
  assignedTo: ""
};

const emptyOrderCostForm = {
  productCost: "",
  packagingCost: "",
  domesticShipping: "",
  internationalShipping: "",
  paymentFee: "",
  platformFee: "",
  refundAmount: "",
  reshipCost: "",
  otherCost: "",
  currency: "USD",
  notes: ""
};

const emptyReorderOpsFilters: ReorderOpsFilters = { organizationId: "", opportunityType: "", level: "", status: "" };
const emptyReorderCampaignForm = { organizationId: "", name: "", campaignType: "reorder", targetScope: "own", status: "draft" };
const emptyReorderPlaybookForm = { organizationId: "", title: "", scenario: "reorder_follow_up", language: "en", content: "", enabled: true };
const emptyAfterSalesFilters: AfterSalesFilters = { organizationId: "", customerId: "", orderId: "", productId: "", caseType: "", priority: "", status: "", responsibility: "", assignedTo: "", keyword: "" };
const emptyScriptTestFilters: ScriptTestFilters = { organizationId: "", scenario: "", status: "", targetLanguage: "" };
const emptySupplierFilters: SupplierFilters = { organizationId: "", status: "", riskLevel: "", tag: "", keyword: "", country: "", city: "" };
const emptySupplierForm = { organizationId: "", name: "", contactName: "", phone: "", email: "", whatsapp: "", wechat: "", country: "", city: "", website: "", tags: "", rating: "", status: "candidate", riskLevel: "", notes: "" };
const emptySupplierContactForm = { name: "", role: "", phone: "", email: "", whatsapp: "", wechat: "", notes: "" };
const emptySupplierQuoteForm = { supplierId: "", productId: "", sku: "", moq: "", unitCost: "", currency: "USD", leadTime: "", sampleFee: "", sampleLeadTime: "", bulkLeadTime: "", validUntil: "", notes: "", status: "active", orderId: "" };
const emptyPurchaseNoteForm = { supplierId: "", productId: "", orderId: "", sampleOrderId: "", customRequestId: "", noteType: "general", content: "" };
const emptySupplierRiskForm = { supplierId: "", riskType: "needs_review", level: "medium", description: "", status: "open" };
const emptySupplierScriptForm = { supplierId: "", productId: "", orderId: "", sampleOrderId: "", customRequestId: "", scenario: "ask_price", targetLanguage: "en", tone: "professional" };
const emptyBrandFilters: BrandFilters = { organizationId: "", status: "active", keyword: "" };
const emptyBrandForm = { organizationId: "", name: "", displayName: "", description: "", logoUrl: "", website: "", defaultLanguage: "en", defaultCurrency: "USD", country: "", status: "active", notes: "" };
const emptyBrandRuleForm = { ruleType: "quote_rule", title: "", content: "", language: "en", enabled: true };
const emptyBrandScriptLinkForm = { scriptId: "", scriptType: "script_org" };
const emptyBrandAssignmentForm = { entityType: "customer", entityId: "" };
const emptyAfterSalesForm = {
  customerId: "",
  orderId: "",
  productId: "",
  caseType: "quality_issue",
  priority: "medium",
  status: "open",
  responsibility: "unknown",
  requestedSolution: "",
  finalSolution: "",
  refundAmount: "",
  reshipCost: "",
  compensationAmount: "",
  currency: "USD",
  description: "",
  customerClaim: "",
  internalNotes: "",
  evidenceUrls: "",
  resolutionNotes: "",
  assignedTo: "",
  scriptScenario: "apologize_and_acknowledge"
};
const emptyScriptExperimentForm = {
  organizationId: "",
  name: "",
  scenario: "price_reply",
  description: "",
  status: "draft",
  targetLanguage: "en",
  targetCustomerStage: ""
};
const emptyScriptVariantForm = {
  title: "",
  versionLabel: "A",
  content: "",
  language: "en",
  tone: "professional",
  enabled: true
};

export function App() {
  const [view, setView] = useState<View>("dashboard");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });

  const [dashboard, setDashboard] = useState<WorkbenchDashboard | null>(null);
  const [teamSummary, setTeamSummary] = useState<TeamDashboardSummary | null>(null);
  const [reportSummary, setReportSummary] = useState<TeamDashboardSummary | null>(null);
  const [reportHighIntent, setReportHighIntent] = useState<TeamDashboardCustomer[]>([]);
  const [reportFilters, setReportFilters] = useState<ReportFilters>(emptyReportFilters);
  const [reportJob, setReportJob] = useState<ReportJobSummary | null>(null);
  const [highIntent, setHighIntent] = useState<CustomerSummary[]>([]);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [orgProducts, setOrgProducts] = useState<OrganizationProductSummary[]>([]);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseSummary[]>([]);
  const [orgKnowledgeBase, setOrgKnowledgeBase] = useState<KnowledgeBaseOrgSummary[]>([]);
  const [orgScripts, setOrgScripts] = useState<ScriptOrgSummary[]>([]);
  const [materials, setMaterials] = useState<MaterialSummary[]>([]);
  const [orgMaterials, setOrgMaterials] = useState<OrganizationMaterialSummary[]>([]);
  const [sampleOrders, setSampleOrders] = useState<SampleOrderSummary[]>([]);
  const [customRequests, setCustomRequests] = useState<CustomRequestSummary[]>([]);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [profitOrders, setProfitOrders] = useState<ProfitOrderRow[]>([]);
  const [profitSummary, setProfitSummary] = useState<ProfitSummary | null>(null);
  const [profitByProduct, setProfitByProduct] = useState<ProfitBreakdownRow[]>([]);
  const [profitByCustomer, setProfitByCustomer] = useState<ProfitBreakdownRow[]>([]);
  const [profitBySalesperson, setProfitBySalesperson] = useState<ProfitBreakdownRow[]>([]);
  const [selectedOrderCost, setSelectedOrderCost] = useState<OrderCostSummary | null>(null);
  const [profitReview, setProfitReview] = useState<ProfitReviewResponse | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogSummary[]>([]);
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLogSummary | null>(null);
  const [riskEvents, setRiskEvents] = useState<AuditLogSummary[]>([]);
  const [customerPredictions, setCustomerPredictions] = useState<CustomerPredictionSummary[]>([]);
  const [reorderReminders, setReorderReminders] = useState<ReorderReminderSummary[]>([]);
  const [productOpportunities, setProductOpportunities] = useState<ProductOpportunitySummary[]>([]);
  const [reorderOpportunities, setReorderOpportunities] = useState<ReorderOpportunitySummary[]>([]);
  const [reorderCampaigns, setReorderCampaigns] = useState<ReorderCampaignSummary[]>([]);
  const [reorderPlaybooks, setReorderPlaybooks] = useState<ReorderPlaybookSummary[]>([]);
  const [afterSalesCases, setAfterSalesCases] = useState<AfterSalesCaseSummary[]>([]);
  const [selectedAfterSalesCase, setSelectedAfterSalesCase] = useState<AfterSalesCaseDetail | null>(null);
  const [scriptExperiments, setScriptExperiments] = useState<ScriptExperimentSummary[]>([]);
  const [selectedScriptExperiment, setSelectedScriptExperiment] = useState<ScriptExperimentDetail | null>(null);
  const [scriptVariantDrafts, setScriptVariantDrafts] = useState<Array<{ versionLabel: string; title: string; content: string }>>([]);
  const [scriptUsageDraft, setScriptUsageDraft] = useState<ScriptUsageSummary | null>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);
  const [supplierScript, setSupplierScript] = useState("");
  const [supplierRiskWarnings, setSupplierRiskWarnings] = useState<string[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<any | null>(null);
  const [brandContext, setBrandContext] = useState<any | null>(null);
  const [enterpriseUnits, setEnterpriseUnits] = useState<OrganizationUnitSummary[]>([]);
  const [enterpriseMembers, setEnterpriseMembers] = useState<OrganizationMemberSummary[]>([]);
  const [enterpriseRoles, setEnterpriseRoles] = useState<EnterpriseRoleSummary[]>([]);
  const [enterpriseReports, setEnterpriseReports] = useState<EnterpriseReportSummary[]>([]);
  const [enterpriseAuditLogs, setEnterpriseAuditLogs] = useState<EnterpriseAuditLogSummary[]>([]);
  const [enterpriseBrandContext, setEnterpriseBrandContext] = useState<EnterpriseBrandContextResponse | null>(null);
  const [aiProviderKeys, setAiProviderKeys] = useState<AiProviderKeySummary[]>([]);
  const [aiModels, setAiModels] = useState<AiModelDefinition[]>([]);
  const [aiKeyImportContent, setAiKeyImportContent] = useState("");
  const [aiKeyImportFilename, setAiKeyImportFilename] = useState("");
  const [predictionScript, setPredictionScript] = useState("");
  const [predictionRiskWarnings, setPredictionRiskWarnings] = useState<string[]>([]);
  const [reorderOperationScript, setReorderOperationScript] = useState("");
  const [reorderOperationRiskWarnings, setReorderOperationRiskWarnings] = useState<string[]>([]);
  const [afterSalesScript, setAfterSalesScript] = useState("");
  const [afterSalesRiskWarnings, setAfterSalesRiskWarnings] = useState<string[]>([]);

  const [customerFilters, setCustomerFilters] = useState<CustomerFilters>(emptyCustomerFilters);
  const [productFilters, setProductFilters] = useState<ProductFilters>(emptyProductFilters);
  const [orgProductFilters, setOrgProductFilters] = useState<OrgProductFilters>(emptyOrgProductFilters);
  const [knowledgeFilters, setKnowledgeFilters] = useState<KnowledgeFilters>(emptyKnowledgeFilters);
  const [orgKnowledgeFilters, setOrgKnowledgeFilters] = useState<OrgContentFilters>(emptyOrgContentFilters);
  const [orgScriptFilters, setOrgScriptFilters] = useState<OrgContentFilters>(emptyOrgContentFilters);
  const [materialFilters, setMaterialFilters] = useState<MaterialFilters>(emptyMaterialFilters);
  const [orgMaterialFilters, setOrgMaterialFilters] = useState<OrgMaterialFilters>(emptyOrgMaterialFilters);
  const [sampleFilters, setSampleFilters] = useState<SampleFilters>(emptySampleFilters);
  const [customFilters, setCustomFilters] = useState<CustomFilters>(emptyCustomFilters);
  const [orderFilters, setOrderFilters] = useState<OrderFilters>(emptyOrderFilters);
  const [profitFilters, setProfitFilters] = useState<ProfitFilters>(emptyProfitFilters);
  const [auditLogFilters, setAuditLogFilters] = useState<AuditLogFilters>(emptyAuditLogFilters);
  const [predictionFilters, setPredictionFilters] = useState<PredictionFilters>(emptyPredictionFilters);
  const [reorderOpsFilters, setReorderOpsFilters] = useState<ReorderOpsFilters>(emptyReorderOpsFilters);
  const [afterSalesFilters, setAfterSalesFilters] = useState<AfterSalesFilters>(emptyAfterSalesFilters);
  const [scriptTestFilters, setScriptTestFilters] = useState<ScriptTestFilters>(emptyScriptTestFilters);
  const [supplierFilters, setSupplierFilters] = useState<SupplierFilters>(emptySupplierFilters);
  const [brandFilters, setBrandFilters] = useState<BrandFilters>(emptyBrandFilters);
  const [memberSearch, setMemberSearch] = useState("");
  const [roleSearch, setRoleSearch] = useState("");

  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedOrgProductId, setSelectedOrgProductId] = useState("");
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState("");
  const [selectedOrgKnowledgeId, setSelectedOrgKnowledgeId] = useState("");
  const [selectedOrgScriptId, setSelectedOrgScriptId] = useState("");
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [selectedOrgMaterialId, setSelectedOrgMaterialId] = useState("");
  const [selectedSampleOrderId, setSelectedSampleOrderId] = useState("");
  const [selectedCustomRequestId, setSelectedCustomRequestId] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedAfterSalesId, setSelectedAfterSalesId] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState("");

  const [customerForm, setCustomerForm] = useState<CustomerForm>(emptyCustomerForm);
  const [organizationForm, setOrganizationForm] = useState<OrganizationForm>(emptyOrganizationForm);
  const [organizationMembers, setOrganizationMembers] = useState<OrganizationMemberSummary[]>([]);
  const [memberForm, setMemberForm] = useState<OrganizationMemberForm>(emptyOrganizationMemberForm);
  const [roleForm, setRoleForm] = useState<RoleForm>(emptyRoleForm);
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm);
  const [orgProductForm, setOrgProductForm] = useState<OrgProductForm>(emptyOrgProductForm);
  const [quoteForm, setQuoteForm] = useState<QuoteForm>(emptyQuoteForm);
  const [knowledgeForm, setKnowledgeForm] = useState<KnowledgeForm>(emptyKnowledgeForm);
  const [orgKnowledgeForm, setOrgKnowledgeForm] = useState<OrgKnowledgeForm>(emptyOrgKnowledgeForm);
  const [orgScriptForm, setOrgScriptForm] = useState<OrgScriptForm>(emptyOrgScriptForm);
  const [materialForm, setMaterialForm] = useState<MaterialForm>(emptyMaterialForm);
  const [orgMaterialForm, setOrgMaterialForm] = useState<OrgMaterialForm>(emptyOrgMaterialForm);
  const [sampleForm, setSampleForm] = useState<SampleForm>(emptySampleForm);
  const [customForm, setCustomForm] = useState<CustomForm>(emptyCustomForm);
  const [orderForm, setOrderForm] = useState<OrderForm>(emptyOrderForm);
  const [orderCostForm, setOrderCostForm] = useState(emptyOrderCostForm);
  const [reorderCampaignForm, setReorderCampaignForm] = useState(emptyReorderCampaignForm);
  const [reorderPlaybookForm, setReorderPlaybookForm] = useState(emptyReorderPlaybookForm);
  const [afterSalesForm, setAfterSalesForm] = useState(emptyAfterSalesForm);
  const [scriptExperimentForm, setScriptExperimentForm] = useState(emptyScriptExperimentForm);
  const [scriptVariantForm, setScriptVariantForm] = useState(emptyScriptVariantForm);
  const [supplierForm, setSupplierForm] = useState(emptySupplierForm);
  const [supplierContactForm, setSupplierContactForm] = useState(emptySupplierContactForm);
  const [supplierQuoteForm, setSupplierQuoteForm] = useState(emptySupplierQuoteForm);
  const [purchaseNoteForm, setPurchaseNoteForm] = useState(emptyPurchaseNoteForm);
  const [supplierRiskForm, setSupplierRiskForm] = useState(emptySupplierRiskForm);
  const [supplierScriptForm, setSupplierScriptForm] = useState(emptySupplierScriptForm);
  const [brandForm, setBrandForm] = useState(emptyBrandForm);
  const [brandRuleForm, setBrandRuleForm] = useState(emptyBrandRuleForm);
  const [brandScriptLinkForm, setBrandScriptLinkForm] = useState(emptyBrandScriptLinkForm);
  const [brandAssignmentForm, setBrandAssignmentForm] = useState(emptyBrandAssignmentForm);
  const [enterpriseForm, setEnterpriseForm] = useState<EnterpriseForm>(emptyEnterpriseForm);
  const [enterpriseRoleForm, setEnterpriseRoleForm] = useState<EnterpriseRoleForm>(emptyEnterpriseRoleForm);
  const [enterpriseReportForm, setEnterpriseReportForm] = useState<EnterpriseReportForm>(emptyEnterpriseReportForm);
  const [aiKeyForm, setAiKeyForm] = useState<AiKeyForm>(emptyAiKeyForm);
  const [brandProductLinkId, setBrandProductLinkId] = useState("");
  const [brandMaterialLinkId, setBrandMaterialLinkId] = useState("");
  const [brandKnowledgeLinkId, setBrandKnowledgeLinkId] = useState("");
  const [orderScript, setOrderScript] = useState("");
  const [orderRiskWarnings, setOrderRiskWarnings] = useState<string[]>([]);
  const [fulfillmentBoard, setFulfillmentBoard] = useState<OrderFulfillmentBoardResponse | null>(null);
  const [fulfillmentAlerts, setFulfillmentAlerts] = useState<OrderFulfillmentAlertSummary[]>([]);

  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [customerQuotes, setCustomerQuotes] = useState<QuoteResponse[]>([]);
  const [customerFollowUps, setCustomerFollowUps] = useState<FollowUpSummary[]>([]);
  const [customerAssignmentLogs, setCustomerAssignmentLogs] = useState<CustomerAssignmentLogSummary[]>([]);
  const [customerDuplicateMatches, setCustomerDuplicateMatches] = useState<CustomerDuplicateMatch[]>([]);
  const [customerSampleOrders, setCustomerSampleOrders] = useState<SampleOrderSummary[]>([]);
  const [customerCustomRequests, setCustomerCustomRequests] = useState<CustomRequestSummary[]>([]);
  const [customerOrders, setCustomerOrders] = useState<OrderSummary[]>([]);
  const [customerIntent, setCustomerIntent] = useState<CustomerIntentResponse | null>(null);
  const [importType, setImportType] = useState<ImportExportType>("customers");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [organizationImportType, setOrganizationImportType] = useState<OrganizationImportExportType>("customer");
  const [organizationImportFile, setOrganizationImportFile] = useState<File | null>(null);
  const [importOrganizationId, setImportOrganizationId] = useState("");
  const [importSkipDuplicates, setImportSkipDuplicates] = useState(true);
  const [importResult, setImportResult] = useState<CsvImportResult | null>(null);
  const [organizationImportJob, setOrganizationImportJob] = useState<OrganizationImportJob | null>(null);
  const [organizationExportJob, setOrganizationExportJob] = useState<OrganizationExportJob | null>(null);

  const selectedCustomer = useMemo(() => customers.find((item) => item.id === selectedCustomerId), [customers, selectedCustomerId]);
  const selectedOrganization = useMemo(() => organizations.find((item) => item.id === selectedOrganizationId), [organizations, selectedOrganizationId]);
  const selectedProduct = useMemo(() => products.find((item) => item.id === selectedProductId), [products, selectedProductId]);
  const canManageSelectedOrganization = selectedOrganization?.currentUserRole === "owner" || selectedOrganization?.currentUserRole === "manager";
  const isSelectedOrganizationOwner = selectedOrganization?.currentUserRole === "owner";
  const canManageAiKeys = currentUser?.email?.toLowerCase() === "goseashop@gmail.com";

  useEffect(() => {
    void loadCurrentUser();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    void refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser || view !== "profit") return;
    void loadProfit(profitFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, selectedOrganizationId]);

  async function refreshAll() {
    await Promise.all([loadDashboard(), loadOrganizations(), loadCustomers(), loadProducts(), loadKnowledgeBase(), loadMaterials(), loadSampleOrders(), loadCustomRequests(), loadOrders(), loadFulfillmentBoard(), loadPredictions(), loadReorderOperations(), loadAfterSales(), loadScriptExperiments(), loadSuppliers(), loadBrands()]);
  }

  async function loadCurrentUser() {
    setAuthLoading(true);
    try {
      const result = await getMe();
      setCurrentUser(result.user);
    } catch {
      setCurrentUser(null);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await login(loginForm);
      setCurrentUser(result.user);
      setStatus("Login success. Data is isolated by current user.");
    } catch {
      setStatus("Login failed. Check email, password, API and database.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await logout();
    setCurrentUser(null);
    setOrganizations([]);
    setRoles([]);
    setCustomers([]);
    setProducts([]);
    setOrgProducts([]);
    setKnowledgeBase([]);
    setOrgKnowledgeBase([]);
    setOrgScripts([]);
    setMaterials([]);
    setOrgMaterials([]);
    setSampleOrders([]);
    setCustomRequests([]);
    setOrganizationMembers([]);
    setRoleForm(emptyRoleForm);
    setStatus("Logged out.");
  }

  async function loadDashboard() {
    try {
      const [nextDashboard, nextHighIntent] = await Promise.all([getWorkbenchDashboard(), getHighIntentCustomers(10)]);
      setDashboard(nextDashboard);
      setHighIntent(nextHighIntent);
    } catch {
      setDashboard(null);
      setHighIntent([]);
    }
  }

  async function loadCustomers(next = customerFilters) {
    setCustomerFilters(next);
    try {
      const list = await getCustomers(next);
      setCustomers(list);
      if (!selectedCustomerId && list[0]) await selectCustomer(list[0].id, list);
    } catch {
      setStatus("Customer list failed to load.");
    }
  }

  async function loadOrganizations() {
    try {
      const list = await getOrganizations();
      setOrganizations(list);
      if (!selectedOrganizationId && list[0]) await selectOrganization(list[0].id, list);
    } catch {
      setOrganizations([]);
      setOrganizationMembers([]);
      setStatus("Organization list failed to load.");
    }
  }

  async function selectOrganization(id: string, source = organizations) {
    setSelectedOrganizationId(id);
    try {
      const [detail, members] = await Promise.all([getOrganization(id), getOrganizationMembers(id, memberSearch)]);
      setOrganizationForm(toOrganizationForm(detail));
      setOrganizationMembers(members);
      setRoleForm((form) => ({ ...form, organizationId: id }));
      setOrgProductForm((form) => ({ ...form, organizationId: id }));
      setOrgKnowledgeForm((form) => ({ ...form, organizationId: id }));
      setOrgScriptForm((form) => ({ ...form, organizationId: id }));
      setOrgMaterialForm((form) => ({ ...form, organizationId: id }));
      setOrgProductFilters((filters) => ({ ...filters, organizationId: id }));
      setOrgKnowledgeFilters((filters) => ({ ...filters, organizationId: id }));
      setOrgScriptFilters((filters) => ({ ...filters, organizationId: id }));
      setOrgMaterialFilters((filters) => ({ ...filters, organizationId: id }));
      setAuditLogFilters((filters) => ({ ...filters, organizationId: id }));
      setReportFilters((filters) => ({ ...filters, organizationId: id }));
      setPredictionFilters((filters) => ({ ...filters, organizationId: id }));
      setAfterSalesFilters((filters) => ({ ...filters, organizationId: id }));
      setSupplierFilters((filters) => ({ ...filters, organizationId: id }));
      setBrandFilters((filters) => ({ ...filters, organizationId: id }));
      setBrandForm((form) => ({ ...form, organizationId: id }));
      setEnterpriseForm((form) => ({ ...form, organizationId: id }));
      setEnterpriseRoleForm((form) => ({ ...form, organizationId: id }));
      setEnterpriseReportForm((form) => ({ ...form, organizationId: id }));
      setAiKeyForm((form) => ({ ...form, organizationId: id }));
      setOrganizations((items) => items.map((item) => (item.id === detail.id ? { ...item, ...detail } : item)));
      await Promise.all([
        loadRoles(id),
        loadEnterpriseData(id),
        loadOrgProducts({ ...orgProductFilters, organizationId: id }),
        loadOrgKnowledgeBase({ ...orgKnowledgeFilters, organizationId: id }),
        loadOrgScriptsList({ ...orgScriptFilters, organizationId: id }),
        loadOrgMaterials({ ...orgMaterialFilters, organizationId: id }),
        loadAfterSales({ ...afterSalesFilters, organizationId: id }),
        loadAuditLogs({ ...auditLogFilters, organizationId: id }),
        loadRiskEvents(id),
        loadAiProviderKeys(id),
        loadTeamDashboard(id),
        loadReports({ ...reportFilters, organizationId: id }),
        loadPredictions({ ...predictionFilters, organizationId: id }),
        loadReorderOperations({ ...reorderOpsFilters, organizationId: id }),
        loadSuppliers({ ...supplierFilters, organizationId: id }),
        loadBrands({ ...brandFilters, organizationId: id })
      ]);
    } catch {
      const fallback = source.find((item) => item.id === id);
      if (fallback) setOrganizationForm(toOrganizationForm(fallback));
      setOrganizationMembers([]);
      setRoles([]);
      setOrgProducts([]);
      setOrgKnowledgeBase([]);
      setOrgScripts([]);
      setOrgMaterials([]);
      setAuditLogs([]);
      setTeamSummary(null);
      setReportSummary(null);
      setReportHighIntent([]);
      setCustomerPredictions([]);
      setReorderReminders([]);
      setProductOpportunities([]);
      setReorderOpportunities([]);
      setReorderCampaigns([]);
      setReorderPlaybooks([]);
      setEnterpriseUnits([]);
      setEnterpriseMembers([]);
      setEnterpriseRoles([]);
      setEnterpriseReports([]);
      setEnterpriseAuditLogs([]);
      setEnterpriseBrandContext(null);
      setAiProviderKeys([]);
    }
  }

  async function loadEnterpriseData(organizationId = selectedOrganizationId) {
    if (!organizationId) return;
    try {
      const [units, members, enterpriseRoleRows, reports, logs] = await Promise.all([
        getEnterpriseOrganizationUnits(organizationId),
        getEnterpriseMembers(organizationId),
        getEnterpriseRoles(organizationId),
        getEnterpriseReports(organizationId),
        getEnterpriseAuditLogs(organizationId)
      ]);
      setEnterpriseUnits(units);
      setEnterpriseMembers(members);
      setEnterpriseRoles(enterpriseRoleRows);
      setEnterpriseReports(reports);
      setEnterpriseAuditLogs(logs);
    } catch {
      setEnterpriseUnits([]);
      setEnterpriseMembers([]);
      setEnterpriseRoles([]);
      setEnterpriseReports([]);
      setEnterpriseAuditLogs([]);
      setStatus("Enterprise platform data failed to load.");
    }
  }

  async function loadAiProviderKeys(organizationId = selectedOrganizationId) {
    if (!organizationId) return;
    if (!canManageAiKeys) {
      setAiProviderKeys([]);
      return;
    }
    try {
      const [list, models] = await Promise.all([getAiProviderKeys({ organizationId }), getAiModels()]);
      setAiProviderKeys(list);
      setAiModels(models);
    } catch {
      setAiProviderKeys([]);
      setStatus("AI key pool failed to load. Only goseashop@gmail.com can manage AI keys.");
    }
  }

  async function saveAiProviderKey() {
    const organizationId = aiKeyForm.organizationId || selectedOrganizationId;
    if (!canManageAiKeys) return setStatus("AI key management is restricted to goseashop@gmail.com.");
    if (!organizationId) return setStatus("Select an organization first.");
    if (!aiKeyForm.apiKey.trim()) return setStatus("Paste an AI provider key before saving.");
    setLoading(true);
    try {
      await createAiProviderKey({
        organizationId,
        provider: aiKeyForm.provider,
        name: aiKeyForm.name,
        apiKey: aiKeyForm.apiKey.trim(),
        mode: aiKeyForm.mode,
        model: aiKeyForm.model,
        baseUrl: aiKeyForm.baseUrl,
        userEmail: aiKeyForm.userEmail,
        status: aiKeyForm.status,
        priority: Number(aiKeyForm.priority) || 100
      });
      setAiKeyForm({ ...emptyAiKeyForm, organizationId, mode: aiKeyForm.mode, provider: aiKeyForm.provider, model: aiKeyForm.model });
      await loadAiProviderKeys(organizationId);
      setStatus("AI key saved. The plaintext key is encrypted and will not be shown again.");
    } catch {
      setStatus("AI key save failed. Check goseashop permission and encryption secret.");
    } finally {
      setLoading(false);
    }
  }

  async function updateAiProviderKeyRecord(id: string, payload: Partial<AiKeyForm>) {
    if (!canManageAiKeys) return setStatus("AI key management is restricted to goseashop@gmail.com.");
    setLoading(true);
    try {
      await updateAiProviderKey(id, {
        name: payload.name,
        provider: payload.provider,
        mode: payload.mode,
        model: payload.model,
        baseUrl: payload.baseUrl,
        userEmail: payload.userEmail,
        status: payload.status,
        priority: payload.priority !== undefined ? Number(payload.priority) : undefined
      });
      await loadAiProviderKeys(selectedOrganizationId);
      setStatus("AI key updated.");
    } catch {
      setStatus("AI key update failed.");
    } finally {
      setLoading(false);
    }
  }

  async function disableAiProviderKeyRecord(id: string) {
    if (!canManageAiKeys) return setStatus("AI key management is restricted to goseashop@gmail.com.");
    if (!window.confirm("Disable this AI key? Existing usage stats will be kept.")) return;
    setLoading(true);
    try {
      await disableAiProviderKey(id);
      await loadAiProviderKeys(selectedOrganizationId);
      setStatus("AI key disabled.");
    } catch {
      setStatus("AI key disable failed.");
    } finally {
      setLoading(false);
    }
  }

  async function importAiKeyDocument() {
    const organizationId = aiKeyForm.organizationId || selectedOrganizationId;
    if (!canManageAiKeys) return setStatus("AI key management is restricted to goseashop@gmail.com.");
    if (!organizationId) return setStatus("Select an organization first.");
    if (!aiKeyImportContent.trim()) return setStatus("Paste or upload a JSON/YAML key document first.");
    setLoading(true);
    try {
      const result = await importAiProviderKeys({ organizationId, content: aiKeyImportContent, filename: aiKeyImportFilename });
      await loadAiProviderKeys(organizationId);
      setStatus(`Imported ${result.createdCount} AI keys. Failed rows: ${result.failedCount}.`);
    } catch {
      setStatus("AI key import failed. Check document format and goseashop permission.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAiKeyFile(file: File | null) {
    if (!file) return;
    setAiKeyImportFilename(file.name);
    setAiKeyImportContent(await file.text());
  }

  async function saveEnterpriseUnit() {
    const organizationId = enterpriseForm.organizationId || selectedOrganizationId;
    if (!organizationId) return setStatus("Select an organization first.");
    try {
      await createEnterpriseOrganizationUnit({ ...enterpriseForm, organizationId });
      setEnterpriseForm({ ...emptyEnterpriseForm, organizationId });
      await loadEnterpriseData(organizationId);
      setStatus("Enterprise organization unit saved.");
    } catch {
      setStatus("Enterprise organization unit save failed.");
    }
  }

  async function archiveEnterpriseUnit(id: string) {
    if (!window.confirm("Archive this enterprise organization unit?")) return;
    try {
      await updateEnterpriseOrganizationUnit(id, { status: "archived", confirm: true });
      await loadEnterpriseData(selectedOrganizationId);
      setStatus("Enterprise organization unit archived.");
    } catch {
      setStatus("Enterprise organization unit archive failed.");
    }
  }

  async function saveEnterpriseMember(userId?: string) {
    const organizationId = selectedOrganizationId;
    if (!organizationId) return setStatus("Select an organization first.");
    if (!userId) return setStatus("Enter a user ID.");
    try {
      await upsertEnterpriseMember({ organizationId, userId, role: "sales", status: "active" });
      await loadEnterpriseData(organizationId);
      setStatus("Enterprise member assigned.");
    } catch {
      setStatus("Enterprise member update failed.");
    }
  }

  async function updateEnterpriseMemberRecord(memberId: string, payload: { role?: string; status?: string }) {
    if (!window.confirm("This sensitive member change requires confirmation. Continue?")) return;
    try {
      await updateEnterpriseMember(memberId, { ...payload, confirm: true });
      await loadEnterpriseData(selectedOrganizationId);
      setStatus("Enterprise member updated.");
    } catch {
      setStatus("Enterprise member update failed.");
    }
  }

  async function saveEnterpriseRole() {
    const organizationId = enterpriseRoleForm.organizationId || selectedOrganizationId;
    if (!organizationId) return setStatus("Select an organization first.");
    try {
      await createEnterpriseRole({
        organizationId,
        roleName: enterpriseRoleForm.roleName,
        description: enterpriseRoleForm.description,
        permissions: splitLinesOrComma(enterpriseRoleForm.permissions)
      });
      setEnterpriseRoleForm({ ...emptyEnterpriseRoleForm, organizationId });
      await loadEnterpriseData(organizationId);
      setStatus("Enterprise role saved.");
    } catch {
      setStatus("Enterprise role save failed.");
    }
  }

  async function updateEnterpriseRoleRecord(roleId: string, permissions: string[]) {
    try {
      await updateEnterpriseRole(roleId, { permissions });
      await loadEnterpriseData(selectedOrganizationId);
      setStatus("Enterprise role updated.");
    } catch {
      setStatus("Enterprise role update failed.");
    }
  }

  async function createEnterpriseReportRecord() {
    const organizationId = enterpriseReportForm.organizationId || selectedOrganizationId;
    if (!organizationId) return setStatus("Select an organization first.");
    try {
      await createEnterpriseReport({ organizationId, reportType: enterpriseReportForm.reportType, filters: { generatedFrom: "web" } });
      await loadEnterpriseData(organizationId);
      setStatus("Enterprise report generated.");
    } catch {
      setStatus("Enterprise report generation failed.");
    }
  }

  async function loadEnterpriseBrandContext() {
    const organizationId = selectedOrganizationId;
    const brandId = selectedBrandId || selectedBrand?.id || brands[0]?.id;
    if (!organizationId || !brandId) return setStatus("Select an organization and brand first.");
    try {
      const context = await getEnterpriseBrandContext({ organizationId, brandId, scenario: "enterprise_summary", enterpriseContext: { source: "web" } });
      setEnterpriseBrandContext(context);
    } catch {
      setEnterpriseBrandContext(null);
      setStatus("Enterprise brand context failed to load.");
    }
  }

  async function loadPredictions(next = predictionFilters) {
    const organizationId = next.organizationId || selectedOrganizationId;
    const filters = { ...next, organizationId };
    setPredictionFilters(filters);
    try {
      const [predictions, reminders, opportunities] = await Promise.all([
        getCustomerPredictions({ ...filters, pageSize: "50" }),
        getReorderReminders({ organizationId, status: "pending", pageSize: "50" }),
        getProductOpportunities({ organizationId })
      ]);
      setCustomerPredictions(predictions);
      setReorderReminders(reminders);
      setProductOpportunities(opportunities);
    } catch {
      setCustomerPredictions([]);
      setReorderReminders([]);
      setProductOpportunities([]);
      setStatus("Prediction data failed to load or permission is insufficient.");
    }
  }

  async function loadRoles(organizationId = selectedOrganizationId, q = roleSearch) {
    if (!organizationId) {
      setRoles([]);
      return;
    }
    try {
      setRoles(await getRoles(organizationId, q));
    } catch {
      setRoles([]);
      setStatus("Roles failed to load.");
    }
  }

  async function loadAuditLogs(next = auditLogFilters) {
    const organizationId = next.organizationId || selectedOrganizationId;
    setAuditLogFilters({ ...next, organizationId });
    if (!organizationId) {
      setAuditLogs([]);
      setSelectedAuditLog(null);
      return;
    }
    try {
      const result = await getAuditLogs({ ...next, organizationId, pageSize: 50 });
      setAuditLogs(result.items);
      setSelectedAuditLog(result.items[0] || null);
    } catch {
      setAuditLogs([]);
      setSelectedAuditLog(null);
      setStatus("Audit logs failed to load.");
    }
  }

  async function loadRiskEvents(organizationId = selectedOrganizationId) {
    if (!organizationId) {
      setRiskEvents([]);
      return;
    }
    try {
      setRiskEvents(await getRiskEvents(organizationId));
    } catch {
      setRiskEvents([]);
      setStatus("Risk events failed to load or permission is insufficient.");
    }
  }

  async function loadTeamDashboard(organizationId = selectedOrganizationId) {
    if (!organizationId) {
      setTeamSummary(null);
      return;
    }
    try {
      setTeamSummary(await getTeamSummary(organizationId));
    } catch {
      setTeamSummary(null);
    }
  }

  async function loadReports(next = reportFilters) {
    const organizationId = next.organizationId || selectedOrganizationId;
    setReportFilters({ ...next, organizationId });
    if (!organizationId) {
      setReportSummary(null);
      setReportHighIntent([]);
      return;
    }
    try {
      const [summary, customers] = await Promise.all([
        getReportTeamSummary(organizationId),
        getReportHighIntentCustomers({
          organizationId,
          assignedTo: next.assignedTo,
          stage: next.stage,
          intentLevel: next.intentLevel
        })
      ]);
      setReportSummary(summary);
      setReportHighIntent(customers);
    } catch {
      setReportSummary(null);
      setReportHighIntent([]);
      setStatus("Reports failed to load. Owner or manager role is required.");
    }
  }

  async function selectAuditLog(id: string) {
    try {
      setSelectedAuditLog(await getAuditLog(id));
    } catch {
      setStatus("Audit log detail failed to load.");
    }
  }

  async function loadProducts(next = productFilters) {
    setProductFilters(next);
    try {
      const list = await getProducts(next);
      setProducts(list);
      if (!selectedProductId && list[0]) {
        setSelectedProductId(list[0].id);
        setProductForm(toProductForm(list[0]));
      }
    } catch {
      setStatus("Product list failed to load.");
    }
  }

  async function loadOrgProducts(next = orgProductFilters) {
    const organizationId = next.organizationId || selectedOrganizationId;
    setOrgProductFilters({ ...next, organizationId });
    if (!organizationId) {
      setOrgProducts([]);
      return;
    }
    try {
      setOrgProducts(await getOrganizationProducts({ organizationId, q: next.q, category: next.category }));
    } catch {
      setStatus("Organization products failed to load.");
    }
  }

  async function loadKnowledgeBase(next = knowledgeFilters) {
    setKnowledgeFilters(next);
    try {
      setKnowledgeBase(await getKnowledgeBase({
        q: next.q,
        category: next.category as KnowledgeBaseCategory | "",
        language: next.language as KnowledgeBaseLanguage | "",
        productId: next.productId
      }));
    } catch {
      setStatus("Knowledge base failed to load.");
    }
  }

  async function loadOrgKnowledgeBase(next = orgKnowledgeFilters) {
    const organizationId = next.organizationId || selectedOrganizationId;
    setOrgKnowledgeFilters({ ...next, organizationId });
    if (!organizationId) {
      setOrgKnowledgeBase([]);
      return;
    }
    try {
      setOrgKnowledgeBase(await getOrgKnowledgeBase({
        organizationId,
        q: next.q,
        category: next.category as KnowledgeBaseCategory | "",
        language: next.language as KnowledgeBaseLanguage | ""
      }));
    } catch {
      setStatus("Organization knowledge failed to load.");
    }
  }

  async function loadOrgScriptsList(next = orgScriptFilters) {
    const organizationId = next.organizationId || selectedOrganizationId;
    setOrgScriptFilters({ ...next, organizationId });
    if (!organizationId) {
      setOrgScripts([]);
      return;
    }
    try {
      setOrgScripts(await getOrgScripts({
        organizationId,
        q: next.q,
        category: next.category as ScriptOrgCategory | "",
        language: next.language as KnowledgeBaseLanguage | ""
      }));
    } catch {
      setStatus("Organization scripts failed to load.");
    }
  }

  async function loadMaterials(next = materialFilters) {
    setMaterialFilters(next);
    try {
      setMaterials(await getMaterials({
        q: next.q,
        type: next.type as MaterialType | "",
        language: next.language as MaterialLanguage | "",
        productId: next.productId,
        tag: next.tag
      }));
    } catch {
      setStatus("Materials failed to load.");
    }
  }

  async function loadOrgMaterials(next = orgMaterialFilters) {
    const organizationId = next.organizationId || selectedOrganizationId;
    setOrgMaterialFilters({ ...next, organizationId });
    if (!organizationId) {
      setOrgMaterials([]);
      return;
    }
    try {
      setOrgMaterials(await getOrganizationMaterials({ organizationId, q: next.q, type: next.type as MaterialType | "", productSku: next.productSku }));
    } catch {
      setStatus("Organization materials failed to load.");
    }
  }

  async function loadSampleOrders(next = sampleFilters) {
    setSampleFilters(next);
    try {
      setSampleOrders(await getSampleOrders({
        q: next.q,
        customerId: next.customerId,
        productId: next.productId,
        paymentStatus: next.paymentStatus as SamplePaymentStatus | "",
        shippingStatus: next.shippingStatus as SampleShippingStatus | "",
        feedbackStatus: next.feedbackStatus as SampleFeedbackStatus | ""
      }));
    } catch {
      setStatus("Sample orders failed to load.");
    }
  }

  async function loadCustomRequests(next = customFilters) {
    setCustomFilters(next);
    try {
      setCustomRequests(await getCustomRequests({
        q: next.q,
        customerId: next.customerId,
        productId: next.productId,
        requestType: next.requestType as CustomRequestType | "",
        status: next.status as CustomRequestStatus | ""
      }));
    } catch {
      setStatus("Custom requests failed to load.");
    }
  }

  async function loadOrders(next = orderFilters) {
    setOrderFilters(next);
    try {
      setOrders(await getOrders({
        organizationId: next.organizationId || selectedOrganizationId || undefined,
        customerId: next.customerId || undefined,
        assignedTo: next.assignedTo || undefined,
        orderType: next.orderType || undefined,
        orderStatus: next.orderStatus || undefined,
        paymentStatus: next.paymentStatus || undefined,
        productionStatus: next.productionStatus || undefined,
        shippingStatus: next.shippingStatus || undefined,
        afterSalesStatus: next.afterSalesStatus || undefined,
        keyword: next.keyword || undefined
      }));
    } catch {
      setStatus("Orders failed to load.");
    }
  }

  async function loadReorderOperations(next = reorderOpsFilters) {
    const organizationId = next.organizationId || selectedOrganizationId;
    const filters = { ...next, organizationId };
    setReorderOpsFilters(filters);
    try {
      const [opportunities, campaigns, playbooks] = await Promise.all([
        getReorderOpportunities({ ...filters, pageSize: "50" }),
        getReorderCampaigns({ organizationId }),
        getReorderPlaybooks({ organizationId })
      ]);
      setReorderOpportunities(opportunities);
      setReorderCampaigns(campaigns);
      setReorderPlaybooks(playbooks);
    } catch {
      setReorderOpportunities([]);
      setReorderCampaigns([]);
      setReorderPlaybooks([]);
      setStatus("Reorder operations failed to load or permission is insufficient.");
    }
  }

  async function loadAfterSales(next = afterSalesFilters) {
    const organizationId = next.organizationId || selectedOrganizationId;
    const filters = { ...next, organizationId };
    setAfterSalesFilters(filters);
    try {
      setAfterSalesCases(await getAfterSalesCases({
        organizationId: organizationId || undefined,
        customerId: filters.customerId || undefined,
        orderId: filters.orderId || undefined,
        productId: filters.productId || undefined,
        caseType: filters.caseType || undefined,
        priority: filters.priority || undefined,
        status: filters.status || undefined,
        responsibility: filters.responsibility || undefined,
        assignedTo: filters.assignedTo || undefined,
        keyword: filters.keyword || undefined,
        pageSize: "100"
      }));
    } catch {
      setAfterSalesCases([]);
      setStatus("After-sales cases failed to load or permission is insufficient.");
    }
  }

  async function loadScriptExperiments(next = scriptTestFilters) {
    const organizationId = next.organizationId || selectedOrganizationId;
    const filters = { ...next, organizationId };
    setScriptTestFilters(filters);
    try {
      setScriptExperiments(await getScriptExperiments({
        organizationId: organizationId || undefined,
        scenario: filters.scenario || undefined,
        status: filters.status || undefined,
        targetLanguage: filters.targetLanguage || undefined,
        pageSize: "100"
      }));
    } catch {
      setScriptExperiments([]);
      setStatus("A/B script experiments failed to load or permission is insufficient.");
    }
  }

  async function loadSuppliers(next = supplierFilters) {
    const organizationId = next.organizationId || selectedOrganizationId;
    const filters = { ...next, organizationId };
    setSupplierFilters(filters);
    try {
      const list = await getSuppliers({
        organizationId: organizationId || undefined,
        status: filters.status || undefined,
        riskLevel: filters.riskLevel || undefined,
        tag: filters.tag || undefined,
        keyword: filters.keyword || undefined,
        country: filters.country || undefined,
        city: filters.city || undefined,
        pageSize: "100"
      });
      setSuppliers(list);
      if (!selectedSupplierId && list[0]) await selectSupplierRecord(list[0].id);
    } catch {
      setSuppliers([]);
      setStatus("Supplier data failed to load or permission is insufficient.");
    }
  }

  async function selectSupplierRecord(id: string) {
    setSelectedSupplierId(id);
    try {
      const detail = await getSupplier(id);
      setSelectedSupplier(detail);
      setSupplierForm(toSupplierForm(detail));
      setSupplierQuoteForm((form) => ({ ...form, supplierId: detail.id }));
      setPurchaseNoteForm((form) => ({ ...form, supplierId: detail.id }));
      setSupplierRiskForm((form) => ({ ...form, supplierId: detail.id }));
      setSupplierScriptForm((form) => ({ ...form, supplierId: detail.id }));
    } catch {
      setSelectedSupplier(null);
      setStatus("Supplier detail failed to load.");
    }
  }

  async function loadBrands(next = brandFilters) {
    const filters = { ...next, organizationId: next.organizationId || selectedOrganizationId };
    setBrandFilters(filters);
    if (!filters.organizationId) return;
    try {
      const list = await getBrands({
        organizationId: filters.organizationId,
        status: filters.status || undefined,
        keyword: filters.keyword || undefined,
        pageSize: "50"
      });
      setBrands(list);
      if (!selectedBrandId && list[0]) await selectBrandRecord(list[0].id);
    } catch {
      setBrands([]);
      setStatus("Brand data failed to load or permission is insufficient.");
    }
  }

  async function selectBrandRecord(id: string) {
    setSelectedBrandId(id);
    try {
      const detail = await getBrand(id);
      setSelectedBrand(detail);
      setBrandForm(toBrandForm(detail));
      setBrandRuleForm(emptyBrandRuleForm);
      setBrandScriptLinkForm(emptyBrandScriptLinkForm);
      setBrandAssignmentForm(emptyBrandAssignmentForm);
      const context = await getBrandContext({ brandId: id });
      setBrandContext(context);
    } catch {
      setSelectedBrand(null);
      setBrandContext(null);
      setStatus("Brand detail failed to load.");
    }
  }

  async function loadFulfillmentBoard() {
    try {
      const board = await getOrderFulfillmentBoard({ organizationId: selectedOrganizationId || undefined });
      setFulfillmentBoard(board);
    } catch {
      setStatus("Fulfillment board failed to load.");
    }
  }

  async function loadProfit(next = profitFilters) {
    setProfitFilters(next);
    const organizationId = next.organizationId || selectedOrganizationId || undefined;
    try {
      const [summary, rows, byProduct, byCustomer, bySalesperson] = await Promise.all([
        getProfitSummary({ organizationId }),
        getProfitOrders({ organizationId, assignedTo: next.assignedTo || undefined, marginLevel: next.marginLevel || undefined, costConfirmed: next.costConfirmed || undefined }),
        getProfitByProduct({ organizationId }),
        getProfitByCustomer({ organizationId }),
        getProfitBySalesperson({ organizationId }).catch(() => [])
      ]);
      setProfitSummary(summary);
      setProfitOrders(rows);
      setProfitByProduct(byProduct);
      setProfitByCustomer(byCustomer);
      setProfitBySalesperson(bySalesperson);
    } catch {
      setStatus("Profit review data failed to load. Check role permission and selected organization.");
    }
  }

  async function openOrderCost(orderId: string) {
    setSelectedOrderId(orderId);
    setProfitReview(null);
    try {
      const cost = await getOrderCost(orderId);
      setSelectedOrderCost(cost);
      setOrderCostForm({
        productCost: cost.costItems.productCost || "",
        packagingCost: cost.costItems.packagingCost || "",
        domesticShipping: cost.costItems.domesticShipping || "",
        internationalShipping: cost.costItems.internationalShipping || "",
        paymentFee: cost.costItems.paymentFee || "",
        platformFee: cost.costItems.platformFee || "",
        refundAmount: cost.costItems.refundAmount || "",
        reshipCost: cost.costItems.reshipCost || "",
        otherCost: cost.costItems.otherCost || "",
        currency: cost.costCurrency || cost.currency || "USD",
        notes: cost.notes || ""
      });
      setStatus("Cost review loaded. Confirm values manually before using margin.");
    } catch {
      setStatus("Cost review failed to load or permission denied.");
    }
  }

  async function saveOrderCost() {
    if (!selectedOrderId) return;
    setLoading(true);
    try {
      const saved = await upsertOrderCost(selectedOrderId, orderCostForm);
      setSelectedOrderCost(saved);
      await loadProfit(profitFilters);
      setStatus("Order cost saved. Cost confirmation is still manual.");
    } catch {
      setStatus("Save order cost failed. Check permission and numeric fields.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmSelectedOrderCost() {
    if (!selectedOrderId) return;
    setLoading(true);
    try {
      const saved = await confirmOrderCost(selectedOrderId);
      setSelectedOrderCost(saved);
      await loadProfit(profitFilters);
      setStatus("Order cost confirmed manually.");
    } catch {
      setStatus("Confirm order cost failed. Manager/ owner permission may be required.");
    } finally {
      setLoading(false);
    }
  }

  async function removeSelectedOrderCost() {
    if (!selectedOrderId) return;
    setLoading(true);
    try {
      await deleteOrderCost(selectedOrderId);
      setSelectedOrderCost(null);
      setOrderCostForm(emptyOrderCostForm);
      await loadProfit(profitFilters);
      setStatus("Order cost deleted after confirmation.");
    } catch {
      setStatus("Delete order cost failed. Owner permission and confirmation are required.");
    } finally {
      setLoading(false);
    }
  }

  async function runProfitReview(orderId = selectedOrderId) {
    if (!orderId) return;
    setLoading(true);
    try {
      const review = await generateProfitReview({ orderId, scope: "order", targetLanguage: "English" });
      setProfitReview(review);
      setStatus("AI profit review generated as operational advice only.");
    } catch {
      setStatus("AI profit review failed. Check order access and profit permission.");
    } finally {
      setLoading(false);
    }
  }

  async function selectCustomer(id: string, source = customers) {
    setSelectedCustomerId(id);
    setQuoteForm((form) => ({ ...form, customerId: id }));
    setSampleForm((form) => ({ ...form, customerId: id }));
    setCustomForm((form) => ({ ...form, customerId: id }));
    setOrderForm((form) => ({ ...form, customerId: id }));
    setAfterSalesForm((form) => ({ ...form, customerId: id }));
    try {
      const [detail, quotes, followUps, samples, customItems, customerOrderItems, intent, cases] = await Promise.all([
        getCustomer(id),
        getCustomerQuotes(id),
        getFollowUps({ customerId: id }),
        getSampleOrders({ customerId: id }),
        getCustomRequests({ customerId: id }),
        getOrders({ customerId: id, organizationId: selectedOrganizationId || undefined }),
        getCustomerIntent(id),
        getAfterSalesCases({ customerId: id, organizationId: selectedOrganizationId || undefined })
      ]);
      setCustomerForm(toCustomerForm(detail));
      setCustomerQuotes(quotes);
      setCustomerFollowUps(followUps);
      setCustomerAssignmentLogs(detail.assignmentLogs || []);
      setCustomerSampleOrders(samples);
      setCustomerCustomRequests(customItems);
      setCustomerOrders(customerOrderItems);
      setCustomerIntent(intent);
      setAfterSalesCases((items) => {
        const other = items.filter((item) => item.customerId !== id);
        return [...cases, ...other];
      });
    } catch {
      const fallback = source.find((item) => item.id === id);
      if (fallback) setCustomerForm(toCustomerForm(fallback));
      setCustomerQuotes([]);
      setCustomerAssignmentLogs([]);
      setCustomerSampleOrders([]);
      setCustomerCustomRequests([]);
      setCustomerOrders([]);
      setCustomerIntent(null);
    }
  }

  function selectProduct(product: ProductSummary) {
    setSelectedProductId(product.id);
    setProductForm(toProductForm(product));
    setQuoteForm((form) => ({
      ...form,
      productId: product.id,
      unitPrice: product.suggestedPrice || form.unitPrice,
      moq: product.moq ? String(product.moq) : form.moq,
      leadTime: product.leadTime || form.leadTime
    }));
    setSampleForm((form) => ({ ...form, productId: product.id }));
    setCustomForm((form) => ({ ...form, productId: product.id }));
    setOrderForm((form) => ({ ...form, productId: product.id }));
  }

  async function saveOrganizationRecord() {
    if (!organizationForm.name.trim()) return setStatus("Organization name is required.");
    setLoading(true);
    try {
      const payload: OrganizationUpsertRequest = { name: organizationForm.name.trim() };
      const saved = selectedOrganizationId ? await updateOrganization(selectedOrganizationId, payload) : await createOrganization(payload);
      setSelectedOrganizationId(saved.id);
      setOrganizationForm(toOrganizationForm(saved));
      setOrganizationMembers(saved.members || []);
      await loadOrganizations();
      setStatus("Organization saved.");
    } catch {
      setStatus("Organization save failed. Only owners can update organization info.");
    } finally {
      setLoading(false);
    }
  }

  async function removeOrganizationRecord() {
    if (!selectedOrganizationId || !window.confirm("Delete this organization?")) return;
    setLoading(true);
    try {
      await deleteOrganization(selectedOrganizationId);
      setSelectedOrganizationId("");
      setOrganizationForm(emptyOrganizationForm);
      setOrganizationMembers([]);
      await loadOrganizations();
      setStatus("Organization deleted.");
    } catch {
      setStatus("Organization delete failed. Owner role is required.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshOrganizationMembers() {
    if (!selectedOrganizationId) return;
    try {
      setOrganizationMembers(await getOrganizationMembers(selectedOrganizationId, memberSearch));
    } catch {
      setStatus("Organization members failed to load.");
    }
  }

  async function addMemberRecord() {
    if (!selectedOrganizationId) return setStatus("Select an organization first.");
    if (!memberForm.userId.trim()) return setStatus("User ID is required.");
    setLoading(true);
    try {
      await addOrganizationMember(selectedOrganizationId, {
        userId: memberForm.userId.trim(),
        role: memberForm.role,
        status: memberForm.status
      });
      setMemberForm(emptyOrganizationMemberForm);
      await selectOrganization(selectedOrganizationId);
      setStatus("Member added.");
    } catch {
      setStatus("Member add failed. Check user ID, duplicate member, and your role.");
    } finally {
      setLoading(false);
    }
  }

  async function updateMemberRecord(memberId: string, payload: OrganizationMemberUpdateRequest) {
    if (!selectedOrganizationId) return;
    setLoading(true);
    try {
      await updateOrganizationMember(selectedOrganizationId, memberId, payload);
      await selectOrganization(selectedOrganizationId);
      setStatus("Member updated.");
    } catch {
      setStatus("Member update failed. Owner or manager role is required.");
    } finally {
      setLoading(false);
    }
  }

  async function removeMemberRecord(memberId: string) {
    if (!selectedOrganizationId || !window.confirm("Remove this member?")) return;
    setLoading(true);
    try {
      await deleteOrganizationMember(selectedOrganizationId, memberId);
      await selectOrganization(selectedOrganizationId);
      setStatus("Member removed.");
    } catch {
      setStatus("Member remove failed. Owner or manager role is required.");
    } finally {
      setLoading(false);
    }
  }

  async function saveRoleRecord() {
    const organizationId = roleForm.organizationId || selectedOrganizationId;
    if (!organizationId) return setStatus("Select an organization first.");
    if (!roleForm.description.trim()) return setStatus("Role description is required.");
    setLoading(true);
    try {
      const payload: RoleUpsertRequest = {
        organizationId,
        name: roleForm.name,
        description: roleForm.description.trim()
      };
      const saved = selectedRoleId ? await updateRole(selectedRoleId, { description: payload.description }) : await createRole(payload);
      setSelectedRoleId(saved.id);
      setRoleForm(toRoleForm(saved));
      await loadRoles(organizationId);
      setStatus("Role saved. API permissions remain enforced on the server.");
    } catch {
      setStatus("Role save failed. Owner role is required and role names must be owner/manager/sales/support.");
    } finally {
      setLoading(false);
    }
  }

  async function removeRoleRecord() {
    if (!selectedRoleId || !window.confirm("Delete this role configuration?")) return;
    setLoading(true);
    try {
      await deleteRole(selectedRoleId);
      setSelectedRoleId("");
      setRoleForm({ ...emptyRoleForm, organizationId: selectedOrganizationId });
      await loadRoles(selectedOrganizationId);
      setStatus("Role deleted.");
    } catch {
      setStatus("Role delete failed. Owner role is required.");
    } finally {
      setLoading(false);
    }
  }

  async function saveCustomerRecord() {
    if (!customerForm.name.trim()) return setStatus("Customer name is required.");
    setLoading(true);
    try {
      const duplicate = await checkCustomerDuplicate({
        ...toCustomerPayload(customerForm),
        customerId: selectedCustomerId || null
      });
      setCustomerDuplicateMatches(duplicate.matches);
      if (duplicate.hasDuplicate) {
        setStatus("Duplicate customer detected. Check owner / assigned user before saving.");
        return;
      }
      const saved = selectedCustomerId
        ? await updateCustomer(selectedCustomerId, toCustomerPayload(customerForm))
        : await createCustomer(toCustomerPayload(customerForm));
      setSelectedCustomerId(saved.id);
      setCustomerForm(toCustomerForm(saved));
      setCustomerDuplicateMatches([]);
      await loadCustomers(customerFilters);
      await selectCustomer(saved.id);
      setStatus("Customer saved.");
    } catch {
      setStatus("Customer save failed.");
    } finally {
      setLoading(false);
    }
  }

  async function assignSelectedCustomer() {
    if (!selectedCustomerId || !customerForm.assignedTo.trim()) return setStatus("Select customer and assigned user first.");
    setLoading(true);
    try {
      const saved = await assignCustomer(selectedCustomerId, {
        assignedTo: customerForm.assignedTo.trim(),
        note: "Assigned from web dashboard"
      });
      setCustomerForm(toCustomerForm(saved));
      await loadCustomers(customerFilters);
      await selectCustomer(saved.id);
      setStatus("Customer assigned and assignment log saved.");
    } catch {
      setStatus("Customer assignment failed. Owner or manager role is required, and assigned user must be in the organization.");
    } finally {
      setLoading(false);
    }
  }

  async function removeCustomer() {
    if (!selectedCustomerId || !window.confirm("Delete this customer?")) return;
    await deleteCustomer(selectedCustomerId);
    setSelectedCustomerId("");
    setCustomerForm(emptyCustomerForm);
    await loadCustomers(customerFilters);
    setStatus("Customer deleted.");
  }

  async function saveProductRecord() {
    if (!productForm.name.trim() || !productForm.sku.trim()) return setStatus("Product name and SKU are required.");
    setLoading(true);
    try {
      const saved = selectedProductId
        ? await updateProduct(selectedProductId, toProductPayload(productForm))
        : await createProduct(toProductPayload(productForm));
      setSelectedProductId(saved.id);
      setProductForm(toProductForm(saved));
      await loadProducts(productFilters);
      setStatus("Product saved.");
    } catch {
      setStatus("Product save failed. Check SKU uniqueness and required fields.");
    } finally {
      setLoading(false);
    }
  }

  async function removeProduct() {
    if (!selectedProductId || !window.confirm("Delete this product?")) return;
    await deleteProduct(selectedProductId);
    setSelectedProductId("");
    setProductForm(emptyProductForm);
    await loadProducts(productFilters);
    setStatus("Product deleted.");
  }

  async function saveOrgProductRecord() {
    const organizationId = orgProductForm.organizationId || selectedOrganizationId;
    if (!organizationId) return setStatus("Select an organization first.");
    setLoading(true);
    try {
      if (selectedOrgProductId) {
        const saved = await updateOrganizationProduct(selectedOrgProductId, toProductPayload(productForm));
        setProductForm(toProductForm(saved.product));
      } else {
        if (!orgProductForm.productId) return setStatus("Select a personal product to share.");
        const saved = await createOrganizationProduct({ organizationId, productId: orgProductForm.productId });
        setSelectedOrgProductId(saved.id);
        setOrgProductForm({ organizationId, productId: saved.productId });
        setProductForm(toProductForm(saved.product));
      }
      await loadOrgProducts({ ...orgProductFilters, organizationId });
      setStatus("Organization product saved. Team members can read it; no WhatsApp message was sent.");
    } catch {
      setStatus("Organization product save failed. Check role, ownership, duplicate sharing, and SKU.");
    } finally {
      setLoading(false);
    }
  }

  async function removeOrgProduct(id: string) {
    await deleteOrganizationProduct(id);
    if (selectedOrgProductId === id) {
      setSelectedOrgProductId("");
      setOrgProductForm({ ...emptyOrgProductForm, organizationId: selectedOrganizationId });
    }
    await loadOrgProducts(orgProductFilters);
    setStatus("Organization product removed from shared library.");
  }

  async function generateAndSaveQuote() {
    if (!quoteForm.productId || !quoteForm.customerId) return setStatus("Customer and product are required for quote.");
    setLoading(true);
    try {
      const payload = toQuotePayload(quoteForm);
      const generated = await generateQuote(payload);
      const saved = await saveQuote({ ...payload, customerId: quoteForm.customerId, quoteText: generated.quoteText });
      setQuote(saved);
      await selectCustomer(quoteForm.customerId);
      await loadDashboard();
      setStatus("Quote generated and saved as draft text. No WhatsApp message was sent.");
    } catch {
      setStatus("Quote generation failed.");
    } finally {
      setLoading(false);
    }
  }

  async function saveKnowledgeRecord() {
    if (!knowledgeForm.title.trim() || !knowledgeForm.content.trim()) return setStatus("Knowledge title and content are required.");
    setLoading(true);
    try {
      const payload: KnowledgeBaseUpsertRequest = {
        title: knowledgeForm.title,
        category: knowledgeForm.category,
        content: knowledgeForm.content,
        language: knowledgeForm.language,
        productId: knowledgeForm.productId || null,
        enabled: knowledgeForm.enabled
      };
      const saved = selectedKnowledgeId ? await updateKnowledgeBaseItem(selectedKnowledgeId, payload) : await createKnowledgeBaseItem(payload);
      setSelectedKnowledgeId(saved.id);
      setKnowledgeForm(toKnowledgeForm(saved));
      await loadKnowledgeBase(knowledgeFilters);
      setStatus("Knowledge saved. AI only uses it as draft context.");
    } catch {
      setStatus("Knowledge save failed.");
    } finally {
      setLoading(false);
    }
  }

  async function removeKnowledge(id: string) {
    await deleteKnowledgeBaseItem(id);
    if (selectedKnowledgeId === id) {
      setSelectedKnowledgeId("");
      setKnowledgeForm(emptyKnowledgeForm);
    }
    await loadKnowledgeBase(knowledgeFilters);
  }

  async function saveOrgKnowledgeRecord() {
    const organizationId = orgKnowledgeForm.organizationId || selectedOrganizationId;
    if (!organizationId) return setStatus("Select an organization first.");
    if (!orgKnowledgeForm.title.trim() || !orgKnowledgeForm.content.trim()) return setStatus("Organization knowledge title and content are required.");
    setLoading(true);
    try {
      const payload = {
        organizationId,
        title: orgKnowledgeForm.title,
        category: orgKnowledgeForm.category,
        content: orgKnowledgeForm.content,
        language: orgKnowledgeForm.language,
        enabled: orgKnowledgeForm.enabled
      };
      const saved = selectedOrgKnowledgeId ? await updateOrgKnowledgeBaseItem(selectedOrgKnowledgeId, payload) : await createOrgKnowledgeBaseItem(payload);
      setSelectedOrgKnowledgeId(saved.id);
      setOrgKnowledgeForm(toOrgKnowledgeForm(saved));
      await loadOrgKnowledgeBase({ ...orgKnowledgeFilters, organizationId });
      setStatus("Organization knowledge saved. AI uses it as draft context only.");
    } catch {
      setStatus("Organization knowledge save failed.");
    } finally {
      setLoading(false);
    }
  }

  async function removeOrgKnowledge(id: string) {
    await deleteOrgKnowledgeBaseItem(id);
    if (selectedOrgKnowledgeId === id) {
      setSelectedOrgKnowledgeId("");
      setOrgKnowledgeForm({ ...emptyOrgKnowledgeForm, organizationId: selectedOrganizationId });
    }
    await loadOrgKnowledgeBase(orgKnowledgeFilters);
  }

  async function saveOrgScriptRecord() {
    const organizationId = orgScriptForm.organizationId || selectedOrganizationId;
    if (!organizationId) return setStatus("Select an organization first.");
    if (!orgScriptForm.title.trim() || !orgScriptForm.content.trim()) return setStatus("Organization script title and content are required.");
    setLoading(true);
    try {
      const payload = {
        organizationId,
        title: orgScriptForm.title,
        category: orgScriptForm.category,
        content: orgScriptForm.content,
        language: orgScriptForm.language,
        enabled: orgScriptForm.enabled
      };
      const saved = selectedOrgScriptId ? await updateOrgScript(selectedOrgScriptId, payload) : await createOrgScript(payload);
      setSelectedOrgScriptId(saved.id);
      setOrgScriptForm(toOrgScriptForm(saved));
      await loadOrgScriptsList({ ...orgScriptFilters, organizationId });
      setStatus("Organization script saved. Scripts are drafts only.");
    } catch {
      setStatus("Organization script save failed.");
    } finally {
      setLoading(false);
    }
  }

  async function removeOrgScript(id: string) {
    await deleteOrgScript(id);
    if (selectedOrgScriptId === id) {
      setSelectedOrgScriptId("");
      setOrgScriptForm({ ...emptyOrgScriptForm, organizationId: selectedOrganizationId });
    }
    await loadOrgScriptsList(orgScriptFilters);
  }

  async function saveMaterialRecord() {
    if (!materialForm.title.trim() || !materialForm.url.trim()) return setStatus("Material title and URL are required.");
    setLoading(true);
    try {
      const payload: MaterialUpsertRequest = {
        title: materialForm.title,
        type: materialForm.type,
        url: materialForm.url,
        description: materialForm.description || null,
        language: materialForm.language,
        productId: materialForm.productId || null,
        tags: splitLinesOrComma(materialForm.tags)
      };
      const saved = selectedMaterialId ? await updateMaterial(selectedMaterialId, payload) : await createMaterial(payload);
      setSelectedMaterialId(saved.id);
      setMaterialForm(toMaterialForm(saved));
      await loadMaterials(materialFilters);
      setStatus("Material saved. Material intro remains a draft only.");
    } catch {
      setStatus("Material save failed.");
    } finally {
      setLoading(false);
    }
  }

  async function generateMaterialDescription(id = selectedMaterialId) {
    if (!id) return setStatus("Select a material first.");
    setLoading(true);
    try {
      const result = await generateMaterialIntro(id, {
        customerLanguage: selectedCustomer?.language || materialForm.language,
        productContext: selectedProduct ? `${selectedProduct.name} ${selectedProduct.sku}` : "",
        useKnowledgeBase: true
      });
      setMaterialForm((form) => ({ ...form, description: result.introText }));
      setStatus(`Material draft generated. ${result.riskWarnings[0] || ""}`);
    } catch {
      setStatus("Material draft generation failed.");
    } finally {
      setLoading(false);
    }
  }

  async function removeMaterial(id: string) {
    await deleteMaterial(id);
    if (selectedMaterialId === id) {
      setSelectedMaterialId("");
      setMaterialForm(emptyMaterialForm);
    }
    await loadMaterials(materialFilters);
  }

  async function saveOrgMaterialRecord() {
    const organizationId = orgMaterialForm.organizationId || selectedOrganizationId;
    if (!organizationId) return setStatus("Select an organization first.");
    setLoading(true);
    try {
      const payload: MaterialUpsertRequest = {
        title: materialForm.title,
        type: materialForm.type,
        url: materialForm.url,
        description: materialForm.description || null,
        language: materialForm.language,
        productId: materialForm.productId || null,
        tags: splitLinesOrComma(materialForm.tags)
      };
      if (selectedOrgMaterialId) {
        const saved = await updateOrganizationMaterial(selectedOrgMaterialId, payload);
        setMaterialForm(toMaterialForm(saved.material));
      } else {
        if (!orgMaterialForm.materialId) return setStatus("Select a personal material to share.");
        const saved = await createOrganizationMaterial({ organizationId, materialId: orgMaterialForm.materialId });
        setSelectedOrgMaterialId(saved.id);
        setOrgMaterialForm({ organizationId, materialId: saved.materialId });
        setMaterialForm(toMaterialForm(saved.material));
      }
      await loadOrgMaterials({ ...orgMaterialFilters, organizationId });
      setStatus("Organization material saved. It remains a draft resource only.");
    } catch {
      setStatus("Organization material save failed. Check role, ownership, duplicate sharing, and URL.");
    } finally {
      setLoading(false);
    }
  }

  async function removeOrgMaterial(id: string) {
    await deleteOrganizationMaterial(id);
    if (selectedOrgMaterialId === id) {
      setSelectedOrgMaterialId("");
      setOrgMaterialForm({ ...emptyOrgMaterialForm, organizationId: selectedOrganizationId });
    }
    await loadOrgMaterials(orgMaterialFilters);
    setStatus("Organization material removed from shared library.");
  }

  async function saveSampleRecord() {
    if (!sampleForm.customerId || !sampleForm.sampleName.trim()) return setStatus("Customer and sample name are required.");
    setLoading(true);
    try {
      const payload: SampleOrderUpsertRequest = {
        customerId: sampleForm.customerId,
        productId: sampleForm.productId || null,
        sampleName: sampleForm.sampleName,
        sampleFee: sampleForm.sampleFee || null,
        shippingCost: sampleForm.shippingCost || null,
        currency: sampleForm.currency || "USD",
        paymentStatus: sampleForm.paymentStatus,
        shippingStatus: sampleForm.shippingStatus,
        trackingNumber: sampleForm.trackingNumber || null,
        feedbackStatus: sampleForm.feedbackStatus,
        expectedShipDate: sampleForm.expectedShipDate || null,
        expectedDeliveryDate: sampleForm.expectedDeliveryDate || null,
        notes: sampleForm.notes || null
      };
      const saved = selectedSampleOrderId ? await updateSampleOrder(selectedSampleOrderId, payload) : await createSampleOrder(payload);
      setSelectedSampleOrderId(saved.id);
      setSampleForm(toSampleForm(saved));
      await loadSampleOrders(sampleFilters);
      if (sampleForm.customerId) await selectCustomer(sampleForm.customerId);
      setStatus("Sample order saved.");
    } catch {
      setStatus("Sample order save failed.");
    } finally {
      setLoading(false);
    }
  }

  async function generateSelectedSampleScript(scenario: SampleScriptScenario) {
    if (!selectedSampleOrderId) return setStatus("Select or save a sample order first.");
    setLoading(true);
    try {
      const result = await generateSampleScript(selectedSampleOrderId, {
        scenario,
        customerLanguage: selectedCustomer?.language || "English",
        productContext: selectedProduct ? `${selectedProduct.name} ${selectedProduct.sku}` : ""
      });
      setSampleForm((form) => ({ ...form, notes: result.scriptText }));
      setStatus(`Sample script generated as draft. ${result.riskWarnings[0] || ""}`);
    } catch {
      setStatus("Sample script generation failed.");
    } finally {
      setLoading(false);
    }
  }

  async function removeSample(id: string) {
    await deleteSampleOrder(id);
    if (selectedSampleOrderId === id) {
      setSelectedSampleOrderId("");
      setSampleForm(emptySampleForm);
    }
    await loadSampleOrders(sampleFilters);
  }

  async function saveCustomRecord() {
    if (!customForm.customerId) return setStatus("Customer is required for custom request.");
    setLoading(true);
    try {
      const payload = toCustomPayload(customForm);
      const saved = selectedCustomRequestId ? await updateCustomRequest(selectedCustomRequestId, payload) : await createCustomRequest(payload);
      setSelectedCustomRequestId(saved.id);
      setCustomForm(toCustomForm(saved));
      await loadCustomRequests(customFilters);
      if (customForm.customerId) await selectCustomer(customForm.customerId);
      setStatus("Custom request saved. It is only a sales record, not production scheduling.");
    } catch {
      setStatus("Custom request save failed. Check customer/product ownership and required fields.");
    } finally {
      setLoading(false);
    }
  }

  async function generateSelectedCustomScript(scenario: CustomScriptScenario) {
    if (!selectedCustomRequestId) return setStatus("Select or save a custom request first.");
    setLoading(true);
    try {
      const result = await generateCustomScript(selectedCustomRequestId, {
        scenario,
        customerLanguage: selectedCustomer?.language || "English",
        productContext: selectedProduct ? `${selectedProduct.name} ${selectedProduct.sku}` : ""
      });
      setCustomForm((form) => ({ ...form, notes: result.scriptText }));
      setStatus(`Custom script generated as draft. ${result.riskWarnings[0] || ""}`);
    } catch {
      setStatus("Custom script generation failed.");
    } finally {
      setLoading(false);
    }
  }

  async function removeCustom(id: string) {
    await deleteCustomRequest(id);
    if (selectedCustomRequestId === id) {
      setSelectedCustomRequestId("");
      setCustomForm(emptyCustomForm);
    }
    await loadCustomRequests(customFilters);
  }

  async function saveOrderRecord() {
    if (!orderForm.customerId) return setStatus("Customer is required for an order.");
    setLoading(true);
    try {
      const payload: OrderUpsertRequest = {
        customerId: orderForm.customerId,
        productId: orderForm.productId || null,
        orderType: orderForm.orderType,
        title: orderForm.title || null,
        amount: orderForm.amount || null,
        currency: orderForm.currency || "USD",
        quantity: orderForm.quantity ? Number(orderForm.quantity) : null,
        paymentStatus: orderForm.paymentStatus,
        productionStatus: orderForm.productionStatus,
        shippingStatus: orderForm.shippingStatus,
        afterSalesStatus: orderForm.afterSalesStatus,
        orderStatus: orderForm.orderStatus,
        expectedShipDate: orderForm.expectedShipDate || null,
        expectedDeliveryDate: orderForm.expectedDeliveryDate || null,
        trackingNumber: orderForm.trackingNumber || null,
        notes: orderForm.notes || null,
        files: splitLinesOrComma(orderForm.files),
        assignedTo: orderForm.assignedTo || null
      };
      const saved = selectedOrderId ? await updateOrder(selectedOrderId, payload) : await createOrder(payload);
      setSelectedOrderId(saved.id);
      setOrderForm(toOrderForm(saved));
      setOrderRiskWarnings((saved as unknown as { riskWarnings?: string[] }).riskWarnings || []);
      await loadOrders(orderFilters);
      if (orderForm.customerId) await selectCustomer(orderForm.customerId);
      setStatus("Order saved. Order status is manually maintained; no WhatsApp message was sent.");
    } catch {
      setStatus("Order save failed. Check customer/product permission and required fields.");
    } finally {
      setLoading(false);
    }
  }

  async function selectOrderRecord(id: string) {
    setSelectedOrderId(id);
    const [detail, fulfillment] = await Promise.all([getOrder(id), getOrderFulfillment(id).catch(() => null)]);
    setOrderForm(toOrderForm(detail));
    setFulfillmentAlerts(fulfillment?.alerts || []);
    setOrderRiskWarnings([]);
    setOrderScript("");
  }

  async function removeOrder(id: string) {
    await deleteOrder(id);
    if (selectedOrderId === id) {
      setSelectedOrderId("");
      setOrderForm(emptyOrderForm);
      setOrderScript("");
      setOrderRiskWarnings([]);
    }
    await loadOrders(orderFilters);
    if (selectedCustomerId) await selectCustomer(selectedCustomerId);
    setStatus("Order deleted after confirmation.");
  }

  async function convertQuoteToOrder(quoteId: string) {
    setLoading(true);
    try {
      const saved = await createOrderFromQuote(quoteId);
      setSelectedOrderId(saved.id);
      setOrderForm(toOrderForm(saved));
      setOrderRiskWarnings((saved as unknown as { riskWarnings?: string[] }).riskWarnings || []);
      await loadOrders(orderFilters);
      if (saved.customerId) await selectCustomer(saved.customerId);
      setStatus("Quote converted to order draft. Confirm price, shipping, inventory and lead time.");
    } catch {
      setStatus("Quote-to-order failed.");
    } finally {
      setLoading(false);
    }
  }

  async function convertSampleToOrder(sampleOrderId: string) {
    setLoading(true);
    try {
      const saved = await createOrderFromSample(sampleOrderId);
      setSelectedOrderId(saved.id);
      setOrderForm(toOrderForm(saved));
      setOrderRiskWarnings((saved as unknown as { riskWarnings?: string[] }).riskWarnings || []);
      await loadOrders(orderFilters);
      if (saved.customerId) await selectCustomer(saved.customerId);
      setStatus("Sample converted to bulk order draft. Confirm quantity and amount.");
    } catch {
      setStatus("Sample-to-order failed.");
    } finally {
      setLoading(false);
    }
  }

  async function convertCustomToOrder(customRequestId: string) {
    setLoading(true);
    try {
      const saved = await createOrderFromCustomRequest(customRequestId);
      setSelectedOrderId(saved.id);
      setOrderForm(toOrderForm(saved));
      setOrderRiskWarnings((saved as unknown as { riskWarnings?: string[] }).riskWarnings || []);
      await loadOrders(orderFilters);
      if (saved.customerId) await selectCustomer(saved.customerId);
      setStatus("Custom request converted to order draft. Confirm amount, MOQ and production lead time.");
    } catch {
      setStatus("Custom-to-order failed.");
    } finally {
      setLoading(false);
    }
  }

  async function updateSelectedOrderStatus(kind: "payment" | "production" | "shipping" | "afterSales", value: string) {
    if (!selectedOrderId) return setStatus("Select or save an order first.");
    const saved =
      kind === "payment" ? await updateOrderPaymentStatus(selectedOrderId, value) :
      kind === "production" ? await updateOrderProductionStatus(selectedOrderId, value, orderForm.notes) :
      kind === "shipping" ? await updateOrderShippingStatus(selectedOrderId, value, orderForm.trackingNumber) :
      await updateOrderAfterSalesStatus(selectedOrderId, value);
    setOrderForm(toOrderForm(saved));
    setOrderRiskWarnings((saved as unknown as { riskWarnings?: string[] }).riskWarnings || []);
    await loadOrders(orderFilters);
    setStatus("Order status updated. Confirm the real-world facts before messaging the customer.");
  }

  async function recalculateSelectedFulfillment() {
    if (!selectedOrderId) return setStatus("Select an order first.");
    const result = await recalculateOrderFulfillmentAlerts(selectedOrderId);
    setFulfillmentAlerts(result.alerts);
    await loadFulfillmentBoard();
    setStatus("Fulfillment alerts recalculated. No order status was changed automatically.");
  }

  async function updateFulfillmentAlertStatus(id: string, statusValue: "dismissed" | "resolved" | "task_created") {
    const updated = await updateOrderFulfillmentAlert(id, statusValue);
    setFulfillmentAlerts((items) => items.map((item) => item.id === id ? updated : item));
    await loadFulfillmentBoard();
    setStatus("Fulfillment alert updated and audited.");
  }

  async function generateSelectedOrderScript(scenario: OrderScriptScenario) {
    if (!selectedOrderId) return setStatus("Select or save an order first.");
    setLoading(true);
    try {
      const result = await generateOrderScript({
        orderId: selectedOrderId,
        scenario,
        targetLanguage: selectedCustomer?.language || "English",
        tone: "professional"
      });
      setOrderScript(result.scriptText);
      setOrderRiskWarnings(result.riskWarnings);
      setStatus("Order script generated as draft only. Confirm payment, production, shipping and after-sales details before sending.");
    } catch {
      setStatus("Order script generation failed.");
    } finally {
      setLoading(false);
    }
  }

  async function generateSelectedFulfillmentScript(scenario: OrderFulfillmentScriptScenario) {
    if (!selectedOrderId) return setStatus("Select or save an order first.");
    setLoading(true);
    try {
      const result = await generateOrderFulfillmentScript({
        orderId: selectedOrderId,
        alertId: fulfillmentAlerts[0]?.id || null,
        scenario,
        targetLanguage: selectedCustomer?.language || "English",
        tone: "professional"
      });
      setOrderScript(result.scriptText);
      setOrderRiskWarnings(result.riskWarnings);
      setStatus("Fulfillment script generated as draft only. Confirm payment, production, shipping and after-sales details before sending.");
    } catch {
      setStatus("Fulfillment script generation failed.");
    } finally {
      setLoading(false);
    }
  }

  async function createFollowUpFromSelectedOrder() {
    if (!selectedOrderId) return setStatus("Select or save an order first.");
    await createOrderFollowUpTask(selectedOrderId, orderScript || orderForm.notes);
    await loadDashboard();
    if (selectedCustomerId) await selectCustomer(selectedCustomerId);
    setStatus("Order follow-up task created by manual click only.");
  }

  async function createFulfillmentFollowUpFromSelectedOrder() {
    if (!selectedOrderId) return setStatus("Select or save an order first.");
    await createOrderFulfillmentFollowUp(selectedOrderId, {
      taskType: "delivery_follow_up",
      recommendedScript: orderScript || orderForm.notes,
      alertId: fulfillmentAlerts[0]?.id || null
    });
    await loadDashboard();
    await loadFulfillmentBoard();
    if (selectedOrderId) await selectOrderRecord(selectedOrderId);
    if (selectedCustomerId) await selectCustomer(selectedCustomerId);
    setStatus("Fulfillment follow-up task created by manual click only.");
  }

  async function createCustomFollowUp() {
    if (!customForm.customerId) return setStatus("Select a customer before creating a follow-up.");
    await createFollowUp({
      customerId: customForm.customerId,
      taskType: FOLLOW_UP_TYPES[5],
      remindAt: tomorrowIso(),
      recommendedScript: customForm.notes || "Please confirm the custom requirements, files, MOQ, sample fee and lead time."
    });
    await loadDashboard();
    await selectCustomer(customForm.customerId);
    setStatus("Custom follow-up reminder created. No WhatsApp message was sent.");
  }

  async function refreshIntent() {
    if (!selectedCustomerId) return;
    const result = await recalculateCustomerIntent(selectedCustomerId);
    setCustomerIntent(result);
    await loadCustomers(customerFilters);
    await loadDashboard();
    setStatus("Intent score recalculated. It is only a sales assistant signal.");
  }

  async function runPredictionRecalculate(customerId?: string) {
    setLoading(true);
    try {
      const payload = customerId
        ? { customerId }
        : { organizationId: predictionFilters.organizationId || selectedOrganizationId || null };
      const result = await recalculatePredictions(payload);
      await loadPredictions(predictionFilters);
      setStatus(`Prediction recalculated. Created ${result.createdCount}, updated ${result.updatedCount}, skipped ${result.skippedCount}.`);
    } catch {
      setStatus("Prediction recalculation failed. Check role and customer access.");
    } finally {
      setLoading(false);
    }
  }

  async function changePredictionStatus(id: string, nextStatus: "open" | "dismissed" | "converted" | "task_created") {
    setLoading(true);
    try {
      await updateCustomerPrediction(id, nextStatus);
      await loadPredictions(predictionFilters);
      setStatus(`Prediction marked as ${nextStatus}. No WhatsApp message was sent.`);
    } catch {
      setStatus("Prediction status update failed.");
    } finally {
      setLoading(false);
    }
  }

  async function createReminderFromPrediction(prediction: CustomerPredictionSummary) {
    setLoading(true);
    try {
      const saved = await createReorderReminder({
        customerId: prediction.customerId,
        reminderType: predictionToReminderType(prediction.predictionType),
        remindAt: tomorrowIso(),
        reason: prediction.recommendedAction || prediction.reasons[0] || "Manual reorder follow-up",
        suggestedScript: prediction.suggestedScript || null
      });
      await updateCustomerPrediction(prediction.id, "task_created");
      await loadPredictions(predictionFilters);
      setStatus(`Reorder reminder created for ${saved.customerName}. It requires manual follow-up.`);
    } catch {
      setStatus("Create reorder reminder failed. Check customer access and permissions.");
    } finally {
      setLoading(false);
    }
  }

  async function generatePredictionScript(prediction: CustomerPredictionSummary) {
    setLoading(true);
    try {
      const result = await generateReorderScript({
        customerId: prediction.customerId,
        reminderType: predictionToScriptType(prediction.predictionType),
        targetLanguage: selectedCustomer?.language || "English",
        tone: "professional"
      });
      setPredictionScript(result.scriptText);
      setPredictionRiskWarnings(result.riskWarnings);
      setStatus("Reorder script generated as draft only. Confirm details before sending manually.");
    } catch {
      setStatus("Generate reorder script failed.");
    } finally {
      setLoading(false);
    }
  }

  async function changeReminderStatus(id: string, nextStatus: "pending" | "completed" | "dismissed" | "converted") {
    setLoading(true);
    try {
      await updateReorderReminder(id, nextStatus);
      await loadPredictions(predictionFilters);
      setStatus(`Reorder reminder marked as ${nextStatus}.`);
    } catch {
      setStatus("Reorder reminder update failed.");
    } finally {
      setLoading(false);
    }
  }

  async function createFollowUpFromReminder(id: string) {
    setLoading(true);
    try {
      await createReorderFollowUpTask(id);
      await Promise.all([loadDashboard(), loadPredictions(predictionFilters)]);
      if (selectedCustomerId) await selectCustomer(selectedCustomerId);
      setStatus("Follow-up task created by manual click. No WhatsApp message was sent.");
    } catch {
      setStatus("Create follow-up task failed.");
    } finally {
      setLoading(false);
    }
  }

  async function runReorderOpsRecalculate(customerId?: string) {
    setLoading(true);
    try {
      const payload = customerId
        ? { customerId }
        : { organizationId: reorderOpsFilters.organizationId || selectedOrganizationId || null };
      const result = await recalculateReorderOpportunities(payload);
      await loadReorderOperations(reorderOpsFilters);
      setStatus(`Reorder opportunities recalculated. Created ${result.createdCount}, updated ${result.updatedCount}, skipped ${result.skippedCount}.`);
    } catch {
      setStatus("Reorder opportunity recalculation failed. Check role and customer access.");
    } finally {
      setLoading(false);
    }
  }

  async function changeReorderOpportunityStatus(id: string, nextStatus: string) {
    setLoading(true);
    try {
      await updateReorderOpportunity(id, nextStatus);
      await loadReorderOperations(reorderOpsFilters);
      setStatus(`Reorder opportunity marked as ${nextStatus}. No WhatsApp message was sent.`);
    } catch {
      setStatus("Reorder opportunity update failed.");
    } finally {
      setLoading(false);
    }
  }

  async function createFollowUpFromOpportunity(opportunity: ReorderOpportunitySummary) {
    setLoading(true);
    try {
      await createReorderOpportunityFollowUpTask(opportunity.id, {
        remindAt: tomorrowIso(),
        recommendedScript: opportunity.suggestedScript || opportunity.recommendedAction || "",
        confirm: true
      });
      await Promise.all([loadDashboard(), loadReorderOperations(reorderOpsFilters)]);
      setStatus("Reorder opportunity converted to FollowUpTask by manual click. No message was sent.");
    } catch {
      setStatus("Create FollowUpTask from reorder opportunity failed.");
    } finally {
      setLoading(false);
    }
  }

  async function generateReorderOpsScript(opportunity: ReorderOpportunitySummary) {
    setLoading(true);
    try {
      const result = await generateReorderOperationScript({
        customerId: opportunity.customerId,
        productId: opportunity.productId || null,
        opportunityId: opportunity.id,
        scenario: opportunityToScriptScenario(opportunity.opportunityType),
        targetLanguage: selectedCustomer?.language || "English",
        tone: "professional"
      });
      setReorderOperationScript(result.scriptText);
      setReorderOperationRiskWarnings(result.riskWarnings);
      setStatus("Reorder operation script generated as draft only.");
    } catch {
      setStatus("Generate reorder operation script failed.");
    } finally {
      setLoading(false);
    }
  }

  async function saveReorderCampaign(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await createReorderCampaign({
        organizationId: reorderCampaignForm.organizationId || selectedOrganizationId || null,
        name: reorderCampaignForm.name,
        campaignType: reorderCampaignForm.campaignType,
        targetScope: reorderCampaignForm.targetScope,
        status: reorderCampaignForm.status
      });
      setReorderCampaignForm(emptyReorderCampaignForm);
      await loadReorderOperations(reorderOpsFilters);
      setStatus("Reorder campaign saved. It does not auto-send or auto-create tasks.");
    } catch {
      setStatus("Save reorder campaign failed.");
    } finally {
      setLoading(false);
    }
  }

  async function saveReorderPlaybook(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await createReorderPlaybook({
        organizationId: reorderPlaybookForm.organizationId || selectedOrganizationId || null,
        title: reorderPlaybookForm.title,
        scenario: reorderPlaybookForm.scenario,
        language: reorderPlaybookForm.language,
        content: reorderPlaybookForm.content,
        enabled: reorderPlaybookForm.enabled
      });
      setReorderPlaybookForm(emptyReorderPlaybookForm);
      await loadReorderOperations(reorderOpsFilters);
      setStatus("Reorder playbook saved. Scripts remain drafts only.");
    } catch {
      setStatus("Save reorder playbook failed.");
    } finally {
      setLoading(false);
    }
  }

  async function selectAfterSalesRecord(id: string) {
    setSelectedAfterSalesId(id);
    try {
      const detail = await getAfterSalesCase(id);
      setSelectedAfterSalesCase(detail);
      setAfterSalesForm(toAfterSalesForm(detail));
      setAfterSalesRiskWarnings(detail.riskWarnings || []);
      setAfterSalesScript("");
    } catch {
      setStatus("After-sales detail failed to load.");
    }
  }

  async function saveAfterSalesRecord(event?: FormEvent) {
    event?.preventDefault();
    if (!afterSalesForm.customerId) return setStatus("Customer is required for after-sales case.");
    setLoading(true);
    try {
      const payload = afterSalesPayload(afterSalesForm);
      const saved = selectedAfterSalesId
        ? await updateAfterSalesCase(selectedAfterSalesId, { ...payload, confirm: true, notes: afterSalesForm.internalNotes })
        : await createAfterSalesCase(payload as any);
      setSelectedAfterSalesId(saved.id);
      setSelectedAfterSalesCase(saved);
      setAfterSalesForm(toAfterSalesForm(saved));
      setAfterSalesRiskWarnings(saved.riskWarnings || []);
      await Promise.all([loadAfterSales(afterSalesFilters), loadOrders(orderFilters)]);
      if (saved.customerId) await selectCustomer(saved.customerId);
      setStatus("After-sales case saved. No refund, reship, responsibility confirmation or WhatsApp message was automated.");
    } catch {
      setStatus("Save after-sales case failed. Check customer/order permission and required fields.");
    } finally {
      setLoading(false);
    }
  }

  async function removeAfterSalesRecord(id: string) {
    if (!window.confirm("Delete this after-sales case? This requires confirmation and is audited.")) return;
    await deleteAfterSalesCase(id);
    if (selectedAfterSalesId === id) {
      setSelectedAfterSalesId("");
      setSelectedAfterSalesCase(null);
      setAfterSalesForm(emptyAfterSalesForm);
      setAfterSalesScript("");
      setAfterSalesRiskWarnings([]);
    }
    await loadAfterSales(afterSalesFilters);
    setStatus("After-sales case deleted after manual confirmation.");
  }

  async function changeAfterSalesStatus(id: string, status: string) {
    setLoading(true);
    try {
      const saved = await updateAfterSalesStatus(id, {
        status,
        notes: afterSalesForm.resolutionNotes || afterSalesForm.internalNotes || "Manual status update.",
        resolutionNotes: afterSalesForm.resolutionNotes || afterSalesForm.internalNotes,
        confirm: status === "closed" ? true : undefined
      });
      setSelectedAfterSalesCase(saved);
      setAfterSalesForm(toAfterSalesForm(saved));
      setAfterSalesRiskWarnings(saved.riskWarnings || []);
      await loadAfterSales(afterSalesFilters);
      setStatus("After-sales status updated manually.");
    } catch {
      setStatus("After-sales status update failed.");
    } finally {
      setLoading(false);
    }
  }

  async function changeAfterSalesResponsibility() {
    if (!selectedAfterSalesId) return setStatus("Select an after-sales case first.");
    setLoading(true);
    try {
      const saved = await updateAfterSalesResponsibility(selectedAfterSalesId, {
        responsibility: afterSalesForm.responsibility,
        notes: afterSalesForm.internalNotes,
        confirm: true
      });
      setSelectedAfterSalesCase(saved);
      setAfterSalesRiskWarnings(saved.riskWarnings || []);
      await loadAfterSales(afterSalesFilters);
      setStatus("Responsibility updated manually. AI did not decide responsibility.");
    } catch {
      setStatus("Responsibility update failed. Owner/manager permission may be required.");
    } finally {
      setLoading(false);
    }
  }

  async function changeAfterSalesSolution(syncOrderCost = false) {
    if (!selectedAfterSalesId) return setStatus("Select an after-sales case first.");
    setLoading(true);
    try {
      const saved = await updateAfterSalesSolution(selectedAfterSalesId, {
        finalSolution: afterSalesForm.finalSolution,
        refundAmount: afterSalesForm.refundAmount || undefined,
        reshipCost: afterSalesForm.reshipCost || undefined,
        compensationAmount: afterSalesForm.compensationAmount || undefined,
        currency: afterSalesForm.currency || undefined,
        notes: afterSalesForm.resolutionNotes || afterSalesForm.internalNotes,
        syncOrderCost,
        confirm: true
      });
      setSelectedAfterSalesCase(saved);
      setAfterSalesForm(toAfterSalesForm(saved));
      setAfterSalesRiskWarnings(saved.riskWarnings || []);
      await Promise.all([loadAfterSales(afterSalesFilters), loadProfit(profitFilters)]);
      setStatus(syncOrderCost ? "After-sales solution saved and cost sync requested after confirmation." : "After-sales solution saved after confirmation.");
    } catch {
      setStatus("Solution update failed. Owner/manager permission may be required.");
    } finally {
      setLoading(false);
    }
  }

  async function createAfterSalesTask() {
    if (!selectedAfterSalesId) return setStatus("Select an after-sales case first.");
    setLoading(true);
    try {
      await createAfterSalesFollowUpTask(selectedAfterSalesId, {
        remindAt: tomorrowIso(),
        taskType: "after_sales_follow_up",
        recommendedScript: afterSalesScript || "Draft only: follow up on after-sales case after confirming company policy and case status.",
        confirm: true
      });
      await Promise.all([loadDashboard(), loadAfterSales(afterSalesFilters)]);
      setStatus("After-sales FollowUpTask created by manual click. No message was sent.");
    } catch {
      setStatus("Create after-sales follow-up failed.");
    } finally {
      setLoading(false);
    }
  }

  async function generateAfterSalesDraft() {
    if (!selectedAfterSalesId) return setStatus("Select an after-sales case first.");
    setLoading(true);
    try {
      const result = await generateAfterSalesScript({
        afterSalesCaseId: selectedAfterSalesId,
        scenario: afterSalesForm.scriptScenario as AfterSalesScriptScenario,
        targetLanguage: selectedCustomer?.language || "English",
        tone: "professional"
      });
      setAfterSalesScript(result.scriptText);
      setAfterSalesRiskWarnings(result.riskWarnings);
      setStatus("After-sales script generated as draft only. Confirm policy before sending.");
    } catch {
      setStatus("After-sales script generation failed.");
    } finally {
      setLoading(false);
    }
  }

  async function saveSupplierRecord(event: FormEvent) {
    event.preventDefault();
    if (!supplierForm.name.trim()) return setStatus("Supplier name is required.");
    setLoading(true);
    try {
      const payload = {
        ...supplierForm,
        organizationId: supplierForm.organizationId || selectedOrganizationId || null,
        tags: splitLinesOrComma(supplierForm.tags),
        rating: optionalNumber(supplierForm.rating)
      };
      const saved = selectedSupplierId ? await updateSupplier(selectedSupplierId, { ...payload, confirm: true }) : await createSupplier(payload);
      await loadSuppliers(supplierFilters);
      await selectSupplierRecord(saved.id);
      setStatus("Supplier saved. No supplier contact, purchase order, payment, or WhatsApp message was automated.");
    } catch {
      setStatus("Save supplier failed. Check duplicate supplier, role permission, and required fields.");
    } finally {
      setLoading(false);
    }
  }

  async function deactivateSupplierRecord() {
    if (!selectedSupplierId) return setStatus("Select a supplier first.");
    if (!window.confirm("Deactivate this supplier? This requires confirmation and is audited.")) return;
    setLoading(true);
    try {
      const saved = await deleteSupplier(selectedSupplierId);
      await loadSuppliers(supplierFilters);
      setSelectedSupplier(saved);
      setSupplierForm(toSupplierForm(saved));
      setStatus("Supplier deactivated after manual confirmation.");
    } catch {
      setStatus("Deactivate supplier failed.");
    } finally {
      setLoading(false);
    }
  }

  async function addSupplierContact() {
    if (!selectedSupplierId) return setStatus("Select a supplier first.");
    setLoading(true);
    try {
      await createSupplierContact(selectedSupplierId, supplierContactForm);
      setSupplierContactForm(emptySupplierContactForm);
      await selectSupplierRecord(selectedSupplierId);
      setStatus("Supplier contact saved. Sensitive contact data remains permission controlled.");
    } catch {
      setStatus("Save supplier contact failed.");
    } finally {
      setLoading(false);
    }
  }

  async function addSupplierQuote() {
    if (!selectedSupplierId) return setStatus("Select a supplier first.");
    setLoading(true);
    try {
      await createSupplierQuote({ ...supplierQuoteForm, supplierId: selectedSupplierId, productId: supplierQuoteForm.productId || null });
      setSupplierQuoteForm({ ...emptySupplierQuoteForm, supplierId: selectedSupplierId });
      await selectSupplierRecord(selectedSupplierId);
      setStatus("Supplier quote saved as cost reference only. It did not update product price or order cost.");
    } catch {
      setStatus("Save supplier quote failed. Check product access and numeric fields.");
    } finally {
      setLoading(false);
    }
  }

  async function applySelectedSupplierQuote(quoteId: string) {
    if (!supplierQuoteForm.orderId) return setStatus("Enter an order ID before applying supplier cost.");
    if (!window.confirm("Apply this supplier quote to order cost? It will not confirm true cost or supplier payment.")) return;
    setLoading(true);
    try {
      const result = await applySupplierQuoteToOrderCost(quoteId, { orderId: supplierQuoteForm.orderId });
      setSupplierRiskWarnings(result.riskWarnings || []);
      await Promise.all([selectSupplierRecord(selectedSupplierId), loadProfit(profitFilters)]);
      setStatus("Supplier quote applied to order cost after manual confirmation. Cost is still unconfirmed.");
    } catch {
      setStatus("Apply supplier quote to order cost failed. Check order access and confirmed-cost permissions.");
    } finally {
      setLoading(false);
    }
  }

  async function addPurchaseNote() {
    setLoading(true);
    try {
      await createPurchaseNote({ ...purchaseNoteForm, supplierId: purchaseNoteForm.supplierId || selectedSupplierId || null });
      setPurchaseNoteForm({ ...emptyPurchaseNoteForm, supplierId: selectedSupplierId });
      if (selectedSupplierId) await selectSupplierRecord(selectedSupplierId);
      setStatus("Purchase note saved. It did not create a purchase order or contact the supplier.");
    } catch {
      setStatus("Save purchase note failed.");
    } finally {
      setLoading(false);
    }
  }

  async function addSupplierRisk() {
    if (!selectedSupplierId) return setStatus("Select a supplier first.");
    setLoading(true);
    try {
      await createSupplierRisk({ ...supplierRiskForm, supplierId: selectedSupplierId });
      setSupplierRiskForm({ ...emptySupplierRiskForm, supplierId: selectedSupplierId });
      await selectSupplierRecord(selectedSupplierId);
      setStatus("Supplier risk saved for manual review.");
    } catch {
      setStatus("Save supplier risk failed.");
    } finally {
      setLoading(false);
    }
  }

  async function generateSupplierDraft() {
    setLoading(true);
    try {
      const result = await generateSupplierScript({
        ...supplierScriptForm,
        supplierId: supplierScriptForm.supplierId || selectedSupplierId || null,
        productId: supplierScriptForm.productId || null,
        orderId: supplierScriptForm.orderId || null,
        sampleOrderId: supplierScriptForm.sampleOrderId || null,
        customRequestId: supplierScriptForm.customRequestId || null
      });
      setSupplierScript(result.scriptText || "");
      setSupplierRiskWarnings(result.riskWarnings || []);
      setStatus("Supplier procurement script generated as draft only. Confirm cost, MOQ, lead time and quality before sending.");
    } catch {
      setStatus("Supplier script generation failed.");
    } finally {
      setLoading(false);
    }
  }

  async function saveBrandRecord(event: FormEvent) {
    event.preventDefault();
    if (!brandForm.name.trim()) return setStatus("Brand name is required.");
    setLoading(true);
    try {
      const payload = { ...brandForm, organizationId: brandForm.organizationId || selectedOrganizationId };
      const saved = selectedBrandId ? await updateBrand(selectedBrandId, { ...payload, confirm: true }) : await createBrand(payload);
      await loadBrands(brandFilters);
      await selectBrandRecord(saved.id);
      setStatus("Brand saved. It only controls drafts, resource filtering and policy context; no WhatsApp account was switched.");
    } catch {
      setStatus("Save brand failed. Check duplicate name, organization and role permission.");
    } finally {
      setLoading(false);
    }
  }

  async function archiveSelectedBrand() {
    if (!selectedBrandId) return setStatus("Select a brand first.");
    if (!window.confirm("Archive this brand/store? It will stop being recommended for AI context.")) return;
    setLoading(true);
    try {
      await archiveBrand(selectedBrandId);
      await loadBrands(brandFilters);
      setStatus("Brand archived after manual confirmation.");
    } catch {
      setStatus("Archive brand failed.");
    } finally {
      setLoading(false);
    }
  }

  async function addBrandProductLink() {
    if (!selectedBrandId || !brandProductLinkId) return setStatus("Select a brand and product first.");
    try {
      await linkBrandProduct(selectedBrandId, brandProductLinkId);
      setBrandProductLinkId("");
      await selectBrandRecord(selectedBrandId);
      setStatus("Brand product linked. Product choices can now be filtered by brand.");
    } catch {
      setStatus("Link product failed. Check product organization and duplicate links.");
    }
  }

  async function addBrandMaterialLink() {
    if (!selectedBrandId || !brandMaterialLinkId) return setStatus("Select a brand and material first.");
    try {
      await linkBrandMaterial(selectedBrandId, brandMaterialLinkId);
      setBrandMaterialLinkId("");
      await selectBrandRecord(selectedBrandId);
      setStatus("Brand material linked. Sidebar material search can prioritize this brand.");
    } catch {
      setStatus("Link material failed. Check material access and duplicate links.");
    }
  }

  async function addBrandKnowledgeLink() {
    if (!selectedBrandId || !brandKnowledgeLinkId) return setStatus("Select a brand and organization knowledge item first.");
    try {
      await linkBrandKnowledgeBase(selectedBrandId, brandKnowledgeLinkId);
      setBrandKnowledgeLinkId("");
      await selectBrandRecord(selectedBrandId);
      setStatus("Brand knowledge linked. AI can cite it as brand context.");
    } catch {
      setStatus("Link knowledge failed. Check organization knowledge access.");
    }
  }

  async function addBrandScriptLink() {
    if (!selectedBrandId || !brandScriptLinkForm.scriptId.trim()) return setStatus("Enter a script ID first.");
    try {
      await linkBrandScript(selectedBrandId, brandScriptLinkForm);
      setBrandScriptLinkForm(emptyBrandScriptLinkForm);
      await selectBrandRecord(selectedBrandId);
      setStatus("Brand script linked for manual draft use.");
    } catch {
      setStatus("Link script failed. Check script access and script type.");
    }
  }

  async function removeBrandLink(kind: "product" | "material" | "knowledge" | "script", id: string) {
    if (!window.confirm("Unlink this brand resource? This is audited and requires confirmation.")) return;
    try {
      if (kind === "product") await unlinkBrandProduct(id);
      if (kind === "material") await unlinkBrandMaterial(id);
      if (kind === "knowledge") await unlinkBrandKnowledgeBase(id);
      if (kind === "script") await unlinkBrandScript(id);
      if (selectedBrandId) await selectBrandRecord(selectedBrandId);
      setStatus("Brand resource unlinked after manual confirmation.");
    } catch {
      setStatus("Unlink brand resource failed.");
    }
  }

  async function saveBrandRule() {
    if (!selectedBrandId || !brandRuleForm.title.trim() || !brandRuleForm.content.trim()) return setStatus("Brand rule title and content are required.");
    try {
      await createBrandRule(selectedBrandId, brandRuleForm);
      setBrandRuleForm(emptyBrandRuleForm);
      await selectBrandRecord(selectedBrandId);
      setStatus("Brand rule saved. AI will still warn users to confirm price, stock, lead time, payment and after-sales details.");
    } catch {
      setStatus("Save brand rule failed.");
    }
  }

  async function toggleBrandRule(rule: any) {
    try {
      await updateBrandRule(rule.id, { enabled: !rule.enabled });
      if (selectedBrandId) await selectBrandRecord(selectedBrandId);
      setStatus("Brand rule status updated.");
    } catch {
      setStatus("Update brand rule failed.");
    }
  }

  async function removeBrandRule(id: string) {
    if (!window.confirm("Delete this brand rule? AI will stop using it.")) return;
    try {
      await deleteBrandRule(id);
      if (selectedBrandId) await selectBrandRecord(selectedBrandId);
      setStatus("Brand rule deleted after manual confirmation.");
    } catch {
      setStatus("Delete brand rule failed.");
    }
  }

  async function assignSelectedBrand() {
    if (!selectedBrandId || !brandAssignmentForm.entityId.trim()) return setStatus("Select a brand and enter the entity ID to assign.");
    if (!window.confirm("Assign this brand to the selected entity? Existing brand context should be reviewed manually.")) return;
    try {
      await assignBrand(selectedBrandId, brandAssignmentForm);
      await selectBrandRecord(selectedBrandId);
      setStatus("Brand assigned after manual confirmation. It did not overwrite WhatsApp account or send any message.");
    } catch {
      setStatus("Assign brand failed. Check entity access and organization.");
    }
  }

  async function selectScriptExperimentRecord(id: string) {
    setLoading(true);
    try {
      const detail = await getScriptExperiment(id);
      setSelectedScriptExperiment(detail);
      setScriptExperimentForm({
        organizationId: detail.organizationId || "",
        name: detail.name,
        scenario: detail.scenario,
        description: detail.description || "",
        status: detail.status,
        targetLanguage: detail.targetLanguage || "",
        targetCustomerStage: detail.targetCustomerStage || ""
      });
      setScriptVariantForm({ ...emptyScriptVariantForm, language: detail.targetLanguage || "en" });
      setScriptVariantDrafts([]);
      setScriptUsageDraft(null);
      setStatus("A/B script experiment loaded.");
    } catch {
      setStatus("A/B script experiment failed to load or permission is insufficient.");
    } finally {
      setLoading(false);
    }
  }

  async function saveScriptExperimentRecord(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const payload = {
        organizationId: scriptExperimentForm.organizationId || selectedOrganizationId || null,
        name: scriptExperimentForm.name,
        scenario: scriptExperimentForm.scenario,
        description: scriptExperimentForm.description || null,
        status: scriptExperimentForm.status,
        targetLanguage: scriptExperimentForm.targetLanguage || null,
        targetCustomerStage: scriptExperimentForm.targetCustomerStage || null
      };
      const saved = selectedScriptExperiment
        ? await updateScriptExperiment(selectedScriptExperiment.id, payload)
        : await createScriptExperiment(payload);
      await loadScriptExperiments(scriptTestFilters);
      await selectScriptExperimentRecord(saved.id);
      setStatus("A/B script experiment saved. It only manages draft scripts and usage records.");
    } catch {
      setStatus("Save A/B script experiment failed. Check scenario, role and organization access.");
    } finally {
      setLoading(false);
    }
  }

  async function archiveSelectedScriptExperiment() {
    if (!selectedScriptExperiment) return setStatus("Select an experiment first.");
    if (!window.confirm("Archive this script experiment? This is audited and requires manual confirmation.")) return;
    setLoading(true);
    try {
      await archiveScriptExperiment(selectedScriptExperiment.id);
      setSelectedScriptExperiment(null);
      setScriptExperimentForm(emptyScriptExperimentForm);
      setScriptUsageDraft(null);
      await loadScriptExperiments(scriptTestFilters);
      setStatus("A/B script experiment archived after manual confirmation.");
    } catch {
      setStatus("Archive A/B script experiment failed.");
    } finally {
      setLoading(false);
    }
  }

  async function saveScriptVariantRecord(event: FormEvent) {
    event.preventDefault();
    if (!selectedScriptExperiment) return setStatus("Select an experiment before adding variants.");
    setLoading(true);
    try {
      const saved = await createScriptVariant(selectedScriptExperiment.id, {
        title: scriptVariantForm.title,
        versionLabel: scriptVariantForm.versionLabel,
        content: scriptVariantForm.content,
        language: scriptVariantForm.language || scriptExperimentForm.targetLanguage || null,
        tone: scriptVariantForm.tone || null,
        enabled: scriptVariantForm.enabled
      });
      setScriptVariantForm({ ...emptyScriptVariantForm, versionLabel: nextVariantLabel(selectedScriptExperiment.variants.length + 1) });
      await selectScriptExperimentRecord(saved.experimentId);
      setStatus("Script variant saved as a selectable draft. It was not sent to WhatsApp.");
    } catch {
      setStatus("Save script variant failed. Version labels must be unique within an experiment.");
    } finally {
      setLoading(false);
    }
  }

  async function disableScriptVariantRecord(variant: ScriptVariantSummary) {
    if (!window.confirm("Disable this script variant? Existing usage history will be kept.")) return;
    setLoading(true);
    try {
      await deleteScriptVariant(variant.id);
      if (selectedScriptExperiment) await selectScriptExperimentRecord(selectedScriptExperiment.id);
      setStatus("Script variant disabled or removed after manual confirmation.");
    } catch {
      setStatus("Disable script variant failed.");
    } finally {
      setLoading(false);
    }
  }

  async function generateScriptVariantDrafts() {
    setLoading(true);
    try {
      const result = await generateScriptExperimentVariants({
        scenario: scriptExperimentForm.scenario,
        targetLanguage: scriptExperimentForm.targetLanguage || "en",
        tone: scriptVariantForm.tone || "professional",
        baseContent: scriptVariantForm.content || undefined,
        count: 3
      });
      setScriptVariantDrafts(result.variants);
      setStatus(`AI generated ${result.variants.length} A/B/C draft variants. Confirm price, stock, lead time and shipping before use.`);
    } catch {
      setStatus("AI variant generation failed.");
    } finally {
      setLoading(false);
    }
  }

  async function saveGeneratedScriptVariant(draft: { versionLabel: string; title: string; content: string }) {
    if (!selectedScriptExperiment) return setStatus("Select an experiment before saving generated variants.");
    setScriptVariantForm({
      versionLabel: draft.versionLabel,
      title: draft.title,
      content: draft.content,
      language: scriptExperimentForm.targetLanguage || "en",
      tone: "professional",
      enabled: true
    });
    setStatus("Generated draft copied into the variant form. Review it, then click Save variant.");
  }

  async function recordScriptVariantUsage(variant: ScriptVariantSummary) {
    setLoading(true);
    try {
      const usage = await createScriptUsage({
        experimentId: variant.experimentId,
        variantId: variant.id,
        customerId: selectedCustomerId || null,
        scenario: selectedScriptExperiment?.scenario || scriptExperimentForm.scenario,
        channel: "web",
        usedText: variant.content
      });
      setScriptUsageDraft(usage);
      await navigator.clipboard.writeText(variant.content);
      if (selectedScriptExperiment) await selectScriptExperimentRecord(selectedScriptExperiment.id);
      setStatus("Variant copied and usage recorded as used_draft. The message still must be sent manually.");
    } catch {
      setStatus("Record script usage failed. Check customer access and experiment status.");
    } finally {
      setLoading(false);
    }
  }

  async function markScriptUsageOutcome(outcome: string) {
    if (!scriptUsageDraft) return setStatus("Record a usage first, then mark its outcome.");
    setLoading(true);
    try {
      const updated = await updateScriptUsageOutcome(scriptUsageDraft.id, { outcome });
      setScriptUsageDraft(updated);
      if (selectedScriptExperiment) await selectScriptExperimentRecord(selectedScriptExperiment.id);
      setStatus(`Script usage outcome marked as ${outcome}.`);
    } catch {
      setStatus("Mark script usage outcome failed.");
    } finally {
      setLoading(false);
    }
  }

  async function markTaskDone(id: string) {
    await completeFollowUp(id);
    await loadDashboard();
    if (selectedCustomerId) await selectCustomer(selectedCustomerId);
  }

  if (authLoading) {
    return <div className="auth-shell"><div className="auth-card">Loading...</div></div>;
  }

  if (!currentUser) {
    return (
      <div className="auth-shell">
        <form className="auth-card" onSubmit={handleLogin}>
          <h1>WhatsApp AI Sales Assistant</h1>
          <p>Login to manage customers, products, quotes, follow-ups, teams and orders.</p>
          <label className="field">
            <span>Email</span>
            <input value={loginForm.email} onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })} />
          </label>
          <label className="field">
            <span>Password</span>
            <input type="password" value={loginForm.password} onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })} />
          </label>
          <button disabled={loading}>Login</button>
          <p>{status}</p>
        </form>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">WA</div>
          <div>
            <h1>WhatsApp AI 销售助手</h1>
            <p>V5 企业平台版</p>
          </div>
        </div>
        <nav className="nav-list">
          {navButton("dashboard", "Home")}
          {canManageSelectedOrganization && navButton("teamDashboard", "Team board")}
          {canManageSelectedOrganization && navButton("reports", "Reports")}
          {navButton("predictions", "Predictions")}
          {navButton("reorderOps", "Reorder ops")}
          {navButton("afterSales", "After sales")}
          {navButton("scriptTests", "A/B scripts")}
          {navButton("suppliers", "Suppliers")}
          {navButton("brands", "Brands / stores")}
          {canManageSelectedOrganization && navButton("enterprise", "Enterprise")}
          {canManageAiKeys && navButton("aiKeys", "AI keys")}
          {navButton("organizations", "Organizations")}
          {navButton("roles", "Roles")}
          {navButton("permissions", "Permissions")}
          {navButton("customers", "Customers")}
          {navButton("products", "Products")}
          {navButton("orgProducts", "Org products")}
          {navButton("quotes", "Quotes")}
          {navButton("orders", "Orders")}
          {navButton("fulfillment", "Fulfillment")}
          {navButton("profit", "Profit review")}
          {navButton("knowledge", "Knowledge")}
          {navButton("orgKnowledge", "Org knowledge")}
          {navButton("orgScripts", "Org scripts")}
          {navButton("materials", "Materials")}
          {navButton("orgMaterials", "Org materials")}
          {navButton("samples", "Samples")}
          {navButton("custom", "Custom")}
          {navButton("importExport", "Import/export")}
          {navButton("auditLogs", "Audit logs")}
          {canManageSelectedOrganization && navButton("riskEvents", "Risk events")}
        </nav>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Logged in as {currentUser.email}</p>
            <h2>{titleForView(view)}</h2>
            <p>{status}</p>
          </div>
          <div className="topbar-actions">
            <span className="user-chip">{currentUser.name || currentUser.email}</span>
            <button className="secondary-button" onClick={refreshAll} disabled={loading}>Refresh</button>
            <button className="secondary-button" onClick={handleLogout}>Logout</button>
          </div>
        </header>
        <div className="safety-note">{AI_SAFETY_NOTE} All generated text is draft only. 系统不会自动发送 WhatsApp 消息，所有内容都需要业务员手动确认。</div>
        {view === "dashboard" && renderDashboard()}
        {view === "teamDashboard" && renderTeamDashboard()}
        {view === "reports" && renderReports()}
        {view === "predictions" && renderPredictions()}
        {view === "reorderOps" && renderReorderOperations()}
        {view === "afterSales" && renderAfterSales()}
        {view === "scriptTests" && renderScriptTests()}
        {view === "suppliers" && renderSuppliers()}
        {view === "brands" && renderBrands()}
        {view === "enterprise" && renderEnterprise()}
        {view === "aiKeys" && renderAiKeys()}
        {view === "organizations" && renderOrganizations()}
        {view === "roles" && renderRoles()}
        {view === "permissions" && renderPermissions()}
        {view === "customers" && renderCustomers()}
        {view === "products" && renderProducts()}
        {view === "orgProducts" && renderOrgProducts()}
        {view === "quotes" && renderQuotes()}
        {view === "orders" && renderOrders()}
        {view === "fulfillment" && renderFulfillment()}
        {view === "profit" && renderProfit()}
        {view === "knowledge" && renderKnowledge()}
        {view === "orgKnowledge" && renderOrgKnowledge()}
        {view === "orgScripts" && renderOrgScripts()}
        {view === "materials" && renderMaterials()}
        {view === "orgMaterials" && renderOrgMaterials()}
        {view === "samples" && renderSamples()}
        {view === "custom" && renderCustom()}
        {view === "importExport" && renderImportExport()}
        {view === "auditLogs" && renderAuditLogs()}
        {view === "riskEvents" && renderRiskEvents()}
      </main>
    </div>
  );

  function navButton(nextView: View, label: string) {
    return (
      <button className={view === nextView ? "active" : ""} onClick={() => setView(nextView)} type="button">
        {label}
      </button>
    );
  }

  function renderDashboard() {
    return (
      <>
        <section className="metrics">
          <Metric label="Today follow-ups" value={dashboard?.today.length || 0} />
          <Metric label="Overdue follow-ups" value={dashboard?.overdue.length || 0} />
          <Metric label="High intent customers" value={highIntent.length} />
        </section>
        <section className="dashboard-grid">
          <TaskPanel title="Today" tasks={dashboard?.today || []} />
          <TaskPanel title="Overdue" tasks={dashboard?.overdue || []} />
          <CustomerPanel title="High intent customers" customers={highIntent} />
          <CustomerPanel title="Recent customers" customers={dashboard?.recentCustomers || []} />
          <Panel title="Reorder reminders" description="Manual reminders generated from V4-E predictions.">
            <SimpleList items={reorderReminders.slice(0, 5)} render={(item) => (
              <button className="customer-row" onClick={() => { setView("customers"); void selectCustomer(item.customerId); }}>
                <strong>{item.customerName} / {item.reminderType}</strong>
                <span>{formatDate(item.remindAt)} / {item.status}</span>
                <span>{item.reason || "-"}</span>
              </button>
            )} />
          </Panel>
          <Panel title="Prediction alerts" description="Rule-based reorder, dormant and churn-risk signals.">
            <SimpleList items={customerPredictions.filter((item) => item.level === "high").slice(0, 5)} render={(item) => (
              <button className="customer-row" onClick={() => { setView("customers"); void selectCustomer(item.customerId); }}>
                <strong>{item.customerName} / {item.predictionType} / {item.score}</strong>
                <span>{item.recommendedAction || "-"}</span>
              </button>
            )} />
          </Panel>
        </section>
      </>
    );
  }

  function renderTeamDashboard() {
    if (!selectedOrganizationId) {
      return <Panel title="Team dashboard" description="Select an organization first."><p className="empty-note">No organization selected.</p></Panel>;
    }
    if (!canManageSelectedOrganization) {
      return <Panel title="Team dashboard" description="Owner or manager role required."><p className="empty-note">You do not have permission to view team KPI.</p></Panel>;
    }
    return (
      <>
        <section className="metrics">
          <button className="metric-card" onClick={() => openTeamCustomers({})}><span>Today new customers</span><strong>{teamSummary?.kpis.todayNewCustomers || 0}</strong></button>
          <button className="metric-card" onClick={() => setView("dashboard")}><span>Today follow-ups</span><strong>{teamSummary?.kpis.todayFollowUpCustomers || 0}</strong></button>
          <button className="metric-card" onClick={() => setView("dashboard")}><span>Overdue follow-ups</span><strong>{teamSummary?.kpis.overdueFollowUpCustomers || 0}</strong></button>
          <button className="metric-card" onClick={() => openTeamCustomers({ intentLevel: "high" })}><span>High intent</span><strong>{teamSummary?.kpis.highIntentCustomers || 0}</strong></button>
          <button className="metric-card" onClick={() => openTeamCustomers({ stage: "" })}><span>Quoted no follow-up</span><strong>{teamSummary?.kpis.quotedNoFollowUpCustomers || 0}</strong></button>
        </section>
        <section className="grid quote-layout">
          <Panel title="Salesperson stats" description="Customer count uses assigned owner when available; quote and follow-up stats use the actor.">
            <div className="detail-actions">
              <button className="secondary-button" onClick={() => loadTeamDashboard(selectedOrganizationId)}>Refresh</button>
              <a className="secondary-button" href={teamSummaryCsvUrl(selectedOrganizationId)}>Export CSV</a>
            </div>
            <div className="quote-history-list">
              {(teamSummary?.memberStats || []).map((member) => (
                <div className="quote-history-item" key={member.userId}>
                  <strong>{member.userName || member.userEmail || member.userId}</strong>
                  <span>{member.role} / customers {member.customerCount}</span>
                  <span>completed follow-ups {member.completedFollowUps} / quotes {member.quoteCount}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="High intent customers" description="Contact information is hidden in this team view. Open customer detail only when you have permission.">
            <SimpleList items={teamSummary?.highIntentCustomers || []} render={(item) => (
              <button className="customer-row" onClick={() => { setView("customers"); void selectCustomer(item.id); }}>
                <strong>{item.name} / {item.intentScore}</strong>
                <span>{item.stage} / owner {item.ownerId || "-"} / assigned {item.assignedTo || "-"}</span>
                <span>{item.recommendedAction}</span>
              </button>
            )} />
          </Panel>
        </section>
      </>
    );
  }

  function openTeamCustomers(next: Partial<CustomerFilters>) {
    const filters = { ...customerFilters, organizationId: selectedOrganizationId, ...next };
    setCustomerFilters(filters);
    void loadCustomers(filters);
    setView("customers");
  }

  function renderReports() {
    const organizationId = reportFilters.organizationId || selectedOrganizationId;
    if (!organizationId) {
      return <Panel title="Reports" description="Select an organization first."><p className="empty-note">No organization selected.</p></Panel>;
    }
    if (!canManageSelectedOrganization) {
      return <Panel title="Reports" description="Owner or manager role required."><p className="empty-note">You do not have permission to view reports.</p></Panel>;
    }
    return (
      <>
        <section className="metrics">
          <button className="metric-card" onClick={() => openTeamCustomers({ organizationId })}><span>Today new customers</span><strong>{reportSummary?.kpis.todayNewCustomers || 0}</strong></button>
          <button className="metric-card" onClick={() => setView("dashboard")}><span>Today follow-ups</span><strong>{reportSummary?.kpis.todayFollowUpCustomers || 0}</strong></button>
          <button className="metric-card" onClick={() => setView("dashboard")}><span>Overdue follow-ups</span><strong>{reportSummary?.kpis.overdueFollowUpCustomers || 0}</strong></button>
          <button className="metric-card" onClick={() => openTeamCustomers({ organizationId, intentLevel: "high" })}><span>High intent customers</span><strong>{reportSummary?.kpis.highIntentCustomers || 0}</strong></button>
          <button className="metric-card" onClick={() => openTeamCustomers({ organizationId })}><span>Quoted no follow-up</span><strong>{reportSummary?.kpis.quotedNoFollowUpCustomers || 0}</strong></button>
        </section>
        <section className="grid quote-layout">
          <Panel title="Team report" description="Owner/manager only. Data is scoped to the selected organization.">
            <div className="form-grid">
              <SelectField label="Organization" value={organizationId} onChange={(value) => setReportFilters({ ...reportFilters, organizationId: value })} options={organizations.map((item) => [item.id, item.name])} emptyLabel="Select organization" />
              <SelectField label="Salesperson" value={reportFilters.assignedTo} onChange={(value) => setReportFilters({ ...reportFilters, assignedTo: value })} options={organizationMembers.map((item) => [item.userId, item.userName || item.userEmail || item.userId])} emptyLabel="All members" />
              <SelectField label="Stage" value={reportFilters.stage} onChange={(value) => setReportFilters({ ...reportFilters, stage: value })} options={CUSTOMER_STAGES.map((item) => [item, item])} emptyLabel="All stages" />
              <SelectField label="Intent level" value={reportFilters.intentLevel} onChange={(value) => setReportFilters({ ...reportFilters, intentLevel: value as ReportFilters["intentLevel"] })} options={[["low", "low"], ["medium", "medium"], ["high", "high"]]} emptyLabel="All levels" />
              <SelectField label="Report type" value={reportFilters.reportType} onChange={(value) => setReportFilters({ ...reportFilters, reportType: value as ReportJobType })} options={REPORT_JOB_TYPES.map((item) => [item, item])} />
            </div>
            <div className="detail-actions">
              <button onClick={() => loadReports({ ...reportFilters, organizationId })}>Refresh report</button>
              <button className="secondary-button" onClick={runReportJob}>Generate report job</button>
              <a className="secondary-button" href={reportTeamSummaryUrl(organizationId, "csv")}>Export CSV</a>
              <a className="secondary-button" href={reportTeamSummaryUrl(organizationId, "excel")}>Export Excel</a>
            </div>
            <RiskWarnings items={[
              "Reports are assistant statistics only and do not send WhatsApp messages.",
              "Exports are scoped by organization role and must not include secrets.",
              "Confirm customer, quote and follow-up data before making management decisions."
            ]} />
            {reportJob && (
              <div className="risk-box">
                <span>Report job: {reportJob.id}</span>
                <span>Type: {reportJob.type}</span>
                <span>Status: {reportJob.status}</span>
              </div>
            )}
          </Panel>
          <Panel title="Member stats" description="Customer, follow-up and quote counts by member.">
            <div className="quote-history-list">
              {(reportSummary?.memberStats || []).map((member) => (
                <div className="quote-history-item" key={member.userId}>
                  <strong>{member.userName || member.userEmail || member.userId}</strong>
                  <span>{member.role} / {member.status}</span>
                  <span>Customers {member.customerCount} / Completed follow-ups {member.completedFollowUps} / Quotes {member.quoteCount}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="High intent customers" description="Open customer records from the report list.">
            <SimpleList items={reportHighIntent} render={(item) => (
              <button className="customer-row" onClick={() => { setView("customers"); void selectCustomer(item.id); }}>
                <strong>{item.name} / {item.intentScore}</strong>
                <span>{item.stage} / owner {item.ownerId || "-"} / assigned {item.assignedTo || "-"}</span>
                <span>{item.recommendedAction}</span>
              </button>
            )} />
          </Panel>
        </section>
      </>
    );
  }
  function renderAfterSales() {
    const openCount = afterSalesCases.filter((item) => item.status === "open").length;
    const processingCount = afterSalesCases.filter((item) => item.status === "processing").length;
    const waitingCount = afterSalesCases.filter((item) => item.status === "waiting_customer" || item.status === "waiting_internal").length;
    const highCount = afterSalesCases.filter((item) => item.priority === "high" || item.priority === "urgent").length;
    const refundCount = afterSalesCases.filter((item) => item.caseType === "refund_request" || item.requestedSolution === "refund" || item.finalSolution === "refund").length;
    const reshipCount = afterSalesCases.filter((item) => item.caseType === "reship_request" || item.requestedSolution === "reship" || item.finalSolution === "reship").length;
    return (
      <>
        <section className="metrics">
          <Metric label="Open" value={openCount} />
          <Metric label="Processing" value={processingCount} />
          <Metric label="Waiting" value={waitingCount} />
          <Metric label="High priority" value={highCount} />
          <Metric label="Refund requests" value={refundCount} />
          <Metric label="Reship requests" value={reshipCount} />
        </section>
        <section className="grid quote-layout">
          <Panel title="After-sales filters" description="After-sales records are scoped by organization and user permissions.">
            <div className="form-grid">
              <SelectField label="Organization" value={afterSalesFilters.organizationId || selectedOrganizationId} onChange={(value) => setAfterSalesFilters({ ...afterSalesFilters, organizationId: value })} options={organizations.map((item) => [item.id, item.name])} emptyLabel="Personal scope" />
              <Field label="Keyword"><input value={afterSalesFilters.keyword} onChange={(event) => setAfterSalesFilters({ ...afterSalesFilters, keyword: event.target.value })} /></Field>
              <SelectField label="Type" value={afterSalesFilters.caseType} onChange={(value) => setAfterSalesFilters({ ...afterSalesFilters, caseType: value })} options={AFTER_SALES_CASE_TYPES.map((item) => [item, item])} emptyLabel="All types" />
              <SelectField label="Priority" value={afterSalesFilters.priority} onChange={(value) => setAfterSalesFilters({ ...afterSalesFilters, priority: value })} options={AFTER_SALES_PRIORITIES.map((item) => [item, item])} emptyLabel="All priorities" />
              <SelectField label="Status" value={afterSalesFilters.status} onChange={(value) => setAfterSalesFilters({ ...afterSalesFilters, status: value })} options={AFTER_SALES_STATUSES.map((item) => [item, item])} emptyLabel="All status" />
              <SelectField label="Responsibility" value={afterSalesFilters.responsibility} onChange={(value) => setAfterSalesFilters({ ...afterSalesFilters, responsibility: value })} options={AFTER_SALES_RESPONSIBILITIES.map((item) => [item, item])} emptyLabel="All responsibilities" />
            </div>
            <div className="detail-actions">
              <button onClick={() => loadAfterSales(afterSalesFilters)} disabled={loading}>Search</button>
              <button className="secondary-button" onClick={() => { setSelectedAfterSalesId(""); setSelectedAfterSalesCase(null); setAfterSalesForm({ ...emptyAfterSalesForm, customerId: selectedCustomerId, orderId: selectedOrderId, productId: selectedProductId }); }}>New after-sales</button>
            </div>
            <RiskWarnings items={[
              "After-sales records do not trigger refunds, reshipments, compensation or WhatsApp messages automatically.",
              "Responsibility and final solution must be manually confirmed by the salesperson, manager or owner.",
              "Evidence URLs are text links only in V4-J; no real file upload is performed."
            ]} />
          </Panel>

          <Panel title="After-sales form" description="Create or update a case. Refund/reship/solution changes require confirmation and are audited.">
            <form onSubmit={saveAfterSalesRecord}>
              <div className="form-grid">
                <SelectField label="Customer" value={afterSalesForm.customerId} onChange={(value) => setAfterSalesForm({ ...afterSalesForm, customerId: value })} options={customers.map((item) => [item.id, item.name])} emptyLabel="Select customer" />
                <SelectField label="Order" value={afterSalesForm.orderId} onChange={(value) => setAfterSalesForm({ ...afterSalesForm, orderId: value })} options={orders.filter((item) => !afterSalesForm.customerId || item.customerId === afterSalesForm.customerId).map((item) => [item.id, item.orderNo])} emptyLabel="No order" />
                <SelectField label="Product" value={afterSalesForm.productId} onChange={(value) => setAfterSalesForm({ ...afterSalesForm, productId: value })} options={products.map((item) => [item.id, item.name])} emptyLabel="No product" />
                <SelectField label="Type" value={afterSalesForm.caseType} onChange={(value) => setAfterSalesForm({ ...afterSalesForm, caseType: value })} options={AFTER_SALES_CASE_TYPES.map((item) => [item, item])} />
                <SelectField label="Priority" value={afterSalesForm.priority} onChange={(value) => setAfterSalesForm({ ...afterSalesForm, priority: value })} options={AFTER_SALES_PRIORITIES.map((item) => [item, item])} />
                <SelectField label="Status" value={afterSalesForm.status} onChange={(value) => setAfterSalesForm({ ...afterSalesForm, status: value })} options={AFTER_SALES_STATUSES.map((item) => [item, item])} />
                <SelectField label="Requested solution" value={afterSalesForm.requestedSolution} onChange={(value) => setAfterSalesForm({ ...afterSalesForm, requestedSolution: value })} options={AFTER_SALES_SOLUTIONS.map((item) => [item, item])} emptyLabel="Not confirmed" />
                <SelectField label="Final solution" value={afterSalesForm.finalSolution} onChange={(value) => setAfterSalesForm({ ...afterSalesForm, finalSolution: value })} options={AFTER_SALES_SOLUTIONS.map((item) => [item, item])} emptyLabel="Not confirmed" />
                <SelectField label="Responsibility" value={afterSalesForm.responsibility} onChange={(value) => setAfterSalesForm({ ...afterSalesForm, responsibility: value })} options={AFTER_SALES_RESPONSIBILITIES.map((item) => [item, item])} />
                <Field label="Currency"><input value={afterSalesForm.currency} onChange={(event) => setAfterSalesForm({ ...afterSalesForm, currency: event.target.value })} /></Field>
                <Field label="Refund amount"><input value={afterSalesForm.refundAmount} onChange={(event) => setAfterSalesForm({ ...afterSalesForm, refundAmount: event.target.value })} /></Field>
                <Field label="Reship cost"><input value={afterSalesForm.reshipCost} onChange={(event) => setAfterSalesForm({ ...afterSalesForm, reshipCost: event.target.value })} /></Field>
                <Field label="Compensation"><input value={afterSalesForm.compensationAmount} onChange={(event) => setAfterSalesForm({ ...afterSalesForm, compensationAmount: event.target.value })} /></Field>
                <Field label="Assigned to"><input value={afterSalesForm.assignedTo} onChange={(event) => setAfterSalesForm({ ...afterSalesForm, assignedTo: event.target.value })} /></Field>
              </div>
              <label className="field"><span>Description</span><textarea rows={3} value={afterSalesForm.description} onChange={(event) => setAfterSalesForm({ ...afterSalesForm, description: event.target.value })} /></label>
              <label className="field"><span>Customer claim</span><textarea rows={3} value={afterSalesForm.customerClaim} onChange={(event) => setAfterSalesForm({ ...afterSalesForm, customerClaim: event.target.value })} /></label>
              <label className="field"><span>Evidence URLs</span><textarea rows={3} value={afterSalesForm.evidenceUrls} onChange={(event) => setAfterSalesForm({ ...afterSalesForm, evidenceUrls: event.target.value })} placeholder="One URL per line" /></label>
              <label className="field"><span>Internal / resolution notes</span><textarea rows={3} value={afterSalesForm.resolutionNotes || afterSalesForm.internalNotes} onChange={(event) => setAfterSalesForm({ ...afterSalesForm, resolutionNotes: event.target.value, internalNotes: event.target.value })} /></label>
              <div className="detail-actions">
                <button disabled={loading}>Save case</button>
                <button type="button" className="secondary-button" onClick={() => selectedAfterSalesId && changeAfterSalesStatus(selectedAfterSalesId, "processing")} disabled={!selectedAfterSalesId || loading}>Processing</button>
                <button type="button" className="secondary-button" onClick={() => selectedAfterSalesId && changeAfterSalesStatus(selectedAfterSalesId, "resolved")} disabled={!selectedAfterSalesId || loading}>Resolved</button>
                <button type="button" className="secondary-button" onClick={() => selectedAfterSalesId && changeAfterSalesStatus(selectedAfterSalesId, "closed")} disabled={!selectedAfterSalesId || loading}>Close</button>
                <button type="button" className="secondary-button" onClick={changeAfterSalesResponsibility} disabled={!selectedAfterSalesId || loading}>Confirm responsibility</button>
                <button type="button" className="secondary-button" onClick={() => changeAfterSalesSolution(false)} disabled={!selectedAfterSalesId || loading}>Confirm solution</button>
                <button type="button" className="secondary-button" onClick={() => changeAfterSalesSolution(true)} disabled={!selectedAfterSalesId || loading}>Sync cost</button>
              </div>
            </form>
          </Panel>

          <Panel title="After-sales cases" description="Refund, reship, responsibility and closure actions require manual confirmation.">
            <SimpleList items={afterSalesCases} render={(item) => (
              <div className="quote-history-item">
                <strong>{item.caseNo} / {item.customerName || item.customerId}</strong>
                <span>{item.caseType} / {item.priority} / {item.status} / responsibility {item.responsibility || "unknown"}</span>
                <span>{item.orderNo || "No order"} / {item.productName || "No product"} / solution {item.finalSolution || item.requestedSolution || "unconfirmed"}</span>
                <div className="detail-actions">
                  <button className="secondary-button" onClick={() => selectAfterSalesRecord(item.id)}>Open</button>
                  <button className="secondary-button" onClick={() => { setSelectedCustomerId(item.customerId); setView("customers"); void selectCustomer(item.customerId); }}>Customer</button>
                  <button className="secondary-button" onClick={() => removeAfterSalesRecord(item.id)} disabled={loading}>Delete</button>
                </div>
              </div>
            )} />
          </Panel>

          <Panel title="AI after-sales draft" description="Draft only. It never confirms responsibility, refund, reship, compensation or logistics status.">
            <div className="form-grid">
              <SelectField label="Scenario" value={afterSalesForm.scriptScenario} onChange={(value) => setAfterSalesForm({ ...afterSalesForm, scriptScenario: value })} options={AFTER_SALES_SCRIPT_SCENARIOS.map((item) => [item, item])} />
            </div>
            <textarea rows={8} value={afterSalesScript} onChange={(event) => setAfterSalesScript(event.target.value)} placeholder="Generate after-sales script draft." />
            <RiskWarnings items={afterSalesRiskWarnings} />
            <div className="detail-actions">
              <button onClick={generateAfterSalesDraft} disabled={!selectedAfterSalesId || loading}>Generate draft</button>
              <button className="secondary-button" onClick={() => navigator.clipboard.writeText(afterSalesScript)} disabled={!afterSalesScript}>Copy</button>
              <button className="secondary-button" onClick={createAfterSalesTask} disabled={!selectedAfterSalesId || loading}>Create FollowUpTask</button>
            </div>
            {selectedAfterSalesCase?.events?.length ? (
              <div className="quote-history-list">
                {selectedAfterSalesCase.events.slice(0, 6).map((event) => (
                  <div className="quote-history-item" key={event.id}>
                    <strong>{event.eventType}</strong>
                    <span>{formatDate(event.createdAt)} / {event.notes || "-"}</span>
                  </div>
                ))}
              </div>
            ) : <p className="empty-note">Open a case to see event timeline.</p>}
          </Panel>
        </section>
      </>
    );
  }

  function renderScriptTests() {
    const activeCount = scriptExperiments.filter((item) => item.status === "active").length;
    const totalUsage = scriptExperiments.reduce((sum, item) => sum + (item.totalUsage || 0), 0);
    const variants = selectedScriptExperiment?.variants || [];
    const usages = selectedScriptExperiment?.usages || [];
    const stats = selectedScriptExperiment?.stats;
    return (
      <>
        <section className="metrics">
          <Metric label="Experiments" value={scriptExperiments.length} />
          <Metric label="Active" value={activeCount} />
          <Metric label="Usage records" value={totalUsage} />
          <Metric label="Selected variants" value={variants.length} />
        </section>
        <section className="grid quote-layout">
          <Panel title="A/B script filters" description="Active experiments are available for draft selection. Nothing is sent automatically.">
            <div className="form-grid">
              <SelectField label="Organization" value={scriptTestFilters.organizationId || selectedOrganizationId} onChange={(value) => setScriptTestFilters({ ...scriptTestFilters, organizationId: value })} options={organizations.map((item) => [item.id, item.name])} emptyLabel="Personal scope" />
              <SelectField label="Scenario" value={scriptTestFilters.scenario} onChange={(value) => setScriptTestFilters({ ...scriptTestFilters, scenario: value })} options={SCRIPT_EXPERIMENT_SCENARIOS.map((item) => [item, item])} emptyLabel="All scenarios" />
              <SelectField label="Status" value={scriptTestFilters.status} onChange={(value) => setScriptTestFilters({ ...scriptTestFilters, status: value })} options={SCRIPT_EXPERIMENT_STATUSES.map((item) => [item, item])} emptyLabel="All status" />
              <Field label="Language"><input value={scriptTestFilters.targetLanguage} onChange={(event) => setScriptTestFilters({ ...scriptTestFilters, targetLanguage: event.target.value })} placeholder="en / es / pt..." /></Field>
            </div>
            <div className="detail-actions">
              <button onClick={() => loadScriptExperiments(scriptTestFilters)} disabled={loading}>Search</button>
              <button className="secondary-button" onClick={() => { setSelectedScriptExperiment(null); setScriptExperimentForm({ ...emptyScriptExperimentForm, organizationId: selectedOrganizationId }); setScriptVariantDrafts([]); }}>New experiment</button>
            </div>
            <RiskWarnings items={[
              "A/B script tests only record draft usage and manually marked outcomes.",
              "The system does not auto-send, bulk-send or click WhatsApp send buttons.",
              "Samples below 10 used_draft records per variant are only directional and not statistically significant."
            ]} />
          </Panel>

          <Panel title="Experiment form" description="Create or update lightweight script experiments by scenario and language.">
            <form onSubmit={saveScriptExperimentRecord}>
              <div className="form-grid">
                <SelectField label="Organization" value={scriptExperimentForm.organizationId || selectedOrganizationId} onChange={(value) => setScriptExperimentForm({ ...scriptExperimentForm, organizationId: value })} options={organizations.map((item) => [item.id, item.name])} emptyLabel="Personal scope" />
                <Field label="Name"><input value={scriptExperimentForm.name} onChange={(event) => setScriptExperimentForm({ ...scriptExperimentForm, name: event.target.value })} required /></Field>
                <SelectField label="Scenario" value={scriptExperimentForm.scenario} onChange={(value) => setScriptExperimentForm({ ...scriptExperimentForm, scenario: value })} options={SCRIPT_EXPERIMENT_SCENARIOS.map((item) => [item, item])} />
                <SelectField label="Status" value={scriptExperimentForm.status} onChange={(value) => setScriptExperimentForm({ ...scriptExperimentForm, status: value })} options={SCRIPT_EXPERIMENT_STATUSES.map((item) => [item, item])} />
                <Field label="Language"><input value={scriptExperimentForm.targetLanguage} onChange={(event) => setScriptExperimentForm({ ...scriptExperimentForm, targetLanguage: event.target.value })} placeholder="en" /></Field>
                <Field label="Customer stage"><input value={scriptExperimentForm.targetCustomerStage} onChange={(event) => setScriptExperimentForm({ ...scriptExperimentForm, targetCustomerStage: event.target.value })} /></Field>
              </div>
              <label className="field"><span>Description</span><textarea rows={3} value={scriptExperimentForm.description} onChange={(event) => setScriptExperimentForm({ ...scriptExperimentForm, description: event.target.value })} /></label>
              <div className="detail-actions">
                <button disabled={loading}>Save experiment</button>
                <button type="button" className="secondary-button" onClick={archiveSelectedScriptExperiment} disabled={!selectedScriptExperiment || loading}>Archive</button>
              </div>
            </form>
          </Panel>

          <Panel title="Experiments" description="Open an experiment to manage variants and outcomes.">
            <SimpleList items={scriptExperiments} render={(item) => (
              <div className="quote-history-item">
                <strong>{item.name} / {item.scenario} / {item.status}</strong>
                <span>{item.targetLanguage || "all languages"} / variants {item.variantsCount || 0} / usage {item.totalUsage || 0}</span>
                <span>Best: {item.bestVariant || "insufficient sample"}</span>
                <div className="detail-actions">
                  <button className="secondary-button" onClick={() => selectScriptExperimentRecord(item.id)}>Open</button>
                </div>
              </div>
            )} />
          </Panel>

          <Panel title="Variant management" description="Variants are draft scripts. Copying a variant records usage, but never sends it.">
            <form onSubmit={saveScriptVariantRecord}>
              <div className="form-grid">
                <Field label="Version label"><input value={scriptVariantForm.versionLabel} onChange={(event) => setScriptVariantForm({ ...scriptVariantForm, versionLabel: event.target.value })} placeholder="A" required /></Field>
                <Field label="Title"><input value={scriptVariantForm.title} onChange={(event) => setScriptVariantForm({ ...scriptVariantForm, title: event.target.value })} required /></Field>
                <Field label="Language"><input value={scriptVariantForm.language} onChange={(event) => setScriptVariantForm({ ...scriptVariantForm, language: event.target.value })} placeholder="en" /></Field>
                <SelectField label="Tone" value={scriptVariantForm.tone} onChange={(value) => setScriptVariantForm({ ...scriptVariantForm, tone: value })} options={[["short", "short"], ["professional", "professional"], ["friendly", "friendly"], ["closing", "closing"]]} emptyLabel="Not set" />
              </div>
              <label className="field"><span>Content</span><textarea rows={6} value={scriptVariantForm.content} onChange={(event) => setScriptVariantForm({ ...scriptVariantForm, content: event.target.value })} required /></label>
              <div className="detail-actions">
                <button disabled={!selectedScriptExperiment || loading}>Save variant</button>
                <button type="button" className="secondary-button" onClick={generateScriptVariantDrafts} disabled={loading}>AI generate A/B/C</button>
              </div>
            </form>
            {scriptVariantDrafts.length > 0 && (
              <div className="quote-history-list">
                {scriptVariantDrafts.map((draft) => (
                  <div className="quote-history-item" key={`${draft.versionLabel}-${draft.title}`}>
                    <strong>{draft.versionLabel} / {draft.title}</strong>
                    <textarea rows={4} value={draft.content} readOnly />
                    <button className="secondary-button" onClick={() => saveGeneratedScriptVariant(draft)}>Use in form</button>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Variants and usage" description="Record only when a salesperson manually copies or inserts a draft.">
            <SimpleList items={variants} render={(variant) => (
              <div className="quote-history-item">
                <strong>{variant.versionLabel} / {variant.title} / {variant.enabled ? "enabled" : "disabled"}</strong>
                <textarea rows={5} value={variant.content} readOnly />
                <div className="detail-actions">
                  <button className="secondary-button" onClick={() => recordScriptVariantUsage(variant)} disabled={!variant.enabled || loading}>Copy + record used_draft</button>
                  <button className="secondary-button" onClick={() => { setScriptVariantForm({ versionLabel: variant.versionLabel, title: variant.title, content: variant.content, language: variant.language || "", tone: variant.tone || "", enabled: variant.enabled }); }}>Edit in form</button>
                  <button className="secondary-button" onClick={() => disableScriptVariantRecord(variant)} disabled={loading}>Disable</button>
                </div>
              </div>
            )} />
            {scriptUsageDraft && (
              <div className="quote-history-item">
                <strong>Last usage: {scriptUsageDraft.outcome}</strong>
                <span>{formatDate(scriptUsageDraft.usedAt)} / {scriptUsageDraft.customerName || "No customer selected"}</span>
                <div className="detail-actions">
                  {SCRIPT_USAGE_OUTCOMES.filter((item) => item !== "used_draft").map((outcome) => (
                    <button className="secondary-button" key={outcome} onClick={() => markScriptUsageOutcome(outcome)} disabled={loading}>{outcome}</button>
                  ))}
                </div>
              </div>
            )}
          </Panel>

          <Panel title="Experiment stats" description="Best variant requires at least 10 used_draft records per candidate.">
            {stats ? (
              <>
                <section className="metrics compact">
                  <Metric label="Total usage" value={stats.totalUsage} />
                  <Metric label="Reply rate" value={formatRate(stats.rates.replyRate)} />
                  <Metric label="Quote rate" value={formatRate(stats.rates.quoteConversionRate)} />
                  <Metric label="Order rate" value={formatRate(stats.rates.orderConversionRate)} />
                  <Metric label="Payment rate" value={formatRate(stats.rates.paymentConversionRate)} />
                  <Metric label="Reorder rate" value={formatRate(stats.rates.reorderConversionRate)} />
                </section>
                <RiskWarnings items={stats.riskWarnings} />
                <SimpleList items={Object.entries(stats.usageByVariant).map(([id, value]) => ({ id, ...(value as any) }))} render={(item: any) => (
                  <div className="quote-history-item">
                    <strong>{item.versionLabel} / used {item.used_draft || 0}</strong>
                    <span>reply {item.customer_replied || 0}, quote {item.quote_created || 0}, order {item.order_created || 0}, payment {item.payment_received || 0}, reorder {item.reorder_created || 0}, no response {item.no_response || 0}</span>
                  </div>
                )} />
              </>
            ) : <p className="empty-note">Open an experiment to view stats.</p>}
            <SimpleList items={usages.slice(0, 12)} render={(usage) => (
              <div className="quote-history-item">
                <strong>{usage.variantId} / {usage.outcome}</strong>
                <span>{usage.customerName || "No customer"} / {formatDate(usage.usedAt)}</span>
              </div>
            )} />
          </Panel>
        </section>
      </>
    );
  }

  function renderSuppliers() {
    return (
      <section className="workspace-grid">
        <Panel title="Suppliers / procurement" description="Lightweight supplier records, quotes, risk labels and procurement drafts. No auto-contact, no purchase order and no payment action.">
          <div className="filter-row">
            <input placeholder="Search supplier" value={supplierFilters.keyword} onChange={(event) => setSupplierFilters({ ...supplierFilters, keyword: event.target.value })} />
            <select value={supplierFilters.status} onChange={(event) => setSupplierFilters({ ...supplierFilters, status: event.target.value })}>
              <option value="">All status</option>
              {["active", "inactive", "blocked", "candidate"].map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={supplierFilters.riskLevel} onChange={(event) => setSupplierFilters({ ...supplierFilters, riskLevel: event.target.value })}>
              <option value="">All risks</option>
              {["low", "medium", "high"].map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <input placeholder="Country" value={supplierFilters.country} onChange={(event) => setSupplierFilters({ ...supplierFilters, country: event.target.value })} />
            <button className="secondary-button" onClick={() => loadSuppliers(supplierFilters)} disabled={loading}>Search</button>
          </div>
          <SimpleList items={suppliers} render={(item) => (
            <button className={`customer-row ${item.id === selectedSupplierId ? "selected" : ""}`} onClick={() => selectSupplierRecord(item.id)}>
              <strong>{item.name} / {item.status}</strong>
              <span>{item.country || "-"} {item.city || ""} / risk: {item.riskLevel || "-"}</span>
              <span>{(item.tags || []).join(", ") || "No tags"}</span>
            </button>
          )} />
        </Panel>

        <Panel title={selectedSupplier ? `Supplier detail: ${selectedSupplier.name}` : "Create supplier"} description="Contacts are permission controlled. Quotes are cost references only.">
          <form className="stack-form" onSubmit={saveSupplierRecord}>
            <input placeholder="Name" value={supplierForm.name} onChange={(event) => setSupplierForm({ ...supplierForm, name: event.target.value })} required />
            <div className="form-grid two">
              <input placeholder="Contact" value={supplierForm.contactName} onChange={(event) => setSupplierForm({ ...supplierForm, contactName: event.target.value })} />
              <input placeholder="Phone" value={supplierForm.phone} onChange={(event) => setSupplierForm({ ...supplierForm, phone: event.target.value })} />
              <input placeholder="Email" value={supplierForm.email} onChange={(event) => setSupplierForm({ ...supplierForm, email: event.target.value })} />
              <input placeholder="WhatsApp" value={supplierForm.whatsapp} onChange={(event) => setSupplierForm({ ...supplierForm, whatsapp: event.target.value })} />
              <input placeholder="Country" value={supplierForm.country} onChange={(event) => setSupplierForm({ ...supplierForm, country: event.target.value })} />
              <input placeholder="City" value={supplierForm.city} onChange={(event) => setSupplierForm({ ...supplierForm, city: event.target.value })} />
              <select value={supplierForm.status} onChange={(event) => setSupplierForm({ ...supplierForm, status: event.target.value })}>
                {["active", "inactive", "blocked", "candidate"].map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select value={supplierForm.riskLevel} onChange={(event) => setSupplierForm({ ...supplierForm, riskLevel: event.target.value })}>
                <option value="">No risk level</option>
                {["low", "medium", "high"].map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <input placeholder="Tags, comma or newline separated" value={supplierForm.tags} onChange={(event) => setSupplierForm({ ...supplierForm, tags: event.target.value })} />
            <textarea placeholder="Notes" value={supplierForm.notes} onChange={(event) => setSupplierForm({ ...supplierForm, notes: event.target.value })} />
            <div className="button-row">
              <button disabled={loading}>{selectedSupplierId ? "Update supplier" : "Create supplier"}</button>
              <button type="button" className="secondary-button" onClick={() => { setSelectedSupplierId(""); setSelectedSupplier(null); setSupplierForm({ ...emptySupplierForm, organizationId: selectedOrganizationId }); }}>New</button>
              {selectedSupplierId && <button type="button" className="danger-button" onClick={deactivateSupplierRecord}>Deactivate</button>}
            </div>
          </form>
        </Panel>

        <Panel title="Contacts, quotes and procurement notes" description="Applying a supplier quote to order cost requires manual confirmation and does not confirm true cost.">
          {selectedSupplier ? (
            <>
              <div className="form-grid two">
                <input placeholder="Contact name" value={supplierContactForm.name} onChange={(event) => setSupplierContactForm({ ...supplierContactForm, name: event.target.value })} />
                <input placeholder="Role" value={supplierContactForm.role} onChange={(event) => setSupplierContactForm({ ...supplierContactForm, role: event.target.value })} />
                <input placeholder="WhatsApp" value={supplierContactForm.whatsapp} onChange={(event) => setSupplierContactForm({ ...supplierContactForm, whatsapp: event.target.value })} />
                <button type="button" onClick={addSupplierContact} disabled={loading}>Add contact</button>
              </div>
              <SimpleList items={selectedSupplier.contacts || []} render={(item: any) => (
                <div className="customer-row"><strong>{item.name}</strong><span>{item.role || "-"} / {item.whatsapp || item.phone || item.email || "hidden"}</span></div>
              )} />

              <div className="form-grid two">
                <select value={supplierQuoteForm.productId} onChange={(event) => setSupplierQuoteForm({ ...supplierQuoteForm, productId: event.target.value })}>
                  <option value="">Select product</option>
                  {products.map((item) => <option key={item.id} value={item.id}>{item.name} / {item.sku}</option>)}
                </select>
                <input placeholder="SKU" value={supplierQuoteForm.sku} onChange={(event) => setSupplierQuoteForm({ ...supplierQuoteForm, sku: event.target.value })} />
                <input placeholder="MOQ" value={supplierQuoteForm.moq} onChange={(event) => setSupplierQuoteForm({ ...supplierQuoteForm, moq: event.target.value })} />
                <input placeholder="Unit cost" value={supplierQuoteForm.unitCost} onChange={(event) => setSupplierQuoteForm({ ...supplierQuoteForm, unitCost: event.target.value })} />
                <input placeholder="Currency" value={supplierQuoteForm.currency} onChange={(event) => setSupplierQuoteForm({ ...supplierQuoteForm, currency: event.target.value })} />
                <input placeholder="Lead time" value={supplierQuoteForm.leadTime} onChange={(event) => setSupplierQuoteForm({ ...supplierQuoteForm, leadTime: event.target.value })} />
              </div>
              <div className="button-row">
                <button type="button" onClick={addSupplierQuote} disabled={loading}>Add quote</button>
                <input placeholder="Order ID for cost application" value={supplierQuoteForm.orderId} onChange={(event) => setSupplierQuoteForm({ ...supplierQuoteForm, orderId: event.target.value })} />
              </div>
              <SimpleList items={selectedSupplier.quotes || []} render={(item: any) => (
                <div className="customer-row">
                  <strong>{item.sku || item.productName || "Quote"} / {item.currency || ""} {item.unitCost || "-"}</strong>
                  <span>MOQ {item.moq || "-"} / lead time {item.leadTime || "-"}</span>
                  <button className="secondary-button" onClick={() => applySelectedSupplierQuote(item.id)}>Apply to order cost</button>
                </div>
              )} />

              <textarea placeholder="Purchase note" value={purchaseNoteForm.content} onChange={(event) => setPurchaseNoteForm({ ...purchaseNoteForm, content: event.target.value })} />
              <button className="secondary-button" type="button" onClick={addPurchaseNote}>Add purchase note</button>
              <SimpleList items={selectedSupplier.purchaseNotes || []} render={(item: any) => (
                <div className="customer-row"><strong>{item.noteType}</strong><span>{item.content}</span></div>
              )} />
            </>
          ) : <p className="empty-note">Select a supplier to manage contacts, quotes, notes and risks.</p>}
        </Panel>

        <Panel title="Supplier risk and draft generator" description="Drafts are for manual procurement communication only. They do not contact suppliers automatically.">
          {selectedSupplier && (
            <>
              <div className="form-grid two">
                <select value={supplierRiskForm.riskType} onChange={(event) => setSupplierRiskForm({ ...supplierRiskForm, riskType: event.target.value })}>
                  {["unstable_delivery", "unstable_quality", "high_price", "poor_cooperation", "payment_risk", "needs_review", "other"].map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <select value={supplierRiskForm.level} onChange={(event) => setSupplierRiskForm({ ...supplierRiskForm, level: event.target.value })}>
                  {["low", "medium", "high"].map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <input placeholder="Risk note" value={supplierRiskForm.description} onChange={(event) => setSupplierRiskForm({ ...supplierRiskForm, description: event.target.value })} />
                <button type="button" onClick={addSupplierRisk}>Add risk</button>
              </div>
              <SimpleList items={selectedSupplier.risks || []} render={(item: any) => (
                <div className="customer-row"><strong>{item.riskType} / {item.level}</strong><span>{item.description || "-"}</span></div>
              )} />
              <div className="form-grid two">
                <select value={supplierScriptForm.scenario} onChange={(event) => setSupplierScriptForm({ ...supplierScriptForm, scenario: event.target.value })}>
                  {["ask_price", "ask_moq", "ask_sample_fee", "ask_lead_time", "ask_bulk_order_cost", "ask_custom_feasibility", "ask_quality_issue", "ask_reship_cost", "negotiate_price", "confirm_purchase_details"].map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <select value={supplierScriptForm.productId} onChange={(event) => setSupplierScriptForm({ ...supplierScriptForm, productId: event.target.value })}>
                  <option value="">Optional product</option>
                  {products.map((item) => <option key={item.id} value={item.id}>{item.name} / {item.sku}</option>)}
                </select>
                <input placeholder="Optional order ID" value={supplierScriptForm.orderId} onChange={(event) => setSupplierScriptForm({ ...supplierScriptForm, orderId: event.target.value })} />
                <button type="button" onClick={generateSupplierDraft} disabled={loading}>Generate draft</button>
              </div>
              {supplierScript && <textarea readOnly value={supplierScript} />}
              <RiskWarnings items={supplierRiskWarnings} />
            </>
          )}
        </Panel>
      </section>
    );
  }

  function renderBrands() {
    return (
      <section className="workspace-grid">
        <Panel title="Brands / stores" description="Brand context filters products, materials, knowledge and rules for drafts only. It does not switch WhatsApp accounts, sync stores or send messages.">
          <div className="filter-row">
            <select value={brandFilters.organizationId || selectedOrganizationId} onChange={(event) => setBrandFilters({ ...brandFilters, organizationId: event.target.value })}>
              <option value="">Select organization</option>
              {organizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select value={brandFilters.status} onChange={(event) => setBrandFilters({ ...brandFilters, status: event.target.value })}>
              <option value="">All status</option>
              {BRAND_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <input placeholder="Search brand" value={brandFilters.keyword} onChange={(event) => setBrandFilters({ ...brandFilters, keyword: event.target.value })} />
            <button className="secondary-button" onClick={() => loadBrands(brandFilters)} disabled={loading}>Search</button>
          </div>
          <SimpleList items={brands} render={(item) => (
            <button className={`customer-row ${item.id === selectedBrandId ? "selected" : ""}`} onClick={() => selectBrandRecord(item.id)}>
              <strong>{item.displayName || item.name} / {item.status}</strong>
              <span>{item.country || "-"} / {item.defaultLanguage || "-"} / {item.defaultCurrency || "-"}</span>
              <span>Products {item.productsCount || 0}, materials {item.materialsCount || 0}, rules {item.rulesCount || 0}</span>
            </button>
          )} />
        </Panel>

        <Panel title={selectedBrand ? `Brand detail: ${selectedBrand.displayName || selectedBrand.name}` : "Create brand / store"} description="Active brands appear in AI and extension selectors. Archiving requires manual confirmation.">
          <form className="stack-form" onSubmit={saveBrandRecord}>
            <input placeholder="Brand name" value={brandForm.name} onChange={(event) => setBrandForm({ ...brandForm, name: event.target.value })} required />
            <div className="form-grid two">
              <input placeholder="Display name" value={brandForm.displayName} onChange={(event) => setBrandForm({ ...brandForm, displayName: event.target.value })} />
              <input placeholder="Logo URL" value={brandForm.logoUrl} onChange={(event) => setBrandForm({ ...brandForm, logoUrl: event.target.value })} />
              <input placeholder="Website" value={brandForm.website} onChange={(event) => setBrandForm({ ...brandForm, website: event.target.value })} />
              <input placeholder="Country" value={brandForm.country} onChange={(event) => setBrandForm({ ...brandForm, country: event.target.value })} />
              <input placeholder="Default language" value={brandForm.defaultLanguage} onChange={(event) => setBrandForm({ ...brandForm, defaultLanguage: event.target.value })} />
              <input placeholder="Default currency" value={brandForm.defaultCurrency} onChange={(event) => setBrandForm({ ...brandForm, defaultCurrency: event.target.value })} />
              <select value={brandForm.status} onChange={(event) => setBrandForm({ ...brandForm, status: event.target.value })}>
                {BRAND_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <textarea placeholder="Description" value={brandForm.description} onChange={(event) => setBrandForm({ ...brandForm, description: event.target.value })} />
            <textarea placeholder="Notes" value={brandForm.notes} onChange={(event) => setBrandForm({ ...brandForm, notes: event.target.value })} />
            <div className="button-row">
              <button disabled={loading}>{selectedBrandId ? "Update brand" : "Create brand"}</button>
              <button type="button" className="secondary-button" onClick={() => { setSelectedBrandId(""); setSelectedBrand(null); setBrandForm({ ...emptyBrandForm, organizationId: selectedOrganizationId }); }}>New</button>
              {selectedBrandId && <button type="button" className="danger-button" onClick={archiveSelectedBrand}>Archive</button>}
            </div>
          </form>
        </Panel>

        <Panel title="Brand resources" description="Resources are linked manually and only affect what this brand prioritizes. They do not modify source product, material or knowledge records.">
          {selectedBrand ? (
            <>
              <div className="form-grid two">
                <select value={brandProductLinkId} onChange={(event) => setBrandProductLinkId(event.target.value)}>
                  <option value="">Product to link</option>
                  {products.map((item) => <option key={item.id} value={item.id}>{item.name} / {item.sku}</option>)}
                </select>
                <button type="button" onClick={addBrandProductLink}>Link product</button>
                <select value={brandMaterialLinkId} onChange={(event) => setBrandMaterialLinkId(event.target.value)}>
                  <option value="">Material to link</option>
                  {materials.map((item) => <option key={item.id} value={item.id}>{item.title} / {item.type}</option>)}
                </select>
                <button type="button" onClick={addBrandMaterialLink}>Link material</button>
                <select value={brandKnowledgeLinkId} onChange={(event) => setBrandKnowledgeLinkId(event.target.value)}>
                  <option value="">Org knowledge to link</option>
                  {orgKnowledgeBase.map((item) => <option key={item.id} value={item.id}>{item.title} / {item.category}</option>)}
                </select>
                <button type="button" onClick={addBrandKnowledgeLink}>Link knowledge</button>
                <input placeholder="Script ID" value={brandScriptLinkForm.scriptId} onChange={(event) => setBrandScriptLinkForm({ ...brandScriptLinkForm, scriptId: event.target.value })} />
                <select value={brandScriptLinkForm.scriptType} onChange={(event) => setBrandScriptLinkForm({ ...brandScriptLinkForm, scriptType: event.target.value })}>
                  {["script_org", "script_variant", "knowledge_script", "other"].map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <button type="button" onClick={addBrandScriptLink}>Link script</button>
              </div>
              <SimpleList items={selectedBrand.products || []} render={(item: any) => <BrandLinkedRow item={item} label={item.name || item.productId} onRemove={() => removeBrandLink("product", item.linkId)} />} />
              <SimpleList items={selectedBrand.materials || []} render={(item: any) => <BrandLinkedRow item={item} label={item.title || item.materialId} onRemove={() => removeBrandLink("material", item.linkId)} />} />
              <SimpleList items={selectedBrand.knowledgeBases || []} render={(item: any) => <BrandLinkedRow item={item} label={item.title || item.knowledgeBaseId} onRemove={() => removeBrandLink("knowledge", item.linkId)} />} />
              <SimpleList items={selectedBrand.scripts || []} render={(item: any) => <BrandLinkedRow item={item} label={`${item.scriptType}: ${item.scriptId}`} onRemove={() => removeBrandLink("script", item.linkId)} />} />
            </>
          ) : <p className="empty-note">Select a brand to link resources.</p>}
        </Panel>

        <Panel title="Brand rules and assignment" description="Brand rules feed AI context. If a policy is missing, AI must ask the salesperson to confirm it.">
          {selectedBrand ? (
            <>
              <div className="form-grid two">
                <select value={brandRuleForm.ruleType} onChange={(event) => setBrandRuleForm({ ...brandRuleForm, ruleType: event.target.value })}>
                  {BRAND_RULE_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <input placeholder="Rule title" value={brandRuleForm.title} onChange={(event) => setBrandRuleForm({ ...brandRuleForm, title: event.target.value })} />
                <input placeholder="Language" value={brandRuleForm.language} onChange={(event) => setBrandRuleForm({ ...brandRuleForm, language: event.target.value })} />
                <label className="checkbox-inline"><input type="checkbox" checked={brandRuleForm.enabled} onChange={(event) => setBrandRuleForm({ ...brandRuleForm, enabled: event.target.checked })} /> Enabled</label>
              </div>
              <textarea placeholder="Rule content" value={brandRuleForm.content} onChange={(event) => setBrandRuleForm({ ...brandRuleForm, content: event.target.value })} />
              <button type="button" onClick={saveBrandRule}>Save brand rule</button>
              <SimpleList items={selectedBrand.rules || []} render={(item: any) => (
                <div className="quote-history-item">
                  <strong>{item.ruleType} / {item.title} / {item.enabled ? "enabled" : "disabled"}</strong>
                  <span>{item.language || "all"} / {item.content}</span>
                  <div className="detail-actions">
                    <button className="secondary-button" onClick={() => toggleBrandRule(item)}>{item.enabled ? "Disable" : "Enable"}</button>
                    <button className="danger-button" onClick={() => removeBrandRule(item.id)}>Delete</button>
                  </div>
                </div>
              )} />
              <div className="form-grid two">
                <select value={brandAssignmentForm.entityType} onChange={(event) => setBrandAssignmentForm({ ...brandAssignmentForm, entityType: event.target.value })}>
                  {BRAND_ASSIGNMENT_ENTITY_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <input placeholder="Entity ID to assign" value={brandAssignmentForm.entityId} onChange={(event) => setBrandAssignmentForm({ ...brandAssignmentForm, entityId: event.target.value })} />
                <button type="button" onClick={assignSelectedBrand}>Assign brand</button>
              </div>
              <RiskWarnings items={brandContext?.riskWarnings || []} />
            </>
          ) : <p className="empty-note">Select a brand to manage rules and assignment.</p>}
        </Panel>
      </section>
    );
  }

  function renderPredictions() {
    const highReorder = customerPredictions.filter((item) => item.predictionType === "reorder" && item.level === "high").length;
    const dormant = customerPredictions.filter((item) => item.predictionType === "dormant").length;
    const churnRisk = customerPredictions.filter((item) => item.predictionType === "churn_risk").length;
    const highValue = customerPredictions.filter((item) => item.predictionType === "high_value").length;
    const dueReminders = reorderReminders.filter((item) => new Date(item.remindAt).getTime() <= Date.now() + 24 * 60 * 60 * 1000).length;
    return (
      <>
        <section className="metrics">
          <Metric label="High reorder potential" value={highReorder} />
          <Metric label="Dormant customers" value={dormant} />
          <Metric label="High value alerts" value={highValue} />
          <Metric label="Churn risk" value={churnRisk} />
          <Metric label="Due reorder reminders" value={dueReminders} />
        </section>
        <section className="grid quote-layout">
          <Panel title="Prediction filters" description="Rule-based prediction only. It does not auto-market or send WhatsApp messages.">
            <div className="form-grid">
              <SelectField label="Organization" value={predictionFilters.organizationId || selectedOrganizationId} onChange={(value) => setPredictionFilters({ ...predictionFilters, organizationId: value })} options={organizations.map((item) => [item.id, item.name])} emptyLabel="Personal scope" />
              <SelectField label="Prediction type" value={predictionFilters.predictionType} onChange={(value) => setPredictionFilters({ ...predictionFilters, predictionType: value })} options={[
                ["reorder", "reorder"],
                ["dormant", "dormant"],
                ["high_value", "high_value"],
                ["churn_risk", "churn_risk"]
              ]} emptyLabel="All types" />
              <SelectField label="Level" value={predictionFilters.level} onChange={(value) => setPredictionFilters({ ...predictionFilters, level: value })} options={[["low", "low"], ["medium", "medium"], ["high", "high"]]} emptyLabel="All levels" />
              <SelectField label="Status" value={predictionFilters.status} onChange={(value) => setPredictionFilters({ ...predictionFilters, status: value })} options={[["open", "open"], ["dismissed", "dismissed"], ["converted", "converted"], ["task_created", "task_created"]]} emptyLabel="All status" />
            </div>
            <div className="detail-actions">
              <button onClick={() => loadPredictions(predictionFilters)} disabled={loading}>Search</button>
              <button className="secondary-button" onClick={() => runPredictionRecalculate()} disabled={loading}>Recalculate visible scope</button>
              <button className="secondary-button" onClick={() => selectedCustomerId && runPredictionRecalculate(selectedCustomerId)} disabled={loading || !selectedCustomerId}>Recalculate selected customer</button>
            </div>
            <RiskWarnings items={[
              "Predictions are rule-based assistant signals, not a deal promise.",
              "The system never sends WhatsApp messages or creates marketing campaigns automatically.",
              "Confirm price, inventory, discount, lead time, shipping and payment details before sending any draft."
            ]} />
          </Panel>
          <Panel title="Generated script draft" description="Copy manually after checking all business details.">
            <textarea rows={8} value={predictionScript} onChange={(event) => setPredictionScript(event.target.value)} placeholder="Generate a reorder or reactivation script from a prediction." />
            <RiskWarnings items={predictionRiskWarnings} />
            <div className="detail-actions">
              <button className="secondary-button" onClick={() => navigator.clipboard.writeText(predictionScript)} disabled={!predictionScript}>Copy draft</button>
            </div>
          </Panel>
          <Panel title="Customer predictions" description="Open predictions can be converted into reminders only by manual click.">
            <SimpleList items={customerPredictions} render={(item) => (
              <div className="quote-history-item">
                <strong>{item.customerName} / {item.predictionType} / {item.score} / {item.level}</strong>
                <span>{item.recommendedAction || "-"}</span>
                {(item.reasons || []).slice(0, 3).map((reason) => <span key={reason}>{reason}</span>)}
                <div className="detail-actions">
                  <button className="secondary-button" onClick={() => { setView("customers"); void selectCustomer(item.customerId); }}>Open customer</button>
                  <button className="secondary-button" onClick={() => generatePredictionScript(item)} disabled={loading}>Generate script</button>
                  <button className="secondary-button" onClick={() => createReminderFromPrediction(item)} disabled={loading || item.status !== "open"}>Create reminder</button>
                  <button className="secondary-button" onClick={() => changePredictionStatus(item.id, "dismissed")} disabled={loading}>Dismiss</button>
                  <button className="secondary-button" onClick={() => changePredictionStatus(item.id, "converted")} disabled={loading}>Mark converted</button>
                </div>
              </div>
            )} />
          </Panel>
          <Panel title="Reorder reminders" description="Reminder status changes are manual and audited.">
            <SimpleList items={reorderReminders} render={(item) => (
              <div className="quote-history-item">
                <strong>{item.customerName} / {item.reminderType} / {item.status}</strong>
                <span>{formatDate(item.remindAt)} / {item.productName || "No product"}</span>
                <span>{item.reason || "-"}</span>
                {item.suggestedScript && <textarea rows={4} value={item.suggestedScript} readOnly />}
                <div className="detail-actions">
                  <button className="secondary-button" onClick={() => createFollowUpFromReminder(item.id)} disabled={loading || item.status !== "pending"}>Create FollowUpTask</button>
                  <button className="secondary-button" onClick={() => changeReminderStatus(item.id, "completed")} disabled={loading}>Complete</button>
                  <button className="secondary-button" onClick={() => changeReminderStatus(item.id, "dismissed")} disabled={loading}>Dismiss</button>
                  <button className="secondary-button" onClick={() => changeReminderStatus(item.id, "converted")} disabled={loading}>Converted</button>
                </div>
              </div>
            )} />
          </Panel>
          <Panel title="Product opportunities" description="Uses product, quote, sample and custom-request signals.">
            <div className="customer-list">
              {productOpportunities.length ? productOpportunities.map((item) => (
                <div className="quote-history-item" key={item.productId}>
                  <strong>{item.productName} / {item.score} / {item.level}</strong>
                  <span>{item.recommendedAction}</span>
                  {(item.reasons || []).slice(0, 3).map((reason) => <span key={reason}>{reason}</span>)}
                </div>
              )) : <p className="empty-note">No product opportunities.</p>}
            </div>
          </Panel>
        </section>
      </>
    );
  }

  function renderReorderOperations() {
    const high = reorderOpportunities.filter((item) => item.level === "high").length;
    const dormant = reorderOpportunities.filter((item) => item.opportunityType === "dormant_reactivation").length;
    const replenishment = reorderOpportunities.filter((item) => item.opportunityType === "replenishment").length;
    const newProduct = reorderOpportunities.filter((item) => item.opportunityType === "new_product").length;
    const converted = reorderOpportunities.filter((item) => item.status === "converted").length;
    return (
      <>
        <section className="metrics">
          <Metric label="High opportunities" value={high} />
          <Metric label="Dormant reactivation" value={dormant} />
          <Metric label="Replenishment" value={replenishment} />
          <Metric label="Related product" value={newProduct} />
          <Metric label="Converted" value={converted} />
        </section>
        <section className="grid quote-layout">
          <Panel title="Reorder operations filters" description="Opportunity pools are rule-based. They never auto-market or auto-send WhatsApp messages.">
            <div className="form-grid">
              <SelectField label="Organization" value={reorderOpsFilters.organizationId || selectedOrganizationId} onChange={(value) => setReorderOpsFilters({ ...reorderOpsFilters, organizationId: value })} options={organizations.map((item) => [item.id, item.name])} emptyLabel="Personal scope" />
              <SelectField label="Opportunity type" value={reorderOpsFilters.opportunityType} onChange={(value) => setReorderOpsFilters({ ...reorderOpsFilters, opportunityType: value })} options={REORDER_OPERATION_TYPES.map((item) => [item, item])} emptyLabel="All types" />
              <SelectField label="Level" value={reorderOpsFilters.level} onChange={(value) => setReorderOpsFilters({ ...reorderOpsFilters, level: value })} options={[["low", "low"], ["medium", "medium"], ["high", "high"]]} emptyLabel="All levels" />
              <SelectField label="Status" value={reorderOpsFilters.status} onChange={(value) => setReorderOpsFilters({ ...reorderOpsFilters, status: value })} options={REORDER_OPPORTUNITY_STATUSES.map((item) => [item, item])} emptyLabel="All status" />
            </div>
            <div className="detail-actions">
              <button onClick={() => loadReorderOperations(reorderOpsFilters)} disabled={loading}>Search</button>
              <button className="secondary-button" onClick={() => runReorderOpsRecalculate()} disabled={loading}>Recalculate scope</button>
              <button className="secondary-button" onClick={() => selectedCustomerId && runReorderOpsRecalculate(selectedCustomerId)} disabled={loading || !selectedCustomerId}>Recalculate selected customer</button>
            </div>
            <RiskWarnings items={[
              "No automatic marketing, bulk sending, or WhatsApp auto-send is implemented.",
              "Scripts must be manually reviewed; confirm price, inventory, discount, lead time, and payment before sending.",
              "Without completed order data, drafts use safe wording such as previous discussion, not previous purchase."
            ]} />
          </Panel>
          <Panel title="Generated reorder draft" description="Draft only. Copy manually after checking business details.">
            <textarea rows={8} value={reorderOperationScript} onChange={(event) => setReorderOperationScript(event.target.value)} placeholder="Generate a reorder, dormant, replenishment, or related-product draft." />
            <RiskWarnings items={reorderOperationRiskWarnings} />
            <div className="detail-actions">
              <button className="secondary-button" onClick={() => navigator.clipboard.writeText(reorderOperationScript)} disabled={!reorderOperationScript}>Copy draft</button>
            </div>
          </Panel>
          <Panel title="Reorder opportunity pool" description="Turn an opportunity into a FollowUpTask only by manual click.">
            <SimpleList items={reorderOpportunities} render={(item) => (
              <div className="quote-history-item">
                <strong>{item.customerName} / {item.opportunityType} / {item.score} / {item.level}</strong>
                <span>{item.productName || "No product"} / {item.status}</span>
                <span>{item.recommendedAction || "-"}</span>
                {(item.reasons || []).slice(0, 3).map((reason) => <span key={reason}>{reason}</span>)}
                <div className="detail-actions">
                  <button className="secondary-button" onClick={() => { setView("customers"); void selectCustomer(item.customerId); }}>Open customer</button>
                  <button className="secondary-button" onClick={() => generateReorderOpsScript(item)} disabled={loading}>Generate script</button>
                  <button className="secondary-button" onClick={() => createFollowUpFromOpportunity(item)} disabled={loading || item.status !== "open"}>Create FollowUpTask</button>
                  <button className="secondary-button" onClick={() => changeReorderOpportunityStatus(item.id, "contacted")} disabled={loading}>Contacted</button>
                  <button className="secondary-button" onClick={() => changeReorderOpportunityStatus(item.id, "converted")} disabled={loading}>Converted</button>
                  <button className="secondary-button" onClick={() => changeReorderOpportunityStatus(item.id, "dismissed")} disabled={loading}>Dismiss</button>
                </div>
              </div>
            )} />
          </Panel>
          <Panel title="Reorder campaigns" description="Campaigns are grouping tools only. They do not send or create bulk tasks automatically.">
            <form className="form-grid" onSubmit={saveReorderCampaign}>
              <SelectField label="Organization" value={reorderCampaignForm.organizationId || selectedOrganizationId} onChange={(value) => setReorderCampaignForm({ ...reorderCampaignForm, organizationId: value })} options={organizations.map((item) => [item.id, item.name])} emptyLabel="Personal campaign" />
              <Field label="Name"><input value={reorderCampaignForm.name} onChange={(event) => setReorderCampaignForm({ ...reorderCampaignForm, name: event.target.value })} /></Field>
              <SelectField label="Type" value={reorderCampaignForm.campaignType} onChange={(value) => setReorderCampaignForm({ ...reorderCampaignForm, campaignType: value })} options={REORDER_OPERATION_TYPES.map((item) => [item, item])} />
              <SelectField label="Scope" value={reorderCampaignForm.targetScope} onChange={(value) => setReorderCampaignForm({ ...reorderCampaignForm, targetScope: value })} options={REORDER_CAMPAIGN_SCOPES.map((item) => [item, item])} />
              <SelectField label="Status" value={reorderCampaignForm.status} onChange={(value) => setReorderCampaignForm({ ...reorderCampaignForm, status: value })} options={REORDER_CAMPAIGN_STATUSES.map((item) => [item, item])} />
              <button disabled={loading}>Create campaign</button>
            </form>
            <SimpleList items={reorderCampaigns} render={(item) => (
              <div className="quote-history-item">
                <strong>{item.name} / {item.campaignType}</strong>
                <span>{item.targetScope} / {item.status}</span>
                <div className="detail-actions">
                  <button className="secondary-button" onClick={() => deleteReorderCampaign(item.id).then(() => loadReorderOperations(reorderOpsFilters))} disabled={loading}>Delete</button>
                </div>
              </div>
            )} />
          </Panel>
          <Panel title="Reorder playbooks" description="Reusable templates for safe reorder drafts.">
            <form className="form-grid" onSubmit={saveReorderPlaybook}>
              <SelectField label="Organization" value={reorderPlaybookForm.organizationId || selectedOrganizationId} onChange={(value) => setReorderPlaybookForm({ ...reorderPlaybookForm, organizationId: value })} options={organizations.map((item) => [item.id, item.name])} emptyLabel="Personal playbook" />
              <Field label="Title"><input value={reorderPlaybookForm.title} onChange={(event) => setReorderPlaybookForm({ ...reorderPlaybookForm, title: event.target.value })} /></Field>
              <SelectField label="Scenario" value={reorderPlaybookForm.scenario} onChange={(value) => setReorderPlaybookForm({ ...reorderPlaybookForm, scenario: value })} options={REORDER_OPERATION_SCRIPT_SCENARIOS.map((item) => [item, item])} />
              <Field label="Language"><input value={reorderPlaybookForm.language} onChange={(event) => setReorderPlaybookForm({ ...reorderPlaybookForm, language: event.target.value })} /></Field>
              <label className="field full-width"><span>Content</span><textarea rows={5} value={reorderPlaybookForm.content} onChange={(event) => setReorderPlaybookForm({ ...reorderPlaybookForm, content: event.target.value })} /></label>
              <button disabled={loading}>Create playbook</button>
            </form>
            <SimpleList items={reorderPlaybooks} render={(item) => (
              <div className="quote-history-item">
                <strong>{item.title} / {item.scenario}</strong>
                <span>{item.language} / {item.enabled ? "enabled" : "disabled"}</span>
                <span>{item.content.slice(0, 120)}</span>
                <div className="detail-actions">
                  <button className="secondary-button" onClick={() => deleteReorderPlaybook(item.id).then(() => loadReorderOperations(reorderOpsFilters))} disabled={loading}>Delete</button>
                </div>
              </div>
            )} />
          </Panel>
        </section>
      </>
    );
  }

  function renderOrganizations() {
    return (
      <section className="customer-layout">
        <Panel title="Organizations" description="V3-A team container. Current V1/V2 personal data isolation stays unchanged.">
          <SimpleList items={organizations} render={(item) => (
            <button className={`customer-row ${item.id === selectedOrganizationId ? "selected" : ""}`} onClick={() => selectOrganization(item.id)}>
              <strong>{item.name}</strong>
              <span>{item.currentUserRole || "member"} / {item.currentUserStatus || "-"} / {item.memberCount} members</span>
              <span>Owner: {item.ownerId === currentUser?.id ? "you" : item.ownerId}</span>
            </button>
          )} />
          <div className="detail-actions">
            <button className="secondary-button" onClick={loadOrganizations}>Refresh organizations</button>
            <button className="secondary-button" onClick={() => { setSelectedOrganizationId(""); setOrganizationForm(emptyOrganizationForm); setOrganizationMembers([]); }}>New organization</button>
          </div>
        </Panel>
        <Panel title="Organization detail" description="Owner can edit organization. Owner or manager can manage members.">
          <div className="form-grid">
            <Field label="Name"><input value={organizationForm.name} onChange={(event) => setOrganizationForm({ name: event.target.value })} /></Field>
            <Field label="Your role"><input value={selectedOrganization?.currentUserRole || (selectedOrganizationId ? "-" : "new owner")} readOnly /></Field>
          </div>
          <div className="detail-actions">
            <button onClick={saveOrganizationRecord} disabled={loading || Boolean(selectedOrganizationId && !isSelectedOrganizationOwner)}>Save</button>
            <button className="danger-button" onClick={removeOrganizationRecord} disabled={loading || !selectedOrganizationId || !isSelectedOrganizationOwner}>Delete</button>
          </div>
          <RiskWarnings items={[
            "V3-A only creates organization membership. Customer, product, quote and V2 records remain personally isolated until later sharing rules are added.",
            "Only owner can update or delete organization info. Owner or manager can manage members."
          ]} />
          {selectedOrganizationId && (
            <div className="quote-history">
              <div className="section-subhead"><strong>Members</strong><span>{organizationMembers.length}</span></div>
              <FilterRow>
                <input placeholder="Search member name or email" value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} />
                <button className="secondary-button" onClick={refreshOrganizationMembers}>Search</button>
              </FilterRow>
              <div className="form-grid">
                <Field label="User ID"><input value={memberForm.userId} onChange={(event) => setMemberForm({ ...memberForm, userId: event.target.value })} disabled={!canManageSelectedOrganization} /></Field>
                <SelectField label="Role" value={memberForm.role} onChange={(value) => setMemberForm({ ...memberForm, role: value as OrganizationRole })} options={ORGANIZATION_ROLES.map((item) => [item, item])} />
                <SelectField label="Status" value={memberForm.status} onChange={(value) => setMemberForm({ ...memberForm, status: value as OrganizationMemberStatus })} options={ORGANIZATION_MEMBER_STATUSES.map((item) => [item, item])} />
              </div>
              <div className="detail-actions">
                <button onClick={addMemberRecord} disabled={loading || !canManageSelectedOrganization}>Add member</button>
              </div>
              <SimpleList items={organizationMembers} render={(member) => (
                <div className="list-item">
                  <div>
                    <strong>{member.userName || member.userEmail || member.userId}</strong>
                    <span>{member.userEmail || member.userId}</span>
                  </div>
                  <select value={member.role} onChange={(event) => updateMemberRecord(member.id, { role: event.target.value as OrganizationRole })} disabled={!canManageSelectedOrganization || (member.role === "owner" && !isSelectedOrganizationOwner)}>
                    {ORGANIZATION_ROLES.map((role) => <option key={role}>{role}</option>)}
                  </select>
                  <select value={member.status} onChange={(event) => updateMemberRecord(member.id, { status: event.target.value as OrganizationMemberStatus })} disabled={!canManageSelectedOrganization || (member.role === "owner" && !isSelectedOrganizationOwner)}>
                    {ORGANIZATION_MEMBER_STATUSES.map((status) => <option key={status}>{status}</option>)}
                  </select>
                  <button className="danger-button" onClick={() => removeMemberRecord(member.id)} disabled={!canManageSelectedOrganization || (member.role === "owner" && !isSelectedOrganizationOwner)}>Remove</button>
                </div>
              )} />
            </div>
          )}
        </Panel>
      </section>
    );
  }

  function renderEnterprise() {
    const activeUnits = enterpriseUnits.filter((item) => item.status === "active").length;
    const report = enterpriseReports[0];
    const reportKpis = (report?.result as any)?.kpis || {};
    return (
      <>
        <section className="metrics">
          <Metric label="Org units" value={enterpriseUnits.length} />
          <Metric label="Active units" value={activeUnits} />
          <Metric label="Enterprise roles" value={enterpriseRoles.length} />
          <Metric label="Audit events" value={enterpriseAuditLogs.length} />
        </section>
        <section className="grid quote-layout">
          <Panel title="Enterprise organization units" description="V5 manages subsidiaries and branches under the selected organization.">
            <div className="form-grid">
              <SelectField label="Organization" value={enterpriseForm.organizationId || selectedOrganizationId} onChange={(value) => setEnterpriseForm({ ...enterpriseForm, organizationId: value })} options={organizations.map((item) => [item.id, item.name])} emptyLabel="Select organization" />
              <Field label="Name"><input value={enterpriseForm.name} onChange={(event) => setEnterpriseForm({ ...enterpriseForm, name: event.target.value })} placeholder="Subsidiary / branch name" /></Field>
              <SelectField label="Type" value={enterpriseForm.type} onChange={(value) => setEnterpriseForm({ ...enterpriseForm, type: value })} options={ORGANIZATION_UNIT_TYPES.map((item: string) => [item, item])} />
              <SelectField label="Status" value={enterpriseForm.status} onChange={(value) => setEnterpriseForm({ ...enterpriseForm, status: value })} options={ENTERPRISE_ENTITY_STATUSES.map((item: string) => [item, item])} />
              <Field label="Parent unit ID"><input value={enterpriseForm.parentId} onChange={(event) => setEnterpriseForm({ ...enterpriseForm, parentId: event.target.value })} placeholder="Optional" /></Field>
            </div>
            <div className="detail-actions">
              <button onClick={saveEnterpriseUnit} disabled={loading || !canManageSelectedOrganization}>Create unit</button>
              <button className="secondary-button" onClick={() => loadEnterpriseData(selectedOrganizationId)} disabled={!selectedOrganizationId}>Refresh enterprise data</button>
            </div>
            <SimpleList items={enterpriseUnits} render={(item) => (
              <div className="customer-row">
                <strong>{item.name}</strong>
                <span>{item.type} / {item.status} / org {item.organizationId.slice(0, 8)}</span>
                <span>Parent: {item.parentId || "-"}</span>
                <button className="danger-button" onClick={() => archiveEnterpriseUnit(item.id)} disabled={!canManageSelectedOrganization || item.status === "archived"}>Archive</button>
              </div>
            )} />
          </Panel>

          <Panel title="Enterprise members and role matrix" description="Central member list plus enterprise role overlays. Sensitive member changes require confirmation.">
            <div className="form-grid">
              <Field label="User ID"><input value={memberForm.userId} onChange={(event) => setMemberForm({ ...memberForm, userId: event.target.value })} placeholder="Existing user id" /></Field>
              <Field label="Role name"><input value={enterpriseRoleForm.roleName} onChange={(event) => setEnterpriseRoleForm({ ...enterpriseRoleForm, roleName: event.target.value })} /></Field>
            </div>
            <Field label="Enterprise permissions"><textarea rows={5} value={enterpriseRoleForm.permissions} onChange={(event) => setEnterpriseRoleForm({ ...enterpriseRoleForm, permissions: event.target.value })} placeholder="One permission per line" /></Field>
            <Field label="Role description"><input value={enterpriseRoleForm.description} onChange={(event) => setEnterpriseRoleForm({ ...enterpriseRoleForm, description: event.target.value })} /></Field>
            <div className="detail-actions">
              <button onClick={() => saveEnterpriseMember(memberForm.userId)} disabled={loading || !canManageSelectedOrganization}>Assign member</button>
              <button onClick={saveEnterpriseRole} disabled={loading || !canManageSelectedOrganization}>Create role overlay</button>
            </div>
            <div className="quote-history">
              <div className="section-subhead"><strong>Members</strong><span>{enterpriseMembers.length}</span></div>
              <SimpleList items={enterpriseMembers} render={(member) => (
                <div className="list-item">
                  <div>
                    <strong>{member.userName || member.userEmail || member.userId}</strong>
                    <span>{member.role} / {member.status}</span>
                  </div>
                  <select value={member.role} onChange={(event) => updateEnterpriseMemberRecord(member.id, { role: event.target.value })} disabled={!canManageSelectedOrganization}>
                    {ORGANIZATION_ROLES.map((role) => <option key={role}>{role}</option>)}
                  </select>
                  <select value={member.status} onChange={(event) => updateEnterpriseMemberRecord(member.id, { status: event.target.value })} disabled={!canManageSelectedOrganization}>
                    {ORGANIZATION_MEMBER_STATUSES.map((status) => <option key={status}>{status}</option>)}
                  </select>
                </div>
              )} />
            </div>
            <div className="quote-history">
              <div className="section-subhead"><strong>Enterprise role overlays</strong><span>{enterpriseRoles.length}</span></div>
              <SimpleList items={enterpriseRoles} render={(role) => (
                <div className="customer-row">
                  <strong>{role.roleName}</strong>
                  <span>{role.description || "No description"}</span>
                  <span>{role.permissions.slice(0, 8).join(", ")}{role.permissions.length > 8 ? "..." : ""}</span>
                  <button className="secondary-button" onClick={() => updateEnterpriseRoleRecord(role.id, role.permissions)} disabled={!canManageSelectedOrganization}>Refresh audit</button>
                </div>
              )} />
            </div>
          </Panel>
        </section>

        <section className="grid quote-layout">
          <Panel title="Enterprise reports" description="Aggregated V5 KPI snapshot across accessible organization data.">
            <div className="form-grid">
              <SelectField label="Organization" value={enterpriseReportForm.organizationId || selectedOrganizationId} onChange={(value) => setEnterpriseReportForm({ ...enterpriseReportForm, organizationId: value })} options={organizations.map((item) => [item.id, item.name])} emptyLabel="Select organization" />
              <Field label="Report type"><input value={enterpriseReportForm.reportType} onChange={(event) => setEnterpriseReportForm({ ...enterpriseReportForm, reportType: event.target.value })} /></Field>
            </div>
            <div className="detail-actions">
              <button onClick={createEnterpriseReportRecord} disabled={loading || !canManageSelectedOrganization}>Generate report</button>
            </div>
            <div className="metrics">
              <Metric label="Customers today" value={reportKpis.todayNewCustomers ?? "-"} />
              <Metric label="Orders" value={reportKpis.orderCount ?? "-"} />
              <Metric label="Brands" value={reportKpis.activeBrands ?? "-"} />
              <Metric label="Suppliers" value={reportKpis.supplierCount ?? "-"} />
            </div>
            <SimpleList items={enterpriseReports} render={(item) => (
              <div className="customer-row">
                <strong>{item.reportType}</strong>
                <span>{item.status} / {item.createdAt}</span>
                <span>{JSON.stringify((item.result as any)?.kpis || {}).slice(0, 160)}</span>
              </div>
            )} />
          </Panel>

          <Panel title="Enterprise AI brand context" description="Checks brand rules and organization context for AI drafts. It never sends WhatsApp messages.">
            <div className="detail-actions">
              <button onClick={loadEnterpriseBrandContext} disabled={loading || !selectedOrganizationId || !brands.length}>Load brand context</button>
            </div>
            {enterpriseBrandContext && (
              <div className="quote-history-item">
                <strong>{enterpriseBrandContext.brandUsed || "No brand selected"}</strong>
                <span>Rules: {enterpriseBrandContext.brandRulesUsed.join(", ") || "-"}</span>
                <span>Knowledge: {enterpriseBrandContext.knowledgeUsed.join(", ") || "-"}</span>
              </div>
            )}
            <RiskWarnings items={enterpriseBrandContext?.riskWarnings || ["Enterprise AI context is advisory only. Confirm price, inventory, lead time, payment, logistics and after-sales policy before sending."]} />
          </Panel>
        </section>

        <section className="grid quote-layout">
          <Panel title="Enterprise audit trail" description="Centralized enterprise operations and AI context checks.">
            <SimpleList items={enterpriseAuditLogs} render={(item) => (
              <div className="customer-row">
                <strong>{item.riskLevel || "low"} / {item.action}</strong>
                <span>{item.entityType} {item.entityId || ""}</span>
                <span>{item.createdAt}</span>
              </div>
            )} />
          </Panel>
          <Panel title="V5 safety boundary" description="Enterprise platform keeps V4 sales safety behavior unchanged.">
            <RiskWarnings items={[
              "No WhatsApp official API, no automatic sending, no bulk sending, and no send-button simulation.",
              "AI output remains a draft or recommendation. Salespeople must manually confirm before sending.",
              "Sensitive exports, destructive changes and role changes stay permission-gated and audited."
            ]} />
          </Panel>
        </section>
      </>
    );
  }

  function renderAiKeys() {
    const instantKeys = aiProviderKeys.filter((item) => item.mode === "instant");
    const thinkingKeys = aiProviderKeys.filter((item) => item.mode === "thinking");
    const totalTokens = aiProviderKeys.reduce((sum, item) => sum + item.totalTokens, 0);
    const modelOptions = (aiModels.length > 0 ? aiModels : [
      { id: "deepseek-v4-fastest", label: "DeepSeek V4 fastest", provider: "deepseek", mode: "instant", model: "deepseek-v4-flash", baseUrl: "https://api.deepseek.com", priority: 10 },
      { id: "deepseek-v4-pro", label: "DeepSeek V4 thinking", provider: "deepseek", mode: "thinking", model: "deepseek-v4-pro", baseUrl: "https://api.deepseek.com", priority: 20 },
      { id: "deepseek-v4-chat", label: "DeepSeek V4 chat", provider: "deepseek", mode: "instant", model: "deepseek-v4-chat", baseUrl: "https://api.deepseek.com", priority: 30 },
      { id: "deepseek-v4-reasoner", label: "DeepSeek V4 reasoner", provider: "deepseek", mode: "thinking", model: "deepseek-v4-reasoner", baseUrl: "https://api.deepseek.com", priority: 40 },
      { id: "chatgpt-5.5-instant", label: "ChatGPT 5.5 instant", provider: "openai", mode: "instant", model: "gpt-5.5-instant", baseUrl: "https://api.openai.com/v1", priority: 100 },
      { id: "chatgpt-5.5-thinking", label: "ChatGPT 5.5 thinking", provider: "openai", mode: "thinking", model: "gpt-5.5-thinking", baseUrl: "https://api.openai.com/v1", priority: 110 }
    ] as AiModelDefinition[]);
    const permissionWarnings = !selectedOrganizationId
      ? ["Select an organization first. AI keys are stored per organization."]
      : !canManageAiKeys
        ? ["Only goseashop@gmail.com can view or manage AI keys."]
        : [];
    if (!canManageAiKeys) {
      return (
        <Panel title="AI key pool" description="Restricted management page.">
          <RiskWarnings items={permissionWarnings.length ? permissionWarnings : ["Only goseashop@gmail.com can access this page."]} />
        </Panel>
      );
    }
    return (
      <>
        <section className="metrics">
          <Metric label="Instant keys" value={instantKeys.length} />
          <Metric label="Thinking keys" value={thinkingKeys.length} />
          <Metric label="Total requests" value={aiProviderKeys.reduce((sum, item) => sum + item.totalRequests, 0)} />
          <Metric label="Tokens used" value={totalTokens} />
          <Metric label="Errors" value={aiProviderKeys.reduce((sum, item) => sum + item.errorCount, 0)} />
        </section>
        <section className="customer-layout">
          <Panel title="AI key pool" description="Restricted to goseashop@gmail.com. Keys are encrypted at rest, masked in UI, and selected by model, mode and priority.">
            <RiskWarnings items={permissionWarnings} />
            <div className="form-grid">
              <SelectField label="Organization" value={aiKeyForm.organizationId || selectedOrganizationId} onChange={(value) => setAiKeyForm({ ...aiKeyForm, organizationId: value })} options={organizations.map((item) => [item.id, item.name])} emptyLabel="Select organization" />
              <Field label="Name"><input value={aiKeyForm.name} onChange={(event) => setAiKeyForm({ ...aiKeyForm, name: event.target.value })} placeholder="Provider key label" /></Field>
              <SelectField label="Model" value={aiKeyForm.model} onChange={(value) => {
                const model = modelOptions.find((item) => item.model === value || item.id === value);
                setAiKeyForm({
                  ...aiKeyForm,
                  provider: model?.provider || aiKeyForm.provider,
                  mode: model?.mode || aiKeyForm.mode,
                  model: model?.model || value,
                  baseUrl: model?.baseUrl || aiKeyForm.baseUrl,
                  priority: String(model?.priority || aiKeyForm.priority || 100)
                });
              }} options={modelOptions.map((item) => [item.model, `${item.label} (${item.mode})`])} />
              <SelectField label="Provider" value={aiKeyForm.provider} onChange={(value) => setAiKeyForm({ ...aiKeyForm, provider: value })} options={[["deepseek", "DeepSeek"], ["openai", "OpenAI / ChatGPT"]]} />
              <SelectField label="Mode" value={aiKeyForm.mode} onChange={(value) => setAiKeyForm({ ...aiKeyForm, mode: value as "instant" | "thinking" })} options={[["instant", "Instant"], ["thinking", "Thinking"]]} />
              <SelectField label="Status" value={aiKeyForm.status} onChange={(value) => setAiKeyForm({ ...aiKeyForm, status: value as "active" | "disabled" | "exhausted" })} options={[["active", "Active"], ["disabled", "Disabled"], ["exhausted", "Exhausted"]]} />
              <Field label="User email"><input value={aiKeyForm.userEmail} onChange={(event) => setAiKeyForm({ ...aiKeyForm, userEmail: event.target.value })} placeholder="goseashop@gmail.com" /></Field>
              <Field label="Base URL"><input value={aiKeyForm.baseUrl} onChange={(event) => setAiKeyForm({ ...aiKeyForm, baseUrl: event.target.value })} placeholder="Provider default if blank" /></Field>
              <Field label="Priority"><input value={aiKeyForm.priority} onChange={(event) => setAiKeyForm({ ...aiKeyForm, priority: event.target.value })} placeholder="Lower number is tried first" /></Field>
              <Field label="API key"><input type="password" value={aiKeyForm.apiKey} onChange={(event) => setAiKeyForm({ ...aiKeyForm, apiKey: event.target.value })} placeholder="sk-..." autoComplete="off" /></Field>
            </div>
            <div className="detail-actions">
              <button onClick={saveAiProviderKey} disabled={loading || !canManageAiKeys}>Save key</button>
              <button className="secondary-button" onClick={() => loadAiProviderKeys(aiKeyForm.organizationId || selectedOrganizationId)} disabled={!selectedOrganizationId}>Refresh usage</button>
              {selectedOrganizationId && <a className="secondary-button" href={aiKeyUsageExportUrl(selectedOrganizationId)} target="_blank" rel="noreferrer">Export usage CSV</a>}
            </div>
            <RiskWarnings items={[
              "Stored keys are never displayed again. Only masked suffix and usage counters are shown.",
              "DeepSeek V4 keys are tried before ChatGPT 5.5 fallback keys when both are active.",
              "Exported usage reports never include plaintext keys."
            ]} />
          </Panel>

          <Panel title="Document import" description="Paste or upload JSON/YAML with key, model and user_email fields. Example: { keys: [{ key, model, user_email }] }.">
            <Field label="Upload JSON/YAML"><input type="file" accept=".json,.yaml,.yml,application/json,text/yaml,text/plain" onChange={(event) => void handleAiKeyFile(event.target.files?.[0] || null)} /></Field>
            <Field label="Import document"><textarea rows={8} value={aiKeyImportContent} onChange={(event) => setAiKeyImportContent(event.target.value)} placeholder={'keys:\n  - key: sk-...\n    model: deepseek-v4-flash\n    user_email: goseashop@gmail.com'} /></Field>
            <div className="detail-actions">
              <button onClick={importAiKeyDocument} disabled={loading || !canManageAiKeys || !selectedOrganizationId}>Import keys</button>
              <button className="secondary-button" onClick={() => { setAiKeyImportContent(""); setAiKeyImportFilename(""); }}>Clear</button>
            </div>
          </Panel>

          <Panel title="Usage and health" description="The backend automatically tries active keys by mode and priority, then switches to the next key after rate-limit, quota, network, or API errors.">
            <SimpleList items={aiProviderKeys} render={(item) => (
              <div className="customer-row">
                <strong>{item.name} / {item.provider} / {item.model || item.mode} / {item.maskedKey}</strong>
                <span>Status {item.status} / mode {item.mode} / priority {item.priority} / tokens {item.totalTokens}</span>
                <span>User {item.userEmail || "-"} / base URL {item.baseUrl || "provider default"}</span>
                <span>Requests {item.totalRequests} / success {item.successCount} / errors {item.errorCount} / 429 {item.rateLimitCount} / quota {item.quotaErrorCount}</span>
                <span>Last used {formatDate(item.lastUsedAt)} / last success {formatDate(item.lastSuccessAt)} / last error {item.lastErrorMessage || "-"}</span>
                <div className="detail-actions">
                  <button className="secondary-button" onClick={() => updateAiProviderKeyRecord(item.id, { status: item.status === "active" ? "disabled" : "active" })} disabled={!canManageAiKeys}>
                    {item.status === "active" ? "Disable" : "Enable"}
                  </button>
                  <button className="secondary-button" onClick={() => updateAiProviderKeyRecord(item.id, { mode: item.mode === "instant" ? "thinking" : "instant" })} disabled={!canManageAiKeys}>
                    Switch to {item.mode === "instant" ? "thinking" : "instant"}
                  </button>
                  <button className="danger-button" onClick={() => disableAiProviderKeyRecord(item.id)} disabled={!canManageAiKeys}>Disable with confirm</button>
                </div>
              </div>
            )} />
          </Panel>
        </section>
      </>
    );
  }

  function renderRoles() {
    return (
      <section className="customer-layout">
        <Panel title="Roles" description="Role permissions are enforced by API. Choose an organization to view its role definitions.">
          <FilterRow>
            <select value={selectedOrganizationId} onChange={(event) => selectOrganization(event.target.value)}>
              <option value="">Select organization</option>
              {organizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <input placeholder="Search role or description" value={roleSearch} onChange={(event) => setRoleSearch(event.target.value)} />
            <button onClick={() => loadRoles(selectedOrganizationId, roleSearch)}>Search</button>
          </FilterRow>
          <SimpleList items={roles} render={(role) => (
            <button className={`customer-row ${role.id === selectedRoleId ? "selected" : ""}`} onClick={() => { setSelectedRoleId(role.id); setRoleForm(toRoleForm(role)); }}>
              <strong>{role.name}</strong>
              <span>{role.description}</span>
            </button>
          )} />
        </Panel>
        <Panel title="Role editor" description="Only organization owners can create, update, or delete role descriptions.">
          <div className="form-grid">
            <SelectField label="Organization" value={roleForm.organizationId || selectedOrganizationId} onChange={(value) => setRoleForm({ ...roleForm, organizationId: value })} options={organizations.map((item) => [item.id, item.name])} emptyLabel="Select organization" />
            <SelectField label="Role" value={roleForm.name} onChange={(value) => setRoleForm({ ...roleForm, name: value as OrganizationRole })} options={ORGANIZATION_ROLES.map((item) => [item, item])} />
          </div>
          <Field label="Description"><textarea rows={5} value={roleForm.description} onChange={(event) => setRoleForm({ ...roleForm, description: event.target.value })} /></Field>
          <RiskWarnings items={[
            "owner: full access. manager: can manage members and organization resources. sales/support: read-only when an organization context is used.",
            "V3-B does not convert personal V1/V2 data into organization-shared data. Personal account isolation remains active.",
            "Frontend buttons are convenience only; the API enforces permissions."
          ]} />
          <div className="detail-actions">
            <button onClick={saveRoleRecord} disabled={loading || selectedOrganization?.currentUserRole !== "owner"}>Save</button>
            <button className="secondary-button" onClick={() => { setSelectedRoleId(""); setRoleForm({ ...emptyRoleForm, organizationId: selectedOrganizationId }); }}>New role config</button>
            <button className="danger-button" onClick={removeRoleRecord} disabled={loading || !selectedRoleId || selectedOrganization?.currentUserRole !== "owner"}>Delete</button>
          </div>
        </Panel>
      </section>
    );
  }

  function renderCustomers() {
    return (
      <section className="customer-layout">
        <Panel title="Customer list" description="Filtered by current logged-in user only.">
          <div className="filters">
            <input placeholder="Search" value={customerFilters.q} onChange={(event) => setCustomerFilters({ ...customerFilters, q: event.target.value })} />
            <select value={customerFilters.organizationId} onChange={(event) => setCustomerFilters({ ...customerFilters, organizationId: event.target.value })}>
              <option value="">Personal scope</option>
              {organizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select value={customerFilters.tag} onChange={(event) => setCustomerFilters({ ...customerFilters, tag: event.target.value })}>
              <option value="">All tags</option>
              {CUSTOMER_TAGS.map((tag) => <option key={tag}>{tag}</option>)}
            </select>
            <select value={customerFilters.intentLevel} onChange={(event) => setCustomerFilters({ ...customerFilters, intentLevel: event.target.value as CustomerFilters["intentLevel"] })}>
              <option value="">All intent</option>
              <option value="high">high</option>
              <option value="medium">medium</option>
              <option value="low">low</option>
            </select>
            <button onClick={() => loadCustomers(customerFilters)}>Search</button>
          </div>
          <div className="customer-list">
            {customers.map((customer) => (
              <button key={customer.id} className={`customer-row ${customer.id === selectedCustomerId ? "selected" : ""}`} onClick={() => selectCustomer(customer.id)}>
                <strong>{customer.name}</strong>
                <span>{customer.whatsappNumber || "No WhatsApp"} / {customer.stage}</span>
                <span>Owner {customer.ownerId ? customer.ownerId.slice(0, 8) : "-"} / Assigned {customer.assignedTo ? customer.assignedTo.slice(0, 8) : "-"} / Collaborators {customer.collaborators?.length || 0}</span>
                <span>Intent: {customer.intentScore ?? "-"} / {customer.intentLevel || "-"}</span>
              </button>
            ))}
          </div>
        </Panel>
        <Panel title="Customer detail" description="Tags, stage, notes, quotes, samples and custom requests.">
          {renderCustomerForm()}
          {renderCustomerSideRecords()}
        </Panel>
      </section>
    );
  }

  function renderCustomerForm() {
    return (
      <>
        <div className="form-grid">
          <Field label="Name"><input value={customerForm.name} onChange={(event) => setCustomerForm({ ...customerForm, name: event.target.value })} /></Field>
          <Field label="WhatsApp"><input value={customerForm.whatsappNumber} onChange={(event) => setCustomerForm({ ...customerForm, whatsappNumber: event.target.value })} /></Field>
          <Field label="Email"><input value={customerForm.email} onChange={(event) => setCustomerForm({ ...customerForm, email: event.target.value })} /></Field>
          <Field label="Social links"><input value={customerForm.socialLinks} onChange={(event) => setCustomerForm({ ...customerForm, socialLinks: event.target.value })} placeholder="Use comma or new lines" /></Field>
          <SelectField label="Organization" value={customerForm.organizationId} onChange={(value) => setCustomerForm({ ...customerForm, organizationId: value, assignedTo: value ? customerForm.assignedTo : "", collaborators: value ? customerForm.collaborators : "" })} options={organizations.map((item) => [item.id, item.name])} emptyLabel="Personal customer" />
          <Field label="Assigned to"><input value={customerForm.assignedTo} onChange={(event) => setCustomerForm({ ...customerForm, assignedTo: event.target.value })} /></Field>
          <Field label="Collaborators"><input value={customerForm.collaborators} onChange={(event) => setCustomerForm({ ...customerForm, collaborators: event.target.value })} /></Field>
          <Field label="Country"><input value={customerForm.country} onChange={(event) => setCustomerForm({ ...customerForm, country: event.target.value })} /></Field>
          <Field label="Language"><input value={customerForm.language} onChange={(event) => setCustomerForm({ ...customerForm, language: event.target.value })} /></Field>
          <Field label="Tags"><input value={customerForm.tags} onChange={(event) => setCustomerForm({ ...customerForm, tags: event.target.value })} /></Field>
          <Field label="Stage">
            <select value={customerForm.stage} onChange={(event) => setCustomerForm({ ...customerForm, stage: event.target.value })}>
              {CUSTOMER_STAGES.map((stage) => <option key={stage}>{stage}</option>)}
            </select>
          </Field>
          <Field label="Interested product"><input value={customerForm.interestedProduct} onChange={(event) => setCustomerForm({ ...customerForm, interestedProduct: event.target.value })} /></Field>
          <Field label="Next follow-up"><input type="datetime-local" value={customerForm.nextFollowUpAt} onChange={(event) => setCustomerForm({ ...customerForm, nextFollowUpAt: event.target.value })} /></Field>
        </div>
        <Field label="Latest summary"><textarea rows={3} value={customerForm.latestSummary} onChange={(event) => setCustomerForm({ ...customerForm, latestSummary: event.target.value })} /></Field>
        <Field label="Notes"><textarea rows={3} value={customerForm.notes} onChange={(event) => setCustomerForm({ ...customerForm, notes: event.target.value })} /></Field>
        {customerDuplicateMatches.length > 0 && (
          <div className="risk-box">
            <strong>Duplicate customer detected</strong>
            {customerDuplicateMatches.map((match) => (
              <span key={match.customerId}>{match.name} / owner {match.ownerId || "-"} / assigned {match.assignedTo || "-"} / fields {match.matchedFields.join(", ")}</span>
            ))}
          </div>
        )}
        <div className="detail-actions">
          <button onClick={saveCustomerRecord} disabled={loading}>Save</button>
          <button className="secondary-button" onClick={assignSelectedCustomer} disabled={loading || !selectedCustomerId || !customerForm.organizationId}>Assign</button>
          <button className="secondary-button" onClick={() => { setSelectedCustomerId(""); setCustomerForm(emptyCustomerForm); }}>New</button>
          <button className="danger-button" onClick={removeCustomer}>Delete</button>
          <button className="secondary-button" onClick={refreshIntent}>Recalculate intent</button>
        </div>
      </>
    );
  }

  function renderCustomerSideRecords() {
    const predictions = customerPredictions.filter((item) => item.customerId === selectedCustomerId);
    const reminders = reorderReminders.filter((item) => item.customerId === selectedCustomerId);
    const cases = afterSalesCases.filter((item) => item.customerId === selectedCustomerId);
    return (
      <div className="quote-history">
        <div>
          <div className="section-subhead"><strong>Reorder predictions</strong><span>{predictions.length}</span></div>
          <div className="quote-history-list">
            {predictions.length ? predictions.map((item) => (
              <div className="quote-history-item" key={item.id}>
                <strong>{item.predictionType} / {item.score} / {item.level}</strong>
                <span>{item.recommendedAction || "-"}</span>
                <div className="detail-actions">
                  <button className="secondary-button" onClick={() => generatePredictionScript(item)}>Generate script</button>
                  <button className="secondary-button" onClick={() => createReminderFromPrediction(item)} disabled={item.status !== "open"}>Create reminder</button>
                </div>
              </div>
            )) : <p className="empty-note">No reorder predictions yet.</p>}
          </div>
        </div>
        <RecordList title="Reorder reminders" items={reminders.map((item) => `${item.reminderType} / ${item.status} / ${formatDate(item.remindAt)} / ${item.reason || "-"}`)} />
        <RecordList title="Assignment logs" items={customerAssignmentLogs.map((item) => `${item.fromUserId || "-"} -> ${item.toUserId || "-"} by ${item.operatedBy}`)} />
        {customerIntent && (
          <div className="risk-box">
            <strong>Intent {customerIntent.intentScore} / {customerIntent.intentLevel}</strong>
            <span>{customerIntent.recommendedAction}</span>
            {customerIntent.intentReasons.slice(0, 4).map((item) => <span key={item}>{item}</span>)}
          </div>
        )}
        <RecordList title="Quotes" items={customerQuotes.map((item) => `${item.currency} ${item.unitPrice} / ${item.quoteText.slice(0, 80)}`)} />
        <div>
          <div className="section-subhead"><strong>Orders</strong><span>{customerOrders.length}</span></div>
          <div className="quote-history-list">
            {customerOrders.length ? customerOrders.map((item) => (
              <div className="quote-history-item" key={item.id}>
                <strong>{item.orderNo} / {item.orderStatus} / {item.paymentStatus}</strong>
                <span>{item.productName || "No product"} / {item.currency || ""} {item.amount || "-"}</span>
                <button className="secondary-button" onClick={() => { setView("orders"); void selectOrderRecord(item.id); }}>Open order</button>
              </div>
            )) : <p className="empty-note">No orders yet.</p>}
          </div>
        </div>
        <div>
          <div className="section-subhead"><strong>Quote conversion</strong><span>{customerQuotes.length}</span></div>
          <div className="detail-actions">{customerQuotes.slice(0, 3).map((item) => item.id ? <button className="secondary-button" key={item.id} onClick={() => convertQuoteToOrder(item.id!)}>Quote to order</button> : null)}</div>
        </div>
        <div>
          <div className="section-subhead"><strong>Sample conversion</strong><span>{customerSampleOrders.length}</span></div>
          <div className="detail-actions">{customerSampleOrders.slice(0, 3).map((item) => <button className="secondary-button" key={item.id} onClick={() => convertSampleToOrder(item.id)}>Sample to bulk order</button>)}</div>
        </div>
        <div>
          <div className="section-subhead"><strong>Custom conversion</strong><span>{customerCustomRequests.length}</span></div>
          <div className="detail-actions">{customerCustomRequests.slice(0, 3).map((item) => <button className="secondary-button" key={item.id} onClick={() => convertCustomToOrder(item.id)}>Custom to order</button>)}</div>
        </div>
        <RecordList title="Follow-ups" items={customerFollowUps.map((item) => `${item.taskType} / ${item.status} / ${formatDate(item.remindAt)}`)} />
        <div>
          <div className="section-subhead"><strong>After-sales</strong><span>{cases.length}</span></div>
          <div className="quote-history-list">
            {cases.length ? cases.map((item) => (
              <div className="quote-history-item" key={item.id}>
                <strong>{item.caseNo} / {item.caseType} / {item.status}</strong>
                <span>{item.priority} / responsibility {item.responsibility || "unknown"} / solution {item.finalSolution || item.requestedSolution || "unconfirmed"}</span>
                <div className="detail-actions">
                  <button className="secondary-button" onClick={() => { setView("afterSales"); void selectAfterSalesRecord(item.id); }}>Open after-sales</button>
                  <button className="secondary-button" onClick={() => { setView("afterSales"); setSelectedAfterSalesId(""); setAfterSalesForm({ ...emptyAfterSalesForm, customerId: selectedCustomerId, orderId: customerOrders[0]?.id || "", productId: customerOrders[0]?.productId || "" }); }}>New after-sales</button>
                </div>
              </div>
            )) : <p className="empty-note">No after-sales cases yet.</p>}
          </div>
        </div>
        <RecordList title="Samples" items={customerSampleOrders.map((item) => `${item.sampleName} / ${item.paymentStatus} / ${item.shippingStatus}`)} />
        <RecordList title="Custom requests" items={customerCustomRequests.map((item) => `${item.requestType} / ${item.status} / ${item.productName || "No product"}`)} />
      </div>
    );
  }

  function renderProducts() {
    return (
      <section className="customer-layout">
        <Panel title="Products" description="Search by name, SKU or category.">
          <div className="filters product-filters">
            <input placeholder="Search" value={productFilters.q} onChange={(event) => setProductFilters({ ...productFilters, q: event.target.value })} />
            <input placeholder="Category" value={productFilters.category} onChange={(event) => setProductFilters({ ...productFilters, category: event.target.value })} />
            <button onClick={() => loadProducts(productFilters)}>Search</button>
          </div>
          <div className="customer-list">
            {products.map((product) => (
              <button key={product.id} className={`customer-row ${product.id === selectedProductId ? "selected" : ""}`} onClick={() => selectProduct(product)}>
                <strong>{product.name}</strong>
                <span>{product.sku} / {product.category || "No category"}</span>
                <span>MOQ {product.moq || "-"} / Price {product.suggestedPrice || "-"}</span>
              </button>
            ))}
          </div>
        </Panel>
        <Panel title="Product editor" description="V2 still uses URL text for images and videos.">
          <div className="form-grid">
            <Field label="Name"><input value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} /></Field>
            <Field label="SKU"><input value={productForm.sku} onChange={(event) => setProductForm({ ...productForm, sku: event.target.value })} /></Field>
            <Field label="Category"><input value={productForm.category} onChange={(event) => setProductForm({ ...productForm, category: event.target.value })} /></Field>
            <Field label="MOQ"><input value={productForm.moq} onChange={(event) => setProductForm({ ...productForm, moq: event.target.value })} /></Field>
            <Field label="Suggested price"><input value={productForm.suggestedPrice} onChange={(event) => setProductForm({ ...productForm, suggestedPrice: event.target.value })} /></Field>
            <Field label="Min price"><input value={productForm.minPrice} onChange={(event) => setProductForm({ ...productForm, minPrice: event.target.value })} /></Field>
          </div>
          <Field label="Lead time"><input value={productForm.leadTime} onChange={(event) => setProductForm({ ...productForm, leadTime: event.target.value })} /></Field>
          <Field label="Selling points"><textarea rows={4} value={productForm.sellingPoints} onChange={(event) => setProductForm({ ...productForm, sellingPoints: event.target.value })} /></Field>
          <Field label="Image URLs"><textarea rows={2} value={productForm.images} onChange={(event) => setProductForm({ ...productForm, images: event.target.value })} /></Field>
          <Field label="Video URLs"><textarea rows={2} value={productForm.videos} onChange={(event) => setProductForm({ ...productForm, videos: event.target.value })} /></Field>
          <div className="detail-actions">
            <button onClick={saveProductRecord}>Save</button>
            <button className="secondary-button" onClick={() => { setSelectedProductId(""); setProductForm(emptyProductForm); }}>New</button>
            <button className="danger-button" onClick={removeProduct}>Delete</button>
          </div>
        </Panel>
      </section>
    );
  }

  function renderOrgProducts() {
    return (
      <section className="customer-layout">
        <Panel title="Organization products" description="Shared product library for the selected organization. Owner/manager can edit; sales/support are read-only.">
          <FilterRow>
            <select value={orgProductFilters.organizationId} onChange={(event) => setOrgProductFilters({ ...orgProductFilters, organizationId: event.target.value })}>
              <option value="">Select organization</option>
              {organizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <input placeholder="Search name / SKU / category" value={orgProductFilters.q} onChange={(event) => setOrgProductFilters({ ...orgProductFilters, q: event.target.value })} />
            <input placeholder="Category" value={orgProductFilters.category} onChange={(event) => setOrgProductFilters({ ...orgProductFilters, category: event.target.value })} />
            <button onClick={() => loadOrgProducts(orgProductFilters)}>Search</button>
          </FilterRow>
          <SimpleList items={orgProducts} render={(item) => (
            <button className={`customer-row ${item.id === selectedOrgProductId ? "selected" : ""}`} onClick={async () => {
              const detail = await getOrganizationProduct(item.id);
              setSelectedOrgProductId(detail.id);
              setOrgProductForm({ organizationId: detail.organizationId, productId: detail.productId });
              setProductForm(toProductForm(detail.product));
            }}>
              <strong>{item.product.name}</strong>
              <span>{item.product.sku} / {item.product.category || "No category"}</span>
              <span>Images {item.product.images.length} / MOQ {item.product.moq || "-"}</span>
            </button>
          )} />
        </Panel>
        <Panel title="Shared product editor" description="Select an existing personal product to share, then owner/manager can maintain it for the organization.">
          <div className="form-grid">
            <SelectField label="Organization" value={orgProductForm.organizationId || selectedOrganizationId} onChange={(value) => setOrgProductForm({ ...orgProductForm, organizationId: value })} options={organizations.map((item) => [item.id, item.name])} emptyLabel="Select organization" />
            <SelectField label="Personal product to share" value={orgProductForm.productId} onChange={(value) => {
              setOrgProductForm({ ...orgProductForm, productId: value });
              const product = products.find((item) => item.id === value);
              if (product) setProductForm(toProductForm(product));
            }} options={products.map((item) => [item.id, `${item.name} (${item.sku})`])} emptyLabel="Select product" />
            <Field label="Name"><input value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} /></Field>
            <Field label="SKU"><input value={productForm.sku} onChange={(event) => setProductForm({ ...productForm, sku: event.target.value })} /></Field>
            <Field label="Category"><input value={productForm.category} onChange={(event) => setProductForm({ ...productForm, category: event.target.value })} /></Field>
            <Field label="MOQ"><input value={productForm.moq} onChange={(event) => setProductForm({ ...productForm, moq: event.target.value })} /></Field>
          </div>
          <Field label="Selling points"><textarea rows={4} value={productForm.sellingPoints} onChange={(event) => setProductForm({ ...productForm, sellingPoints: event.target.value })} /></Field>
          <Field label="Image URLs"><textarea rows={2} value={productForm.images} onChange={(event) => setProductForm({ ...productForm, images: event.target.value })} /></Field>
          <div className="detail-actions">
            <button onClick={saveOrgProductRecord} disabled={loading || !canManageSelectedOrganization}>Save / Share</button>
            <button className="secondary-button" onClick={() => { setSelectedOrgProductId(""); setOrgProductForm({ ...emptyOrgProductForm, organizationId: selectedOrganizationId }); }}>New share</button>
            <button className="danger-button" onClick={() => selectedOrgProductId && removeOrgProduct(selectedOrgProductId)} disabled={!selectedOrgProductId || !canManageSelectedOrganization}>Remove from org</button>
          </div>
        </Panel>
      </section>
    );
  }

  function renderQuotes() {
    return (
      <section className="grid quote-layout">
        <Panel title="Quote assistant" description="Generate and save WhatsApp-ready quote draft.">
          <div className="form-grid">
            <SelectField label="Customer" value={quoteForm.customerId} onChange={(value) => setQuoteForm({ ...quoteForm, customerId: value })} options={customers.map((item) => [item.id, item.name])} />
            <SelectField label="Organization scope" value={quoteForm.organizationId} onChange={(value) => setQuoteForm({ ...quoteForm, organizationId: value })} options={organizations.map((item) => [item.id, item.name])} emptyLabel="Personal products" />
            <SelectField label="Product" value={quoteForm.productId} onChange={(value) => setQuoteForm({ ...quoteForm, productId: value })} options={[...products.map((item) => [item.id, item.name] as [string, string]), ...orgProducts.map((item) => [item.product.id, `${item.product.name} (Org)`] as [string, string])]} />
            <Field label="Quantity"><input value={quoteForm.quantity} onChange={(event) => setQuoteForm({ ...quoteForm, quantity: event.target.value })} /></Field>
            <Field label="Unit price"><input value={quoteForm.unitPrice} onChange={(event) => setQuoteForm({ ...quoteForm, unitPrice: event.target.value })} /></Field>
            <Field label="Currency"><input value={quoteForm.currency} onChange={(event) => setQuoteForm({ ...quoteForm, currency: event.target.value })} /></Field>
            <Field label="Shipping cost"><input value={quoteForm.shippingCost} onChange={(event) => setQuoteForm({ ...quoteForm, shippingCost: event.target.value })} /></Field>
            <Field label="MOQ"><input value={quoteForm.moq} onChange={(event) => setQuoteForm({ ...quoteForm, moq: event.target.value })} /></Field>
            <Field label="Lead time"><input value={quoteForm.leadTime} onChange={(event) => setQuoteForm({ ...quoteForm, leadTime: event.target.value })} /></Field>
          </div>
          <Field label="Tier quote, one per line: quantity,price"><textarea rows={3} value={quoteForm.tiers} onChange={(event) => setQuoteForm({ ...quoteForm, tiers: event.target.value })} /></Field>
          <label className="field"><span>Include shipping</span><input type="checkbox" checked={quoteForm.includeShipping} onChange={(event) => setQuoteForm({ ...quoteForm, includeShipping: event.target.checked })} /></label>
          <button onClick={generateAndSaveQuote}>Generate and save quote</button>
        </Panel>
        <Panel title="Quote draft" description="Copy manually into WhatsApp after checking price, stock, lead time and freight.">
          {quote ? (
            <>
              <textarea rows={10} value={quote.quoteText} readOnly />
              <RiskWarnings items={quote.riskWarnings} />
            </>
          ) : <p className="empty-note">No quote generated yet.</p>}
        </Panel>
      </section>
    );
  }

  function renderOrders() {
    const selectedOrder = orders.find((item) => item.id === selectedOrderId);
    return (
      <section className="customer-layout">
        <Panel title="Order center" description="Lightweight manual order records. No payment processing, no logistics lookup, no automatic WhatsApp sending.">
          <FilterRow>
            <select value={orderFilters.organizationId} onChange={(event) => setOrderFilters({ ...orderFilters, organizationId: event.target.value })}>
              <option value="">Current scope</option>
              {organizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <input placeholder="Search order / customer / tracking" value={orderFilters.keyword} onChange={(event) => setOrderFilters({ ...orderFilters, keyword: event.target.value })} />
            <select value={orderFilters.orderStatus} onChange={(event) => setOrderFilters({ ...orderFilters, orderStatus: event.target.value })}>
              <option value="">All order statuses</option>
              {ORDER_STATUSES.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select value={orderFilters.paymentStatus} onChange={(event) => setOrderFilters({ ...orderFilters, paymentStatus: event.target.value })}>
              <option value="">All payment statuses</option>
              {ORDER_PAYMENT_STATUSES.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select value={orderFilters.shippingStatus} onChange={(event) => setOrderFilters({ ...orderFilters, shippingStatus: event.target.value })}>
              <option value="">All shipping statuses</option>
              {ORDER_SHIPPING_STATUSES.map((item) => <option key={item}>{item}</option>)}
            </select>
            <button onClick={() => loadOrders(orderFilters)}>Search</button>
          </FilterRow>
          <SimpleList items={orders} render={(item) => (
            <button className={`customer-row ${item.id === selectedOrderId ? "selected" : ""}`} onClick={() => selectOrderRecord(item.id)}>
              <strong>{item.orderNo} / {item.customerName || "Customer"}</strong>
              <span>{item.orderType} / {item.orderStatus} / payment {item.paymentStatus}</span>
              <span>{item.productName || "No product"} / {item.currency || ""} {item.amount || "-"} / ship {item.shippingStatus}</span>
            </button>
          )} />
        </Panel>
        <Panel title="Order editor" description="Statuses are manually maintained. Confirm payment, production, shipping and after-sales facts before messaging customers.">
          {selectedOrder && <p className="empty-note">Selected: {selectedOrder.orderNo}</p>}
          {renderOrderForm()}
        </Panel>
      </section>
    );
  }

  function renderFulfillment() {
    const groupLabels: Record<string, string> = {
      pending_payment: "Pending payment",
      deposit_paid: "Deposit paid / pending production",
      in_production: "In production",
      production_delayed: "Production delayed",
      pending_shipment: "Pending shipment",
      shipped_not_delivered: "Shipped, not delivered",
      shipping_delayed: "Shipping delayed",
      delivered_follow_up: "Delivered follow-up",
      after_sales_pending: "After-sales pending",
      completed: "Completed",
      cancelled: "Cancelled"
    };
    const summary = fulfillmentBoard?.summary || {};
    return (
      <section className="stack">
        <Panel title="Order fulfillment board" description="Manual fulfillment visibility only. No logistics lookup, no auto-shipping, no auto-payment, no WhatsApp auto-send.">
          <div className="metrics-grid">
            <Metric label="Pending payment" value={summary.pendingPaymentCount || 0} />
            <Metric label="Deposit / pending production" value={summary.depositPaidCount || 0} />
            <Metric label="In production" value={summary.inProductionCount || 0} />
            <Metric label="Production delayed" value={summary.productionDelayedCount || 0} />
            <Metric label="Pending shipment" value={summary.pendingShipmentCount || 0} />
            <Metric label="Shipping delayed" value={summary.shippingDelayedCount || 0} />
            <Metric label="After-sales" value={summary.afterSalesPendingCount || 0} />
            <Metric label="Completed" value={summary.completedCount || 0} />
          </div>
          <div className="detail-actions">
            <button onClick={loadFulfillmentBoard}>Refresh fulfillment</button>
            <button className="secondary-button" onClick={() => selectedOrganizationId ? recalculateOrganizationFulfillmentAlerts(selectedOrganizationId).then(() => loadFulfillmentBoard()) : setStatus("Select an organization before batch recalculation.")}>Batch recalc alerts</button>
          </div>
        </Panel>
        <section className="grid">
          {Object.entries(fulfillmentBoard?.groups || {}).map(([group, items]) => (
            <Panel key={group} title={groupLabels[group] || group} description="Orders may appear with live and persisted fulfillment alerts.">
              <SimpleList items={items} render={(item) => (
                <button className={`customer-row ${item.id === selectedOrderId ? "selected" : ""}`} onClick={async () => { setView("orders"); await selectOrderRecord(item.id); }}>
                  <strong>{item.orderNo} / {item.customerName || "Customer"}</strong>
                  <span>{item.productName || "No product"} / {item.currency || ""} {item.amount || "-"}</span>
                  <span>{item.alerts.length ? item.alerts.map((alert) => `${alert.level}:${alert.alertType}`).join(", ") : "No alerts"}</span>
                  <span>{item.recommendedAction}</span>
                </button>
              )} />
            </Panel>
          ))}
        </section>
      </section>
    );
  }

  function renderProfit() {
    return (
      <section className="stack">
        <Panel title="Profit and cost review" description="Lightweight sales operation reference only. Not accounting, tax, payment, or reconciliation.">
          <FilterRow>
            <select value={profitFilters.organizationId} onChange={(event) => setProfitFilters({ ...profitFilters, organizationId: event.target.value })}>
              <option value="">Current scope</option>
              {organizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <input placeholder="Assigned user ID" value={profitFilters.assignedTo} onChange={(event) => setProfitFilters({ ...profitFilters, assignedTo: event.target.value })} />
            <select value={profitFilters.marginLevel} onChange={(event) => setProfitFilters({ ...profitFilters, marginLevel: event.target.value })}>
              <option value="">All margin levels</option>
              <option value="loss">Loss</option>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
            <select value={profitFilters.costConfirmed} onChange={(event) => setProfitFilters({ ...profitFilters, costConfirmed: event.target.value })}>
              <option value="">Any confirmation</option>
              <option value="true">Confirmed</option>
              <option value="false">Unconfirmed</option>
            </select>
            <button onClick={() => loadProfit(profitFilters)}>Refresh profit</button>
          </FilterRow>
          <div className="metrics-grid">
            <Metric label="Revenue" value={profitSummary?.totalRevenue || "0.00"} />
            <Metric label="Cost" value={profitSummary?.totalCost || "0.00"} />
            <Metric label="Gross profit" value={profitSummary?.totalGrossProfit || "0.00"} />
            <Metric label="Avg margin" value={profitSummary?.avgGrossMargin ? `${profitSummary.avgGrossMargin}%` : "-"} />
            <Metric label="Loss orders" value={profitSummary?.lossOrderCount || 0} />
            <Metric label="Low margin" value={profitSummary?.lowMarginOrderCount || 0} />
            <Metric label="Unconfirmed cost" value={profitSummary?.unconfirmedCostCount || 0} />
          </div>
          <RiskWarnings items={profitSummary?.riskWarnings || ["Profit data is reference only. Confirm all costs manually before decisions."]} />
        </Panel>
        <section className="customer-layout">
          <Panel title="Order profit list" description="Open an order to edit costs, confirm costs, or generate AI review.">
            <SimpleList items={profitOrders.map((row) => ({ ...row, id: row.orderId }))} render={(item) => (
              <button className={`customer-row ${item.orderId === selectedOrderId ? "selected" : ""}`} onClick={() => openOrderCost(item.orderId)}>
                <strong>{item.orderNo} / {item.customerName || "Customer"}</strong>
                <span>{item.productName || "No product"} / revenue {item.currency || ""} {item.revenue || "-"} / cost {item.totalCost || "-"}</span>
                <span>Gross {item.grossProfit || "-"} / margin {item.grossMargin || "-"}% / {item.marginLevel} / {item.costConfirmed ? "confirmed" : "unconfirmed"}</span>
              </button>
            )} />
          </Panel>
          <Panel title="Cost editor" description="Owner/manager can edit and confirm costs. Sales may only view permitted own records.">
            {selectedOrderCost ? (
              <>
                <div className="metrics-grid">
                  <Metric label="Revenue" value={`${selectedOrderCost.currency || ""} ${selectedOrderCost.revenue || "-"}`} />
                  <Metric label="Total cost" value={`${selectedOrderCost.costCurrency || selectedOrderCost.currency || ""} ${selectedOrderCost.totalCost || "-"}`} />
                  <Metric label="Gross profit" value={selectedOrderCost.grossProfit || "-"} />
                  <Metric label="Gross margin" value={selectedOrderCost.grossMargin ? `${selectedOrderCost.grossMargin}%` : "-"} />
                </div>
                <div className="form-grid">
                  <Field label="Product cost"><input value={orderCostForm.productCost} onChange={(event) => setOrderCostForm({ ...orderCostForm, productCost: event.target.value })} /></Field>
                  <Field label="Packaging cost"><input value={orderCostForm.packagingCost} onChange={(event) => setOrderCostForm({ ...orderCostForm, packagingCost: event.target.value })} /></Field>
                  <Field label="Domestic shipping"><input value={orderCostForm.domesticShipping} onChange={(event) => setOrderCostForm({ ...orderCostForm, domesticShipping: event.target.value })} /></Field>
                  <Field label="International shipping"><input value={orderCostForm.internationalShipping} onChange={(event) => setOrderCostForm({ ...orderCostForm, internationalShipping: event.target.value })} /></Field>
                  <Field label="Payment fee"><input value={orderCostForm.paymentFee} onChange={(event) => setOrderCostForm({ ...orderCostForm, paymentFee: event.target.value })} /></Field>
                  <Field label="Platform fee"><input value={orderCostForm.platformFee} onChange={(event) => setOrderCostForm({ ...orderCostForm, platformFee: event.target.value })} /></Field>
                  <Field label="Refund amount"><input value={orderCostForm.refundAmount} onChange={(event) => setOrderCostForm({ ...orderCostForm, refundAmount: event.target.value })} /></Field>
                  <Field label="Reship cost"><input value={orderCostForm.reshipCost} onChange={(event) => setOrderCostForm({ ...orderCostForm, reshipCost: event.target.value })} /></Field>
                  <Field label="Other cost"><input value={orderCostForm.otherCost} onChange={(event) => setOrderCostForm({ ...orderCostForm, otherCost: event.target.value })} /></Field>
                  <Field label="Cost currency"><input value={orderCostForm.currency} onChange={(event) => setOrderCostForm({ ...orderCostForm, currency: event.target.value })} /></Field>
                </div>
                <Field label="Notes"><textarea rows={3} value={orderCostForm.notes} onChange={(event) => setOrderCostForm({ ...orderCostForm, notes: event.target.value })} /></Field>
                <RiskWarnings items={selectedOrderCost.riskWarnings} />
                <div className="detail-actions">
                  <button onClick={saveOrderCost} disabled={loading}>Save cost</button>
                  <button className="secondary-button" onClick={confirmSelectedOrderCost} disabled={loading || selectedOrderCost.costConfirmed}>Confirm cost</button>
                  <button className="secondary-button" onClick={() => runProfitReview()} disabled={loading}>AI review</button>
                  <button className="danger-button" onClick={removeSelectedOrderCost} disabled={loading}>Delete cost</button>
                </div>
              </>
            ) : (
              <p className="empty-note">Select an order to review profit. Cost details are hidden unless you have permission.</p>
            )}
            {profitReview && (
              <div className="result-card">
                <strong>{profitReview.reviewSummary}</strong>
                <RecordList title="Findings" items={profitReview.findings} />
                <RecordList title="Recommended actions" items={profitReview.recommendedActions} />
                <RiskWarnings items={profitReview.riskWarnings} />
              </div>
            )}
          </Panel>
        </section>
        <section className="grid">
          <ProfitBreakdownPanel title="Product profit" rows={profitByProduct} />
          <ProfitBreakdownPanel title="Customer profit" rows={profitByCustomer} />
          <ProfitBreakdownPanel title="Salesperson profit" rows={profitBySalesperson} />
        </section>
      </section>
    );
  }

  function renderOrderForm() {
    return (
      <>
        <div className="form-grid">
          <SelectField label="Customer" value={orderForm.customerId} onChange={(value) => setOrderForm({ ...orderForm, customerId: value })} options={customers.map((item) => [item.id, item.name])} />
          <SelectField label="Product" value={orderForm.productId} onChange={(value) => setOrderForm({ ...orderForm, productId: value })} options={[...products.map((item) => [item.id, item.name] as [string, string]), ...orgProducts.map((item) => [item.product.id, `${item.product.name} (Org)`] as [string, string])]} emptyLabel="No product" />
          <SelectField label="Order type" value={orderForm.orderType} onChange={(value) => setOrderForm({ ...orderForm, orderType: value })} options={ORDER_TYPES.map((item) => [item, item])} />
          <SelectField label="Order status" value={orderForm.orderStatus} onChange={(value) => setOrderForm({ ...orderForm, orderStatus: value })} options={ORDER_STATUSES.map((item) => [item, item])} />
          <Field label="Title"><input value={orderForm.title} onChange={(event) => setOrderForm({ ...orderForm, title: event.target.value })} /></Field>
          <Field label="Amount"><input value={orderForm.amount} onChange={(event) => setOrderForm({ ...orderForm, amount: event.target.value })} /></Field>
          <Field label="Currency"><input value={orderForm.currency} onChange={(event) => setOrderForm({ ...orderForm, currency: event.target.value })} /></Field>
          <Field label="Quantity"><input value={orderForm.quantity} onChange={(event) => setOrderForm({ ...orderForm, quantity: event.target.value })} /></Field>
          <SelectField label="Payment" value={orderForm.paymentStatus} onChange={(value) => setOrderForm({ ...orderForm, paymentStatus: value })} options={ORDER_PAYMENT_STATUSES.map((item) => [item, item])} />
          <SelectField label="Production" value={orderForm.productionStatus} onChange={(value) => setOrderForm({ ...orderForm, productionStatus: value })} options={ORDER_PRODUCTION_STATUSES.map((item) => [item, item])} />
          <SelectField label="Shipping" value={orderForm.shippingStatus} onChange={(value) => setOrderForm({ ...orderForm, shippingStatus: value })} options={ORDER_SHIPPING_STATUSES.map((item) => [item, item])} />
          <SelectField label="After-sales" value={orderForm.afterSalesStatus} onChange={(value) => setOrderForm({ ...orderForm, afterSalesStatus: value })} options={ORDER_AFTER_SALES_STATUSES.map((item) => [item, item])} />
          <Field label="Expected ship date"><input type="date" value={orderForm.expectedShipDate} onChange={(event) => setOrderForm({ ...orderForm, expectedShipDate: event.target.value })} /></Field>
          <Field label="Expected delivery date"><input type="date" value={orderForm.expectedDeliveryDate} onChange={(event) => setOrderForm({ ...orderForm, expectedDeliveryDate: event.target.value })} /></Field>
          <Field label="Tracking number"><input value={orderForm.trackingNumber} onChange={(event) => setOrderForm({ ...orderForm, trackingNumber: event.target.value })} /></Field>
          <Field label="Assigned to"><input value={orderForm.assignedTo} onChange={(event) => setOrderForm({ ...orderForm, assignedTo: event.target.value })} placeholder="User ID, optional" /></Field>
        </div>
        <Field label="File URLs, one per line"><textarea rows={3} value={orderForm.files} onChange={(event) => setOrderForm({ ...orderForm, files: event.target.value })} /></Field>
        <Field label="Notes"><textarea rows={4} value={orderForm.notes} onChange={(event) => setOrderForm({ ...orderForm, notes: event.target.value })} /></Field>
        {orderScript && <Field label="Generated order script draft"><textarea rows={6} value={orderScript} onChange={(event) => setOrderScript(event.target.value)} /></Field>}
        {fulfillmentAlerts.length > 0 && (
          <Panel title="Fulfillment alerts" description="Alerts are rule-based suggestions. Resolve or dismiss them manually.">
            <SimpleList items={fulfillmentAlerts.filter((item): item is OrderFulfillmentAlertSummary & { id: string } => Boolean(item.id))} render={(item) => (
              <div className="customer-row">
                <strong>{item.level} / {item.alertType}</strong>
                <span>{item.reason}</span>
                <span>{item.recommendedAction}</span>
                <div className="detail-actions">
                  <button className="secondary-button" onClick={() => item.id && updateFulfillmentAlertStatus(item.id, "resolved")}>Resolve</button>
                  <button className="secondary-button" onClick={() => item.id && updateFulfillmentAlertStatus(item.id, "dismissed")}>Dismiss</button>
                </div>
              </div>
            )} />
          </Panel>
        )}
        <RiskWarnings items={orderRiskWarnings.length ? orderRiskWarnings : ["Order center is a manual sales record. It does not process payment, query logistics, or send WhatsApp messages.", "Confirm payment, production, shipping, after-sales, price, inventory and lead time before sending any draft."]} />
        <div className="detail-actions">
          <button onClick={saveOrderRecord}>Save order</button>
          <button className="secondary-button" onClick={() => { setSelectedOrderId(""); setOrderForm({ ...emptyOrderForm, customerId: selectedCustomerId, productId: selectedProductId }); setOrderScript(""); setOrderRiskWarnings([]); }}>New</button>
          <button className="danger-button" disabled={!selectedOrderId} onClick={() => selectedOrderId && removeOrder(selectedOrderId)}>Delete</button>
        </div>
        <div className="detail-actions">
          <button className="secondary-button" disabled={!selectedOrderId} onClick={() => updateSelectedOrderStatus("payment", orderForm.paymentStatus)}>Update payment</button>
          <button className="secondary-button" disabled={!selectedOrderId} onClick={() => updateSelectedOrderStatus("production", orderForm.productionStatus)}>Update production</button>
          <button className="secondary-button" disabled={!selectedOrderId} onClick={() => updateSelectedOrderStatus("shipping", orderForm.shippingStatus)}>Update shipping</button>
          <button className="secondary-button" disabled={!selectedOrderId} onClick={() => updateSelectedOrderStatus("afterSales", orderForm.afterSalesStatus)}>Update after-sales</button>
          <button className="secondary-button" disabled={!selectedOrderId} onClick={createFollowUpFromSelectedOrder}>Create follow-up task</button>
          <button className="secondary-button" disabled={!selectedOrderId} onClick={recalculateSelectedFulfillment}>Recalc fulfillment</button>
          <button className="secondary-button" disabled={!selectedOrderId} onClick={createFulfillmentFollowUpFromSelectedOrder}>Create fulfillment follow-up</button>
          <button className="secondary-button" disabled={!selectedOrderId} onClick={() => selectedOrderId && openOrderCost(selectedOrderId)}>Open cost review</button>
        </div>
        <div className="detail-actions">
          {ORDER_SCRIPT_SCENARIOS.map((scenario) => (
            <button className="secondary-button" key={scenario} disabled={!selectedOrderId} onClick={() => generateSelectedOrderScript(scenario as OrderScriptScenario)}>{scenario}</button>
          ))}
        </div>
        <div className="detail-actions">
          {ORDER_FULFILLMENT_SCRIPT_SCENARIOS.map((scenario) => (
            <button className="secondary-button" key={scenario} disabled={!selectedOrderId} onClick={() => generateSelectedFulfillmentScript(scenario as OrderFulfillmentScriptScenario)}>{scenario}</button>
          ))}
        </div>
      </>
    );
  }

  function renderKnowledge() {
    return (
      <section className="customer-layout">
        <Panel title="Knowledge base" description="Company policy and sales context for AI drafts.">
          <FilterRow>
            <input placeholder="Search" value={knowledgeFilters.q} onChange={(event) => setKnowledgeFilters({ ...knowledgeFilters, q: event.target.value })} />
            <select value={knowledgeFilters.category} onChange={(event) => setKnowledgeFilters({ ...knowledgeFilters, category: event.target.value })}>
              <option value="">All categories</option>
              {KNOWLEDGE_BASE_CATEGORIES.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select value={knowledgeFilters.language} onChange={(event) => setKnowledgeFilters({ ...knowledgeFilters, language: event.target.value })}>
              <option value="">All languages</option>
              {KNOWLEDGE_BASE_LANGUAGES.map((item) => <option key={item}>{item}</option>)}
            </select>
            <button onClick={() => loadKnowledgeBase(knowledgeFilters)}>Search</button>
          </FilterRow>
          <SimpleList items={knowledgeBase} render={(item) => (
            <button className="customer-row" onClick={async () => {
              setSelectedKnowledgeId(item.id);
              setKnowledgeForm(toKnowledgeForm(await getKnowledgeBaseItem(item.id)));
            }}>
              <strong>{item.title}</strong>
              <span>{item.category} / {item.language} / {item.enabled ? "enabled" : "disabled"}</span>
            </button>
          )} />
        </Panel>
        <Panel title="Knowledge editor" description="Knowledge never replaces salesperson confirmation.">
          <div className="form-grid">
            <Field label="Title"><input value={knowledgeForm.title} onChange={(event) => setKnowledgeForm({ ...knowledgeForm, title: event.target.value })} /></Field>
            <SelectField label="Category" value={knowledgeForm.category} onChange={(value) => setKnowledgeForm({ ...knowledgeForm, category: value as KnowledgeBaseCategory })} options={KNOWLEDGE_BASE_CATEGORIES.map((item) => [item, item])} />
            <SelectField label="Language" value={knowledgeForm.language} onChange={(value) => setKnowledgeForm({ ...knowledgeForm, language: value as KnowledgeBaseLanguage })} options={KNOWLEDGE_BASE_LANGUAGES.map((item) => [item, item])} />
            <SelectField label="Product" value={knowledgeForm.productId} onChange={(value) => setKnowledgeForm({ ...knowledgeForm, productId: value })} options={products.map((item) => [item.id, item.name])} emptyLabel="No product" />
          </div>
          <Field label="Content"><textarea rows={8} value={knowledgeForm.content} onChange={(event) => setKnowledgeForm({ ...knowledgeForm, content: event.target.value })} /></Field>
          <div className="detail-actions">
            <button onClick={saveKnowledgeRecord}>Save</button>
            <button className="secondary-button" onClick={() => selectedKnowledgeId && (knowledgeForm.enabled ? disableKnowledgeBaseItem(selectedKnowledgeId) : enableKnowledgeBaseItem(selectedKnowledgeId)).then(() => loadKnowledgeBase(knowledgeFilters))}>{knowledgeForm.enabled ? "Disable" : "Enable"}</button>
            <button className="secondary-button" onClick={() => { setSelectedKnowledgeId(""); setKnowledgeForm(emptyKnowledgeForm); }}>New</button>
            <button className="danger-button" onClick={() => selectedKnowledgeId && removeKnowledge(selectedKnowledgeId)}>Delete</button>
          </div>
        </Panel>
      </section>
    );
  }

  function renderOrgKnowledge() {
    return (
      <section className="customer-layout">
        <Panel title="Organization knowledge" description="Shared company knowledge for team AI drafts. Owner/manager can edit; sales/support are read-only.">
          <OrgContentFilterBar
            filters={orgKnowledgeFilters}
            setFilters={setOrgKnowledgeFilters}
            organizations={organizations}
            categories={[...KNOWLEDGE_BASE_CATEGORIES]}
            onSearch={() => loadOrgKnowledgeBase(orgKnowledgeFilters)}
          />
          <SimpleList items={orgKnowledgeBase} render={(item) => (
            <button className="customer-row" onClick={async () => {
              setSelectedOrgKnowledgeId(item.id);
              setOrgKnowledgeForm(toOrgKnowledgeForm(await getOrgKnowledgeBaseItem(item.id)));
            }}>
              <strong>{item.title}</strong>
              <span>{item.category} / {item.language} / {item.enabled ? "enabled" : "disabled"}</span>
              <span>Source: Org</span>
            </button>
          )} />
        </Panel>
        <Panel title="Organization knowledge editor" description="Shared knowledge is draft context only. Confirm policy, price, stock, lead time and after-sales promises before sending.">
          <div className="form-grid">
            <SelectField label="Organization" value={orgKnowledgeForm.organizationId || selectedOrganizationId} onChange={(value) => setOrgKnowledgeForm({ ...orgKnowledgeForm, organizationId: value })} options={organizations.map((item) => [item.id, item.name])} emptyLabel="Select organization" />
            <Field label="Title"><input value={orgKnowledgeForm.title} onChange={(event) => setOrgKnowledgeForm({ ...orgKnowledgeForm, title: event.target.value })} /></Field>
            <SelectField label="Category" value={orgKnowledgeForm.category} onChange={(value) => setOrgKnowledgeForm({ ...orgKnowledgeForm, category: value as KnowledgeBaseCategory })} options={KNOWLEDGE_BASE_CATEGORIES.map((item) => [item, item])} />
            <SelectField label="Language" value={orgKnowledgeForm.language} onChange={(value) => setOrgKnowledgeForm({ ...orgKnowledgeForm, language: value as KnowledgeBaseLanguage })} options={KNOWLEDGE_BASE_LANGUAGES.map((item) => [item, item])} />
          </div>
          <Field label="Content"><textarea rows={8} value={orgKnowledgeForm.content} onChange={(event) => setOrgKnowledgeForm({ ...orgKnowledgeForm, content: event.target.value })} /></Field>
          <label className="field"><span>Enabled</span><input type="checkbox" checked={orgKnowledgeForm.enabled} onChange={(event) => setOrgKnowledgeForm({ ...orgKnowledgeForm, enabled: event.target.checked })} /></label>
          <div className="detail-actions">
            <button onClick={saveOrgKnowledgeRecord} disabled={loading || !canManageSelectedOrganization}>Save</button>
            <button className="secondary-button" onClick={() => { setSelectedOrgKnowledgeId(""); setOrgKnowledgeForm({ ...emptyOrgKnowledgeForm, organizationId: selectedOrganizationId }); }}>New</button>
            <button className="danger-button" onClick={() => selectedOrgKnowledgeId && removeOrgKnowledge(selectedOrgKnowledgeId)} disabled={!selectedOrgKnowledgeId || !canManageSelectedOrganization}>Delete</button>
          </div>
        </Panel>
      </section>
    );
  }

  function renderOrgScripts() {
    return (
      <section className="customer-layout">
        <Panel title="Organization scripts" description="Shared draft scripts for common team replies. They never send WhatsApp messages automatically.">
          <OrgContentFilterBar
            filters={orgScriptFilters}
            setFilters={setOrgScriptFilters}
            organizations={organizations}
            categories={[...SCRIPT_ORG_CATEGORIES]}
            onSearch={() => loadOrgScriptsList(orgScriptFilters)}
          />
          <SimpleList items={orgScripts} render={(item) => (
            <button className="customer-row" onClick={async () => {
              setSelectedOrgScriptId(item.id);
              setOrgScriptForm(toOrgScriptForm(await getOrgScript(item.id)));
            }}>
              <strong>{item.title}</strong>
              <span>{item.category} / {item.language} / {item.enabled ? "enabled" : "disabled"}</span>
              <span>Source: Org script</span>
            </button>
          )} />
        </Panel>
        <Panel title="Organization script editor" description="Owner/manager can maintain shared scripts; sales/support can view only.">
          <div className="form-grid">
            <SelectField label="Organization" value={orgScriptForm.organizationId || selectedOrganizationId} onChange={(value) => setOrgScriptForm({ ...orgScriptForm, organizationId: value })} options={organizations.map((item) => [item.id, item.name])} emptyLabel="Select organization" />
            <Field label="Title"><input value={orgScriptForm.title} onChange={(event) => setOrgScriptForm({ ...orgScriptForm, title: event.target.value })} /></Field>
            <SelectField label="Category" value={orgScriptForm.category} onChange={(value) => setOrgScriptForm({ ...orgScriptForm, category: value as ScriptOrgCategory })} options={SCRIPT_ORG_CATEGORIES.map((item) => [item, item])} />
            <SelectField label="Language" value={orgScriptForm.language} onChange={(value) => setOrgScriptForm({ ...orgScriptForm, language: value as KnowledgeBaseLanguage })} options={KNOWLEDGE_BASE_LANGUAGES.map((item) => [item, item])} />
          </div>
          <Field label="Content"><textarea rows={8} value={orgScriptForm.content} onChange={(event) => setOrgScriptForm({ ...orgScriptForm, content: event.target.value })} /></Field>
          <label className="field"><span>Enabled</span><input type="checkbox" checked={orgScriptForm.enabled} onChange={(event) => setOrgScriptForm({ ...orgScriptForm, enabled: event.target.checked })} /></label>
          <div className="detail-actions">
            <button onClick={saveOrgScriptRecord} disabled={loading || !canManageSelectedOrganization}>Save</button>
            <button className="secondary-button" onClick={() => { setSelectedOrgScriptId(""); setOrgScriptForm({ ...emptyOrgScriptForm, organizationId: selectedOrganizationId }); }}>New</button>
            <button className="danger-button" onClick={() => selectedOrgScriptId && removeOrgScript(selectedOrgScriptId)} disabled={!selectedOrgScriptId || !canManageSelectedOrganization}>Delete</button>
          </div>
        </Panel>
      </section>
    );
  }

  function renderMaterials() {
    return (
      <section className="customer-layout">
        <Panel title="Material center" description="V2-B stores URLs only, not uploaded files.">
          <FilterRow>
            <input placeholder="Search" value={materialFilters.q} onChange={(event) => setMaterialFilters({ ...materialFilters, q: event.target.value })} />
            <select value={materialFilters.type} onChange={(event) => setMaterialFilters({ ...materialFilters, type: event.target.value })}>
              <option value="">All types</option>
              {MATERIAL_TYPES.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select value={materialFilters.language} onChange={(event) => setMaterialFilters({ ...materialFilters, language: event.target.value })}>
              <option value="">All languages</option>
              {MATERIAL_LANGUAGES.map((item) => <option key={item}>{item}</option>)}
            </select>
            <button onClick={() => loadMaterials(materialFilters)}>Search</button>
          </FilterRow>
          <SimpleList items={materials} render={(item) => (
            <button className="customer-row" onClick={() => { setSelectedMaterialId(item.id); setMaterialForm(toMaterialForm(item)); }}>
              <strong>{item.title}</strong>
              <span>{item.type} / {item.language}</span>
              <span>{item.url}</span>
            </button>
          )} />
        </Panel>
        <Panel title="Material editor" description="Generated material intro is draft only.">
          <div className="form-grid">
            <Field label="Title"><input value={materialForm.title} onChange={(event) => setMaterialForm({ ...materialForm, title: event.target.value })} /></Field>
            <SelectField label="Type" value={materialForm.type} onChange={(value) => setMaterialForm({ ...materialForm, type: value as MaterialType })} options={MATERIAL_TYPES.map((item) => [item, item])} />
            <SelectField label="Language" value={materialForm.language} onChange={(value) => setMaterialForm({ ...materialForm, language: value as MaterialLanguage })} options={MATERIAL_LANGUAGES.map((item) => [item, item])} />
            <SelectField label="Product" value={materialForm.productId} onChange={(value) => setMaterialForm({ ...materialForm, productId: value })} options={products.map((item) => [item.id, item.name])} emptyLabel="No product" />
          </div>
          <Field label="URL"><input value={materialForm.url} onChange={(event) => setMaterialForm({ ...materialForm, url: event.target.value })} /></Field>
          <Field label="Tags"><input value={materialForm.tags} onChange={(event) => setMaterialForm({ ...materialForm, tags: event.target.value })} /></Field>
          <Field label="Description / generated draft"><textarea rows={6} value={materialForm.description} onChange={(event) => setMaterialForm({ ...materialForm, description: event.target.value })} /></Field>
          <div className="detail-actions">
            <button onClick={saveMaterialRecord}>Save</button>
            <button className="secondary-button" onClick={() => generateMaterialDescription()}>Generate intro</button>
            <button className="secondary-button" onClick={() => { setSelectedMaterialId(""); setMaterialForm(emptyMaterialForm); }}>New</button>
            <button className="danger-button" onClick={() => selectedMaterialId && removeMaterial(selectedMaterialId)}>Delete</button>
          </div>
        </Panel>
      </section>
    );
  }

  function renderOrgMaterials() {
    return (
      <section className="customer-layout">
        <Panel title="Organization materials" description="Shared material library. URLs only; no file upload or automatic WhatsApp sending.">
          <FilterRow>
            <select value={orgMaterialFilters.organizationId} onChange={(event) => setOrgMaterialFilters({ ...orgMaterialFilters, organizationId: event.target.value })}>
              <option value="">Select organization</option>
              {organizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <input placeholder="Search title / type / product SKU" value={orgMaterialFilters.q} onChange={(event) => setOrgMaterialFilters({ ...orgMaterialFilters, q: event.target.value })} />
            <select value={orgMaterialFilters.type} onChange={(event) => setOrgMaterialFilters({ ...orgMaterialFilters, type: event.target.value })}>
              <option value="">All types</option>
              {MATERIAL_TYPES.map((item) => <option key={item}>{item}</option>)}
            </select>
            <input placeholder="Product SKU" value={orgMaterialFilters.productSku} onChange={(event) => setOrgMaterialFilters({ ...orgMaterialFilters, productSku: event.target.value })} />
            <button onClick={() => loadOrgMaterials(orgMaterialFilters)}>Search</button>
          </FilterRow>
          <SimpleList items={orgMaterials} render={(item) => (
            <button className={`customer-row ${item.id === selectedOrgMaterialId ? "selected" : ""}`} onClick={async () => {
              const detail = await getOrganizationMaterial(item.id);
              setSelectedOrgMaterialId(detail.id);
              setOrgMaterialForm({ organizationId: detail.organizationId, materialId: detail.materialId });
              setMaterialForm(toMaterialForm(detail.material));
            }}>
              <strong>{item.material.title}</strong>
              <span>{item.material.type} / {item.material.language}</span>
              <span>{item.material.url}</span>
            </button>
          )} />
        </Panel>
        <Panel title="Shared material editor" description="Owner/manager can share and update material URLs. Sales/support can view only.">
          <div className="form-grid">
            <SelectField label="Organization" value={orgMaterialForm.organizationId || selectedOrganizationId} onChange={(value) => setOrgMaterialForm({ ...orgMaterialForm, organizationId: value })} options={organizations.map((item) => [item.id, item.name])} emptyLabel="Select organization" />
            <SelectField label="Personal material to share" value={orgMaterialForm.materialId} onChange={(value) => {
              setOrgMaterialForm({ ...orgMaterialForm, materialId: value });
              const material = materials.find((item) => item.id === value);
              if (material) setMaterialForm(toMaterialForm(material));
            }} options={materials.map((item) => [item.id, `${item.title} (${item.type})`])} emptyLabel="Select material" />
            <Field label="Title"><input value={materialForm.title} onChange={(event) => setMaterialForm({ ...materialForm, title: event.target.value })} /></Field>
            <SelectField label="Type" value={materialForm.type} onChange={(value) => setMaterialForm({ ...materialForm, type: value as MaterialType })} options={MATERIAL_TYPES.map((item) => [item, item])} />
            <SelectField label="Product" value={materialForm.productId} onChange={(value) => setMaterialForm({ ...materialForm, productId: value })} options={[...products.map((item) => [item.id, item.name] as [string, string]), ...orgProducts.map((item) => [item.product.id, `${item.product.name} (Org)`] as [string, string])]} emptyLabel="No product" />
          </div>
          <Field label="URL"><input value={materialForm.url} onChange={(event) => setMaterialForm({ ...materialForm, url: event.target.value })} /></Field>
          <Field label="Tags"><input value={materialForm.tags} onChange={(event) => setMaterialForm({ ...materialForm, tags: event.target.value })} /></Field>
          <Field label="Description"><textarea rows={6} value={materialForm.description} onChange={(event) => setMaterialForm({ ...materialForm, description: event.target.value })} /></Field>
          <div className="detail-actions">
            <button onClick={saveOrgMaterialRecord} disabled={loading || !canManageSelectedOrganization}>Save / Share</button>
            <button className="secondary-button" onClick={() => { setSelectedOrgMaterialId(""); setOrgMaterialForm({ ...emptyOrgMaterialForm, organizationId: selectedOrganizationId }); }}>New share</button>
            <button className="danger-button" onClick={() => selectedOrgMaterialId && removeOrgMaterial(selectedOrgMaterialId)} disabled={!selectedOrgMaterialId || !canManageSelectedOrganization}>Remove from org</button>
          </div>
        </Panel>
      </section>
    );
  }

  function renderSamples() {
    return (
      <section className="customer-layout">
        <Panel title="Sample orders" description="Sales process record only, no payment or logistics system.">
          <SampleFilterBar />
          <SimpleList items={sampleOrders} render={(item) => (
            <button className="customer-row" onClick={async () => { setSelectedSampleOrderId(item.id); setSampleForm(toSampleForm(await getSampleOrder(item.id))); }}>
              <strong>{item.sampleName}</strong>
              <span>{item.customerName || item.customerId} / {item.paymentStatus} / {item.shippingStatus}</span>
            </button>
          )} />
        </Panel>
        <Panel title="Sample editor" description="Sample scripts are drafts only.">
          {renderSampleForm()}
        </Panel>
      </section>
    );
  }

  function renderSampleForm() {
    return (
      <>
        <div className="form-grid">
          <SelectField label="Customer" value={sampleForm.customerId} onChange={(value) => setSampleForm({ ...sampleForm, customerId: value })} options={customers.map((item) => [item.id, item.name])} />
          <SelectField label="Product" value={sampleForm.productId} onChange={(value) => setSampleForm({ ...sampleForm, productId: value })} options={products.map((item) => [item.id, item.name])} emptyLabel="No product" />
          <Field label="Sample name"><input value={sampleForm.sampleName} onChange={(event) => setSampleForm({ ...sampleForm, sampleName: event.target.value })} /></Field>
          <Field label="Currency"><input value={sampleForm.currency} onChange={(event) => setSampleForm({ ...sampleForm, currency: event.target.value })} /></Field>
          <Field label="Sample fee"><input value={sampleForm.sampleFee} onChange={(event) => setSampleForm({ ...sampleForm, sampleFee: event.target.value })} /></Field>
          <Field label="Shipping cost"><input value={sampleForm.shippingCost} onChange={(event) => setSampleForm({ ...sampleForm, shippingCost: event.target.value })} /></Field>
          <SelectField label="Payment status" value={sampleForm.paymentStatus} onChange={(value) => setSampleForm({ ...sampleForm, paymentStatus: value as SamplePaymentStatus })} options={SAMPLE_PAYMENT_STATUSES.map((item) => [item, item])} />
          <SelectField label="Shipping status" value={sampleForm.shippingStatus} onChange={(value) => setSampleForm({ ...sampleForm, shippingStatus: value as SampleShippingStatus })} options={SAMPLE_SHIPPING_STATUSES.map((item) => [item, item])} />
          <Field label="Tracking number"><input value={sampleForm.trackingNumber} onChange={(event) => setSampleForm({ ...sampleForm, trackingNumber: event.target.value })} /></Field>
          <SelectField label="Feedback" value={sampleForm.feedbackStatus} onChange={(value) => setSampleForm({ ...sampleForm, feedbackStatus: value as SampleFeedbackStatus })} options={SAMPLE_FEEDBACK_STATUSES.map((item) => [item, item])} />
          <Field label="Expected ship date"><input type="date" value={sampleForm.expectedShipDate} onChange={(event) => setSampleForm({ ...sampleForm, expectedShipDate: event.target.value })} /></Field>
          <Field label="Expected delivery date"><input type="date" value={sampleForm.expectedDeliveryDate} onChange={(event) => setSampleForm({ ...sampleForm, expectedDeliveryDate: event.target.value })} /></Field>
        </div>
        <Field label="Notes / generated script"><textarea rows={6} value={sampleForm.notes} onChange={(event) => setSampleForm({ ...sampleForm, notes: event.target.value })} /></Field>
        <div className="detail-actions">
          <button onClick={saveSampleRecord}>Save</button>
          {SAMPLE_SCRIPT_SCENARIOS.map((scenario) => <button className="secondary-button" key={scenario} onClick={() => generateSelectedSampleScript(scenario)}>{scenario}</button>)}
          <button className="secondary-button" onClick={() => { setSelectedSampleOrderId(""); setSampleForm({ ...emptySampleForm, customerId: selectedCustomerId, productId: selectedProductId }); }}>New</button>
          <button className="danger-button" onClick={() => selectedSampleOrderId && removeSample(selectedSampleOrderId)}>Delete</button>
        </div>
      </>
    );
  }

  function renderCustom() {
    return (
      <section className="customer-layout">
        <Panel title="Custom requests" description="Logo, packaging, color, size, material, OEM and ODM requirements.">
          <CustomFilterBar />
          <SimpleList items={customRequests} render={(item) => (
            <button className="customer-row" onClick={async () => { setSelectedCustomRequestId(item.id); setCustomForm(toCustomForm(await getCustomRequest(item.id))); }}>
              <strong>{item.customerName || item.customerId} / {item.requestType}</strong>
              <span>{item.productName || "No product"} / {item.status}</span>
              <span>MOQ {item.moq || "-"} /Qty {item.quantity || "-"}</span>
            </button>
          )} />
        </Panel>
        <Panel title="Custom editor" description="No production scheduling, payment or order system is created here.">
          {renderCustomForm()}
        </Panel>
      </section>
    );
  }

  function renderAuditLogs() {
    const organizationId = auditLogFilters.organizationId || selectedOrganizationId;
    return (
      <section className="customer-layout">
        <Panel title="Audit logs" description="Organization operations are read-only. Sales/support can only see their own actions.">
          <div className="filters">
            <select value={organizationId} onChange={(event) => setAuditLogFilters({ ...auditLogFilters, organizationId: event.target.value })}>
              <option value="">Select organization</option>
              {organizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <input placeholder="Entity type" value={auditLogFilters.entityType} onChange={(event) => setAuditLogFilters({ ...auditLogFilters, entityType: event.target.value })} />
            <input placeholder="Entity ID" value={auditLogFilters.entityId} onChange={(event) => setAuditLogFilters({ ...auditLogFilters, entityId: event.target.value })} />
            <select value={auditLogFilters.action} onChange={(event) => setAuditLogFilters({ ...auditLogFilters, action: event.target.value as "" | AuditLogAction })}>
              <option value="">All actions</option>
              <option value="create">create</option>
              <option value="update">update</option>
              <option value="delete">delete</option>
            </select>
            <select value={auditLogFilters.riskLevel} onChange={(event) => setAuditLogFilters({ ...auditLogFilters, riskLevel: event.target.value as AuditLogFilters["riskLevel"] })}>
              <option value="">All risks</option>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
            <input placeholder="User ID" value={auditLogFilters.userId} onChange={(event) => setAuditLogFilters({ ...auditLogFilters, userId: event.target.value })} />
            <input placeholder="Keyword" value={auditLogFilters.keyword} onChange={(event) => setAuditLogFilters({ ...auditLogFilters, keyword: event.target.value })} />
            <button onClick={() => loadAuditLogs({ ...auditLogFilters, organizationId })}>Search</button>
            {organizationId && <a className="secondary-button" href={auditLogsCsvUrl({ ...auditLogFilters, organizationId })}>Export CSV</a>}
          </div>
          <SimpleList items={auditLogs} render={(item) => (
            <button className={`customer-row ${selectedAuditLog?.id === item.id ? "selected" : ""}`} onClick={() => selectAuditLog(item.id)}>
              <strong>{item.action} {item.entityType}</strong>
              <span>{item.createdAt} / actor {item.userId || item.actorId || "-"}</span>
              <span>{item.entityId || "-"}</span>
            </button>
          )} />
        </Panel>
        <Panel title="Audit detail" description="before/after JSON is for review only and cannot be edited.">
          {selectedAuditLog ? (
            <>
              <div className="detail-grid">
                <span>Action</span><strong>{selectedAuditLog.action}</strong>
                <span>Entity</span><strong>{selectedAuditLog.entityType} / {selectedAuditLog.entityId || "-"}</strong>
                <span>User</span><strong>{selectedAuditLog.userId || selectedAuditLog.actorId || "-"}</strong>
                <span>Risk</span><strong>{selectedAuditLog.riskLevel || "low"}</strong>
                <span>Time</span><strong>{selectedAuditLog.createdAt}</strong>
              </div>
              <Field label="Before"><textarea rows={8} readOnly value={JSON.stringify(selectedAuditLog.before || null, null, 2)} /></Field>
              <Field label="After"><textarea rows={8} readOnly value={JSON.stringify(selectedAuditLog.after || null, null, 2)} /></Field>
              <Field label="Metadata"><textarea rows={6} readOnly value={JSON.stringify(selectedAuditLog.metadata || null, null, 2)} /></Field>
            </>
          ) : (
            <p>Select an audit log.</p>
          )}
        </Panel>
      </section>
    );
  }

  function renderPermissions() {
    const rolePermissions: Record<OrganizationRole, string[]> = {
      owner: uniqueStrings(PERMISSION_KEYS),
      manager: uniqueStrings(PERMISSION_KEYS.filter((key) => !["organization.delete", "member.updateRole", "member.remove", "export.sensitiveFields"].includes(key))),
      sales: uniqueStrings(PERMISSION_KEYS.filter((key) => /Own|create$|ai\.|viewOrg|viewOwn|audit\.viewOwn|dashboard\.viewOwn/.test(key) && !/delete|export|report|member|organization\.delete/.test(key))),
      support: uniqueStrings(PERMISSION_KEYS.filter((key) => ["customer.viewOwn", "followup.viewOwn", "followup.create", "followup.updateOwn", "material.viewOrg", "knowledge.viewOrg", "script.viewOrg", "audit.viewOwn", "ai.reply", "ai.riskCheck", "ai.salesSummary", "ai.useOrgKnowledge", "ai.useOrgMaterial"].includes(key)))
    };
    const roleSummaries: Record<OrganizationRole, { label: string; description: string; highlights: string[] }> = {
      owner: {
        label: "Owner",
        description: "Full organization access, including members, sensitive exports, audit exports and high-risk operations.",
        highlights: ["All features", "Member admin", "Sensitive export", "Audit export", "Organization delete"]
      },
      manager: {
        label: "Manager",
        description: "Can manage team business data, shared resources, reports and normal exports, but cannot delete the organization or export sensitive fields by default.",
        highlights: ["Team data", "Shared resources", "Customer assignment", "Team reports", "Normal export"]
      },
      sales: {
        label: "Sales",
        description: "Works mainly on assigned customers, quotes, follow-ups, samples, custom requests and AI drafts. Cannot manage members or organization exports.",
        highlights: ["Own customers", "Quote follow-up", "AI drafts", "Samples/custom", "No team export"]
      },
      support: {
        label: "Support",
        description: "Read and after-sales focused. Can view authorized customers and create support drafts, but cannot quote, export or manage shared resources.",
        highlights: ["Authorized customers", "After-sales", "Read-only resources", "AI risk check", "No export"]
      }
    };
    return (
      <section className="grid quote-layout">
        <Panel title="Permission matrix" description="V4-D only displays the default matrix. Custom IAM, SSO and external directories are not included.">
          <div className="permission-cards">
            {ORGANIZATION_ROLES.map((role) => (
              <div className="permission-card" key={role}>
                <div>
                  <strong>{roleSummaries[role].label}</strong>
                  <span>{role}</span>
                </div>
                <p>{roleSummaries[role].description}</p>
                <div className="permission-tags">
                  {roleSummaries[role].highlights.map((item) => <span key={item}>{item}</span>)}
                </div>
                <details>
                  <summary>View technical permission keys ({rolePermissions[role].length})</summary>
                  <p className="permission-key-list">{rolePermissions[role].join(", ")}</p>
                </details>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Sensitive operation confirmation" description="Deletion, role changes and sensitive exports require explicit confirmation.">
          <ul>
            <li>owner: full access, including sensitive export and audit export.</li>
            <li>manager: team data and normal export, no organization delete or sensitive export.</li>
            <li>sales: own assigned customers and sales workflow only.</li>
            <li>support: read/after-sales follow-up only, no quote creation or export.</li>
          </ul>
        </Panel>
      </section>
    );
  }
  function renderRiskEvents() {
    const organizationId = selectedOrganizationId;
    return (
      <section className="customer-layout">
        <Panel title="Risk events" description="High and medium risk audit events for the selected organization.">
          <div className="detail-actions">
            <button onClick={() => loadRiskEvents(organizationId)} disabled={!organizationId || !canManageSelectedOrganization}>Refresh risk events</button>
          </div>
          <SimpleList items={riskEvents} render={(item) => (
            <button className={`customer-row ${selectedAuditLog?.id === item.id ? "selected" : ""}`} onClick={() => selectAuditLog(item.id)}>
              <strong>{item.riskLevel || "low"} / {item.action}</strong>
              <span>{item.entityType} {item.entityId || ""}</span>
              <span>{item.createdAt}</span>
            </button>
          )} />
        </Panel>
        <Panel title="Risk event detail" description="Risk events are audit hints, not automated WhatsApp actions.">
          <p>Review high-risk deletes, role changes, cross-organization denials and sensitive exports. Confirm whether the action was expected.</p>
          {selectedAuditLog && <Field label="Metadata"><textarea rows={10} readOnly value={JSON.stringify(selectedAuditLog.metadata || null, null, 2)} /></Field>}
        </Panel>
      </section>
    );
  }
  function renderImportExport() {
    const orgScope = importOrganizationId || selectedOrganizationId;
    return (
      <section className="grid quote-layout">
        <Panel title="Organization import/export" description="V4-A: owner/manager can batch handle organization customers, shared products, materials, knowledge and scripts.">
          <div className="form-grid">
            <SelectField label="Organization" value={orgScope} onChange={setImportOrganizationId} options={organizations.map((item) => [item.id, item.name])} emptyLabel="Select organization" />
            <Field label="Data type">
              <select value={organizationImportType} onChange={(event) => { setOrganizationImportType(event.target.value as OrganizationImportExportType); setOrganizationImportJob(null); setOrganizationExportJob(null); }}>
                {ORGANIZATION_IMPORT_EXPORT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </Field>
          </div>
          <Field label="CSV file"><input type="file" accept=".csv,text/csv" onChange={(event) => setOrganizationImportFile(event.target.files?.[0] || null)} /></Field>
          <label className="checkbox-line"><input type="checkbox" checked={importSkipDuplicates} onChange={(event) => setImportSkipDuplicates(event.target.checked)} /><span>Skip duplicate customers/products during formal import</span></label>
          <div className="detail-actions">
            <button className="secondary-button" onClick={() => runOrganizationCsvImport(true)} disabled={!canManageSelectedOrganization}>Dry run</button>
            <button onClick={() => runOrganizationCsvImport(false)} disabled={!canManageSelectedOrganization}>Confirm import</button>
            <button className="secondary-button" onClick={() => runOrganizationCsvExport("normal")} disabled={!canManageSelectedOrganization}>Generate normal export</button>
            <button className="secondary-button" onClick={() => runOrganizationCsvExport("sensitive")} disabled={!canManageSelectedOrganization}>Sensitive export</button>
          </div>
          <RiskWarnings items={["Organization import/export is owner/manager only; sales/support are read-only.", "dryRun validates format, uniqueness and permission without writing to the database.", "ownerId, createdBy, organizationId, secrets and token fields are ignored."]} />
          {organizationImportJob && <div className="risk-box"><span>Import job: {organizationImportJob.id}</span><span>Status: {organizationImportJob.status}</span><span>Rows: {organizationImportJob.result?.totalRows ?? "-"}</span><span>Success: {organizationImportJob.result?.successCount ?? "-"}</span><span>Failed: {organizationImportJob.result?.failureCount ?? "-"}</span></div>}
          {organizationExportJob && <div className="risk-box"><span>Export job: {organizationExportJob.id}</span><span>Status: {organizationExportJob.status}</span><span>File: {organizationExportJob.filePath || "generated"}</span></div>}
        </Panel>
        <Panel title="CSV import" description="Upload UTF-8 CSV only. Dry run validates without writing data.">
          <Field label="Data type"><select value={importType} onChange={(event) => { setImportType(event.target.value as ImportExportType); setImportResult(null); }}>{IMPORT_EXPORT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></Field>
          <Field label="CSV file"><input type="file" accept=".csv,text/csv" onChange={(event) => setImportFile(event.target.files?.[0] || null)} /></Field>
          {importType === "customers" && <><SelectField label="Customer organization scope" value={importOrganizationId} onChange={setImportOrganizationId} options={organizations.map((item) => [item.id, item.name])} emptyLabel="Personal scope" /><label className="checkbox-line"><input type="checkbox" checked={importSkipDuplicates} onChange={(event) => setImportSkipDuplicates(event.target.checked)} /><span>Skip duplicate customers during formal import</span></label></>}
          <div className="detail-actions"><a className="secondary-button" href={templateCsvUrl(importType)}>Download template</a><button className="secondary-button" onClick={() => runCsvImport(true)}>Dry run</button><button onClick={() => runCsvImport(false)}>Confirm import</button></div>
          <RiskWarnings items={["CSV only, max 5MB. Excel files are not supported in V2-F.", "ownerId, createdBy, tokens, secrets and API keys are ignored and never imported.", "Import/export is scoped to the current logged-in user only."]} />
        </Panel>
        <Panel title="CSV export and result" description="Export only current user data. Formula-like cells are escaped.">
          <div className="list">{IMPORT_EXPORT_TYPES.map((type) => <div className="list-item" key={type}><div><strong>{type}</strong><span>UTF-8 CSV, arrays use | separator</span></div><a className="secondary-button" href={exportCsvUrl(type)}>Export</a></div>)}</div>
          {importResult && <div className="quote-history"><div className="risk-box"><span>Total rows: {importResult.totalRows}</span><span>Success: {importResult.successCount}</span><span>Skipped: {importResult.skippedCount}</span><span>Failed rows: {importResult.failureCount}</span><span>Mode: {importResult.dryRun ? "dry run" : "write"}</span></div><RecordList title="Import errors" items={importResult.errors.map((error) => `row ${error.row} / ${error.field}: ${error.message}`)} /></div>}
        </Panel>
      </section>
    );
  }
  async function runCsvImport(dryRun: boolean) {
    if (!importFile) return setStatus("Please choose a CSV file first.");
    setLoading(true);
    try {
      const result = await importCsv(importType, importFile, {
        dryRun,
        skipDuplicates: importType === "customers" ? importSkipDuplicates : true,
        organizationId: importType === "customers" ? importOrganizationId : undefined
      });
      setImportResult(result);
      setStatus(dryRun ? "Dry run completed. No data was written." : "CSV import completed.");
      if (!dryRun) await refreshAll();
    } catch {
      setStatus("CSV import failed. Check file type, size and row errors.");
    } finally {
      setLoading(false);
    }
  }

  async function runOrganizationCsvImport(dryRun: boolean) {
    const organizationId = importOrganizationId || selectedOrganizationId;
    if (!organizationId) return setStatus("Please choose an organization first.");
    if (!organizationImportFile) return setStatus("Please choose a CSV file first.");
    setLoading(true);
    try {
      const result = await importOrganizationCsv(organizationImportType, organizationImportFile, {
        organizationId,
        dryRun,
        skipDuplicates: importSkipDuplicates
      });
      setOrganizationImportJob({ ...result.job, result: result.result });
      setStatus(dryRun ? "Organization dry run completed. No data was written." : "Organization import completed and audit log was recorded.");
      if (!dryRun) await refreshAll();
    } catch {
      setStatus("Organization import failed. Owner or manager role is required.");
    } finally {
      setLoading(false);
    }
  }

  async function runOrganizationCsvExport(fieldsScope: "normal" | "sensitive" = "normal") {
    const organizationId = importOrganizationId || selectedOrganizationId;
    if (!organizationId) return setStatus("Please choose an organization first.");
    if (fieldsScope === "sensitive" && !window.confirm("Sensitive export may include contact information. Confirm this high-risk action?")) return;
    setLoading(true);
    try {
      const result = await createOrganizationExportJob(organizationImportType, organizationId, {}, fieldsScope);
      setOrganizationExportJob(result.job);
      setStatus(`Organization ${fieldsScope} export job completed and audit log was recorded.`);
    } catch {
      setStatus("Organization export failed. Owner or manager role is required.");
    } finally {
      setLoading(false);
    }
  }

  async function runReportJob() {
    const organizationId = reportFilters.organizationId || selectedOrganizationId;
    if (!organizationId) return setStatus("Please choose an organization first.");
    setLoading(true);
    try {
      const result = await generateReportJob(organizationId, reportFilters.reportType, {
        assignedTo: reportFilters.assignedTo,
        stage: reportFilters.stage,
        intentLevel: reportFilters.intentLevel
      });
      setReportJob(result.job);
      setStatus("Report job completed and audit log was recorded.");
    } catch {
      setStatus("Report generation failed. Owner or manager role is required.");
    } finally {
      setLoading(false);
    }
  }

  function renderCustomForm() {
    return (
      <>
        <div className="form-grid">
          <SelectField label="Customer" value={customForm.customerId} onChange={(value) => setCustomForm({ ...customForm, customerId: value })} options={customers.map((item) => [item.id, item.name])} />
          <SelectField label="Product" value={customForm.productId} onChange={(value) => setCustomForm({ ...customForm, productId: value })} options={products.map((item) => [item.id, item.name])} emptyLabel="No product" />
          <SelectField label="Request type" value={customForm.requestType} onChange={(value) => setCustomForm({ ...customForm, requestType: value as CustomRequestType })} options={CUSTOM_REQUEST_TYPES.map((item) => [item, item])} />
          <SelectField label="Status" value={customForm.status} onChange={(value) => setCustomForm({ ...customForm, status: value as CustomRequestStatus })} options={CUSTOM_REQUEST_STATUSES.map((item) => [item, item])} />
          <Field label="Quantity"><input value={customForm.quantity} onChange={(event) => setCustomForm({ ...customForm, quantity: event.target.value })} /></Field>
          <Field label="MOQ"><input value={customForm.moq} onChange={(event) => setCustomForm({ ...customForm, moq: event.target.value })} /></Field>
          <Field label="Sample fee"><input value={customForm.sampleFee} onChange={(event) => setCustomForm({ ...customForm, sampleFee: event.target.value })} /></Field>
          <Field label="Sample lead time"><input value={customForm.sampleLeadTime} onChange={(event) => setCustomForm({ ...customForm, sampleLeadTime: event.target.value })} /></Field>
          <Field label="Bulk lead time"><input value={customForm.bulkLeadTime} onChange={(event) => setCustomForm({ ...customForm, bulkLeadTime: event.target.value })} /></Field>
          <Field label="Color"><input value={customForm.colorRequirement} onChange={(event) => setCustomForm({ ...customForm, colorRequirement: event.target.value })} /></Field>
          <Field label="Size"><input value={customForm.sizeRequirement} onChange={(event) => setCustomForm({ ...customForm, sizeRequirement: event.target.value })} /></Field>
          <Field label="Material"><input value={customForm.materialRequirement} onChange={(event) => setCustomForm({ ...customForm, materialRequirement: event.target.value })} /></Field>
        </div>
        <div className="tag-picker">
          <label className={customForm.logoRequired ? "checked" : ""}>
            <input type="checkbox" checked={customForm.logoRequired} onChange={(event) => setCustomForm({ ...customForm, logoRequired: event.target.checked })} />
            Logo required
          </label>
          <label className={customForm.packagingRequired ? "checked" : ""}>
            <input type="checkbox" checked={customForm.packagingRequired} onChange={(event) => setCustomForm({ ...customForm, packagingRequired: event.target.checked })} />
            Packaging required
          </label>
        </div>
        <Field label="File URLs, one per line"><textarea rows={3} value={customForm.files} onChange={(event) => setCustomForm({ ...customForm, files: event.target.value })} /></Field>
        <Field label="Notes / generated custom script"><textarea rows={8} value={customForm.notes} onChange={(event) => setCustomForm({ ...customForm, notes: event.target.value })} /></Field>
        <RiskWarnings items={["Do not invent MOQ, sample fee, lead time, bulk lead time, production feasibility or return policy.", "All custom scripts are drafts only and will not be sent automatically."]} />
        <div className="detail-actions">
          <button onClick={saveCustomRecord}>Save</button>
          {CUSTOM_SCRIPT_SCENARIOS.map((scenario) => <button className="secondary-button" key={scenario} onClick={() => generateSelectedCustomScript(scenario)}>{scenario}</button>)}
          <button className="secondary-button" onClick={createCustomFollowUp}>Set follow-up</button>
          <button className="secondary-button" onClick={() => { setSelectedCustomRequestId(""); setCustomForm({ ...emptyCustomForm, customerId: selectedCustomerId, productId: selectedProductId }); }}>New</button>
          <button className="danger-button" onClick={() => selectedCustomRequestId && removeCustom(selectedCustomRequestId)}>Delete</button>
        </div>
      </>
    );
  }

  function SampleFilterBar() {
    return (
      <FilterRow>
        <input placeholder="Search" value={sampleFilters.q} onChange={(event) => setSampleFilters({ ...sampleFilters, q: event.target.value })} />
        <select value={sampleFilters.paymentStatus} onChange={(event) => setSampleFilters({ ...sampleFilters, paymentStatus: event.target.value })}>
          <option value="">All payment</option>
          {SAMPLE_PAYMENT_STATUSES.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={sampleFilters.shippingStatus} onChange={(event) => setSampleFilters({ ...sampleFilters, shippingStatus: event.target.value })}>
          <option value="">All shipping</option>
          {SAMPLE_SHIPPING_STATUSES.map((item) => <option key={item}>{item}</option>)}
        </select>
        <button onClick={() => loadSampleOrders(sampleFilters)}>Search</button>
      </FilterRow>
    );
  }

  function CustomFilterBar() {
    return (
      <FilterRow>
        <input placeholder="Search customer, product, notes or file URL" value={customFilters.q} onChange={(event) => setCustomFilters({ ...customFilters, q: event.target.value })} />
        <select value={customFilters.requestType} onChange={(event) => setCustomFilters({ ...customFilters, requestType: event.target.value })}>
          <option value="">All types</option>
          {CUSTOM_REQUEST_TYPES.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={customFilters.status} onChange={(event) => setCustomFilters({ ...customFilters, status: event.target.value })}>
          <option value="">All status</option>
          {CUSTOM_REQUEST_STATUSES.map((item) => <option key={item}>{item}</option>)}
        </select>
        <button onClick={() => loadCustomRequests(customFilters)}>Search</button>
      </FilterRow>
    );
  }

  function TaskPanel({ title, tasks }: { title: string; tasks: FollowUpSummary[] }) {
    return (
      <Panel title={title} description="Manual task reminders only.">
        <div className="task-list">
          {tasks.length ? tasks.map((task) => (
            <div className="task-card" key={task.id}>
              <strong>{task.customerName}</strong>
              <span>{task.taskType} / {formatDate(task.remindAt)}</span>
              <textarea value={task.recommendedScript} readOnly />
              <button onClick={() => markTaskDone(task.id)}>Complete</button>
            </div>
          )) : <p className="empty-note">No tasks.</p>}
        </div>
      </Panel>
    );
  }

  function CustomerPanel({ title, customers: items }: { title: string; customers: CustomerSummary[] }) {
    return (
      <Panel title={title} description="Current user data only.">
        <div className="list">
          {items.length ? items.map((customer) => (
            <div className="list-item" key={customer.id}>
              <div>
                <strong>{customer.name}</strong>
                <span>{customer.stage} / intent {customer.intentScore ?? "-"}</span>
              </div>
              <button onClick={() => { setView("customers"); void selectCustomer(customer.id); }}>Open</button>
            </div>
          )) : <p className="empty-note">No customers.</p>}
        </div>
      </Panel>
    );
  }
}

function Panel({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function SelectField({ label, value, onChange, options, emptyLabel = "Select" }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]>; emptyLabel?: string }) {
  return (
    <Field label={label}>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{emptyLabel}</option>
        {options.map(([optionValue, labelText]) => <option value={optionValue} key={optionValue}>{labelText}</option>)}
      </select>
    </Field>
  );
}

function FilterRow({ children }: { children: ReactNode }) {
  return <div className="filters">{children}</div>;
}

function OrgContentFilterBar({
  filters,
  setFilters,
  organizations,
  categories,
  onSearch
}: {
  filters: OrgContentFilters;
  setFilters: (filters: OrgContentFilters) => void;
  organizations: OrganizationSummary[];
  categories: string[];
  onSearch: () => void;
}) {
  return (
    <FilterRow>
      <select value={filters.organizationId} onChange={(event) => setFilters({ ...filters, organizationId: event.target.value })}>
        <option value="">Select organization</option>
        {organizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
      <input placeholder="Search title/content/category/language" value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} />
      <select value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}>
        <option value="">All categories</option>
        {categories.map((item) => <option key={item}>{item}</option>)}
      </select>
      <select value={filters.language} onChange={(event) => setFilters({ ...filters, language: event.target.value })}>
        <option value="">All languages</option>
        {KNOWLEDGE_BASE_LANGUAGES.map((item) => <option key={item}>{item}</option>)}
      </select>
      <button onClick={onSearch}>Search</button>
    </FilterRow>
  );
}

function SimpleList<T extends { id: string }>({ items, render }: { items: T[]; render: (item: T) => ReactNode }) {
  return <div className="customer-list">{items.length ? items.map((item) => <div key={item.id}>{render(item)}</div>) : <p className="empty-note">No records.</p>}</div>;
}

function BrandLinkedRow({ item, label, onRemove }: { item: any; label: string; onRemove: () => void }) {
  return (
    <div className="customer-row">
      <strong>{label}</strong>
      <span>{item.sku || item.type || item.category || item.scriptType || item.id}</span>
      <button className="secondary-button" onClick={onRemove}>Unlink</button>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}

function ProfitBreakdownPanel({ title, rows }: { title: string; rows: ProfitBreakdownRow[] }) {
  return (
    <Panel title={title} description="Aggregated from accessible orders only. Currency conversion is not performed.">
      <SimpleList items={rows.map((row) => ({ ...row, id: row.id || row.name }))} render={(row) => (
        <div className="customer-row">
          <strong>{row.name}</strong>
          <span>{row.sku || row.country || "No extra label"} / orders {row.orderCount}</span>
          <span>Revenue {row.revenue} / cost {row.totalCost} / gross {row.grossProfit} / margin {row.grossMargin || "-"}%</span>
        </div>
      )} />
    </Panel>
  );
}

function RecordList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="section-subhead"><strong>{title}</strong><span>{items.length}</span></div>
      <div className="quote-history-list">
        {items.length ? items.map((item, index) => <div className="quote-history-item" key={`${title}-${index}`}><span>{item}</span></div>) : <p className="empty-note">No records.</p>}
      </div>
    </div>
  );
}

function RiskWarnings({ items }: { items: string[] }) {
  if (!items.length) return null;
  return <div className="risk-box">{items.map((item) => <span key={item}>{item}</span>)}</div>;
}

function uniqueStrings(items: readonly string[]) {
  return Array.from(new Set(items));
}

function predictionToReminderType(type: string) {
  if (type === "dormant") return "dormant_reactivation";
  if (type === "high_value") return "product_recommendation";
  return "reorder";
}

function predictionToScriptType(type: string) {
  if (type === "dormant") return "dormant_reactivation";
  if (type === "high_value") return "high_value_follow_up";
  if (type === "churn_risk") return "churn_risk_follow_up";
  return "reorder";
}

function opportunityToScriptScenario(type: string): ReorderOperationScriptScenario {
  if (type === "dormant_reactivation") return "dormant_reactivation";
  if (type === "new_product") return "new_product_recommendation";
  if (type === "replenishment") return "replenishment_check";
  if (type === "holiday") return "holiday_greeting";
  if (type === "high_value") return "high_value_customer_follow_up";
  if (type === "churn_risk") return "churn_risk_recovery";
  return "reorder_follow_up";
}

function titleForView(view: View) {
  const titles: Record<View, string> = {
    dashboard: "Home",
    teamDashboard: "Team board",
    reports: "Reports",
    predictions: "Predictions / reorder reminders",
    reorderOps: "Reorder operations",
    afterSales: "After-sales and exceptions",
    scriptTests: "A/B script testing",
    suppliers: "Suppliers / procurement",
    brands: "Brands / stores",
    enterprise: "Enterprise platform",
    aiKeys: "AI key pool",
    organizations: "Organizations",
    roles: "Roles",
    permissions: "Permission matrix",
    customers: "Customer CRM",
    products: "Products",
    orgProducts: "Org products",
    quotes: "Quotes",
    orders: "Order center",
    fulfillment: "Order fulfillment",
    profit: "Profit review",
    knowledge: "Knowledge",
    orgKnowledge: "Org knowledge",
    orgScripts: "Org scripts",
    materials: "Materials",
    orgMaterials: "Org materials",
    samples: "Sample orders",
    custom: "Custom requests",
    importExport: "CSV import/export",
    auditLogs: "Audit logs",
    riskEvents: "Risk events"
  };
  return titles[view];
}
function toOrganizationForm(organization: OrganizationSummary | OrganizationDetail): OrganizationForm {
  return {
    name: organization.name || ""
  };
}

function toRoleForm(role: RoleSummary): RoleForm {
  return {
    organizationId: role.organizationId,
    name: role.name,
    description: role.description || ""
  };
}

function toCustomerForm(customer: CustomerSummary): CustomerForm {
  return {
    name: customer.name || "",
    whatsappNumber: customer.whatsappNumber || "",
    email: customer.email || "",
    socialLinks: (customer.socialLinks || []).join(", "),
    organizationId: customer.organizationId || "",
    assignedTo: customer.assignedTo || "",
    collaborators: (customer.collaborators || []).join(", "),
    country: customer.country || "",
    language: customer.language || "English",
    tags: (customer.tags || []).join(", "),
    stage: customer.stage || "New lead",
    interestedProduct: customer.interestedProduct || "",
    latestSummary: customer.latestSummary || "",
    nextFollowUpAt: toDatetimeLocal(customer.nextFollowUpAt),
    notes: customer.notes || ""
  };
}

function toCustomerPayload(form: CustomerForm): CustomerUpsertRequest {
  return {
    name: form.name.trim(),
    whatsappNumber: form.whatsappNumber || null,
    email: form.email || null,
    socialLinks: splitLinesOrComma(form.socialLinks),
    organizationId: form.organizationId || null,
    assignedTo: form.assignedTo || null,
    collaborators: splitLinesOrComma(form.collaborators),
    country: form.country || null,
    language: form.language || null,
    tags: splitLinesOrComma(form.tags),
    stage: form.stage || "New lead",
    latestSummary: form.latestSummary || null,
    nextFollowUpAt: form.nextFollowUpAt ? new Date(form.nextFollowUpAt).toISOString() : null,
    notes: form.notes || null
  };
}

function toProductForm(product: ProductSummary): ProductForm {
  return {
    name: product.name || "",
    sku: product.sku || "",
    category: product.category || "",
    moq: product.moq ? String(product.moq) : "",
    suggestedPrice: product.suggestedPrice || "",
    minPrice: product.minPrice || "",
    leadTime: product.leadTime || "",
    sellingPoints: (product.sellingPoints || []).join("\n"),
    images: (product.images || []).join("\n"),
    videos: (product.videos || []).join("\n")
  };
}

function toProductPayload(form: ProductForm): ProductUpsertRequest {
  return {
    name: form.name.trim(),
    sku: form.sku.trim(),
    category: form.category || null,
    moq: optionalNumber(form.moq),
    suggestedPrice: form.suggestedPrice || null,
    minPrice: form.minPrice || null,
    leadTime: form.leadTime || null,
    sellingPoints: splitLinesOrComma(form.sellingPoints),
    images: splitLinesOrComma(form.images),
    videos: splitLinesOrComma(form.videos)
  };
}

function toQuotePayload(form: QuoteForm): QuoteGenerateRequest {
  return {
    customerId: form.customerId,
    productId: form.productId,
    organizationId: form.organizationId || null,
    quantity: Number(form.quantity || 0),
    unitPrice: form.unitPrice,
    currency: form.currency || "USD",
    shippingCost: form.shippingCost || null,
    moq: optionalNumber(form.moq),
    leadTime: form.leadTime || null,
    includeShipping: form.includeShipping,
    targetLanguage: form.targetLanguage,
    tiers: parseTiers(form.tiers),
    stockKnown: false,
    promiseStock: false,
    useKnowledgeBase: true
  };
}

function toKnowledgeForm(item: KnowledgeBaseSummary): KnowledgeForm {
  return {
    title: item.title,
    category: item.category,
    content: item.content,
    language: item.language,
    productId: item.productId || "",
    enabled: item.enabled
  };
}

function toOrgKnowledgeForm(item: KnowledgeBaseOrgSummary): OrgKnowledgeForm {
  return {
    organizationId: item.organizationId,
    title: item.title,
    category: item.category,
    content: item.content,
    language: item.language,
    enabled: item.enabled
  };
}

function toOrgScriptForm(item: ScriptOrgSummary): OrgScriptForm {
  return {
    organizationId: item.organizationId,
    title: item.title,
    category: item.category,
    content: item.content,
    language: item.language,
    enabled: item.enabled
  };
}

function toMaterialForm(item: MaterialSummary): MaterialForm {
  return {
    title: item.title,
    type: item.type,
    url: item.url,
    description: item.description || "",
    language: item.language,
    productId: item.productId || "",
    tags: (item.tags || []).join(", ")
  };
}

function toSampleForm(item: SampleOrderSummary): SampleForm {
  return {
    customerId: item.customerId,
    productId: item.productId || "",
    sampleName: item.sampleName,
    sampleFee: item.sampleFee || "",
    shippingCost: item.shippingCost || "",
    currency: item.currency || "USD",
    paymentStatus: item.paymentStatus,
    shippingStatus: item.shippingStatus,
    trackingNumber: item.trackingNumber || "",
    feedbackStatus: item.feedbackStatus,
    expectedShipDate: item.expectedShipDate?.slice(0, 10) || "",
    expectedDeliveryDate: item.expectedDeliveryDate?.slice(0, 10) || "",
    notes: item.notes || ""
  };
}

function toCustomForm(item: CustomRequestSummary): CustomForm {
  return {
    customerId: item.customerId,
    productId: item.productId || "",
    requestType: item.requestType,
    logoRequired: item.logoRequired,
    packagingRequired: item.packagingRequired,
    colorRequirement: item.colorRequirement || "",
    sizeRequirement: item.sizeRequirement || "",
    materialRequirement: item.materialRequirement || "",
    quantity: item.quantity ? String(item.quantity) : "",
    moq: item.moq ? String(item.moq) : "",
    sampleFee: item.sampleFee || "",
    sampleLeadTime: item.sampleLeadTime || "",
    bulkLeadTime: item.bulkLeadTime || "",
    files: (item.files || []).join("\n"),
    status: item.status,
    notes: item.notes || ""
  };
}

function toOrderForm(item: OrderSummary): OrderForm {
  return {
    customerId: item.customerId,
    productId: item.productId || "",
    orderType: item.orderType || "normal",
    title: item.title || "",
    amount: item.amount || "",
    currency: item.currency || "USD",
    quantity: item.quantity ? String(item.quantity) : "",
    paymentStatus: item.paymentStatus || "unpaid",
    productionStatus: item.productionStatus || "not_started",
    shippingStatus: item.shippingStatus || "pending",
    afterSalesStatus: item.afterSalesStatus || "none",
    orderStatus: item.orderStatus || "draft",
    expectedShipDate: item.expectedShipDate?.slice(0, 10) || "",
    expectedDeliveryDate: item.expectedDeliveryDate?.slice(0, 10) || "",
    trackingNumber: item.trackingNumber || "",
    notes: item.notes || "",
    files: (item.files || []).join("\n"),
    assignedTo: item.assignedTo || ""
  };
}

function toAfterSalesForm(item: AfterSalesCaseSummary | AfterSalesCaseDetail | any) {
  return {
    customerId: item.customerId,
    orderId: item.orderId || "",
    productId: item.productId || "",
    caseType: item.caseType || "quality_issue",
    priority: item.priority || "medium",
    status: item.status || "open",
    responsibility: item.responsibility || "unknown",
    requestedSolution: item.requestedSolution || "",
    finalSolution: item.finalSolution || "",
    refundAmount: item.refundAmount || "",
    reshipCost: item.reshipCost || "",
    compensationAmount: item.compensationAmount || "",
    currency: item.currency || "USD",
    description: item.description || "",
    customerClaim: item.customerClaim || "",
    internalNotes: item.internalNotes || "",
    evidenceUrls: (item.evidenceUrls || []).join("\n"),
    resolutionNotes: item.resolutionNotes || "",
    assignedTo: item.assignedTo || "",
    scriptScenario: "apologize_and_acknowledge"
  };
}

function toSupplierForm(item: any) {
  return {
    organizationId: item.organizationId || "",
    name: item.name || "",
    contactName: item.contactName || "",
    phone: item.phone || "",
    email: item.email || "",
    whatsapp: item.whatsapp || "",
    wechat: item.wechat || "",
    country: item.country || "",
    city: item.city || "",
    website: item.website || "",
    tags: (item.tags || []).join(", "),
    rating: item.rating ? String(item.rating) : "",
    status: item.status || "candidate",
    riskLevel: item.riskLevel || "",
    notes: item.notes || ""
  };
}

function toBrandForm(item: any) {
  return {
    organizationId: item.organizationId || "",
    name: item.name || "",
    displayName: item.displayName || "",
    description: item.description || "",
    logoUrl: item.logoUrl || "",
    website: item.website || "",
    defaultLanguage: item.defaultLanguage || "en",
    defaultCurrency: item.defaultCurrency || "USD",
    country: item.country || "",
    status: item.status || "active",
    notes: item.notes || ""
  };
}

function afterSalesPayload(form: typeof emptyAfterSalesForm) {
  return {
    customerId: form.customerId,
    orderId: form.orderId || null,
    productId: form.productId || null,
    caseType: form.caseType,
    priority: form.priority,
    status: form.status,
    responsibility: form.responsibility,
    requestedSolution: form.requestedSolution || null,
    finalSolution: form.finalSolution || null,
    refundAmount: form.refundAmount || null,
    reshipCost: form.reshipCost || null,
    compensationAmount: form.compensationAmount || null,
    currency: form.currency || null,
    description: form.description || null,
    customerClaim: form.customerClaim || null,
    internalNotes: form.internalNotes || null,
    evidenceUrls: splitLinesOrComma(form.evidenceUrls),
    resolutionNotes: form.resolutionNotes || null,
    assignedTo: form.assignedTo || null
  };
}

function toCustomPayload(form: CustomForm): CustomRequestUpsertRequest {
  return {
    customerId: form.customerId,
    productId: form.productId || null,
    requestType: form.requestType,
    logoRequired: form.logoRequired,
    packagingRequired: form.packagingRequired,
    colorRequirement: form.colorRequirement || null,
    sizeRequirement: form.sizeRequirement || null,
    materialRequirement: form.materialRequirement || null,
    quantity: optionalNumber(form.quantity),
    moq: optionalNumber(form.moq),
    sampleFee: form.sampleFee || null,
    sampleLeadTime: form.sampleLeadTime || null,
    bulkLeadTime: form.bulkLeadTime || null,
    files: splitLinesOrComma(form.files),
    status: form.status,
    notes: form.notes || null
  };
}

function splitLinesOrComma(value: string) {
  return value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
}

function optionalNumber(value: string) {
  if (!value.trim()) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function parseTiers(value: string) {
  return value
    .split("\n")
    .map((line) => line.split(",").map((part) => part.trim()))
    .filter(([quantity, unitPrice]) => quantity && unitPrice)
    .map(([quantity, unitPrice]) => ({ quantity: Number(quantity), unitPrice }));
}

function toDatetimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function tomorrowIso() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString();
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatRate(value?: number | null) {
  if (value === null || value === undefined) return "n/a";
  return `${Math.round(value * 1000) / 10}%`;
}

function nextVariantLabel(index: number) {
  return ["A", "B", "C", "D", "E"][Math.max(0, Math.min(index, 4))] || "A";
}

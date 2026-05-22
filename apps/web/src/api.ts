import type {
  AuthResponse,
  AuthUser,
  AuditLogDetail,
  AuditLogListQuery,
  AuditLogSummary,
  AfterSalesCaseDetail,
  AfterSalesCaseSummary,
  AfterSalesListQuery,
  AfterSalesScriptRequest,
  AfterSalesScriptResponse,
  AfterSalesUpsertRequest,
  CustomerAssignRequest,
  CustomerDuplicateCheckRequest,
  CustomerDuplicateCheckResponse,
  CustomerDetail,
  CustomRequestDetail,
  CustomRequestListQuery,
  CustomRequestStatus,
  CustomRequestSummary,
  CustomRequestUpsertRequest,
  CustomScriptRequest,
  CustomScriptResponse,
  CustomerIntentResponse,
  CustomerListQuery,
  CustomerPredictionListQuery,
  CustomerPredictionRecalculateRequest,
  CustomerPredictionRecalculateResponse,
  CustomerPredictionSummary,
  CustomerSummary,
  CustomerUpsertRequest,
  EnterpriseAuditLogSummary,
  EnterpriseBrandContextResponse,
  EnterpriseReportSummary,
  EnterpriseRoleSummary,
  FollowUpDetail,
  FollowUpListQuery,
  FollowUpSummary,
  FollowUpUpsertRequest,
  GenerateDraftRequest,
  GenerateDraftResponse,
  KnowledgeBaseDetail,
  KnowledgeBaseListQuery,
  KnowledgeBaseOrgDetail,
  KnowledgeBaseOrgListQuery,
  KnowledgeBaseOrgSummary,
  KnowledgeBaseOrgUpsertRequest,
  KnowledgeBaseSummary,
  KnowledgeBaseUpsertRequest,
  MaterialDetail,
  MaterialIntroRequest,
  MaterialIntroResponse,
  MaterialListQuery,
  MaterialSummary,
  MaterialUpsertRequest,
  OrganizationDetail,
  OrganizationUnitSummary,
  OrganizationMemberSummary,
  OrganizationMemberUpdateRequest,
  OrganizationMemberUpsertRequest,
  OrganizationMaterialCreateRequest,
  OrganizationMaterialDetail,
  OrganizationMaterialListQuery,
  OrganizationMaterialSummary,
  OrganizationProductCreateRequest,
  OrganizationProductDetail,
  OrganizationProductListQuery,
  OrganizationProductSummary,
  OrganizationSummary,
  OrganizationUpsertRequest,
  OrderDetail,
  OrderCostSummary,
  OrderCostUpsertRequest,
  OrderFulfillmentAlertSummary,
  OrderFulfillmentBoardResponse,
  OrderFulfillmentDetailResponse,
  OrderFulfillmentScriptRequest,
  OrderListQuery,
  OrderScriptRequest,
  OrderScriptResponse,
  OrderSummary,
  OrderUpsertRequest,
  ProductDetail,
  ProfitBreakdownRow,
  ProfitOrderRow,
  ProfitReviewRequest,
  ProfitReviewResponse,
  ProfitSummary,
  ProductOpportunitySummary,
  ProductListQuery,
  ProductSummary,
  ProductUpsertRequest,
  QuoteGenerateRequest,
  QuoteResponse,
  QuoteSaveRequest,
  ReportJobSummary,
  ReorderCampaignSummary,
  ReorderCampaignUpsertRequest,
  ReorderOperationScriptRequest,
  ReorderOperationScriptResponse,
  ReorderOpportunityListQuery,
  ReorderOpportunityRecalculateRequest,
  ReorderOpportunityRecalculateResponse,
  ReorderOpportunitySummary,
  ReorderPlaybookSummary,
  ReorderPlaybookUpsertRequest,
  ReorderReminderListQuery,
  ReorderReminderSummary,
  ReorderReminderUpsertRequest,
  ReorderScriptRequest,
  ReorderScriptResponse,
  ReportJobType,
  RoleSummary,
  RoleUpdateRequest,
  RoleUpsertRequest,
  SampleFeedbackStatus,
  SampleOrderDetail,
  SampleOrderListQuery,
  SampleOrderSummary,
  SampleOrderUpsertRequest,
  SamplePaymentStatus,
  SampleScriptRequest,
  SampleScriptResponse,
  SampleShippingStatus,
  ScriptExperimentDetail,
  ScriptExperimentStats,
  ScriptExperimentSummary,
  ScriptExperimentUpsertRequest,
  ScriptUsageCreateRequest,
  ScriptUsageOutcomeRequest,
  ScriptUsageSummary,
  ScriptVariantGenerationRequest,
  ScriptVariantGenerationResponse,
  ScriptVariantSummary,
  ScriptVariantUpsertRequest,
  ScriptOrgDetail,
  ScriptOrgListQuery,
  ScriptOrgSummary,
  ScriptOrgUpsertRequest,
  TeamDashboardSummary,
  WorkbenchDashboard
} from "@wa-ai/shared";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
export const API_BASE = API_BASE_URL;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    },
    ...init
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export type { AuthUser };

export function register(payload: { email: string; password: string; name: string }) {
  return request<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function login(payload: { email: string; password: string }) {
  return request<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function logout() {
  return fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: "POST",
    credentials: "include"
  }).then((response) => {
    if (!response.ok && response.status !== 204) {
      throw new Error(`Request failed: ${response.status}`);
    }
  });
}

export function getMe() {
  return request<AuthResponse>("/api/auth/me");
}

export type AiProviderKeySummary = {
  id: string;
  organizationId: string;
  provider: string;
  name: string;
  mode: "instant" | "thinking";
  model: string;
  userEmail?: string | null;
  baseUrl?: string | null;
  maskedKey: string;
  status: "active" | "disabled" | "exhausted";
  priority: number;
  totalRequests: number;
  totalTokens: number;
  successCount: number;
  errorCount: number;
  rateLimitCount: number;
  quotaErrorCount: number;
  lastUsedAt?: string | null;
  lastSuccessAt?: string | null;
  lastErrorAt?: string | null;
  lastErrorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AiProviderKeyUpsertRequest = {
  organizationId?: string;
  provider?: string;
  name?: string;
  apiKey?: string;
  mode?: "instant" | "thinking";
  model?: string;
  userEmail?: string;
  baseUrl?: string;
  status?: "active" | "disabled" | "exhausted";
  priority?: number;
};

export type AiModelDefinition = {
  id: string;
  label: string;
  provider: string;
  mode: "instant" | "thinking";
  model: string;
  baseUrl: string;
  priority: number;
};

export function getAiModels() {
  return request<AiModelDefinition[]>("/api/ai-keys/models");
}

export function getAiProviderKeys(query: { organizationId: string; mode?: string; status?: string; model?: string }) {
  return request<AiProviderKeySummary[]>(
    `/api/ai-keys${toQuery({ organizationId: query.organizationId, mode: query.mode, status: query.status, model: query.model })}`
  );
}

export function createAiProviderKey(payload: AiProviderKeyUpsertRequest & { organizationId: string; apiKey: string }) {
  return request<AiProviderKeySummary>("/api/ai-keys", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateAiProviderKey(id: string, payload: AiProviderKeyUpsertRequest) {
  return request<AiProviderKeySummary>(`/api/ai-keys/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function disableAiProviderKey(id: string) {
  return request<AiProviderKeySummary>(`/api/ai-keys/${id}`, {
    method: "DELETE",
    body: JSON.stringify({ confirm: true })
  });
}

export function importAiProviderKeys(payload: { organizationId: string; content: string; filename?: string }) {
  return request<{ createdCount: number; failedCount: number; errors: Array<{ index: number; message: string }>; keys: AiProviderKeySummary[] }>("/api/ai-keys/import", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function aiKeyUsageExportUrl(organizationId: string) {
  return `${API_BASE_URL}/api/ai-keys/export${toQuery({ organizationId })}`;
}

function toQuery(params: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const text = query.toString();
  return text ? `?${text}` : "";
}

export function getCustomers(query: CustomerListQuery = {}) {
  return request<CustomerSummary[]>(
    `/api/customers${toQuery({ tag: query.tag, stage: query.stage, q: query.q, sort: query.sort, intentLevel: query.intentLevel, organizationId: query.organizationId })}`
  );
}

export function getCustomer(id: string) {
  return request<CustomerDetail>(`/api/customers/${id}`);
}

export function getCustomerIntent(id: string) {
  return request<CustomerIntentResponse>(`/api/customers/${id}/intent`);
}

export function recalculateCustomerIntent(id: string) {
  return request<CustomerIntentResponse>(`/api/customers/${id}/recalculate-intent`, {
    method: "POST"
  });
}

export function getHighIntentCustomers(limit = 10) {
  return request<CustomerSummary[]>(`/api/dashboard/high-intent-customers${toQuery({ limit: String(limit) })}`);
}

export function getTeamSummary(organizationId: string) {
  return request<TeamDashboardSummary>(`/api/dashboard/team-summary${toQuery({ organizationId })}`);
}

export function teamSummaryCsvUrl(organizationId: string) {
  return `${API_BASE_URL}/api/dashboard/team-summary${toQuery({ organizationId, format: "csv" })}`;
}

export function getReportTeamSummary(organizationId: string) {
  return request<TeamDashboardSummary>(`/api/reports/team-summary${toQuery({ organizationId })}`);
}

export function reportTeamSummaryUrl(organizationId: string, format: "csv" | "excel") {
  return `${API_BASE_URL}/api/reports/team-summary${toQuery({ organizationId, format })}`;
}

export function getReportHighIntentCustomers(query: { organizationId: string; assignedTo?: string; stage?: string; intentLevel?: string }) {
  return request<TeamDashboardSummary["highIntentCustomers"]>(`/api/reports/high-intent-customers${toQuery(query)}`);
}

export function generateReportJob(organizationId: string, type: ReportJobType, filters: Record<string, unknown> = {}) {
  return request<{ job: ReportJobSummary }>(
    `/api/reports/generate${toQuery({ organizationId })}`,
    { method: "POST", body: JSON.stringify({ type, filters }) }
  );
}

export function getReportJob(id: string) {
  return request<ReportJobSummary>(`/api/reports/${id}/status`);
}

export function getEnterpriseOrganizationUnits(organizationId: string) {
  return request<OrganizationUnitSummary[]>(`/api/enterprise/organizations${toQuery({ organizationId })}`);
}

export function createEnterpriseOrganizationUnit(payload: { organizationId: string; parentId?: string | null; name: string; type: string; status?: string }) {
  return request<OrganizationUnitSummary>("/api/enterprise/organizations", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateEnterpriseOrganizationUnit(id: string, payload: Partial<{ parentId: string | null; name: string; type: string; status: string; confirm: boolean }>) {
  return request<OrganizationUnitSummary>(`/api/enterprise/organizations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function getEnterpriseMembers(organizationId: string) {
  return request<OrganizationMemberSummary[]>(`/api/enterprise/members${toQuery({ organizationId })}`);
}

export function upsertEnterpriseMember(payload: { organizationId: string; userId: string; role: string; status?: string }) {
  return request<OrganizationMemberSummary>("/api/enterprise/members", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateEnterpriseMember(id: string, payload: Partial<{ role: string; status: string; confirm: boolean }>) {
  return request<OrganizationMemberSummary>(`/api/enterprise/members/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function getEnterpriseRoles(organizationId: string) {
  return request<EnterpriseRoleSummary[]>(`/api/enterprise/roles${toQuery({ organizationId })}`);
}

export function createEnterpriseRole(payload: { organizationId: string; roleName: string; permissions: string[]; description?: string | null }) {
  return request<EnterpriseRoleSummary>("/api/enterprise/roles", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateEnterpriseRole(id: string, payload: Partial<{ permissions: string[]; description: string | null }>) {
  return request<EnterpriseRoleSummary>(`/api/enterprise/roles/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function getEnterpriseReports(organizationId: string) {
  return request<EnterpriseReportSummary[]>(`/api/enterprise/reports${toQuery({ organizationId })}`);
}

export function createEnterpriseReport(payload: { organizationId: string; reportType: string; filters?: Record<string, unknown> }) {
  return request<EnterpriseReportSummary>("/api/enterprise/reports", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getEnterpriseAuditLogs(organizationId: string) {
  return request<EnterpriseAuditLogSummary[]>(`/api/enterprise/audit-logs${toQuery({ organizationId })}`);
}

export function getEnterpriseBrandContext(payload: { organizationId: string; brandId?: string; customerId?: string; productId?: string; scenario?: string; enterpriseContext?: unknown }) {
  return request<EnterpriseBrandContextResponse>("/api/enterprise/brand-context", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function createCustomer(payload: CustomerUpsertRequest) {
  return request<CustomerDetail>("/api/customers", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateCustomer(id: string, payload: Partial<CustomerUpsertRequest>) {
  return request<CustomerDetail>(`/api/customers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function assignCustomer(id: string, payload: CustomerAssignRequest) {
  return request<CustomerDetail>(`/api/customers/${id}/assign`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function checkCustomerDuplicate(payload: CustomerDuplicateCheckRequest) {
  return request<CustomerDuplicateCheckResponse>("/api/customers/check-duplicate", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function deleteCustomer(id: string) {
  return fetch(`${API_BASE_URL}/api/customers/${id}`, {
    credentials: "include",
    method: "DELETE"
  }).then((response) => {
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }
  });
}

export function getProducts(query: ProductListQuery = {}) {
  return request<ProductSummary[]>(`/api/products${toQuery({ q: query.q, category: query.category })}`);
}

export function getOrganizationProducts(query: OrganizationProductListQuery) {
  return request<OrganizationProductSummary[]>(`/api/products/org${toQuery({ organizationId: query.organizationId, q: query.q, category: query.category })}`);
}

export function getOrganizationProduct(id: string) {
  return request<OrganizationProductDetail>(`/api/products/org/${id}`);
}

export function createOrganizationProduct(payload: OrganizationProductCreateRequest) {
  return request<OrganizationProductDetail>("/api/products/org", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateOrganizationProduct(id: string, payload: Partial<ProductUpsertRequest>) {
  return request<OrganizationProductDetail>(`/api/products/org/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function deleteOrganizationProduct(id: string) {
  return fetch(`${API_BASE_URL}/api/products/org/${id}`, {
    credentials: "include",
    method: "DELETE"
  }).then((response) => {
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  });
}

export function getOrganizations() {
  return request<OrganizationSummary[]>("/api/organizations");
}

export function getOrganization(id: string) {
  return request<OrganizationDetail>(`/api/organizations/${id}`);
}

export function createOrganization(payload: OrganizationUpsertRequest) {
  return request<OrganizationDetail>("/api/organizations", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateOrganization(id: string, payload: OrganizationUpsertRequest) {
  return request<OrganizationDetail>(`/api/organizations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function deleteOrganization(id: string) {
  return fetch(`${API_BASE_URL}/api/organizations/${id}`, {
    credentials: "include",
    method: "DELETE"
  }).then((response) => {
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  });
}

export function getOrganizationMembers(id: string, q = "") {
  return request<OrganizationMemberSummary[]>(`/api/organizations/${id}/members${toQuery({ q })}`);
}

export function addOrganizationMember(id: string, payload: OrganizationMemberUpsertRequest) {
  return request<OrganizationMemberSummary>(`/api/organizations/${id}/members`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateOrganizationMember(id: string, memberId: string, payload: OrganizationMemberUpdateRequest) {
  return request<OrganizationMemberSummary>(`/api/organizations/${id}/members/${memberId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function deleteOrganizationMember(id: string, memberId: string) {
  return fetch(`${API_BASE_URL}/api/organizations/${id}/members/${memberId}?confirm=true`, {
    credentials: "include",
    method: "DELETE"
  }).then((response) => {
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  });
}

export function getRoles(organizationId: string, q = "") {
  return request<RoleSummary[]>(`/api/roles${toQuery({ organizationId, q })}`);
}

export function getAuditLogs(query: AuditLogListQuery) {
  return request<{ items: AuditLogSummary[]; page: number; pageSize: number }>(
    `/api/audit-logs${toQuery({
      organizationId: query.organizationId,
      entityType: query.entityType,
      entityId: query.entityId,
      userId: query.userId,
      action: query.action,
      riskLevel: query.riskLevel,
      keyword: query.keyword,
      from: query.from,
      to: query.to,
      page: query.page ? String(query.page) : undefined,
      pageSize: query.pageSize ? String(query.pageSize) : undefined
    })}`
  );
}

export function getAuditLog(id: string) {
  return request<AuditLogDetail>(`/api/audit-logs/${id}`);
}

export function auditLogsCsvUrl(query: AuditLogListQuery) {
  return `${API_BASE_URL}/api/audit-logs/export${toQuery({
    organizationId: query.organizationId,
    entityType: query.entityType,
    entityId: query.entityId,
    userId: query.userId,
    action: query.action,
    riskLevel: query.riskLevel,
    keyword: query.keyword,
    from: query.from,
    to: query.to
  })}`;
}

export function getRiskEvents(organizationId: string) {
  return request<AuditLogSummary[]>(`/api/security/risk-events${toQuery({ organizationId })}`);
}

export function getRole(id: string) {
  return request<RoleSummary>(`/api/roles/${id}`);
}

export function createRole(payload: RoleUpsertRequest) {
  return request<RoleSummary>("/api/roles", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateRole(id: string, payload: RoleUpdateRequest) {
  return request<RoleSummary>(`/api/roles/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function deleteRole(id: string) {
  return fetch(`${API_BASE_URL}/api/roles/${id}`, {
    credentials: "include",
    method: "DELETE"
  }).then((response) => {
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  });
}

export function getProduct(id: string) {
  return request<ProductDetail>(`/api/products/${id}`);
}

export function createProduct(payload: ProductUpsertRequest) {
  return request<ProductDetail>("/api/products", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateProduct(id: string, payload: Partial<ProductUpsertRequest>) {
  return request<ProductDetail>(`/api/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function deleteProduct(id: string) {
  return fetch(`${API_BASE_URL}/api/products/${id}`, {
    credentials: "include",
    method: "DELETE"
  }).then((response) => {
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  });
}

export function generateQuote(payload: QuoteGenerateRequest) {
  return request<QuoteResponse>("/api/quotes/generate", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function saveQuote(payload: QuoteSaveRequest) {
  return request<QuoteResponse>("/api/quotes", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getQuotes(customerId?: string) {
  return request<QuoteResponse[]>(`/api/quotes${toQuery({ customerId })}`);
}

export function getCustomerQuotes(customerId: string) {
  return request<QuoteResponse[]>(`/api/quotes/customer/${customerId}`);
}

export function getQuote(id: string) {
  return request<QuoteResponse>(`/api/quotes/${id}`);
}

export function updateQuote(id: string, payload: Partial<QuoteSaveRequest>) {
  return request<QuoteResponse>(`/api/quotes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function deleteQuote(id: string) {
  return fetch(`${API_BASE_URL}/api/quotes/${id}`, {
    credentials: "include",
    method: "DELETE"
  }).then((response) => {
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  });
}

export function getFollowUps(query: FollowUpListQuery = {}) {
  return request<FollowUpSummary[]>(
    `/api/follow-ups${toQuery({ customerId: query.customerId, status: query.status, scope: query.scope })}`
  );
}

export function getFollowUp(id: string) {
  return request<FollowUpDetail>(`/api/follow-ups/${id}`);
}

export function createFollowUp(payload: FollowUpUpsertRequest) {
  return request<FollowUpDetail>("/api/follow-ups", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateFollowUp(id: string, payload: Partial<FollowUpUpsertRequest>) {
  return request<FollowUpDetail>(`/api/follow-ups/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function completeFollowUp(id: string) {
  return request<FollowUpDetail>(`/api/follow-ups/${id}/complete`, { method: "POST" });
}

export function cancelFollowUp(id: string) {
  return request<FollowUpDetail>(`/api/follow-ups/${id}/cancel`, { method: "POST" });
}

export function deleteFollowUp(id: string) {
  return fetch(`${API_BASE_URL}/api/follow-ups/${id}`, {
    credentials: "include",
    method: "DELETE"
  }).then((response) => {
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  });
}

export function getWorkbenchDashboard() {
  return request<WorkbenchDashboard>("/api/follow-ups/dashboard");
}

export function generateFollowUpScript(payload: { taskType: string }) {
  return request<{ taskType: string; recommendedScript: string; riskWarnings: string[] }>("/api/follow-ups/script", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function generateDraft(payload: GenerateDraftRequest) {
  return request<GenerateDraftResponse>("/api/ai/draft", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getKnowledgeBase(query: KnowledgeBaseListQuery = {}) {
  return request<KnowledgeBaseSummary[]>(
    `/api/knowledge-base${toQuery({ category: query.category, language: query.language, productId: query.productId, q: query.q })}`
  );
}

export function getKnowledgeBaseItem(id: string) {
  return request<KnowledgeBaseDetail>(`/api/knowledge-base/${id}`);
}

export function createKnowledgeBaseItem(payload: KnowledgeBaseUpsertRequest) {
  return request<KnowledgeBaseDetail>("/api/knowledge-base", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateKnowledgeBaseItem(id: string, payload: Partial<KnowledgeBaseUpsertRequest>) {
  return request<KnowledgeBaseDetail>(`/api/knowledge-base/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function enableKnowledgeBaseItem(id: string) {
  return request<KnowledgeBaseDetail>(`/api/knowledge-base/${id}/enable`, { method: "POST" });
}

export function disableKnowledgeBaseItem(id: string) {
  return request<KnowledgeBaseDetail>(`/api/knowledge-base/${id}/disable`, { method: "POST" });
}

export function deleteKnowledgeBaseItem(id: string) {
  return fetch(`${API_BASE_URL}/api/knowledge-base/${id}`, {
    credentials: "include",
    method: "DELETE"
  }).then((response) => {
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  });
}

export function getOrgKnowledgeBase(query: KnowledgeBaseOrgListQuery) {
  return request<KnowledgeBaseOrgSummary[]>(
    `/api/knowledge-base/org${toQuery({ organizationId: query.organizationId, category: query.category, language: query.language, q: query.q })}`
  );
}

export function getOrgKnowledgeBaseItem(id: string) {
  return request<KnowledgeBaseOrgDetail>(`/api/knowledge-base/org/${id}`);
}

export function createOrgKnowledgeBaseItem(payload: KnowledgeBaseOrgUpsertRequest) {
  return request<KnowledgeBaseOrgDetail>("/api/knowledge-base/org", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateOrgKnowledgeBaseItem(id: string, payload: Partial<KnowledgeBaseOrgUpsertRequest>) {
  return request<KnowledgeBaseOrgDetail>(`/api/knowledge-base/org/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function deleteOrgKnowledgeBaseItem(id: string) {
  return fetch(`${API_BASE_URL}/api/knowledge-base/org/${id}`, {
    credentials: "include",
    method: "DELETE"
  }).then((response) => {
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  });
}

export function getOrgScripts(query: ScriptOrgListQuery) {
  return request<ScriptOrgSummary[]>(
    `/api/scripts/org${toQuery({ organizationId: query.organizationId, category: query.category, language: query.language, q: query.q })}`
  );
}

export function getOrgScript(id: string) {
  return request<ScriptOrgDetail>(`/api/scripts/org/${id}`);
}

export function createOrgScript(payload: ScriptOrgUpsertRequest) {
  return request<ScriptOrgDetail>("/api/scripts/org", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateOrgScript(id: string, payload: Partial<ScriptOrgUpsertRequest>) {
  return request<ScriptOrgDetail>(`/api/scripts/org/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function deleteOrgScript(id: string) {
  return fetch(`${API_BASE_URL}/api/scripts/org/${id}`, {
    credentials: "include",
    method: "DELETE"
  }).then((response) => {
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  });
}

export function getMaterials(query: MaterialListQuery = {}) {
  return request<MaterialSummary[]>(
    `/api/materials${toQuery({ q: query.q, type: query.type, language: query.language, productId: query.productId, tag: query.tag })}`
  );
}

export function getOrganizationMaterials(query: OrganizationMaterialListQuery) {
  return request<OrganizationMaterialSummary[]>(
    `/api/materials/org${toQuery({ organizationId: query.organizationId, q: query.q, type: query.type, productSku: query.productSku })}`
  );
}

export function getOrganizationMaterial(id: string) {
  return request<OrganizationMaterialDetail>(`/api/materials/org/${id}`);
}

export function createOrganizationMaterial(payload: OrganizationMaterialCreateRequest) {
  return request<OrganizationMaterialDetail>("/api/materials/org", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateOrganizationMaterial(id: string, payload: Partial<MaterialUpsertRequest>) {
  return request<OrganizationMaterialDetail>(`/api/materials/org/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function deleteOrganizationMaterial(id: string) {
  return fetch(`${API_BASE_URL}/api/materials/org/${id}`, {
    credentials: "include",
    method: "DELETE"
  }).then((response) => {
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  });
}

export function getMaterial(id: string) {
  return request<MaterialDetail>(`/api/materials/${id}`);
}

export function createMaterial(payload: MaterialUpsertRequest) {
  return request<MaterialDetail>("/api/materials", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateMaterial(id: string, payload: Partial<MaterialUpsertRequest>) {
  return request<MaterialDetail>(`/api/materials/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function deleteMaterial(id: string) {
  return fetch(`${API_BASE_URL}/api/materials/${id}`, {
    credentials: "include",
    method: "DELETE"
  }).then((response) => {
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  });
}

export function generateMaterialIntro(id: string, payload: MaterialIntroRequest) {
  return request<MaterialIntroResponse>(`/api/materials/${id}/intro`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getSampleOrders(query: SampleOrderListQuery = {}) {
  return request<SampleOrderSummary[]>(
    `/api/sample-orders${toQuery({
      q: query.q,
      customerId: query.customerId,
      productId: query.productId,
      paymentStatus: query.paymentStatus,
      shippingStatus: query.shippingStatus,
      feedbackStatus: query.feedbackStatus
    })}`
  );
}

export function getSampleOrder(id: string) {
  return request<SampleOrderDetail>(`/api/sample-orders/${id}`);
}

export function createSampleOrder(payload: SampleOrderUpsertRequest) {
  return request<SampleOrderDetail>("/api/sample-orders", { method: "POST", body: JSON.stringify(payload) });
}

export function updateSampleOrder(id: string, payload: Partial<SampleOrderUpsertRequest>) {
  return request<SampleOrderDetail>(`/api/sample-orders/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteSampleOrder(id: string) {
  return fetch(`${API_BASE_URL}/api/sample-orders/${id}`, { credentials: "include", method: "DELETE" }).then((response) => {
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  });
}

export function updateSamplePaymentStatus(id: string, paymentStatus: SamplePaymentStatus) {
  return request<SampleOrderDetail>(`/api/sample-orders/${id}/payment-status`, { method: "PATCH", body: JSON.stringify({ paymentStatus }) });
}

export function updateSampleShippingStatus(id: string, shippingStatus: SampleShippingStatus) {
  return request<SampleOrderDetail>(`/api/sample-orders/${id}/shipping-status`, { method: "PATCH", body: JSON.stringify({ shippingStatus }) });
}

export function updateSampleFeedbackStatus(id: string, feedbackStatus: SampleFeedbackStatus) {
  return request<SampleOrderDetail>(`/api/sample-orders/${id}/feedback-status`, { method: "PATCH", body: JSON.stringify({ feedbackStatus }) });
}

export function generateSampleScript(id: string, payload: SampleScriptRequest) {
  return request<SampleScriptResponse>(`/api/sample-orders/${id}/script`, { method: "POST", body: JSON.stringify(payload) });
}

export function getCustomRequests(query: CustomRequestListQuery = {}) {
  return request<CustomRequestSummary[]>(
    `/api/custom-requests${toQuery({
      q: query.q,
      customerId: query.customerId,
      productId: query.productId,
      requestType: query.requestType,
      status: query.status
    })}`
  );
}

export function getCustomRequest(id: string) {
  return request<CustomRequestDetail>(`/api/custom-requests/${id}`);
}

export function createCustomRequest(payload: CustomRequestUpsertRequest) {
  return request<CustomRequestDetail>("/api/custom-requests", { method: "POST", body: JSON.stringify(payload) });
}

export function updateCustomRequest(id: string, payload: Partial<CustomRequestUpsertRequest>) {
  return request<CustomRequestDetail>(`/api/custom-requests/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteCustomRequest(id: string) {
  return fetch(`${API_BASE_URL}/api/custom-requests/${id}`, { credentials: "include", method: "DELETE" }).then((response) => {
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  });
}

export function updateCustomRequestStatus(id: string, status: CustomRequestStatus) {
  return request<CustomRequestDetail>(`/api/custom-requests/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
}

export function generateCustomScript(id: string, payload: CustomScriptRequest) {
  return request<CustomScriptResponse>(`/api/custom-requests/${id}/script`, { method: "POST", body: JSON.stringify(payload) });
}

export type ImportExportType = "customers" | "products" | "knowledge-base" | "materials" | "sample-orders" | "custom-requests";
export type OrganizationImportExportType = "customer" | "product" | "material" | "knowledge" | "script";

export type CsvImportResult = {
  totalRows: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  dryRun: boolean;
  errors: Array<{ row: number; field: string; message: string }>;
};

export type OrganizationImportJob = {
  id: string;
  organizationId: string;
  type: OrganizationImportExportType;
  filePath: string;
  dryRun: boolean;
  status: "pending" | "processing" | "completed" | "failed";
  result?: CsvImportResult | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationExportJob = {
  id: string;
  organizationId: string;
  type: OrganizationImportExportType;
  filePath: string;
  status: "pending" | "processing" | "completed" | "failed";
  filters?: unknown;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export function importCsv(type: ImportExportType, file: File, options: { dryRun?: boolean; skipDuplicates?: boolean; organizationId?: string } = {}) {
  const form = new FormData();
  form.append("file", file);
  return fetch(
    `${API_BASE_URL}/api/import/${type}${toQuery({
      dryRun: options.dryRun ? "true" : "false",
      skipDuplicates: options.skipDuplicates === false ? "false" : "true",
      organizationId: options.organizationId
    })}`,
    { method: "POST", credentials: "include", body: form }
  ).then(async (response) => {
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return response.json() as Promise<CsvImportResult>;
  });
}

export function importOrganizationCsv(type: OrganizationImportExportType, file: File, options: { organizationId: string; dryRun?: boolean; skipDuplicates?: boolean }) {
  const form = new FormData();
  form.append("file", file);
  return fetch(
    `${API_BASE_URL}/api/import/${type}${toQuery({
      organizationId: options.organizationId,
      dryRun: options.dryRun ? "true" : "false",
      skipDuplicates: options.skipDuplicates === false ? "false" : "true"
    })}`,
    { method: "POST", credentials: "include", body: form }
  ).then(async (response) => {
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return response.json() as Promise<{ job: OrganizationImportJob; result: CsvImportResult }>;
  });
}

export function getOrganizationImportJob(id: string) {
  return request<OrganizationImportJob>(`/api/import/${id}/status`);
}

export function createOrganizationExportJob(type: OrganizationImportExportType, organizationId: string, filters: Record<string, unknown> = {}, fieldsScope: "normal" | "sensitive" = "normal") {
  return request<{ job: OrganizationExportJob; downloadUrl: string; fieldsScope: string; riskWarnings: string[] }>(
    `/api/export/${type}${toQuery({ organizationId })}`,
    { method: "POST", body: JSON.stringify({ filters, fieldsScope, confirm: fieldsScope === "sensitive" }) }
  );
}

export function getOrganizationExportJob(id: string) {
  return request<OrganizationExportJob>(`/api/export/${id}/status`);
}

export function exportCsvUrl(type: ImportExportType) {
  return `${API_BASE_URL}/api/export/${type}`;
}

export function templateCsvUrl(type: ImportExportType) {
  return `${API_BASE_URL}/api/import/templates/${type}`;
}

export function getCustomerPredictions(query: CustomerPredictionListQuery = {}) {
  return request<CustomerPredictionSummary[]>(
    `/api/predictions/customers${toQuery({
      predictionType: query.predictionType,
      level: query.level,
      status: query.status,
      assignedTo: query.assignedTo,
      organizationId: query.organizationId,
      page: query.page,
      pageSize: query.pageSize
    })}`
  );
}

export function recalculatePredictions(payload: CustomerPredictionRecalculateRequest) {
  return request<CustomerPredictionRecalculateResponse>("/api/predictions/customers/recalculate", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateCustomerPrediction(id: string, status: string) {
  return request<CustomerPredictionSummary>(`/api/predictions/customers/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}

export function getProductOpportunities(query: { organizationId?: string; productId?: string; category?: string; level?: string } = {}) {
  return request<ProductOpportunitySummary[]>(
    `/api/predictions/product-opportunities${toQuery({
      organizationId: query.organizationId,
      productId: query.productId,
      category: query.category,
      level: query.level
    })}`
  );
}

export function getReorderReminders(query: ReorderReminderListQuery = {}) {
  return request<ReorderReminderSummary[]>(
    `/api/reorder-reminders${toQuery({
      status: query.status,
      reminderType: query.reminderType,
      remindAtFrom: query.remindAtFrom,
      remindAtTo: query.remindAtTo,
      assignedTo: query.assignedTo,
      organizationId: query.organizationId,
      page: query.page,
      pageSize: query.pageSize
    })}`
  );
}

export function createReorderReminder(payload: ReorderReminderUpsertRequest) {
  return request<ReorderReminderSummary>("/api/reorder-reminders", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateReorderReminder(id: string, status: string) {
  return request<ReorderReminderSummary>(`/api/reorder-reminders/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}

export function createReorderFollowUpTask(id: string) {
  return request<{ followUpTask: FollowUpSummary; reminder: ReorderReminderSummary }>(`/api/reorder-reminders/${id}/create-follow-up-task`, {
    method: "POST"
  });
}

export function generateReorderScript(payload: ReorderScriptRequest) {
  return request<ReorderScriptResponse>("/api/ai/reorder-script", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getReorderOpportunities(query: ReorderOpportunityListQuery = {}) {
  return request<ReorderOpportunitySummary[]>(
    `/api/reorder/opportunities${toQuery({
      organizationId: query.organizationId,
      opportunityType: query.opportunityType,
      level: query.level,
      status: query.status,
      ownerId: query.ownerId,
      assignedTo: query.assignedTo,
      productId: query.productId,
      campaignId: query.campaignId,
      customerId: query.customerId,
      page: query.page,
      pageSize: query.pageSize
    })}`
  );
}

export function recalculateReorderOpportunities(payload: ReorderOpportunityRecalculateRequest) {
  return request<ReorderOpportunityRecalculateResponse>("/api/reorder/opportunities/recalculate", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateReorderOpportunity(id: string, status: string) {
  return request<ReorderOpportunitySummary>(`/api/reorder/opportunities/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}

export function createReorderOpportunityFollowUpTask(id: string, payload: { remindAt?: string; recommendedScript?: string; confirm: true }) {
  return request<{ followUpTask: FollowUpSummary; opportunity: ReorderOpportunitySummary }>(`/api/reorder/opportunities/${id}/create-follow-up-task`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function generateReorderOperationScript(payload: ReorderOperationScriptRequest) {
  return request<ReorderOperationScriptResponse>("/api/ai/reorder-operation-script", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getReorderCampaigns(query: { organizationId?: string; campaignType?: string; status?: string } = {}) {
  return request<ReorderCampaignSummary[]>(
    `/api/reorder/campaigns${toQuery({
      organizationId: query.organizationId,
      campaignType: query.campaignType,
      status: query.status
    })}`
  );
}

export function createReorderCampaign(payload: ReorderCampaignUpsertRequest) {
  return request<ReorderCampaignSummary>("/api/reorder/campaigns", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateReorderCampaign(id: string, payload: Partial<ReorderCampaignUpsertRequest>) {
  return request<ReorderCampaignSummary>(`/api/reorder/campaigns/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function deleteReorderCampaign(id: string) {
  return request<void>(`/api/reorder/campaigns/${id}?confirm=true`, { method: "DELETE" });
}

export function getReorderPlaybooks(query: { organizationId?: string; scenario?: string; language?: string } = {}) {
  return request<ReorderPlaybookSummary[]>(
    `/api/reorder/playbooks${toQuery({
      organizationId: query.organizationId,
      scenario: query.scenario,
      language: query.language
    })}`
  );
}

export function createReorderPlaybook(payload: ReorderPlaybookUpsertRequest) {
  return request<ReorderPlaybookSummary>("/api/reorder/playbooks", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateReorderPlaybook(id: string, payload: Partial<ReorderPlaybookUpsertRequest>) {
  return request<ReorderPlaybookSummary>(`/api/reorder/playbooks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function deleteReorderPlaybook(id: string) {
  return request<void>(`/api/reorder/playbooks/${id}?confirm=true`, { method: "DELETE" });
}

export function getOrders(query: OrderListQuery = {}) {
  return request<OrderSummary[]>(
    `/api/orders${toQuery({
      organizationId: query.organizationId,
      customerId: query.customerId,
      assignedTo: query.assignedTo,
      orderType: query.orderType,
      orderStatus: query.orderStatus,
      paymentStatus: query.paymentStatus,
      productionStatus: query.productionStatus,
      shippingStatus: query.shippingStatus,
      afterSalesStatus: query.afterSalesStatus,
      keyword: query.keyword,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      page: query.page,
      pageSize: query.pageSize
    })}`
  );
}

export function getOrder(id: string) {
  return request<OrderDetail>(`/api/orders/${id}`);
}

export function createOrder(payload: OrderUpsertRequest) {
  return request<OrderDetail>("/api/orders", { method: "POST", body: JSON.stringify(payload) });
}

export function updateOrder(id: string, payload: Partial<OrderUpsertRequest>) {
  return request<OrderDetail>(`/api/orders/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteOrder(id: string) {
  return fetch(`${API_BASE_URL}/api/orders/${id}`, {
    credentials: "include",
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirm: true })
  }).then((response) => {
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  });
}

export function createOrderFromQuote(quoteId: string) {
  return request<OrderDetail>(`/api/orders/from-quote/${quoteId}`, { method: "POST" });
}

export function createOrderFromSample(sampleOrderId: string) {
  return request<OrderDetail>(`/api/orders/from-sample/${sampleOrderId}`, { method: "POST" });
}

export function createOrderFromCustomRequest(customRequestId: string) {
  return request<OrderDetail>(`/api/orders/from-custom-request/${customRequestId}`, { method: "POST" });
}

export function updateOrderPaymentStatus(id: string, paymentStatus: string) {
  return request<OrderDetail>(`/api/orders/${id}/payment-status`, { method: "PATCH", body: JSON.stringify({ paymentStatus }) });
}

export function updateOrderProductionStatus(id: string, productionStatus: string, notes?: string) {
  return request<OrderDetail>(`/api/orders/${id}/production-status`, { method: "PATCH", body: JSON.stringify({ productionStatus, notes }) });
}

export function updateOrderShippingStatus(id: string, shippingStatus: string, trackingNumber?: string) {
  return request<OrderDetail>(`/api/orders/${id}/shipping-status`, { method: "PATCH", body: JSON.stringify({ shippingStatus, trackingNumber }) });
}

export function updateOrderAfterSalesStatus(id: string, afterSalesStatus: string) {
  return request<OrderDetail>(`/api/orders/${id}/after-sales-status`, { method: "PATCH", body: JSON.stringify({ afterSalesStatus }) });
}

export function createOrderFollowUpTask(id: string, recommendedScript?: string) {
  return request<{ followUpTask: FollowUpSummary; riskWarnings: string[] }>(`/api/orders/${id}/create-follow-up-task`, {
    method: "POST",
    body: JSON.stringify({ recommendedScript })
  });
}

export function generateOrderScript(payload: OrderScriptRequest) {
  return request<OrderScriptResponse>("/api/ai/order-script", { method: "POST", body: JSON.stringify(payload) });
}

export function getOrderFulfillmentBoard(query: Record<string, string | undefined> = {}) {
  return request<OrderFulfillmentBoardResponse>(`/api/orders/fulfillment-board${toQuery(query)}`);
}

export function getOrderFulfillment(id: string) {
  return request<OrderFulfillmentDetailResponse>(`/api/orders/${id}/fulfillment`);
}

export function recalculateOrderFulfillmentAlerts(id: string) {
  return request<{ alerts: OrderFulfillmentAlertSummary[]; createdCount: number; updatedCount: number; resolvedCount: number }>(`/api/orders/${id}/recalculate-fulfillment-alerts`, { method: "POST" });
}

export function recalculateOrganizationFulfillmentAlerts(organizationId: string) {
  return request<{ createdCount: number; updatedCount: number; resolvedCount: number; skippedCount: number }>(`/api/orders/recalculate-fulfillment-alerts`, { method: "POST", body: JSON.stringify({ organizationId }) });
}

export function updateOrderFulfillmentAlert(id: string, status: "dismissed" | "resolved" | "task_created") {
  return request<OrderFulfillmentAlertSummary>(`/api/order-fulfillment-alerts/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
}

export function createOrderFulfillmentFollowUp(id: string, payload: { taskType?: string; remindAt?: string; recommendedScript?: string; alertId?: string | null }) {
  return request<{ followUpTask: FollowUpSummary; riskWarnings: string[] }>(`/api/orders/${id}/create-fulfillment-follow-up`, { method: "POST", body: JSON.stringify(payload) });
}

export function generateOrderFulfillmentScript(payload: OrderFulfillmentScriptRequest) {
  return request<OrderScriptResponse>("/api/ai/order-fulfillment-script", { method: "POST", body: JSON.stringify(payload) });
}

export function getOrderCost(orderId: string) {
  return request<OrderCostSummary>(`/api/orders/${orderId}/cost`);
}

export function upsertOrderCost(orderId: string, payload: OrderCostUpsertRequest) {
  return request<OrderCostSummary>(`/api/orders/${orderId}/cost`, { method: "PUT", body: JSON.stringify(payload) });
}

export function confirmOrderCost(orderId: string) {
  return request<OrderCostSummary>(`/api/orders/${orderId}/cost/confirm`, { method: "PATCH", body: JSON.stringify({ confirm: true }) });
}

export function deleteOrderCost(orderId: string) {
  return fetch(`${API_BASE_URL}/api/orders/${orderId}/cost?confirm=true`, { credentials: "include", method: "DELETE" }).then((response) => {
    if (!response.ok) throw new Error("Failed to delete order cost");
    return true;
  });
}

export function getProfitOrders(query: Record<string, string | undefined> = {}) {
  return request<ProfitOrderRow[]>(`/api/profit/orders${toQuery(query)}`);
}

export function getProfitSummary(query: Record<string, string | undefined> = {}) {
  return request<ProfitSummary>(`/api/profit/summary${toQuery(query)}`);
}

export function getProfitByProduct(query: Record<string, string | undefined> = {}) {
  return request<ProfitBreakdownRow[]>(`/api/profit/by-product${toQuery(query)}`);
}

export function getProfitByCustomer(query: Record<string, string | undefined> = {}) {
  return request<ProfitBreakdownRow[]>(`/api/profit/by-customer${toQuery(query)}`);
}

export function getProfitBySalesperson(query: Record<string, string | undefined> = {}) {
  return request<ProfitBreakdownRow[]>(`/api/profit/by-salesperson${toQuery(query)}`);
}

export function generateProfitReview(payload: ProfitReviewRequest) {
  return request<ProfitReviewResponse>("/api/ai/profit-review", { method: "POST", body: JSON.stringify(payload) });
}

export function getAfterSalesCases(query: AfterSalesListQuery = {}) {
  return request<AfterSalesCaseSummary[]>(
    `/api/after-sales${toQuery({
      organizationId: query.organizationId,
      customerId: query.customerId,
      orderId: query.orderId,
      productId: query.productId,
      caseType: query.caseType,
      priority: query.priority,
      status: query.status,
      responsibility: query.responsibility,
      assignedTo: query.assignedTo,
      keyword: query.keyword,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      page: query.page ? String(query.page) : undefined,
      pageSize: query.pageSize ? String(query.pageSize) : undefined
    })}`
  );
}

export function getAfterSalesCase(id: string) {
  return request<AfterSalesCaseDetail>(`/api/after-sales/${id}`);
}

export function createAfterSalesCase(payload: AfterSalesUpsertRequest) {
  return request<AfterSalesCaseDetail>("/api/after-sales", { method: "POST", body: JSON.stringify(payload) });
}

export function updateAfterSalesCase(id: string, payload: Partial<AfterSalesUpsertRequest> & { confirm?: boolean; notes?: string }) {
  return request<AfterSalesCaseDetail>(`/api/after-sales/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteAfterSalesCase(id: string) {
  return fetch(`${API_BASE_URL}/api/after-sales/${id}?confirm=true`, { credentials: "include", method: "DELETE" }).then((response) => {
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  });
}

export function updateAfterSalesStatus(id: string, payload: { status: string; notes?: string; resolutionNotes?: string; confirm?: boolean }) {
  return request<AfterSalesCaseDetail>(`/api/after-sales/${id}/status`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function updateAfterSalesResponsibility(id: string, payload: { responsibility: string; notes?: string; confirm: true }) {
  return request<AfterSalesCaseDetail>(`/api/after-sales/${id}/responsibility`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function updateAfterSalesSolution(
  id: string,
  payload: {
    finalSolution: string;
    refundAmount?: string;
    reshipCost?: string;
    compensationAmount?: string;
    currency?: string;
    notes?: string;
    syncOrderCost?: boolean;
    confirm: true;
  }
) {
  return request<AfterSalesCaseDetail>(`/api/after-sales/${id}/solution`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function createAfterSalesFollowUpTask(id: string, payload: { remindAt?: string; taskType?: string; recommendedScript?: string; confirm: true }) {
  return request<{ followUpTask: FollowUpSummary; riskWarnings: string[] }>(`/api/after-sales/${id}/create-follow-up-task`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function generateAfterSalesScript(payload: AfterSalesScriptRequest) {
  return request<AfterSalesScriptResponse>("/api/ai/after-sales-script", { method: "POST", body: JSON.stringify(payload) });
}

export function getScriptExperiments(query: Record<string, string | undefined> = {}) {
  return request<ScriptExperimentSummary[]>(`/api/script-experiments${toQuery(query)}`);
}

export function createScriptExperiment(payload: ScriptExperimentUpsertRequest) {
  return request<ScriptExperimentSummary>("/api/script-experiments", { method: "POST", body: JSON.stringify(payload) });
}

export function getScriptExperiment(id: string) {
  return request<ScriptExperimentDetail>(`/api/script-experiments/${id}`);
}

export function updateScriptExperiment(id: string, payload: Partial<ScriptExperimentUpsertRequest>) {
  return request<ScriptExperimentSummary>(`/api/script-experiments/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function archiveScriptExperiment(id: string) {
  return request<ScriptExperimentSummary>(`/api/script-experiments/${id}?confirm=true`, { method: "DELETE" });
}

export function createScriptVariant(experimentId: string, payload: ScriptVariantUpsertRequest) {
  return request<ScriptVariantSummary>(`/api/script-experiments/${experimentId}/variants`, { method: "POST", body: JSON.stringify(payload) });
}

export function updateScriptVariant(id: string, payload: Partial<ScriptVariantUpsertRequest>) {
  return request<ScriptVariantSummary>(`/api/script-variants/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteScriptVariant(id: string) {
  return request<ScriptVariantSummary | { deleted: true }>(`/api/script-variants/${id}?confirm=true`, { method: "DELETE" });
}

export function createScriptUsage(payload: ScriptUsageCreateRequest) {
  return request<ScriptUsageSummary & { usageId: string }>("/api/script-usages", { method: "POST", body: JSON.stringify(payload) });
}

export function updateScriptUsageOutcome(id: string, payload: ScriptUsageOutcomeRequest) {
  return request<ScriptUsageSummary>(`/api/script-usages/${id}/outcome`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function getScriptExperimentStats(id: string) {
  return request<ScriptExperimentStats>(`/api/script-experiments/${id}/stats`);
}

export function generateScriptExperimentVariants(payload: ScriptVariantGenerationRequest) {
  return request<ScriptVariantGenerationResponse>("/api/ai/script-experiments/generate-variants", { method: "POST", body: JSON.stringify(payload) });
}

export function getSuppliers(query: Record<string, string | undefined> = {}) {
  return request<any[]>(`/api/suppliers${toQuery(query)}`);
}

export function getSupplier(id: string) {
  return request<any>(`/api/suppliers/${id}`);
}

export function createSupplier(payload: Record<string, unknown>) {
  return request<any>("/api/suppliers", { method: "POST", body: JSON.stringify(payload) });
}

export function updateSupplier(id: string, payload: Record<string, unknown>) {
  return request<any>(`/api/suppliers/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteSupplier(id: string) {
  return request<any>(`/api/suppliers/${id}?confirm=true`, { method: "DELETE" });
}

export function createSupplierContact(supplierId: string, payload: Record<string, unknown>) {
  return request<any>(`/api/suppliers/${supplierId}/contacts`, { method: "POST", body: JSON.stringify(payload) });
}

export function createSupplierQuote(payload: Record<string, unknown>) {
  return request<any>("/api/supplier-quotes", { method: "POST", body: JSON.stringify(payload) });
}

export function applySupplierQuoteToOrderCost(id: string, payload: Record<string, unknown>) {
  return request<any>(`/api/supplier-quotes/${id}/apply-to-order-cost`, { method: "POST", body: JSON.stringify({ ...payload, confirm: true }) });
}

export function createPurchaseNote(payload: Record<string, unknown>) {
  return request<any>("/api/purchase-notes", { method: "POST", body: JSON.stringify(payload) });
}

export function createSupplierRisk(payload: Record<string, unknown>) {
  return request<any>("/api/supplier-risks", { method: "POST", body: JSON.stringify(payload) });
}

export function generateSupplierScript(payload: Record<string, unknown>) {
  return request<any>("/api/ai/supplier-script", { method: "POST", body: JSON.stringify(payload) });
}

export function getBrands(query: Record<string, string | undefined> = {}) {
  return request<any[]>(`/api/brands${toQuery(query)}`);
}

export function getBrand(id: string) {
  return request<any>(`/api/brands/${id}`);
}

export function createBrand(payload: Record<string, unknown>) {
  return request<any>("/api/brands", { method: "POST", body: JSON.stringify(payload) });
}

export function updateBrand(id: string, payload: Record<string, unknown>) {
  return request<any>(`/api/brands/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function archiveBrand(id: string) {
  return request<any>(`/api/brands/${id}?confirm=true`, { method: "DELETE" });
}

export function linkBrandProduct(brandId: string, productId: string) {
  return request<any>(`/api/brands/${brandId}/products`, { method: "POST", body: JSON.stringify({ productId }) });
}

export function unlinkBrandProduct(id: string) {
  return request<any>(`/api/brand-products/${id}?confirm=true`, { method: "DELETE" });
}

export function linkBrandMaterial(brandId: string, materialId: string) {
  return request<any>(`/api/brands/${brandId}/materials`, { method: "POST", body: JSON.stringify({ materialId }) });
}

export function unlinkBrandMaterial(id: string) {
  return request<any>(`/api/brand-materials/${id}?confirm=true`, { method: "DELETE" });
}

export function linkBrandKnowledgeBase(brandId: string, knowledgeBaseId: string) {
  return request<any>(`/api/brands/${brandId}/knowledge-bases`, { method: "POST", body: JSON.stringify({ knowledgeBaseId }) });
}

export function unlinkBrandKnowledgeBase(id: string) {
  return request<any>(`/api/brand-knowledge-bases/${id}?confirm=true`, { method: "DELETE" });
}

export function linkBrandScript(brandId: string, payload: Record<string, unknown>) {
  return request<any>(`/api/brands/${brandId}/scripts`, { method: "POST", body: JSON.stringify(payload) });
}

export function unlinkBrandScript(id: string) {
  return request<any>(`/api/brand-scripts/${id}?confirm=true`, { method: "DELETE" });
}

export function createBrandRule(brandId: string, payload: Record<string, unknown>) {
  return request<any>(`/api/brands/${brandId}/rules`, { method: "POST", body: JSON.stringify(payload) });
}

export function updateBrandRule(id: string, payload: Record<string, unknown>) {
  return request<any>(`/api/brand-rules/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteBrandRule(id: string) {
  return request<any>(`/api/brand-rules/${id}?confirm=true`, { method: "DELETE" });
}

export function assignBrand(brandId: string, payload: Record<string, unknown>) {
  return request<any>(`/api/brands/${brandId}/assign`, { method: "POST", body: JSON.stringify({ ...payload, confirm: true }) });
}

export function getBrandContext(query: Record<string, string | undefined> = {}) {
  return request<any>(`/api/brands/context${toQuery(query)}`);
}

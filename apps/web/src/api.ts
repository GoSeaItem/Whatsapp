import type {
  AuthResponse,
  AuthUser,
  AuditLogDetail,
  AuditLogListQuery,
  AuditLogSummary,
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
  CustomerSummary,
  CustomerUpsertRequest,
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
  ProductDetail,
  ProductListQuery,
  ProductSummary,
  ProductUpsertRequest,
  QuoteGenerateRequest,
  QuoteResponse,
  QuoteSaveRequest,
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
  return fetch(`${API_BASE_URL}/api/organizations/${id}/members/${memberId}`, {
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
      userId: query.userId,
      action: query.action,
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
  return `${API_BASE_URL}/api/audit-logs${toQuery({
    organizationId: query.organizationId,
    entityType: query.entityType,
    userId: query.userId,
    action: query.action,
    from: query.from,
    to: query.to,
    format: "csv"
  })}`;
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

export type CsvImportResult = {
  totalRows: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  dryRun: boolean;
  errors: Array<{ row: number; field: string; message: string }>;
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

export function exportCsvUrl(type: ImportExportType) {
  return `${API_BASE_URL}/api/export/${type}`;
}

export function templateCsvUrl(type: ImportExportType) {
  return `${API_BASE_URL}/api/import/templates/${type}`;
}

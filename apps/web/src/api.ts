import type {
  AuthResponse,
  AuthUser,
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
  KnowledgeBaseSummary,
  KnowledgeBaseUpsertRequest,
  MaterialDetail,
  MaterialIntroRequest,
  MaterialIntroResponse,
  MaterialListQuery,
  MaterialSummary,
  MaterialUpsertRequest,
  ProductDetail,
  ProductListQuery,
  ProductSummary,
  ProductUpsertRequest,
  QuoteGenerateRequest,
  QuoteResponse,
  QuoteSaveRequest,
  SampleFeedbackStatus,
  SampleOrderDetail,
  SampleOrderListQuery,
  SampleOrderSummary,
  SampleOrderUpsertRequest,
  SamplePaymentStatus,
  SampleScriptRequest,
  SampleScriptResponse,
  SampleShippingStatus,
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
    `/api/customers${toQuery({ tag: query.tag, stage: query.stage, q: query.q, sort: query.sort, intentLevel: query.intentLevel })}`
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

export function getMaterials(query: MaterialListQuery = {}) {
  return request<MaterialSummary[]>(
    `/api/materials${toQuery({ q: query.q, type: query.type, language: query.language, productId: query.productId, tag: query.tag })}`
  );
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

export function importCsv(type: ImportExportType, file: File, options: { dryRun?: boolean; skipDuplicates?: boolean } = {}) {
  const form = new FormData();
  form.append("file", file);
  return fetch(
    `${API_BASE_URL}/api/import/${type}${toQuery({
      dryRun: options.dryRun ? "true" : "false",
      skipDuplicates: options.skipDuplicates === false ? "false" : "true"
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

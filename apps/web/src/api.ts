import type {
  AuthResponse,
  AuthUser,
  CustomerDetail,
  CustomerListQuery,
  CustomerSummary,
  CustomerUpsertRequest,
  FollowUpDetail,
  FollowUpListQuery,
  FollowUpSummary,
  FollowUpUpsertRequest,
  GenerateDraftRequest,
  GenerateDraftResponse,
  ProductDetail,
  ProductListQuery,
  ProductSummary,
  ProductUpsertRequest,
  QuoteGenerateRequest,
  QuoteResponse,
  QuoteSaveRequest,
  WorkbenchDashboard
} from "@wa-ai/shared";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

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
    `/api/customers${toQuery({ tag: query.tag, stage: query.stage, q: query.q })}`
  );
}

export function getCustomer(id: string) {
  return request<CustomerDetail>(`/api/customers/${id}`);
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

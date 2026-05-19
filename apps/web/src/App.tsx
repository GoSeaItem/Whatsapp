import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  AI_SAFETY_NOTE,
  CUSTOM_REQUEST_STATUSES,
  CUSTOM_REQUEST_TYPES,
  CUSTOM_SCRIPT_SCENARIOS,
  KNOWLEDGE_BASE_CATEGORIES,
  KNOWLEDGE_BASE_LANGUAGES,
  MATERIAL_LANGUAGES,
  MATERIAL_TYPES,
  SAMPLE_FEEDBACK_STATUSES,
  SAMPLE_PAYMENT_STATUSES,
  SAMPLE_SCRIPT_SCENARIOS,
  SAMPLE_SHIPPING_STATUSES,
  type CustomRequestStatus,
  type CustomRequestSummary,
  type CustomRequestType,
  type CustomRequestUpsertRequest,
  type CustomScriptScenario,
  type CustomerIntentResponse,
  type CustomerSummary,
  type CustomerUpsertRequest,
  type FollowUpSummary,
  type FollowUpTaskType,
  type KnowledgeBaseCategory,
  type KnowledgeBaseLanguage,
  type KnowledgeBaseSummary,
  type KnowledgeBaseUpsertRequest,
  type MaterialLanguage,
  type MaterialSummary,
  type MaterialType,
  type MaterialUpsertRequest,
  type ProductSummary,
  type ProductUpsertRequest,
  type QuoteGenerateRequest,
  type QuoteResponse,
  type SampleFeedbackStatus,
  type SampleOrderSummary,
  type SampleOrderUpsertRequest,
  type SamplePaymentStatus,
  type SampleScriptScenario,
  type SampleShippingStatus,
  type WorkbenchDashboard
} from "@wa-ai/shared";
import {
  completeFollowUp,
  createCustomRequest,
  createCustomer,
  createFollowUp,
  createKnowledgeBaseItem,
  createMaterial,
  createProduct,
  createSampleOrder,
  deleteCustomRequest,
  deleteCustomer,
  deleteKnowledgeBaseItem,
  deleteMaterial,
  deleteProduct,
  deleteSampleOrder,
  disableKnowledgeBaseItem,
  enableKnowledgeBaseItem,
  generateCustomScript,
  generateMaterialIntro,
  generateQuote,
  generateSampleScript,
  importCsv,
  getCustomRequest,
  getCustomRequests,
  getCustomer,
  getCustomerIntent,
  getCustomerQuotes,
  getCustomers,
  getFollowUps,
  getHighIntentCustomers,
  getKnowledgeBase,
  getKnowledgeBaseItem,
  getMaterials,
  getMe,
  getProducts,
  getSampleOrder,
  getSampleOrders,
  getWorkbenchDashboard,
  login,
  logout,
  recalculateCustomerIntent,
  saveQuote,
  updateCustomRequest,
  updateCustomer,
  updateKnowledgeBaseItem,
  updateMaterial,
  updateProduct,
  updateSampleOrder,
  type AuthUser
} from "./api";
import type { CsvImportResult, ImportExportType } from "./api";
import { exportCsvUrl, templateCsvUrl } from "./api";

type View = "dashboard" | "customers" | "products" | "quotes" | "knowledge" | "materials" | "samples" | "custom" | "importExport";
type CustomerFilters = { q: string; tag: string; stage: string; sort: "" | "intentScore"; intentLevel: "" | "low" | "medium" | "high" };
type ProductFilters = { q: string; category: string };
type KnowledgeFilters = { q: string; category: string; language: string; productId: string };
type MaterialFilters = { q: string; type: string; language: string; productId: string; tag: string };
type SampleFilters = { q: string; customerId: string; productId: string; paymentStatus: string; shippingStatus: string; feedbackStatus: string };
type CustomFilters = { q: string; customerId: string; productId: string; requestType: string; status: string };

type CustomerForm = {
  name: string;
  whatsappNumber: string;
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

type QuoteForm = {
  customerId: string;
  productId: string;
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

type MaterialForm = {
  title: string;
  type: MaterialType;
  url: string;
  description: string;
  language: MaterialLanguage;
  productId: string;
  tags: string;
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

const CUSTOMER_TAGS = ["新客户", "高意向", "已报价", "待付款", "已成交", "售后中", "老客户", "无效客户", "需要跟进"];
const CUSTOMER_STAGES = ["新线索", "已沟通需求", "已推荐产品", "已报价", "待付款", "已成交", "待复购", "无效客户"];
const FOLLOW_UP_TYPES = ["报价后跟进", "催付款", "样品反馈", "老客户复购", "售后跟进", "普通提醒"] as FollowUpTaskType[];
const IMPORT_EXPORT_TYPES: ImportExportType[] = ["customers", "products", "knowledge-base", "materials", "sample-orders", "custom-requests"];

const emptyCustomerFilters: CustomerFilters = { q: "", tag: "", stage: "", sort: "", intentLevel: "" };
const emptyProductFilters: ProductFilters = { q: "", category: "" };
const emptyKnowledgeFilters: KnowledgeFilters = { q: "", category: "", language: "", productId: "" };
const emptyMaterialFilters: MaterialFilters = { q: "", type: "", language: "", productId: "", tag: "" };
const emptySampleFilters: SampleFilters = { q: "", customerId: "", productId: "", paymentStatus: "", shippingStatus: "", feedbackStatus: "" };
const emptyCustomFilters: CustomFilters = { q: "", customerId: "", productId: "", requestType: "", status: "" };

const emptyCustomerForm: CustomerForm = {
  name: "",
  whatsappNumber: "",
  country: "",
  language: "English",
  tags: "新客户",
  stage: "新线索",
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

const emptyQuoteForm: QuoteForm = {
  customerId: "",
  productId: "",
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

const emptyMaterialForm: MaterialForm = {
  title: "",
  type: "image",
  url: "",
  description: "",
  language: "other",
  productId: "",
  tags: ""
};

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

export function App() {
  const [view, setView] = useState<View>("dashboard");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });

  const [dashboard, setDashboard] = useState<WorkbenchDashboard | null>(null);
  const [highIntent, setHighIntent] = useState<CustomerSummary[]>([]);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseSummary[]>([]);
  const [materials, setMaterials] = useState<MaterialSummary[]>([]);
  const [sampleOrders, setSampleOrders] = useState<SampleOrderSummary[]>([]);
  const [customRequests, setCustomRequests] = useState<CustomRequestSummary[]>([]);

  const [customerFilters, setCustomerFilters] = useState<CustomerFilters>(emptyCustomerFilters);
  const [productFilters, setProductFilters] = useState<ProductFilters>(emptyProductFilters);
  const [knowledgeFilters, setKnowledgeFilters] = useState<KnowledgeFilters>(emptyKnowledgeFilters);
  const [materialFilters, setMaterialFilters] = useState<MaterialFilters>(emptyMaterialFilters);
  const [sampleFilters, setSampleFilters] = useState<SampleFilters>(emptySampleFilters);
  const [customFilters, setCustomFilters] = useState<CustomFilters>(emptyCustomFilters);

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState("");
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [selectedSampleOrderId, setSelectedSampleOrderId] = useState("");
  const [selectedCustomRequestId, setSelectedCustomRequestId] = useState("");

  const [customerForm, setCustomerForm] = useState<CustomerForm>(emptyCustomerForm);
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm);
  const [quoteForm, setQuoteForm] = useState<QuoteForm>(emptyQuoteForm);
  const [knowledgeForm, setKnowledgeForm] = useState<KnowledgeForm>(emptyKnowledgeForm);
  const [materialForm, setMaterialForm] = useState<MaterialForm>(emptyMaterialForm);
  const [sampleForm, setSampleForm] = useState<SampleForm>(emptySampleForm);
  const [customForm, setCustomForm] = useState<CustomForm>(emptyCustomForm);

  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [customerQuotes, setCustomerQuotes] = useState<QuoteResponse[]>([]);
  const [customerFollowUps, setCustomerFollowUps] = useState<FollowUpSummary[]>([]);
  const [customerSampleOrders, setCustomerSampleOrders] = useState<SampleOrderSummary[]>([]);
  const [customerCustomRequests, setCustomerCustomRequests] = useState<CustomRequestSummary[]>([]);
  const [customerIntent, setCustomerIntent] = useState<CustomerIntentResponse | null>(null);
  const [importType, setImportType] = useState<ImportExportType>("customers");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<CsvImportResult | null>(null);

  const selectedCustomer = useMemo(() => customers.find((item) => item.id === selectedCustomerId), [customers, selectedCustomerId]);
  const selectedProduct = useMemo(() => products.find((item) => item.id === selectedProductId), [products, selectedProductId]);

  useEffect(() => {
    void loadCurrentUser();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    void refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  async function refreshAll() {
    await Promise.all([loadDashboard(), loadCustomers(), loadProducts(), loadKnowledgeBase(), loadMaterials(), loadSampleOrders(), loadCustomRequests()]);
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
    setCustomers([]);
    setProducts([]);
    setKnowledgeBase([]);
    setMaterials([]);
    setSampleOrders([]);
    setCustomRequests([]);
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

  async function selectCustomer(id: string, source = customers) {
    setSelectedCustomerId(id);
    setQuoteForm((form) => ({ ...form, customerId: id }));
    setSampleForm((form) => ({ ...form, customerId: id }));
    setCustomForm((form) => ({ ...form, customerId: id }));
    try {
      const [detail, quotes, followUps, samples, customItems, intent] = await Promise.all([
        getCustomer(id),
        getCustomerQuotes(id),
        getFollowUps({ customerId: id }),
        getSampleOrders({ customerId: id }),
        getCustomRequests({ customerId: id }),
        getCustomerIntent(id)
      ]);
      setCustomerForm(toCustomerForm(detail));
      setCustomerQuotes(quotes);
      setCustomerFollowUps(followUps);
      setCustomerSampleOrders(samples);
      setCustomerCustomRequests(customItems);
      setCustomerIntent(intent);
    } catch {
      const fallback = source.find((item) => item.id === id);
      if (fallback) setCustomerForm(toCustomerForm(fallback));
      setCustomerQuotes([]);
      setCustomerSampleOrders([]);
      setCustomerCustomRequests([]);
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
  }

  async function saveCustomerRecord() {
    if (!customerForm.name.trim()) return setStatus("Customer name is required.");
    setLoading(true);
    try {
      const saved = selectedCustomerId
        ? await updateCustomer(selectedCustomerId, toCustomerPayload(customerForm))
        : await createCustomer(toCustomerPayload(customerForm));
      setSelectedCustomerId(saved.id);
      setCustomerForm(toCustomerForm(saved));
      await loadCustomers(customerFilters);
      await selectCustomer(saved.id);
      setStatus("Customer saved.");
    } catch {
      setStatus("Customer save failed.");
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
          <p>Sign in to manage your own customers, products, quotes, follow-ups and V2 custom workflow.</p>
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
            <h1>AI Sales Assistant</h1>
            <p>V2 internal build</p>
          </div>
        </div>
        <nav className="nav-list">
          {navButton("dashboard", "Home")}
          {navButton("customers", "Customers")}
          {navButton("products", "Products")}
          {navButton("quotes", "Quotes")}
          {navButton("knowledge", "Knowledge")}
          {navButton("materials", "Materials")}
          {navButton("samples", "Samples")}
          {navButton("custom", "Custom")}
          {navButton("importExport", "Import / Export")}
        </nav>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Current user: {currentUser.email}</p>
            <h2>{titleForView(view)}</h2>
            <p>{status}</p>
          </div>
          <div className="topbar-actions">
            <span className="user-chip">{currentUser.name || currentUser.email}</span>
            <button className="secondary-button" onClick={refreshAll} disabled={loading}>Refresh</button>
            <button className="secondary-button" onClick={handleLogout}>Logout</button>
          </div>
        </header>
        <div className="safety-note">{AI_SAFETY_NOTE} All generated text is draft only. 复制后由业务员手动发送。The system never sends WhatsApp messages automatically.</div>
        {view === "dashboard" && renderDashboard()}
        {view === "customers" && renderCustomers()}
        {view === "products" && renderProducts()}
        {view === "quotes" && renderQuotes()}
        {view === "knowledge" && renderKnowledge()}
        {view === "materials" && renderMaterials()}
        {view === "samples" && renderSamples()}
        {view === "custom" && renderCustom()}
        {view === "importExport" && renderImportExport()}
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
        </section>
      </>
    );
  }

  function renderCustomers() {
    return (
      <section className="customer-layout">
        <Panel title="Customer list" description="Filtered by current logged-in user only.">
          <div className="filters">
            <input placeholder="Search" value={customerFilters.q} onChange={(event) => setCustomerFilters({ ...customerFilters, q: event.target.value })} />
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
                <span>{customer.whatsappNumber || "No WhatsApp"} · {customer.stage}</span>
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
        <div className="detail-actions">
          <button onClick={saveCustomerRecord} disabled={loading}>Save</button>
          <button className="secondary-button" onClick={() => { setSelectedCustomerId(""); setCustomerForm(emptyCustomerForm); }}>New</button>
          <button className="danger-button" onClick={removeCustomer}>Delete</button>
          <button className="secondary-button" onClick={refreshIntent}>Recalculate intent</button>
        </div>
      </>
    );
  }

  function renderCustomerSideRecords() {
    return (
      <div className="quote-history">
        {customerIntent && (
          <div className="risk-box">
            <strong>Intent {customerIntent.intentScore} / {customerIntent.intentLevel}</strong>
            <span>{customerIntent.recommendedAction}</span>
            {customerIntent.intentReasons.slice(0, 4).map((item) => <span key={item}>{item}</span>)}
          </div>
        )}
        <RecordList title="Quotes" items={customerQuotes.map((item) => `${item.currency} ${item.unitPrice} · ${item.quoteText.slice(0, 80)}`)} />
        <RecordList title="Follow-ups" items={customerFollowUps.map((item) => `${item.taskType} · ${item.status} · ${formatDate(item.remindAt)}`)} />
        <RecordList title="Samples" items={customerSampleOrders.map((item) => `${item.sampleName} · ${item.paymentStatus} · ${item.shippingStatus}`)} />
        <RecordList title="Custom requests" items={customerCustomRequests.map((item) => `${item.requestType} · ${item.status} · ${item.productName || "No product"}`)} />
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
                <span>{product.sku} · {product.category || "No category"}</span>
                <span>MOQ {product.moq || "-"} · Price {product.suggestedPrice || "-"}</span>
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

  function renderQuotes() {
    return (
      <section className="grid quote-layout">
        <Panel title="Quote assistant" description="Generate and save WhatsApp-ready quote draft.">
          <div className="form-grid">
            <SelectField label="Customer" value={quoteForm.customerId} onChange={(value) => setQuoteForm({ ...quoteForm, customerId: value })} options={customers.map((item) => [item.id, item.name])} />
            <SelectField label="Product" value={quoteForm.productId} onChange={(value) => setQuoteForm({ ...quoteForm, productId: value })} options={products.map((item) => [item.id, item.name])} />
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
              <span>{item.category} · {item.language} · {item.enabled ? "enabled" : "disabled"}</span>
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
              <span>{item.type} · {item.language}</span>
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

  function renderSamples() {
    return (
      <section className="customer-layout">
        <Panel title="Sample orders" description="Sales process record only, no payment or logistics system.">
          <SampleFilterBar />
          <SimpleList items={sampleOrders} render={(item) => (
            <button className="customer-row" onClick={async () => { setSelectedSampleOrderId(item.id); setSampleForm(toSampleForm(await getSampleOrder(item.id))); }}>
              <strong>{item.sampleName}</strong>
              <span>{item.customerName || item.customerId} · {item.paymentStatus} · {item.shippingStatus}</span>
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
              <strong>{item.customerName || item.customerId} · {item.requestType}</strong>
              <span>{item.productName || "No product"} · {item.status}</span>
              <span>MOQ {item.moq || "-"} · Qty {item.quantity || "-"}</span>
            </button>
          )} />
        </Panel>
        <Panel title="Custom editor" description="No production scheduling, payment or order system is created here.">
          {renderCustomForm()}
        </Panel>
      </section>
    );
  }

  function renderImportExport() {
    return (
      <section className="grid quote-layout">
        <Panel title="CSV import" description="Upload UTF-8 CSV only. Dry run validates without writing data.">
          <Field label="Data type">
            <select value={importType} onChange={(event) => { setImportType(event.target.value as ImportExportType); setImportResult(null); }}>
              {IMPORT_EXPORT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </Field>
          <Field label="CSV file">
            <input type="file" accept=".csv,text/csv" onChange={(event) => setImportFile(event.target.files?.[0] || null)} />
          </Field>
          <div className="detail-actions">
            <a className="secondary-button" href={templateCsvUrl(importType)}>Download template</a>
            <button className="secondary-button" onClick={() => runCsvImport(true)}>Dry run</button>
            <button onClick={() => runCsvImport(false)}>Confirm import</button>
          </div>
          <RiskWarnings items={[
            "CSV only, max 5MB. Excel files are not supported in V2-F.",
            "ownerId, createdBy, tokens, secrets and API keys are ignored and never imported.",
            "Import/export is scoped to the current logged-in user only."
          ]} />
        </Panel>
        <Panel title="CSV export and result" description="Export only current user data. Formula-like cells are escaped.">
          <div className="list">
            {IMPORT_EXPORT_TYPES.map((type) => (
              <div className="list-item" key={type}>
                <div>
                  <strong>{type}</strong>
                  <span>UTF-8 CSV, arrays use | separator</span>
                </div>
                <a className="secondary-button" href={exportCsvUrl(type)}>Export</a>
              </div>
            ))}
          </div>
          {importResult && (
            <div className="quote-history">
              <div className="risk-box">
                <span>Total rows: {importResult.totalRows}</span>
                <span>Success: {importResult.successCount}</span>
                <span>Skipped: {importResult.skippedCount}</span>
                <span>Failed rows: {importResult.failureCount}</span>
                <span>Mode: {importResult.dryRun ? "dry run" : "write"}</span>
              </div>
              <RecordList title="Import errors" items={importResult.errors.map((error) => `row ${error.row} · ${error.field}: ${error.message}`)} />
            </div>
          )}
        </Panel>
      </section>
    );
  }

  async function runCsvImport(dryRun: boolean) {
    if (!importFile) return setStatus("Please choose a CSV file first.");
    setLoading(true);
    try {
      const result = await importCsv(importType, importFile, { dryRun, skipDuplicates: true });
      setImportResult(result);
      setStatus(dryRun ? "Dry run completed. No data was written." : "CSV import completed.");
      if (!dryRun) await refreshAll();
    } catch {
      setStatus("CSV import failed. Check file type, size and row errors.");
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
              <span>{task.taskType} · {formatDate(task.remindAt)}</span>
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
                <span>{customer.stage} · intent {customer.intentScore ?? "-"}</span>
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

function SimpleList<T extends { id: string }>({ items, render }: { items: T[]; render: (item: T) => ReactNode }) {
  return <div className="customer-list">{items.length ? items.map((item) => <div key={item.id}>{render(item)}</div>) : <p className="empty-note">No records.</p>}</div>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
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

function titleForView(view: View) {
  const titles: Record<View, string> = {
    dashboard: "Home workbench",
    customers: "Customer CRM",
    products: "Product library",
    quotes: "Quote assistant",
    knowledge: "AI company knowledge base",
    materials: "Material center",
    samples: "Sample order management",
    custom: "Custom request management",
    importExport: "CSV import / export"
  };
  return titles[view];
}

function toCustomerForm(customer: CustomerSummary): CustomerForm {
  return {
    name: customer.name || "",
    whatsappNumber: customer.whatsappNumber || "",
    country: customer.country || "",
    language: customer.language || "English",
    tags: (customer.tags || []).join(", "),
    stage: customer.stage || "新线索",
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
    country: form.country || null,
    language: form.language || null,
    tags: splitLinesOrComma(form.tags),
    stage: form.stage || "新线索",
    interestedProduct: form.interestedProduct || null,
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

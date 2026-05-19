import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Calculator,
  CalendarClock,
  Check,
  Clock3,
  Copy,
  Home,
  LogOut,
  Package,
  Plus,
  RefreshCw,
  Save,
  Search,
  Tag,
  Trash2,
  Users
} from "lucide-react";
import {
  AI_SAFETY_NOTE,
  DEFAULT_CUSTOMER_STAGES,
  DEFAULT_CUSTOMER_TAGS,
  type CustomerDetail,
  type CustomerSummary,
  type CustomerUpsertRequest,
  type FollowUpSummary,
  type FollowUpTaskType,
  type FollowUpUpsertRequest,
  type ProductDetail,
  type ProductSummary,
  type ProductUpsertRequest,
  type QuoteGenerateRequest,
  type QuoteResponse,
  type WorkbenchDashboard
} from "@wa-ai/shared";
import {
  completeFollowUp,
  createCustomer,
  createFollowUp,
  createProduct,
  deleteCustomer,
  deleteProduct,
  generateQuote,
  getFollowUps,
  getCustomer,
  getCustomerQuotes,
  getCustomers,
  getMe,
  getProduct,
  getProducts,
  getWorkbenchDashboard,
  login,
  logout,
  saveQuote,
  updateCustomer,
  updateProduct,
  type AuthUser
} from "./api";

type View = "dashboard" | "customers" | "products" | "quotes";
type Filters = { tag: string; stage: string; q: string };
type ProductFilters = { q: string; category: string };

type CustomerForm = {
  name: string;
  whatsappNumber: string;
  country: string;
  language: string;
  tags: string[];
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
  images: string;
  videos: string;
  colors: string;
  sizes: string;
  material: string;
  moq: string;
  suggestedPrice: string;
  minPrice: string;
  leadTime: string;
  sellingPoints: string;
  introEn: string;
  introEs: string;
  introPt: string;
  introAr: string;
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
  stockKnown: boolean;
  promiseStock: boolean;
};

type FollowUpForm = {
  customerId: string;
  taskType: FollowUpTaskType;
  remindAt: string;
  recommendedScript: string;
};

const emptyFilters: Filters = { tag: "", stage: "", q: "" };
const emptyProductFilters: ProductFilters = { q: "", category: "" };
const followUpTaskTypes: FollowUpTaskType[] = ["报价后跟进", "催付款", "样品反馈", "老客户复购", "售后跟进", "普通提醒"];

const emptyCustomerForm: CustomerForm = {
  name: "",
  whatsappNumber: "",
  country: "",
  language: "English",
  tags: ["新客户"],
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
  images: "",
  videos: "",
  colors: "",
  sizes: "",
  material: "",
  moq: "",
  suggestedPrice: "",
  minPrice: "",
  leadTime: "",
  sellingPoints: "",
  introEn: "",
  introEs: "",
  introPt: "",
  introAr: ""
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
  tiers: "50,12.50\n100,11.80\n300,10.90",
  stockKnown: false,
  promiseStock: false
};

const emptyFollowUpForm: FollowUpForm = {
  customerId: "",
  taskType: "普通提醒",
  remindAt: "",
  recommendedScript: ""
};

export function App() {
  const [view, setView] = useState<View>("dashboard");
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [dashboard, setDashboard] = useState<WorkbenchDashboard | null>(null);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [productFilters, setProductFilters] = useState<ProductFilters>(emptyProductFilters);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [customerForm, setCustomerForm] = useState<CustomerForm>(emptyCustomerForm);
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm);
  const [quoteForm, setQuoteForm] = useState<QuoteForm>(emptyQuoteForm);
  const [followUpForm, setFollowUpForm] = useState<FollowUpForm>(emptyFollowUpForm);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [customerQuotes, setCustomerQuotes] = useState<QuoteResponse[]>([]);
  const [customerFollowUps, setCustomerFollowUps] = useState<FollowUpSummary[]>([]);
  const [status, setStatus] = useState("准备就绪");
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedCustomerId),
    [customers, selectedCustomerId]
  );
  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId),
    [products, selectedProductId]
  );

  useEffect(() => {
    void loadCurrentUser();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    void loadDashboard();
    void loadCustomers();
    void loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  async function loadDashboard() {
    try {
      setDashboard(await getWorkbenchDashboard());
    } catch {
      setDashboard(null);
      setStatus("首页工作台加载失败，请确认 API 和数据库已启动");
    }
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
      setStatus("登录成功，数据已按当前账号隔离");
    } catch {
      setStatus("登录失败，请确认邮箱、密码和数据库服务");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await logout();
    setCurrentUser(null);
    setCustomers([]);
    setProducts([]);
    setDashboard(null);
    setSelectedCustomerId("");
    setSelectedProductId("");
    setQuote(null);
    setCustomerQuotes([]);
    setCustomerFollowUps([]);
    setStatus("已退出登录");
  }

  async function loadCustomers(nextFilters = filters) {
    setLoading(true);
    try {
      const list = await getCustomers(nextFilters);
      setCustomers(list);
      if (!selectedCustomerId && list[0]) await selectCustomer(list[0].id, list);
      if (!quoteForm.customerId && list[0]) setQuoteForm((form) => ({ ...form, customerId: list[0].id }));
      setStatus("客户列表已同步");
    } catch {
      setStatus("客户加载失败，请确认 API 和数据库已启动");
    } finally {
      setLoading(false);
    }
  }

  async function loadProducts(nextFilters = productFilters) {
    setLoading(true);
    try {
      const list = await getProducts(nextFilters);
      setProducts(list);
      if (!selectedProductId && list[0]) await selectProduct(list[0].id, list);
      if (!quoteForm.productId && list[0]) seedQuoteFromProduct(list[0]);
      setStatus("产品列表已同步");
    } catch {
      setStatus("产品加载失败，请确认 API 和数据库已启动");
    } finally {
      setLoading(false);
    }
  }

  async function selectCustomer(id: string, source = customers) {
    setSelectedCustomerId(id);
    setQuoteForm((form) => ({ ...form, customerId: id }));
    setFollowUpForm((form) => ({ ...form, customerId: id }));
    void loadCustomerQuotes(id);
    void loadCustomerFollowUps(id);
    try {
      setCustomerForm(toCustomerForm(await getCustomer(id)));
    } catch {
      const fallback = source.find((customer) => customer.id === id);
      if (fallback) setCustomerForm(toCustomerForm(fallback));
    }
  }

  async function loadCustomerQuotes(customerId: string) {
    try {
      setCustomerQuotes(await getCustomerQuotes(customerId));
    } catch {
      setCustomerQuotes([]);
    }
  }

  async function loadCustomerFollowUps(customerId: string) {
    try {
      setCustomerFollowUps(await getFollowUps({ customerId }));
    } catch {
      setCustomerFollowUps([]);
    }
  }

  async function selectProduct(id: string, source = products) {
    setSelectedProductId(id);
    const fallback = source.find((product) => product.id === id);
    if (fallback) seedQuoteFromProduct(fallback);
    try {
      const detail = await getProduct(id);
      setProductForm(toProductForm(detail));
      seedQuoteFromProduct(detail);
    } catch {
      if (fallback) setProductForm(toProductForm(fallback));
    }
  }

  function seedQuoteFromProduct(product: ProductSummary) {
    setQuoteForm((form) => ({
      ...form,
      productId: product.id,
      unitPrice: product.suggestedPrice || form.unitPrice,
      moq: product.moq ? String(product.moq) : form.moq,
      leadTime: product.leadTime || form.leadTime
    }));
  }

  async function saveCustomer() {
    const validation = validateCustomerForm(customerForm);
    if (validation) return setStatus(validation);

    setLoading(true);
    try {
      const saved = selectedCustomerId
        ? await updateCustomer(selectedCustomerId, toCustomerPayload(customerForm))
        : await createCustomer(toCustomerPayload(customerForm));
      setSelectedCustomerId(saved.id);
      setCustomerForm(toCustomerForm(saved));
      await loadCustomers(filters);
      await loadDashboard();
      setStatus("客户信息已保存");
    } catch {
      setStatus("客户保存失败，请检查必填项和数据库连接");
    } finally {
      setLoading(false);
    }
  }

  async function saveProduct() {
    const validation = validateProductForm(productForm);
    if (validation) return setStatus(validation);

    setLoading(true);
    try {
      const saved = selectedProductId
        ? await updateProduct(selectedProductId, toProductPayload(productForm))
        : await createProduct(toProductPayload(productForm));
      setSelectedProductId(saved.id);
      setProductForm(toProductForm(saved));
      await loadProducts(productFilters);
      setStatus("产品资料已保存");
    } catch {
      setStatus("产品保存失败，请检查 SKU 是否重复，以及数据库连接是否正常");
    } finally {
      setLoading(false);
    }
  }

  async function removeCustomer() {
    if (!selectedCustomerId || !window.confirm("确定删除这个客户吗？")) return;
    await deleteCustomer(selectedCustomerId);
    setSelectedCustomerId("");
    setCustomerForm(emptyCustomerForm);
    setCustomerQuotes([]);
    setCustomerFollowUps([]);
    await loadCustomers(filters);
    await loadDashboard();
    setStatus("客户已删除");
  }

  async function removeProduct() {
    if (!selectedProductId || !window.confirm("确定删除这个产品吗？")) return;
    await deleteProduct(selectedProductId);
    setSelectedProductId("");
    setProductForm(emptyProductForm);
    await loadProducts(productFilters);
    setStatus("产品已删除");
  }

  async function handleGenerateQuote() {
    const validation = validateQuoteForm(quoteForm, false);
    if (validation) return setStatus(validation);

    setLoading(true);
    try {
      const result = await generateQuote(toQuotePayload(quoteForm));
      setQuote(result);
      setStatus(result.followUpPrompt);
    } catch {
      setStatus("报价生成失败，请检查产品、数量和单价");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveQuote() {
    const validation = validateQuoteForm(quoteForm, true);
    if (validation) return setStatus(validation);

    setLoading(true);
    try {
      const result = await saveQuote({
        ...toQuotePayload(quoteForm),
        customerId: quoteForm.customerId,
        quoteText: quote?.quoteText
      });
      setQuote(result);
      if (result.customerId) await loadCustomerQuotes(result.customerId);
      seedQuoteFollowUp(result.customerId || quoteForm.customerId);
      setStatus(`${result.followUpPrompt} 可在客户详情里一键保存报价后跟进提醒。`);
    } catch {
      setStatus("报价保存失败，请确认客户、产品和数据库连接");
    } finally {
      setLoading(false);
    }
  }

  function seedQuoteFollowUp(customerId: string) {
    if (!customerId) return;
    setFollowUpForm({
      customerId,
      taskType: "报价后跟进",
      remindAt: toDateTimeLocal(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()),
      recommendedScript: defaultFollowUpScript("报价后跟进")
    });
    if (selectedCustomerId !== customerId) setSelectedCustomerId(customerId);
  }

  async function saveFollowUp() {
    const validation = validateFollowUpForm(followUpForm);
    if (validation) return setStatus(validation);

    setLoading(true);
    try {
      const payload = toFollowUpPayload(followUpForm);
      const saved = await createFollowUp(payload);
      setFollowUpForm({ ...emptyFollowUpForm, customerId: saved.customerId, taskType: "普通提醒" });
      await loadCustomerFollowUps(saved.customerId);
      await loadDashboard();
      setStatus("跟进提醒已保存，只会作为任务提示，不会自动发送 WhatsApp 消息。");
    } catch {
      setStatus("跟进提醒保存失败，请确认已选择当前账号下的客户并填写提醒时间");
    } finally {
      setLoading(false);
    }
  }

  async function completeTask(task: FollowUpSummary) {
    setLoading(true);
    try {
      await completeFollowUp(task.id);
      if (selectedCustomerId) await loadCustomerFollowUps(selectedCustomerId);
      await loadDashboard();
      setStatus("跟进任务已标记完成");
    } catch {
      setStatus("跟进任务更新失败，请刷新后重试");
    } finally {
      setLoading(false);
    }
  }

  function setFollowUpTime(days: number) {
    const next = new Date();
    next.setDate(next.getDate() + days);
    next.setHours(10, 0, 0, 0);
    setFollowUpForm((form) => ({
      ...form,
      customerId: form.customerId || selectedCustomerId,
      remindAt: toDateTimeLocal(next.toISOString()),
      recommendedScript: form.recommendedScript || defaultFollowUpScript(form.taskType)
    }));
  }

  if (authLoading) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <div className="brand-mark">WA</div>
          <h1>正在检查登录状态</h1>
          <p>请稍候。</p>
        </section>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="auth-shell">
        <form className="auth-card" onSubmit={handleLogin}>
          <div className="brand-mark">WA</div>
          <h1>WhatsApp AI 销售助手</h1>
          <p>使用个人账号登录后，客户、产品、报价和跟进数据会按账号隔离保存。</p>
          <Field label="邮箱">
            <input
              type="email"
              value={loginForm.email}
              onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })}
            />
          </Field>
          <Field label="密码">
            <input
              type="password"
              value={loginForm.password}
              onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
            />
          </Field>
          <button type="submit" disabled={loading}>
            登录
          </button>
          <p className="empty-note">{status}</p>
        </form>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">WA</div>
          <div>
            <h1>WhatsApp AI 销售助手</h1>
            <p>V1 管理后台</p>
          </div>
        </div>

        <nav className="nav-list" aria-label="主导航">
          <button className={view === "dashboard" ? "active" : ""} type="button" onClick={() => setView("dashboard")}>
            <Home size={18} />
            首页
          </button>
          <button className={view === "customers" ? "active" : ""} type="button" onClick={() => setView("customers")}>
            <Users size={18} />
            客户
          </button>
          <button className={view === "products" ? "active" : ""} type="button" onClick={() => setView("products")}>
            <Package size={18} />
            产品
          </button>
          <button className={view === "quotes" ? "active" : ""} type="button" onClick={() => setView("quotes")}>
            <Calculator size={18} />
            报价
          </button>
          <button className={view === "dashboard" ? "active" : ""} type="button" onClick={() => setView("dashboard")}>
            <CalendarClock size={18} />
            跟进
          </button>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{viewEyebrow(view)}</p>
            <h2>{viewTitle(view)}</h2>
          </div>
          <div className="topbar-actions">
            <span className="user-chip">{currentUser.name}</span>
            <button className="secondary-button" type="button" onClick={startNew}>
              <Plus size={16} />
              新建
            </button>
            <button className="icon-button" type="button" onClick={refreshCurrent} title="刷新">
              <RefreshCw size={18} />
            </button>
            <button className="icon-button" type="button" onClick={handleLogout} title="退出登录">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {view === "dashboard" ? renderDashboardView() : null}
        {view === "customers" ? renderCustomerView() : null}
        {view === "products" ? renderProductView() : null}
        {view === "quotes" ? renderQuoteView() : null}
      </section>
    </main>
  );

  function startNew() {
    if (view === "dashboard") {
      setView("customers");
      setSelectedCustomerId("");
      setCustomerForm(emptyCustomerForm);
    } else if (view === "customers") {
      setSelectedCustomerId("");
      setCustomerForm(emptyCustomerForm);
    } else if (view === "products") {
      setSelectedProductId("");
      setProductForm(emptyProductForm);
    } else {
      setQuote(null);
      setQuoteForm(emptyQuoteForm);
    }
  }

  function refreshCurrent() {
    if (view === "dashboard") void loadDashboard();
    else if (view === "customers") void loadCustomers();
    else if (view === "products") void loadProducts();
    else {
      void loadCustomers();
      void loadProducts();
    }
  }

  function renderDashboardView() {
    const today = dashboard?.today || [];
    const overdue = dashboard?.overdue || [];
    const future = dashboard?.future || [];
    const quoted = dashboard?.quotedWithoutFollowUp || [];
    const highIntent = dashboard?.highIntent || [];
    const recent = dashboard?.recentCustomers || [];

    return (
      <>
        <section className="metrics" aria-label="首页跟进概览">
          <Metric label="今日待跟进" value={today.length} />
          <Metric label="逾期未跟进" value={overdue.length} />
          <Metric label="未来待跟进" value={future.length} />
        </section>

        <section className="dashboard-grid">
          <FollowUpPanel title="今日待跟进" items={today} empty="今天暂无待跟进任务" onComplete={completeTask} onOpen={openTaskCustomer} />
          <FollowUpPanel title="逾期未跟进" items={overdue} empty="暂无逾期任务" onComplete={completeTask} onOpen={openTaskCustomer} />
          <FollowUpPanel title="未来待跟进" items={future} empty="暂无未来跟进任务" onComplete={completeTask} onOpen={openTaskCustomer} />
          <CustomerPanel title="已报价未跟进客户" items={quoted} empty="暂无已报价未跟进客户" onOpen={openCustomerFromDashboard} />
          <CustomerPanel title="高意向待跟进客户" items={highIntent} empty="暂无高意向待跟进客户" onOpen={openCustomerFromDashboard} />
          <CustomerPanel title="最近新增客户" items={recent} empty="暂无客户数据" onOpen={openCustomerFromDashboard} />
        </section>
      </>
    );
  }

  function openTaskCustomer(task: FollowUpSummary) {
    setView("customers");
    void selectCustomer(task.customerId);
  }

  function openCustomerFromDashboard(customer: CustomerSummary) {
    setView("customers");
    void selectCustomer(customer.id);
  }

  function renderCustomerView() {
    return (
      <>
        <section className="metrics" aria-label="客户概览">
          <Metric label="客户总数" value={customers.length} />
          <Metric label="待跟进" value={customers.filter((item) => item.tags.includes("需要跟进")).length} />
          <Metric label="已成交" value={customers.filter((item) => item.stage === "已成交").length} />
        </section>

        <section className="customer-layout">
          <div className="panel">
            <PanelHeader title="客户列表" desc="按标签、销售阶段和关键词筛选" icon={<Search size={20} />} />
            <div className="filters">
              <input
                aria-label="搜索客户"
                placeholder="搜索名称、号码、国家、产品"
                value={filters.q}
                onChange={(event) => setFilters({ ...filters, q: event.target.value })}
                onKeyDown={(event) => event.key === "Enter" && void loadCustomers(filters)}
              />
              <select value={filters.tag} onChange={(event) => loadCustomers({ ...filters, tag: event.target.value })}>
                <option value="">全部标签</option>
                {DEFAULT_CUSTOMER_TAGS.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
              <select value={filters.stage} onChange={(event) => loadCustomers({ ...filters, stage: event.target.value })}>
                <option value="">全部阶段</option>
                {DEFAULT_CUSTOMER_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => loadCustomers(filters)}>
                <Search size={16} />
                筛选
              </button>
            </div>
            <div className="customer-list">
              {customers.map((customer) => (
                <button
                  className={`customer-row ${customer.id === selectedCustomerId ? "selected" : ""}`}
                  key={customer.id}
                  type="button"
                  onClick={() => selectCustomer(customer.id)}
                >
                  <div>
                    <strong>{customer.name}</strong>
                    <span>{customer.whatsappNumber || "未填写号码"} · {customer.country || "未知国家"}</span>
                  </div>
                  <div className="row-meta">
                    <b>{customer.stage}</b>
                    {customer.nextFollowUpAt ? <time>{formatDateTime(customer.nextFollowUpAt)}</time> : null}
                  </div>
                  <TagList values={customer.tags} />
                </button>
              ))}
            </div>
          </div>

          <div className="panel detail-panel">
            <PanelHeader title={selectedCustomer?.name || "客户详情"} desc="保存标签、阶段、备注和跟进时间" icon={<Tag size={20} />} />
            <div className="form-grid">
              <Field label="客户名称" required>
                <input value={customerForm.name} onChange={(event) => setCustomerForm({ ...customerForm, name: event.target.value })} />
              </Field>
              <Field label="WhatsApp 号码">
                <input value={customerForm.whatsappNumber} onChange={(event) => setCustomerForm({ ...customerForm, whatsappNumber: event.target.value })} />
              </Field>
              <Field label="国家">
                <input value={customerForm.country} onChange={(event) => setCustomerForm({ ...customerForm, country: event.target.value })} />
              </Field>
              <Field label="语言">
                <LanguageSelect value={customerForm.language} onChange={(language) => setCustomerForm({ ...customerForm, language })} />
              </Field>
              <Field label="销售阶段">
                <select value={customerForm.stage} onChange={(event) => setCustomerForm({ ...customerForm, stage: event.target.value })}>
                  {DEFAULT_CUSTOMER_STAGES.map((stage) => <option key={stage}>{stage}</option>)}
                </select>
              </Field>
              <Field label="下次跟进时间">
                <input type="datetime-local" value={customerForm.nextFollowUpAt} onChange={(event) => setCustomerForm({ ...customerForm, nextFollowUpAt: event.target.value })} />
              </Field>
              <Field label="意向产品">
                <input value={customerForm.interestedProduct} onChange={(event) => setCustomerForm({ ...customerForm, interestedProduct: event.target.value })} />
              </Field>
            </div>
            <div className="tag-picker">
              {DEFAULT_CUSTOMER_TAGS.map((tag) => (
                <label key={tag} className={customerForm.tags.includes(tag) ? "checked" : ""}>
                  <input type="checkbox" checked={customerForm.tags.includes(tag)} onChange={() => setCustomerForm({ ...customerForm, tags: toggleTag(customerForm.tags, tag) })} />
                  <Check size={14} />
                  {tag}
                </label>
              ))}
            </div>
            <Field label="最近沟通摘要">
              <textarea rows={4} value={customerForm.latestSummary} onChange={(event) => setCustomerForm({ ...customerForm, latestSummary: event.target.value })} />
            </Field>
            <Field label="备注">
              <textarea rows={5} value={customerForm.notes} onChange={(event) => setCustomerForm({ ...customerForm, notes: event.target.value })} />
            </Field>
            <section className="quote-history" aria-label="客户报价记录">
              <div className="section-subhead">
                <strong>报价记录</strong>
                <span>{customerQuotes.length} 条</span>
              </div>
              {customerQuotes.length === 0 ? (
                <p className="empty-note">暂无报价记录。可在报价助手生成后保存到客户。</p>
              ) : (
                <div className="quote-history-list">
                  {customerQuotes.map((item) => (
                    <article key={item.id} className="quote-history-item">
                      <div>
                        <strong>
                          {item.currency} {item.unitPrice} / pc
                        </strong>
                        <span>
                          {item.quantity} pcs · MOQ {item.moq || "-"} · {item.leadTime || "交期待确认"}
                        </span>
                      </div>
                      <time>{item.createdAt ? formatDateTime(item.createdAt) : ""}</time>
                    </article>
                  ))}
                </div>
              )}
            </section>
            <section className="quote-history" id="follow-up" aria-label="客户跟进任务">
              <div className="section-subhead">
                <strong>跟进任务</strong>
                <span>{customerFollowUps.length} 条</span>
              </div>
              <div className="form-grid">
                <Field label="任务类型">
                  <select
                    value={followUpForm.taskType}
                    onChange={(event) =>
                      setFollowUpForm({
                        ...followUpForm,
                        taskType: event.target.value as FollowUpTaskType,
                        recommendedScript: defaultFollowUpScript(event.target.value as FollowUpTaskType)
                      })
                    }
                  >
                    {followUpTaskTypes.map((taskType) => <option key={taskType}>{taskType}</option>)}
                  </select>
                </Field>
                <Field label="提醒时间">
                  <input
                    type="datetime-local"
                    value={followUpForm.remindAt}
                    onChange={(event) => setFollowUpForm({ ...followUpForm, remindAt: event.target.value })}
                  />
                </Field>
              </div>
              <div className="quick-time-row">
                <button type="button" onClick={() => setFollowUpTime(1)}>明天</button>
                <button type="button" onClick={() => setFollowUpTime(3)}>3 天后</button>
                <button type="button" onClick={() => setFollowUpTime(7)}>下周</button>
              </div>
              <Field label="推荐话术草稿">
                <textarea
                  rows={4}
                  value={followUpForm.recommendedScript}
                  onChange={(event) => setFollowUpForm({ ...followUpForm, recommendedScript: event.target.value })}
                />
              </Field>
              <div className="detail-actions">
                <button type="button" onClick={saveFollowUp} disabled={loading || !selectedCustomerId}>
                  <CalendarClock size={16} />
                  新增跟进
                </button>
              </div>
              {customerFollowUps.length === 0 ? (
                <p className="empty-note">暂无跟进记录。可从侧边栏、报价后流程或这里新增。</p>
              ) : (
                <div className="quote-history-list">
                  {customerFollowUps.map((task) => (
                    <article key={task.id} className="quote-history-item">
                      <div>
                        <strong>{task.taskType} · {task.status}</strong>
                        <span>{task.recommendedScript}</span>
                      </div>
                      <div className="task-side">
                        <time>{formatDateTime(task.remindAt)}</time>
                        {task.status === "pending" ? (
                          <button type="button" onClick={() => completeTask(task)} disabled={loading}>
                            <Check size={14} />
                            完成
                          </button>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
            <ActionFooter status={status} onSave={saveCustomer} onDelete={removeCustomer} canDelete={Boolean(selectedCustomerId)} loading={loading} />
          </div>
        </section>
      </>
    );
  }

  function renderProductView() {
    const categories = Array.from(new Set(products.map((product) => product.category).filter(Boolean))) as string[];
    return (
      <>
        <section className="metrics" aria-label="产品概览">
          <Metric label="产品总数" value={products.length} />
          <Metric label="类目数" value={categories.length} />
          <Metric label="有西语介绍" value={products.filter((item) => Boolean(item.introEs)).length} />
        </section>

        <section className="customer-layout">
          <div className="panel">
            <PanelHeader title="产品列表" desc="按名称、SKU、类目搜索" icon={<Package size={20} />} />
            <div className="filters product-filters">
              <input
                aria-label="搜索产品"
                placeholder="搜索名称、SKU、类目"
                value={productFilters.q}
                onChange={(event) => setProductFilters({ ...productFilters, q: event.target.value })}
                onKeyDown={(event) => event.key === "Enter" && void loadProducts(productFilters)}
              />
              <select value={productFilters.category} onChange={(event) => loadProducts({ ...productFilters, category: event.target.value })}>
                <option value="">全部类目</option>
                {categories.map((category) => <option key={category}>{category}</option>)}
              </select>
              <button type="button" onClick={() => loadProducts(productFilters)}>
                <Search size={16} />
                搜索
              </button>
            </div>
            <div className="customer-list">
              {products.map((product) => (
                <button
                  className={`customer-row ${product.id === selectedProductId ? "selected" : ""}`}
                  key={product.id}
                  type="button"
                  onClick={() => selectProduct(product.id)}
                >
                  <div>
                    <strong>{product.name}</strong>
                    <span>{product.sku} · {product.category || "未分类"}</span>
                  </div>
                  <div className="row-meta">
                    <b>{product.suggestedPrice ? `USD ${product.suggestedPrice}` : "待定价"}</b>
                    <span>MOQ {product.moq || "-"}</span>
                  </div>
                  <TagList values={product.sellingPoints.slice(0, 3)} />
                </button>
              ))}
            </div>
          </div>

          <div className="panel detail-panel">
            <PanelHeader title={selectedProduct?.name || "产品详情"} desc="维护多语言介绍、卖点、图片和价格" icon={<Package size={20} />} />
            <div className="form-grid">
              <Field label="产品名称" required><input value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} /></Field>
              <Field label="SKU" required><input value={productForm.sku} onChange={(event) => setProductForm({ ...productForm, sku: event.target.value })} /></Field>
              <Field label="类目"><input value={productForm.category} onChange={(event) => setProductForm({ ...productForm, category: event.target.value })} /></Field>
              <Field label="材质"><input value={productForm.material} onChange={(event) => setProductForm({ ...productForm, material: event.target.value })} /></Field>
              <Field label="MOQ"><input type="number" min="0" value={productForm.moq} onChange={(event) => setProductForm({ ...productForm, moq: event.target.value })} /></Field>
              <Field label="交期"><input value={productForm.leadTime} onChange={(event) => setProductForm({ ...productForm, leadTime: event.target.value })} /></Field>
              <Field label="建议价"><input type="number" min="0" step="0.01" value={productForm.suggestedPrice} onChange={(event) => setProductForm({ ...productForm, suggestedPrice: event.target.value })} /></Field>
              <Field label="底价"><input type="number" min="0" step="0.01" value={productForm.minPrice} onChange={(event) => setProductForm({ ...productForm, minPrice: event.target.value })} /></Field>
            </div>
            <Field label="图片 URL（逗号或换行分隔）"><textarea rows={2} value={productForm.images} onChange={(event) => setProductForm({ ...productForm, images: event.target.value })} /></Field>
            <Field label="视频 URL（逗号或换行分隔）"><textarea rows={2} value={productForm.videos} onChange={(event) => setProductForm({ ...productForm, videos: event.target.value })} /></Field>
            <div className="form-grid">
              <Field label="颜色"><textarea rows={2} value={productForm.colors} onChange={(event) => setProductForm({ ...productForm, colors: event.target.value })} /></Field>
              <Field label="尺寸"><textarea rows={2} value={productForm.sizes} onChange={(event) => setProductForm({ ...productForm, sizes: event.target.value })} /></Field>
            </div>
            <Field label="卖点 sellingPoints（逗号或换行分隔）"><textarea rows={3} value={productForm.sellingPoints} onChange={(event) => setProductForm({ ...productForm, sellingPoints: event.target.value })} /></Field>
            <div className="form-grid">
              <Field label="英文介绍"><textarea rows={4} value={productForm.introEn} onChange={(event) => setProductForm({ ...productForm, introEn: event.target.value })} /></Field>
              <Field label="西语介绍"><textarea rows={4} value={productForm.introEs} onChange={(event) => setProductForm({ ...productForm, introEs: event.target.value })} /></Field>
              <Field label="葡语介绍"><textarea rows={4} value={productForm.introPt} onChange={(event) => setProductForm({ ...productForm, introPt: event.target.value })} /></Field>
              <Field label="阿语介绍"><textarea rows={4} value={productForm.introAr} onChange={(event) => setProductForm({ ...productForm, introAr: event.target.value })} /></Field>
            </div>
            <ActionFooter status={status} onSave={saveProduct} onDelete={removeProduct} canDelete={Boolean(selectedProductId)} loading={loading} />
          </div>
        </section>
      </>
    );
  }

  function renderQuoteView() {
    return (
      <section className="customer-layout quote-layout">
        <div className="panel">
          <PanelHeader title="报价表单" desc="支持普通报价和阶梯报价" icon={<Calculator size={20} />} />
          <div className="form-grid">
            <Field label="客户">
              <select value={quoteForm.customerId} onChange={(event) => setQuoteForm({ ...quoteForm, customerId: event.target.value })}>
                <option value="">选择客户</option>
                {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
              </select>
            </Field>
            <Field label="商品">
              <select
                value={quoteForm.productId}
                onChange={(event) => {
                  const product = products.find((item) => item.id === event.target.value);
                  setQuoteForm({ ...quoteForm, productId: event.target.value });
                  if (product) seedQuoteFromProduct(product);
                }}
              >
                <option value="">选择商品</option>
                {products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}
              </select>
            </Field>
            <Field label="数量"><input type="number" min="1" value={quoteForm.quantity} onChange={(event) => setQuoteForm({ ...quoteForm, quantity: event.target.value })} /></Field>
            <Field label="单价"><input type="number" min="0" step="0.01" value={quoteForm.unitPrice} onChange={(event) => setQuoteForm({ ...quoteForm, unitPrice: event.target.value })} /></Field>
            <Field label="币种"><input value={quoteForm.currency} onChange={(event) => setQuoteForm({ ...quoteForm, currency: event.target.value.toUpperCase() })} /></Field>
            <Field label="运费"><input type="number" min="0" step="0.01" value={quoteForm.shippingCost} onChange={(event) => setQuoteForm({ ...quoteForm, shippingCost: event.target.value })} /></Field>
            <Field label="MOQ"><input type="number" min="0" value={quoteForm.moq} onChange={(event) => setQuoteForm({ ...quoteForm, moq: event.target.value })} /></Field>
            <Field label="交期"><input value={quoteForm.leadTime} onChange={(event) => setQuoteForm({ ...quoteForm, leadTime: event.target.value })} /></Field>
            <Field label="客户语言"><LanguageSelect value={quoteForm.targetLanguage} onChange={(targetLanguage) => setQuoteForm({ ...quoteForm, targetLanguage })} /></Field>
          </div>
          <div className="tag-picker">
            <label className={quoteForm.includeShipping ? "checked" : ""}>
              <input type="checkbox" checked={quoteForm.includeShipping} onChange={() => setQuoteForm({ ...quoteForm, includeShipping: !quoteForm.includeShipping })} />
              <Check size={14} />
              报价含运费
            </label>
            <label className={quoteForm.stockKnown ? "checked" : ""}>
              <input type="checkbox" checked={quoteForm.stockKnown} onChange={() => setQuoteForm({ ...quoteForm, stockKnown: !quoteForm.stockKnown })} />
              <Check size={14} />
              库存已确认
            </label>
            <label className={quoteForm.promiseStock ? "checked" : ""}>
              <input type="checkbox" checked={quoteForm.promiseStock} onChange={() => setQuoteForm({ ...quoteForm, promiseStock: !quoteForm.promiseStock })} />
              <Check size={14} />
              文案承诺现货
            </label>
          </div>
          <Field label="阶梯报价（每行：数量,单价）">
            <textarea rows={4} value={quoteForm.tiers} onChange={(event) => setQuoteForm({ ...quoteForm, tiers: event.target.value })} />
          </Field>
          <div className="detail-actions">
            <button type="button" onClick={handleGenerateQuote} disabled={loading}>
              <Calculator size={16} />
              生成报价
            </button>
            <button type="button" onClick={handleSaveQuote} disabled={loading || !quoteForm.customerId}>
              <Save size={16} />
              保存到客户
            </button>
          </div>
        </div>

        <div className="panel detail-panel">
          <PanelHeader title="WhatsApp 报价话术" desc="复制后由业务员手动发送" icon={<Copy size={20} />} />
          <div className="safety-note">{AI_SAFETY_NOTE}</div>
          <Field label="报价文案">
            <textarea rows={14} value={quote?.quoteText || ""} onChange={(event) => setQuote((current) => current ? { ...current, quoteText: event.target.value } : current)} />
          </Field>
          <div className="risk-box">
            {(quote?.riskWarnings || ["报价生成后会显示风险提醒。"]).map((warning) => <span key={warning}>{warning}</span>)}
          </div>
          <div className="footer-row">
            <p>{quote?.followUpPrompt || status}</p>
            <button type="button" disabled={!quote?.quoteText} onClick={() => quote?.quoteText && navigator.clipboard.writeText(quote.quoteText).then(() => setStatus("报价文案已复制，请手动发送"))}>
              <Copy size={16} />
              复制
            </button>
          </div>
        </div>
      </section>
    );
  }
}

function viewTitle(view: View) {
  if (view === "dashboard") return "首页工作台";
  if (view === "products") return "产品资料库";
  if (view === "quotes") return "报价助手";
  return "客户管理工作台";
}

function viewEyebrow(view: View) {
  if (view === "dashboard") return "今日跟进、逾期任务和客户机会";
  if (view === "products") return "商品资料和多语言介绍";
  if (view === "quotes") return "商品报价和 WhatsApp 话术";
  return "客户标签、阶段和跟进时间";
}

function PanelHeader({ title, desc, icon }: { title: string; desc: string; icon: ReactNode }) {
  return (
    <div className="panel-header">
      <div>
        <h3>{title}</h3>
        <p>{desc}</p>
      </div>
      {icon}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}

function FollowUpPanel({
  title,
  items,
  empty,
  onComplete,
  onOpen
}: {
  title: string;
  items: FollowUpSummary[];
  empty: string;
  onComplete: (task: FollowUpSummary) => void;
  onOpen: (task: FollowUpSummary) => void;
}) {
  return (
    <section className="panel dashboard-panel">
      <PanelHeader title={title} desc="提醒只做任务提示和话术草稿" icon={<Clock3 size={20} />} />
      {items.length === 0 ? <p className="empty-note">{empty}</p> : null}
      <div className="task-list">
        {items.map((task) => (
          <article className="task-card" key={task.id}>
            <div>
              <strong>{task.customerName}</strong>
              <span>{task.whatsappNumber || "未填写号码"} · {task.stage}</span>
            </div>
            <TagList values={task.tags} />
            <p>{task.taskType} · {formatDateTime(task.remindAt)}</p>
            <textarea readOnly rows={3} value={task.recommendedScript} />
            <div className="detail-actions">
              <button type="button" onClick={() => onComplete(task)}>
                <Check size={16} />
                标记完成
              </button>
              <button className="secondary-button" type="button" onClick={() => onOpen(task)}>
                打开客户
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CustomerPanel({
  title,
  items,
  empty,
  onOpen
}: {
  title: string;
  items: CustomerSummary[];
  empty: string;
  onOpen: (customer: CustomerSummary) => void;
}) {
  return (
    <section className="panel dashboard-panel">
      <PanelHeader title={title} desc="按当前登录账号隔离展示" icon={<Users size={20} />} />
      {items.length === 0 ? <p className="empty-note">{empty}</p> : null}
      <div className="task-list">
        {items.map((customer) => (
          <article className="task-card" key={customer.id}>
            <div>
              <strong>{customer.name}</strong>
              <span>{customer.whatsappNumber || "未填写号码"} · {customer.country || "未填写国家"}</span>
            </div>
            <TagList values={customer.tags} />
            <p>{customer.stage} · {customer.interestedProduct || "未记录意向产品"}</p>
            <button className="secondary-button" type="button" onClick={() => onOpen(customer)}>
              打开客户
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return <label className="field"><span>{label}{required ? " *" : ""}</span>{children}</label>;
}

function LanguageSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      <option>English</option>
      <option>Spanish</option>
      <option>Portuguese</option>
      <option>Arabic</option>
      <option>Chinese</option>
      <option>French</option>
    </select>
  );
}

function TagList({ values }: { values: string[] }) {
  return <div className="tags">{values.map((value) => <span key={value}>{value}</span>)}</div>;
}

function ActionFooter({ status, onSave, onDelete, canDelete, loading }: { status: string; onSave: () => void; onDelete: () => void; canDelete: boolean; loading: boolean }) {
  return (
    <div className="footer-row">
      <p>{status}</p>
      <div className="detail-actions">
        <button type="button" onClick={onSave} disabled={loading}><Save size={16} />保存</button>
        <button className="danger-button" type="button" onClick={onDelete} disabled={!canDelete || loading}><Trash2 size={16} />删除</button>
      </div>
    </div>
  );
}

function toCustomerForm(customer: CustomerDetail | CustomerSummary): CustomerForm {
  return {
    name: customer.name || "",
    whatsappNumber: customer.whatsappNumber || "",
    country: customer.country || "",
    language: customer.language || "English",
    tags: customer.tags || [],
    stage: customer.stage || "新线索",
    interestedProduct: customer.interestedProduct || "",
    latestSummary: customer.latestSummary || "",
    nextFollowUpAt: toDateTimeLocal(customer.nextFollowUpAt),
    notes: customer.notes || ""
  };
}

function toProductForm(product: ProductDetail | ProductSummary): ProductForm {
  return {
    name: product.name || "",
    sku: product.sku || "",
    category: product.category || "",
    images: listToText(product.images),
    videos: listToText(product.videos),
    colors: listToText(product.colors),
    sizes: listToText(product.sizes),
    material: product.material || "",
    moq: product.moq ? String(product.moq) : "",
    suggestedPrice: product.suggestedPrice || "",
    minPrice: product.minPrice || "",
    leadTime: product.leadTime || "",
    sellingPoints: listToText(product.sellingPoints),
    introEn: product.introEn || "",
    introEs: product.introEs || "",
    introPt: product.introPt || "",
    introAr: product.introAr || ""
  };
}

function toCustomerPayload(form: CustomerForm): CustomerUpsertRequest {
  return { ...form, nextFollowUpAt: form.nextFollowUpAt ? new Date(form.nextFollowUpAt).toISOString() : null };
}

function toProductPayload(form: ProductForm): ProductUpsertRequest {
  return {
    name: form.name,
    sku: form.sku,
    category: form.category || null,
    images: textToList(form.images),
    videos: textToList(form.videos),
    colors: textToList(form.colors),
    sizes: textToList(form.sizes),
    material: form.material || null,
    moq: form.moq ? Number(form.moq) : null,
    suggestedPrice: form.suggestedPrice || null,
    minPrice: form.minPrice || null,
    leadTime: form.leadTime || null,
    sellingPoints: textToList(form.sellingPoints),
    introEn: form.introEn || null,
    introEs: form.introEs || null,
    introPt: form.introPt || null,
    introAr: form.introAr || null
  };
}

function toQuotePayload(form: QuoteForm): QuoteGenerateRequest {
  return {
    customerId: form.customerId || null,
    productId: form.productId,
    quantity: Number(form.quantity),
    unitPrice: form.unitPrice,
    currency: form.currency,
    shippingCost: form.shippingCost || null,
    moq: form.moq ? Number(form.moq) : null,
    leadTime: form.leadTime || null,
    includeShipping: form.includeShipping,
    targetLanguage: form.targetLanguage,
    tiers: parseTiers(form.tiers),
    stockKnown: form.stockKnown,
    promiseStock: form.promiseStock,
    attachmentSelected: false
  };
}

function toFollowUpPayload(form: FollowUpForm): FollowUpUpsertRequest {
  return {
    customerId: form.customerId,
    taskType: form.taskType,
    remindAt: new Date(form.remindAt).toISOString(),
    recommendedScript: form.recommendedScript || defaultFollowUpScript(form.taskType)
  };
}

function validateCustomerForm(form: CustomerForm) {
  if (!form.name.trim()) return "客户名称不能为空";
  if (form.whatsappNumber.length > 40) return "WhatsApp 号码不能超过 40 个字符";
  return "";
}

function validateFollowUpForm(form: FollowUpForm) {
  if (!form.customerId) return "请先选择客户";
  if (!form.taskType) return "请选择任务类型";
  if (!form.remindAt || Number.isNaN(Date.parse(form.remindAt))) return "请填写正确的提醒时间";
  if (form.recommendedScript.length > 2000) return "推荐话术不能超过 2000 个字符";
  return "";
}

function defaultFollowUpScript(taskType: FollowUpTaskType) {
  const scripts: Record<FollowUpTaskType, string> = {
    报价后跟进:
      "Hi, just checking if you had a chance to review the quotation. Would you like us to keep stock for you or adjust the quantity? This is only a draft; please confirm price, stock, lead time, and shipping before sending.",
    催付款:
      "Hi, may I confirm if the payment arrangement is ready? We will proceed after payment is confirmed. This is only a draft; please confirm payment method, account, price, stock, and lead time before sending.",
    样品反馈:
      "Hi, did you receive the sample and test it? Please let me know your feedback, and I can help adjust the product details if needed. This is only a draft and will not be sent automatically.",
    老客户复购:
      "Hi, hope everything is going well. Would you like to reorder the previous product or check the latest options? This is only a draft; please confirm price, stock, lead time, and shipping before sending.",
    售后跟进:
      "Hi, I am following up to check whether everything is working well after delivery. If you need support, please send details or photos. This is only a draft and will not be sent automatically.",
    普通提醒:
      "Hi, just following up on our previous conversation. Please let me know if you need any more details. This is only a draft; please confirm key information before sending."
  };
  return scripts[taskType];
}

function validateProductForm(form: ProductForm) {
  if (!form.name.trim()) return "产品名称不能为空";
  if (!form.sku.trim()) return "SKU 不能为空";
  if (form.moq && Number(form.moq) < 0) return "MOQ 必须是非负数";
  return "";
}

function validateQuoteForm(form: QuoteForm, requireCustomer: boolean) {
  if (requireCustomer && !form.customerId) return "请先选择客户";
  if (!form.productId) return "请先选择商品";
  if (!Number(form.quantity)) return "数量必须大于 0";
  if (!Number(form.unitPrice)) return "单价必须大于 0";
  if (!form.currency.trim()) return "币种不能为空";
  return "";
}

function parseTiers(value: string) {
  return value.split(/\n/).map((line) => {
    const [quantity, unitPrice] = line.split(/,|\//).map((item) => item.trim());
    return { quantity: Number(quantity), unitPrice };
  }).filter((tier) => tier.quantity > 0 && Number(tier.unitPrice) > 0);
}

function toggleTag(tags: string[], tag: string) {
  return tags.includes(tag) ? tags.filter((item) => item !== tag) : [...tags, tag];
}

function textToList(value: string) {
  return Array.from(new Set(value.split(/\n|,/).map((item) => item.trim()).filter(Boolean)));
}

function listToText(value: string[]) {
  return value.join("\n");
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 16);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

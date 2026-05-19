import type {
  AiReplyRequest,
  AiReplyResponse,
  AiReplyScenario,
  AuthUser,
  CustomerDetail,
  CustomerUpsertRequest,
  FollowUpTaskType,
  ProductIntroResponse,
  ProductSummary,
  QuoteResponse
} from "@wa-ai/shared";
import { AI_SAFETY_NOTE } from "@wa-ai/shared";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
const WEB_LOGIN_URL = import.meta.env.VITE_WEB_LOGIN_URL || "http://localhost:5173";
const SIDEBAR_ID = "wa-ai-sidebar";
const HIDDEN_CLASS = "wa-ai-hidden";

type QuickAction = "translate" | "reply" | "quote" | "urge" | "product" | "followUp";
type ReplyVariant = "short" | "professional" | "closing";
type RecognitionStatus = "normal" | "abnormal" | "notChat" | "whatsappNotOpen";
type SidebarAuthState = { status: "checking" | "authenticated" | "anonymous"; user?: AuthUser };

let authState: SidebarAuthState = { status: "checking" };

type StoredCustomerProfile = {
  customerId?: string;
  name?: string;
  whatsappNumber?: string;
  country?: string;
  language?: string;
  stage?: string;
  tags?: string;
  interestedProduct?: string;
  latestSummary?: string;
  nextFollowUpAt?: string;
  notes?: string;
};

const actionScenarioMap: Partial<Record<QuickAction, AiReplyScenario>> = {
  urge: "follow_up",
  followUp: "follow_up"
};

const recognitionStatusText: Record<RecognitionStatus, string> = {
  normal: "识别正常",
  abnormal: "识别异常，已切换复制粘贴模式",
  notChat: "当前不是聊天窗口",
  whatsappNotOpen: "WhatsApp 页面未打开"
};

function createSidebar() {
  if (document.getElementById(SIDEBAR_ID)) return;

  const toggleButton = document.createElement("button");
  toggleButton.className = "wa-ai-toggle";
  toggleButton.type = "button";
  toggleButton.textContent = "AI";
  toggleButton.title = "显示或隐藏 WhatsApp AI 销售助手";
  document.body.appendChild(toggleButton);

  const sidebar = document.createElement("aside");
  sidebar.id = SIDEBAR_ID;
  sidebar.setAttribute("aria-label", "WhatsApp AI 销售助手");
  sidebar.innerHTML = `
    <header class="wa-ai-header">
      <div>
        <p class="wa-ai-kicker">当前为复制粘贴模式</p>
        <h2>WhatsApp AI 销售助手</h2>
      </div>
      <span class="wa-ai-pill">草稿模式</span>
    </header>

    <section id="wa-ai-auth-panel" class="wa-ai-auth-panel" data-auth="checking">
      <div>
        <strong id="wa-ai-auth-title">正在检查登录状态</strong>
        <span id="wa-ai-auth-desc">请稍候。</span>
      </div>
      <button id="wa-ai-open-login" type="button">打开 Web 后台登录</button>
    </section>

    <section class="wa-ai-scroll">
      <section class="wa-ai-section">
        <div class="wa-ai-section-title">
          <h3>客户信息</h3>
          <button id="wa-ai-save-customer" type="button" class="wa-ai-link-button">保存到后台</button>
        </div>
        <input id="wa-ai-customer-id" type="hidden" />
        <label class="wa-ai-field"><span>客户名称</span><input id="wa-ai-customer" type="text" placeholder="例如 Amina Trading" /></label>
        <div class="wa-ai-two-cols">
          <label class="wa-ai-field"><span>WhatsApp 号码</span><input id="wa-ai-whatsapp-number" type="text" placeholder="+971..." /></label>
          <label class="wa-ai-field"><span>国家</span><input id="wa-ai-country" type="text" placeholder="UAE" /></label>
        </div>
        <div class="wa-ai-two-cols">
          <label class="wa-ai-field">
            <span>回复语言</span>
            <select id="wa-ai-language">
              <option value="auto">跟随客户语言</option>
              <option value="English">English</option>
              <option value="Spanish">Spanish</option>
              <option value="Portuguese">Portuguese</option>
              <option value="Arabic">Arabic</option>
            </select>
          </label>
          <label class="wa-ai-field">
            <span>销售阶段</span>
            <select id="wa-ai-stage">
              <option value="新线索">新线索</option>
              <option value="已沟通需求">已沟通需求</option>
              <option value="已推荐产品">已推荐产品</option>
              <option value="已报价">已报价</option>
              <option value="待付款">待付款</option>
              <option value="已成交">已成交</option>
              <option value="待复购">待复购</option>
              <option value="无效客户">无效客户</option>
            </select>
          </label>
        </div>
        <label class="wa-ai-field"><span>标签</span><input id="wa-ai-tags" type="text" placeholder="新客户, 高意向, 需要跟进" /></label>
        <label class="wa-ai-field"><span>意向产品</span><input id="wa-ai-interested-product" type="text" placeholder="SKU 或产品名称" /></label>
        <label class="wa-ai-field"><span>最近沟通摘要</span><textarea id="wa-ai-latest-summary" rows="3"></textarea></label>
        <label class="wa-ai-field"><span>下次跟进时间</span><input id="wa-ai-next-follow-up" type="datetime-local" /></label>
        <label class="wa-ai-field"><span>备注</span><textarea id="wa-ai-notes" rows="3"></textarea></label>
      </section>

      <section class="wa-ai-section">
        <div class="wa-ai-section-title">
          <h3>产品资料库</h3>
          <button id="wa-ai-refresh-products" type="button" class="wa-ai-link-button">刷新</button>
        </div>
        <div class="wa-ai-safety-note">${AI_SAFETY_NOTE}</div>
        <div class="wa-ai-product-search">
          <input id="wa-ai-product-search" type="search" placeholder="搜索产品名称、SKU、类目" />
          <button id="wa-ai-search-products" type="button">搜索</button>
        </div>
        <label class="wa-ai-field"><span>选择产品</span><select id="wa-ai-product-select"><option value="">加载产品中...</option></select></label>
        <div class="wa-ai-product-meta" id="wa-ai-product-meta">选择产品后显示 MOQ、价格、交期和卖点。</div>
        <label class="wa-ai-field"><span>产品介绍文案</span><textarea id="wa-ai-product-intro" rows="4"></textarea></label>
        <div class="wa-ai-two-actions">
          <button id="wa-ai-copy-product-intro" type="button" class="wa-ai-wide-button">复制产品介绍</button>
          <button id="wa-ai-insert-product-intro" type="button" class="wa-ai-wide-button wa-ai-secondary-wide">插入输入框</button>
        </div>
      </section>

      <section class="wa-ai-section">
        <div class="wa-ai-section-title"><h3>报价助手</h3></div>
        <div class="wa-ai-safety-note">${AI_SAFETY_NOTE}</div>
        <div class="wa-ai-two-cols">
          <label class="wa-ai-field"><span>数量</span><input id="wa-ai-quote-quantity" type="number" min="1" value="100" /></label>
          <label class="wa-ai-field"><span>单价</span><input id="wa-ai-quote-unit-price" type="number" min="0" step="0.01" /></label>
        </div>
        <div class="wa-ai-two-cols">
          <label class="wa-ai-field"><span>币种</span><input id="wa-ai-quote-currency" type="text" value="USD" /></label>
          <label class="wa-ai-field"><span>运费</span><input id="wa-ai-quote-shipping" type="number" min="0" step="0.01" /></label>
        </div>
        <div class="wa-ai-two-cols">
          <label class="wa-ai-field"><span>MOQ</span><input id="wa-ai-quote-moq" type="number" min="0" /></label>
          <label class="wa-ai-field"><span>交期</span><input id="wa-ai-quote-lead-time" type="text" /></label>
        </div>
        <label class="wa-ai-field"><span>阶梯报价（每行：数量,单价）</span><textarea id="wa-ai-quote-tiers" rows="3" placeholder="50,12.50&#10;100,11.80&#10;300,10.90"></textarea></label>
        <div class="wa-ai-secondary-actions">
          <button id="wa-ai-quote-include-shipping" type="button" data-active="false">不含运费</button>
          <button id="wa-ai-quote-stock-known" type="button" data-active="false">库存未知</button>
        </div>
        <label class="wa-ai-field"><span>报价话术</span><textarea id="wa-ai-quote-text" rows="6"></textarea></label>
        <div class="wa-ai-two-actions">
          <button id="wa-ai-copy-quote" type="button" class="wa-ai-wide-button">复制报价</button>
          <button id="wa-ai-insert-quote" type="button" class="wa-ai-wide-button wa-ai-secondary-wide">插入输入框</button>
        </div>
        <button id="wa-ai-save-quote" type="button" class="wa-ai-wide-button wa-ai-secondary-wide">保存报价到客户记录</button>
      </section>

      <section class="wa-ai-section">
        <div class="wa-ai-section-title"><h3>设置跟进</h3></div>
        <div class="wa-ai-safety-note">跟进提醒只会保存为任务和话术草稿，不会自动发送 WhatsApp 消息。</div>
        <label class="wa-ai-field">
          <span>任务类型</span>
          <select id="wa-ai-follow-up-type">
            <option value="报价后跟进">报价后跟进</option>
            <option value="催付款">催付款</option>
            <option value="样品反馈">样品反馈</option>
            <option value="老客户复购">老客户复购</option>
            <option value="售后跟进">售后跟进</option>
            <option value="普通提醒">普通提醒</option>
          </select>
        </label>
        <div class="wa-ai-secondary-actions">
          <button type="button" data-follow-up-days="1">明天</button>
          <button type="button" data-follow-up-days="3">3 天后</button>
          <button type="button" data-follow-up-days="7">下周</button>
        </div>
        <label class="wa-ai-field"><span>自定义提醒时间</span><input id="wa-ai-follow-up-remind-at" type="datetime-local" /></label>
        <label class="wa-ai-field"><span>推荐话术草稿</span><textarea id="wa-ai-follow-up-script" rows="4"></textarea></label>
        <button id="wa-ai-save-follow-up" type="button" class="wa-ai-wide-button">保存跟进提醒</button>
      </section>

      <section class="wa-ai-section">
        <div class="wa-ai-section-title">
          <h3>客户消息理解</h3>
          <button id="wa-ai-read-selection" type="button" class="wa-ai-link-button">读取选中</button>
        </div>
        <label class="wa-ai-field"><span>客户消息</span><textarea id="wa-ai-message" rows="5" placeholder="无法读取时请手动粘贴客户消息"></textarea></label>
        <label class="wa-ai-field"><span>产品上下文（可选）</span><textarea id="wa-ai-product-context" rows="3"></textarea></label>
        <label class="wa-ai-field"><span>中文翻译</span><textarea id="wa-ai-translation" rows="4"></textarea></label>
        <div class="wa-ai-analysis-grid">
          <div class="wa-ai-analysis-card"><span>客户意图</span><strong id="wa-ai-intent">待分析</strong></div>
          <div class="wa-ai-analysis-card"><span>关注点</span><div id="wa-ai-concerns" class="wa-ai-chips"><span>待分析</span></div></div>
        </div>
        <div class="wa-ai-risk-list" id="wa-ai-risks"><span>风险提示会显示在这里</span></div>
      </section>

      <section class="wa-ai-section">
        <div class="wa-ai-section-title"><h3>快捷操作</h3></div>
        <div class="wa-ai-action-grid">
          <button data-action="translate" type="button">翻译</button>
          <button data-action="reply" type="button">生成回复</button>
          <button data-action="quote" type="button">报价</button>
          <button data-action="urge" type="button">催单</button>
          <button data-action="product" type="button">发产品</button>
          <button data-action="followUp" type="button">设置跟进</button>
        </div>
      </section>

      <section class="wa-ai-section">
        <div class="wa-ai-section-title"><h3>AI 推荐回复</h3></div>
        <div class="wa-ai-safety-note">${AI_SAFETY_NOTE}</div>
        <div class="wa-ai-replies">
          ${replyCard("short", "简短版", 4)}
          ${replyCard("professional", "专业版", 5)}
          ${replyCard("closing", "成交版", 5)}
        </div>
      </section>
    </section>

    <footer class="wa-ai-footer">
      <div id="wa-ai-recognition-status" class="wa-ai-recognition-status">识别异常，已切换复制粘贴模式</div>
      <div id="wa-ai-status">当前为复制粘贴模式。报价和回复只生成草稿，不会自动发送 WhatsApp 消息。</div>
    </footer>
  `;
  document.body.appendChild(sidebar);

  bindEvents(toggleButton);
  applyWhatsAppOffset();
  updateRecognitionStatus();
  window.addEventListener("focus", updateRecognitionStatus);
  window.addEventListener("hashchange", updateRecognitionStatus);
  window.addEventListener("resize", applyWhatsAppOffset);
  void restoreCustomerProfile();
  void checkAuthStatus();
}

function replyCard(id: ReplyVariant, title: string, rows: number) {
  return `
    <article class="wa-ai-reply-card">
      <div class="wa-ai-reply-title"><strong>${title}</strong><button type="button" data-copy="${id}">复制</button></div>
      <textarea id="wa-ai-reply-${id}" rows="${rows}"></textarea>
      <button type="button" class="wa-ai-reserved" disabled>插入 WhatsApp 输入框（预留）</button>
    </article>
  `;
}

function bindEvents(toggleButton: HTMLButtonElement) {
  toggleButton.addEventListener("click", () => {
    document.documentElement.classList.toggle(HIDDEN_CLASS);
    applyWhatsAppOffset();
  });

  getElement<HTMLButtonElement>("wa-ai-save-customer").addEventListener("click", saveCustomerToApi);
  getElement<HTMLButtonElement>("wa-ai-open-login").addEventListener("click", () => {
    window.open(WEB_LOGIN_URL, "_blank", "noopener,noreferrer");
  });
  getElement<HTMLButtonElement>("wa-ai-refresh-products").addEventListener("click", () => void loadProducts());
  getElement<HTMLButtonElement>("wa-ai-search-products").addEventListener("click", () => void loadProducts(getInput("wa-ai-product-search").value));
  getInput("wa-ai-product-search").addEventListener("keydown", (event) => {
    if (event.key === "Enter") void loadProducts(getInput("wa-ai-product-search").value);
  });
  getElement<HTMLSelectElement>("wa-ai-product-select").addEventListener("change", updateSelectedProductMeta);
  getElement<HTMLButtonElement>("wa-ai-copy-product-intro").addEventListener("click", () => copyTextArea("wa-ai-product-intro", "产品介绍已复制，请手动发送。"));
  getElement<HTMLButtonElement>("wa-ai-insert-product-intro").addEventListener("click", () => insertTextAreaIntoWhatsApp("wa-ai-product-intro"));
  getElement<HTMLButtonElement>("wa-ai-copy-quote").addEventListener("click", () => copyTextArea("wa-ai-quote-text", "报价文案已复制，请手动发送。"));
  getElement<HTMLButtonElement>("wa-ai-insert-quote").addEventListener("click", () => insertTextAreaIntoWhatsApp("wa-ai-quote-text"));
  getElement<HTMLButtonElement>("wa-ai-save-quote").addEventListener("click", () => void saveQuoteToCustomer());
  getElement<HTMLSelectElement>("wa-ai-follow-up-type").addEventListener("change", updateFollowUpScript);
  getElement<HTMLButtonElement>("wa-ai-save-follow-up").addEventListener("click", () => void saveFollowUpTask());
  document.querySelectorAll<HTMLButtonElement>("[data-follow-up-days]").forEach((button) => {
    button.addEventListener("click", () => {
      setFollowUpDate(Number(button.dataset.followUpDays || "1"));
      updateFollowUpScript();
    });
  });
  bindToggleButton("wa-ai-quote-include-shipping", "含运费", "不含运费");
  bindToggleButton("wa-ai-quote-stock-known", "库存已确认", "库存未知");

  getElement<HTMLButtonElement>("wa-ai-read-selection").addEventListener("click", () => {
    const selectedText = window.getSelection()?.toString().trim();
    if (!selectedText) {
      setRecognitionStatus("abnormal");
      return setStatus("无法读取 WhatsApp 页面内容，请手动粘贴客户消息。当前为复制粘贴模式。");
    }
    getTextArea("wa-ai-message").value = selectedText;
    updateRecognitionStatus();
    setStatus("已读取页面选中文本。");
  });

  document.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const action = button.dataset.action as QuickAction;
      if (action === "product") return generateSelectedProductIntro();
      if (action === "quote") return generateQuoteDraft();
      if (action === "followUp") {
        updateFollowUpScript();
        setFollowUpDate(1);
        return setStatus("已生成跟进话术草稿。请确认时间后点击保存跟进提醒，不会自动发送 WhatsApp 消息。");
      }
      return handleQuickAction(action);
    });
  });

  document.querySelectorAll<HTMLButtonElement>("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const variant = button.dataset.copy as ReplyVariant;
      await copyTextArea(`wa-ai-reply-${variant}`, "回复已复制。请人工检查后手动发送。");
    });
  });
}

async function checkAuthStatus() {
  try {
    const response = await apiFetch("/api/auth/me");
    if (!response.ok) throw new Error("not authenticated");
    const result = (await response.json()) as { user: AuthUser };
    authState = { status: "authenticated", user: result.user };
    renderAuthState();
    await loadProducts();
  } catch {
    authState = { status: "anonymous" };
    renderAuthState();
  }
}

function renderAuthState() {
  const panel = getElement("wa-ai-auth-panel");
  const title = getElement("wa-ai-auth-title");
  const desc = getElement("wa-ai-auth-desc");
  const loginButton = getElement<HTMLButtonElement>("wa-ai-open-login");

  panel.dataset.auth = authState.status;
  if (authState.status === "authenticated" && authState.user) {
    title.textContent = `已登录：${authState.user.name}`;
    desc.textContent = authState.user.email;
    loginButton.style.display = "none";
    setProtectedControlsDisabled(false);
    return;
  }

  if (authState.status === "checking") {
    title.textContent = "正在检查登录状态";
    desc.textContent = "请稍候。";
    loginButton.style.display = "none";
    setProtectedControlsDisabled(true);
    return;
  }

  title.textContent = "请先登录 Web 后台";
  desc.textContent = "登录后侧边栏才能读取产品、保存客户和生成报价。";
  loginButton.style.display = "inline-flex";
  setProtectedControlsDisabled(true);
}

function setProtectedControlsDisabled(disabled: boolean) {
  [
    "wa-ai-save-customer",
    "wa-ai-refresh-products",
    "wa-ai-search-products",
    "wa-ai-product-search",
    "wa-ai-product-select",
    "wa-ai-copy-product-intro",
    "wa-ai-insert-product-intro",
    "wa-ai-copy-quote",
    "wa-ai-insert-quote",
    "wa-ai-save-quote",
    "wa-ai-follow-up-type",
    "wa-ai-follow-up-remind-at",
    "wa-ai-follow-up-script",
    "wa-ai-save-follow-up"
  ].forEach((id) => {
    const element = document.getElementById(id) as HTMLButtonElement | HTMLSelectElement | null;
    if (element) element.disabled = disabled;
  });
  document.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((button) => {
    button.disabled = disabled;
  });
}

function ensureAuthenticated() {
  if (authState.status === "authenticated") return true;
  renderAuthState();
  setStatus("请先登录 Web 后台，然后回到 WhatsApp 页面刷新侧边栏。");
  return false;
}

async function apiFetch(path: string, init: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include"
  });
  if (response.status === 401) {
    authState = { status: "anonymous" };
    renderAuthState();
  }
  return response;
}

async function loadProducts(query = "") {
  if (!ensureAuthenticated()) return;
  const select = getElement<HTMLSelectElement>("wa-ai-product-select");
  try {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    const response = await apiFetch(`/api/products${params.toString() ? `?${params.toString()}` : ""}`);
    if (!response.ok) throw new Error("products failed");
    const products = (await response.json()) as ProductSummary[];
    select.replaceChildren(option("", products.length > 0 ? "请选择产品" : "暂无产品"), ...products.map((product) => option(product.id, `${product.name} · ${product.sku}`)));
    select.dataset.products = JSON.stringify(products);
    updateSelectedProductMeta();
  } catch {
    select.replaceChildren(option("", "产品加载失败"));
    setStatus("产品资料库加载失败，请确认本地 API 已启动。");
  }
}

async function generateQuoteDraft() {
  if (!ensureAuthenticated()) return;
  const product = selectedProduct();
  if (!product) return setStatus("请先选择产品。");
  if (!Number(getInput("wa-ai-quote-quantity").value) || !Number(getInput("wa-ai-quote-unit-price").value)) {
    return setStatus("请填写数量和单价。");
  }

  setButtonsBusy(true);
  try {
    const response = await apiFetch("/api/quotes/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: getInput("wa-ai-customer-id").value || null,
        productId: product.id,
        quantity: Number(getInput("wa-ai-quote-quantity").value),
        unitPrice: getInput("wa-ai-quote-unit-price").value,
        currency: getInput("wa-ai-quote-currency").value || "USD",
        shippingCost: getInput("wa-ai-quote-shipping").value || null,
        moq: getInput("wa-ai-quote-moq").value ? Number(getInput("wa-ai-quote-moq").value) : null,
        leadTime: getInput("wa-ai-quote-lead-time").value || null,
        includeShipping: isToggleActive("wa-ai-quote-include-shipping"),
        targetLanguage: getSelect("wa-ai-language").value,
        tiers: parseTiers(getTextArea("wa-ai-quote-tiers").value),
        stockKnown: isToggleActive("wa-ai-quote-stock-known"),
        promiseStock: false,
        attachmentSelected: false
      })
    });
    if (!response.ok) throw new Error("quote failed");
    const result = (await response.json()) as QuoteResponse;
    getTextArea("wa-ai-quote-text").value = result.quoteText;
    getReplyTextArea("professional").value = result.quoteText;
    renderRisks(result.riskWarnings);
    setStatus(result.followUpPrompt);
  } catch {
    setStatus("报价生成失败，请检查产品、数量、单价和 API 服务。");
  } finally {
    setButtonsBusy(false);
  }
}

async function saveQuoteToCustomer() {
  if (!ensureAuthenticated()) return;
  const product = selectedProduct();
  if (!product) return setStatus("请先选择产品。");
  const customerId = getInput("wa-ai-customer-id").value.trim();
  if (!customerId) return setStatus("请先保存或选择客户，再保存报价记录。");
  if (!Number(getInput("wa-ai-quote-quantity").value) || !Number(getInput("wa-ai-quote-unit-price").value)) {
    return setStatus("请填写数量和单价。");
  }

  setButtonsBusy(true);
  try {
    const response = await apiFetch("/api/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        productId: product.id,
        quantity: Number(getInput("wa-ai-quote-quantity").value),
        unitPrice: getInput("wa-ai-quote-unit-price").value,
        currency: getInput("wa-ai-quote-currency").value || "USD",
        shippingCost: getInput("wa-ai-quote-shipping").value || null,
        moq: getInput("wa-ai-quote-moq").value ? Number(getInput("wa-ai-quote-moq").value) : null,
        leadTime: getInput("wa-ai-quote-lead-time").value || null,
        includeShipping: isToggleActive("wa-ai-quote-include-shipping"),
        targetLanguage: getSelect("wa-ai-language").value,
        tiers: parseTiers(getTextArea("wa-ai-quote-tiers").value),
        stockKnown: isToggleActive("wa-ai-quote-stock-known"),
        promiseStock: false,
        attachmentSelected: false,
        quoteText: getTextArea("wa-ai-quote-text").value || undefined
      })
    });
    if (!response.ok) throw new Error("save quote failed");
    const result = (await response.json()) as QuoteResponse;
    getTextArea("wa-ai-quote-text").value = result.quoteText;
    renderRisks(result.riskWarnings);
    getSelect("wa-ai-follow-up-type").value = "报价后跟进";
    setFollowUpDate(1);
    updateFollowUpScript();
    setStatus(`${result.followUpPrompt} 报价已保存到客户记录。建议设置明天的报价后跟进提醒。`);
  } catch {
    setStatus("报价保存失败，请确认客户、产品属于当前账号，并且本地 API 已启动。");
  } finally {
    setButtonsBusy(false);
  }
}

async function saveFollowUpTask() {
  if (!ensureAuthenticated()) return;
  const customerId = getInput("wa-ai-customer-id").value.trim();
  if (!customerId) return setStatus("请先保存或选择客户，再设置跟进提醒。");
  const remindAt = getInput("wa-ai-follow-up-remind-at").value;
  if (!remindAt || Number.isNaN(Date.parse(remindAt))) return setStatus("请填写正确的提醒时间。");

  setButtonsBusy(true);
  try {
    const taskType = getSelect("wa-ai-follow-up-type").value as FollowUpTaskType;
    const response = await apiFetch("/api/follow-ups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        taskType,
        remindAt: new Date(remindAt).toISOString(),
        recommendedScript: getTextArea("wa-ai-follow-up-script").value || defaultFollowUpScript(taskType)
      })
    });
    if (!response.ok) throw new Error("follow-up failed");
    setStatus("跟进提醒已保存。系统只做任务提示和草稿，不会自动发送 WhatsApp 消息。");
  } catch {
    setStatus("跟进提醒保存失败，请确认客户属于当前账号并且 API 已启动。");
  } finally {
    setButtonsBusy(false);
  }
}

async function generateSelectedProductIntro() {
  if (!ensureAuthenticated()) return;
  const productId = getElement<HTMLSelectElement>("wa-ai-product-select").value;
  if (!productId) return setStatus("请先选择产品。");

  setButtonsBusy(true);
  try {
    const response = await apiFetch(`/api/products/${productId}/intro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetLanguage: getSelect("wa-ai-language").value, customerMessage: getTextArea("wa-ai-message").value })
    });
    if (!response.ok) throw new Error("intro failed");
    const result = (await response.json()) as ProductIntroResponse;
    getTextArea("wa-ai-product-intro").value = result.intro;
    getReplyTextArea("professional").value = result.intro;
    getInput("wa-ai-interested-product").value = selectedProductLabel();
    renderRisks(result.riskWarnings);
    setStatus(`${result.copyReminder} 来源：${result.source === "stored" ? "产品资料库" : "AI 生成草稿"}`);
  } catch {
    setStatus("产品介绍生成失败，请确认产品资料存在并且 API 已启动。");
  } finally {
    setButtonsBusy(false);
  }
}

async function saveCustomerToApi() {
  if (!ensureAuthenticated()) return;
  const payload = buildCustomerPayload();
  if (!payload.name.trim()) return setStatus("客户名称不能为空。");

  try {
    const customerId = getInput("wa-ai-customer-id").value;
    const response = await apiFetch(customerId ? `/api/customers/${customerId}` : "/api/customers", {
      method: customerId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error("save failed");
    const saved = (await response.json()) as CustomerDetail;
    getInput("wa-ai-customer-id").value = saved.id;
    await storeCustomerProfile(saved);
    setStatus(`客户已保存：${saved.name}`);
  } catch {
    setStatus("客户保存失败。请确认本地 API 和 PostgreSQL 已启动。");
  }
}

async function handleQuickAction(action: Exclude<QuickAction, "product" | "quote">) {
  const customerMessage = getTextArea("wa-ai-message").value.trim();
  if (!customerMessage) return setStatus("请先粘贴客户消息，或读取选中文本。");

  setButtonsBusy(true);
  try {
    const result = await requestAiReply({
      customerMessage,
      targetLanguage: getSelect("wa-ai-language").value,
      scenario: actionScenarioMap[action],
      productContext: buildProductContext(action)
    });
    renderAiReply(result);
    getTextArea("wa-ai-latest-summary").value = `${result.intent}；关注点：${result.concerns.join("、")}`;
    setStatus(statusForAction(action, result.riskWarnings));
  } catch {
    setStatus("生成失败。请确认本地 API 已启动。");
  } finally {
    setButtonsBusy(false);
  }
}

async function requestAiReply(payload: AiReplyRequest) {
  const response = await apiFetch("/api/ai/reply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error("AI reply request failed");
  return response.json() as Promise<AiReplyResponse>;
}

function renderAiReply(result: AiReplyResponse) {
  getTextArea("wa-ai-translation").value = result.translationZh;
  getElement("wa-ai-intent").textContent = result.intent;
  renderChips("wa-ai-concerns", result.concerns);
  renderRisks(result.riskWarnings);
  getReplyTextArea("short").value = result.shortReply;
  getReplyTextArea("professional").value = result.professionalReply;
  getReplyTextArea("closing").value = result.closingReply;
}

function updateRecognitionStatus() {
  setRecognitionStatus(detectRecognitionStatus());
}

function detectRecognitionStatus(): RecognitionStatus {
  if (location.hostname !== "web.whatsapp.com") return "whatsappNotOpen";
  if (!document.querySelector("#app")) return "whatsappNotOpen";

  const chatInput = document.querySelector(
    'footer [contenteditable="true"], [data-testid="conversation-compose-box-input"], div[role="textbox"][contenteditable="true"]'
  );
  if (chatInput) return "normal";

  const mainArea = document.querySelector('main, [role="main"], #main');
  if (mainArea) return "notChat";
  return "abnormal";
}

function setRecognitionStatus(status: RecognitionStatus) {
  const element = document.getElementById("wa-ai-recognition-status");
  if (!element) return;
  element.textContent = recognitionStatusText[status];
  element.dataset.status = status;
}

function updateSelectedProductMeta() {
  const product = selectedProduct();
  const root = getElement("wa-ai-product-meta");
  if (!product) {
    root.textContent = "选择产品后显示 MOQ、价格、交期和卖点。";
    return;
  }
  root.textContent = `MOQ ${product.moq || "-"} · 建议价 ${product.suggestedPrice || "待定"} · 底价 ${product.minPrice || "未填"} · 交期 ${product.leadTime || "待确认"} · ${product.sellingPoints.slice(0, 3).join(" / ")}`;
  getInput("wa-ai-quote-unit-price").value = product.suggestedPrice || "";
  getInput("wa-ai-quote-moq").value = product.moq ? String(product.moq) : "";
  getInput("wa-ai-quote-lead-time").value = product.leadTime || "";
  getTextArea("wa-ai-product-context").value = [
    `Product: ${product.name}`,
    `SKU: ${product.sku}`,
    `MOQ: ${product.moq || "unknown"}`,
    `Suggested price: ${product.suggestedPrice || "unknown"}`,
    `Min price: ${product.minPrice || "unknown"}`,
    `Lead time: ${product.leadTime || "unknown"}`,
    `Selling points: ${product.sellingPoints.join(", ")}`
  ].join("\n");
}

function selectedProduct() {
  const select = getElement<HTMLSelectElement>("wa-ai-product-select");
  const products = JSON.parse(select.dataset.products || "[]") as ProductSummary[];
  return products.find((product) => product.id === select.value);
}

function selectedProductLabel() {
  const product = selectedProduct();
  return product ? `${product.name} (${product.sku})` : "";
}

function renderChips(id: string, values: string[]) {
  const root = getElement(id);
  root.replaceChildren(...values.map((value) => {
    const chip = document.createElement("span");
    chip.textContent = value;
    return chip;
  }));
}

function renderRisks(values: string[]) {
  const root = getElement("wa-ai-risks");
  root.replaceChildren(...values.map((value) => {
    const item = document.createElement("span");
    item.textContent = value;
    return item;
  }));
}

function updateFollowUpScript() {
  const taskType = getSelect("wa-ai-follow-up-type").value as FollowUpTaskType;
  getTextArea("wa-ai-follow-up-script").value = defaultFollowUpScript(taskType);
}

function setFollowUpDate(days: number) {
  const next = new Date();
  next.setDate(next.getDate() + days);
  next.setHours(10, 0, 0, 0);
  getInput("wa-ai-follow-up-remind-at").value = toDateTimeLocal(next.toISOString());
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

function buildCustomerPayload(): CustomerUpsertRequest {
  return {
    name: getInput("wa-ai-customer").value,
    whatsappNumber: getInput("wa-ai-whatsapp-number").value,
    country: getInput("wa-ai-country").value,
    language: getSelect("wa-ai-language").value === "auto" ? null : getSelect("wa-ai-language").value,
    tags: parseTags(getInput("wa-ai-tags").value),
    stage: getSelect("wa-ai-stage").value,
    interestedProduct: getInput("wa-ai-interested-product").value,
    latestSummary: getTextArea("wa-ai-latest-summary").value,
    nextFollowUpAt: getInput("wa-ai-next-follow-up").value ? new Date(getInput("wa-ai-next-follow-up").value).toISOString() : null,
    notes: getTextArea("wa-ai-notes").value
  };
}

function buildProductContext(action: QuickAction) {
  const manualContext = getTextArea("wa-ai-product-context").value.trim();
  const labels: Record<QuickAction, string> = {
    translate: "用户点击了翻译。",
    reply: "用户点击了生成回复。",
    quote: "用户点击了报价，需要避免编造价格、库存、交期和运费。",
    urge: "用户点击了催单，需要保持礼貌克制。",
    product: "用户点击了发产品，需要生成产品介绍草稿。",
    followUp: "用户点击了设置跟进，需要生成可复制的跟进草稿。"
  };
  return [labels[action], manualContext].filter(Boolean).join("\n");
}

function statusForAction(action: QuickAction, risks: string[]) {
  const prefixMap: Record<QuickAction, string> = {
    translate: "中文翻译和回复草稿已生成。",
    reply: "三种多语言回复草稿已生成。",
    quote: "报价草稿已生成。",
    urge: "催单回复草稿已生成。",
    product: "产品介绍草稿已生成。",
    followUp: "跟进草稿已生成。"
  };
  return `${prefixMap[action]}${risks[0] ? ` ${risks[0]}` : ""}`;
}

function parseTiers(value: string) {
  return value.split(/\n/).map((line) => {
    const [quantity, unitPrice] = line.split(/,|\//).map((item) => item.trim());
    return { quantity: Number(quantity), unitPrice };
  }).filter((tier) => tier.quantity > 0 && Number(tier.unitPrice) > 0);
}

function bindToggleButton(id: string, onText: string, offText: string) {
  const button = getElement<HTMLButtonElement>(id);
  button.addEventListener("click", () => {
    const next = button.dataset.active !== "true";
    button.dataset.active = String(next);
    button.textContent = next ? onText : offText;
  });
}

function isToggleActive(id: string) {
  return getElement<HTMLButtonElement>(id).dataset.active === "true";
}

function setButtonsBusy(isBusy: boolean) {
  document.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((button) => {
    button.disabled = isBusy;
  });
}

function setStatus(text: string) {
  getElement("wa-ai-status").textContent = text;
}

async function copyTextArea(id: string, success: string) {
  const value = getTextArea(id).value.trim();
  if (!value) return setStatus("暂无可复制内容。");
  await navigator.clipboard.writeText(value);
  setStatus(success);
}

function insertTextAreaIntoWhatsApp(id: string) {
  const value = getTextArea(id).value.trim();
  if (!value) return setStatus("暂无可插入内容。");

  const input = document.querySelector<HTMLElement>(
    'footer [contenteditable="true"], [data-testid="conversation-compose-box-input"], div[role="textbox"][contenteditable="true"]'
  );
  if (!input) {
    setRecognitionStatus("notChat");
    return setStatus("当前不是聊天窗口，无法插入。请复制后手动粘贴发送。");
  }

  input.focus();
  document.execCommand("insertText", false, value);
  setStatus("草稿已插入 WhatsApp 输入框。请业务员确认价格、库存、交期和运费后手动发送。");
}

function getReplyTextArea(variant: ReplyVariant) {
  return getTextArea(`wa-ai-reply-${variant}`);
}

function getTextArea(id: string) {
  return getElement<HTMLTextAreaElement>(id);
}

function getInput(id: string) {
  return getElement<HTMLInputElement>(id);
}

function getSelect(id: string) {
  return getElement<HTMLSelectElement>(id);
}

function getElement<T extends HTMLElement = HTMLElement>(id: string) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element: ${id}`);
  return element as T;
}

async function restoreCustomerProfile() {
  const result = await chrome.storage.local.get("waAiCustomerProfile");
  const profile = result.waAiCustomerProfile as StoredCustomerProfile | undefined;
  if (!profile) return;
  getInput("wa-ai-customer-id").value = profile.customerId || "";
  getInput("wa-ai-customer").value = profile.name || "";
  getInput("wa-ai-whatsapp-number").value = profile.whatsappNumber || "";
  getInput("wa-ai-country").value = profile.country || "";
  getSelect("wa-ai-language").value = profile.language || "auto";
  getSelect("wa-ai-stage").value = profile.stage || "新线索";
  getInput("wa-ai-tags").value = profile.tags || "";
  getInput("wa-ai-interested-product").value = profile.interestedProduct || "";
  getTextArea("wa-ai-latest-summary").value = profile.latestSummary || "";
  getInput("wa-ai-next-follow-up").value = profile.nextFollowUpAt || "";
  getTextArea("wa-ai-notes").value = profile.notes || "";
}

async function storeCustomerProfile(customer: CustomerDetail) {
  await chrome.storage.local.set({
    waAiCustomerProfile: {
      customerId: customer.id,
      name: customer.name,
      whatsappNumber: customer.whatsappNumber || "",
      country: customer.country || "",
      language: customer.language || "auto",
      stage: customer.stage,
      tags: customer.tags.join(", "),
      interestedProduct: customer.interestedProduct || "",
      latestSummary: customer.latestSummary || "",
      nextFollowUpAt: toDateTimeLocal(customer.nextFollowUpAt),
      notes: customer.notes || ""
    } satisfies StoredCustomerProfile
  });
}

function parseTags(value: string) {
  return Array.from(new Set(value.split(",").map((tag) => tag.trim()).filter(Boolean)));
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 16);
}

function option(value: string, label: string) {
  const element = document.createElement("option");
  element.value = value;
  element.textContent = label;
  return element;
}

function applyWhatsAppOffset() {
  const appRoot = document.getElementById("app");
  if (!appRoot) return;
  if (document.documentElement.classList.contains(HIDDEN_CLASS)) {
    appRoot.style.marginRight = "";
    return;
  }

  const sidebarWidth = document.getElementById(SIDEBAR_ID)?.getBoundingClientRect().width || 0;
  appRoot.style.marginRight = sidebarWidth > 0 ? `${Math.ceil(sidebarWidth)}px` : "";
}

createSidebar();

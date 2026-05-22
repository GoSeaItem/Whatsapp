import type {
  AfterSalesScriptResponse,
  AiReplyRequest,
  AiReplyResponse,
  AiReplyScenario,
  AuthUser,
  CustomerDetail,
  CustomerIntentResponse,
  CustomerPredictionSummary,
  CustomRequestDetail,
  CustomScriptResponse,
  CustomScriptScenario,
  CustomerUpsertRequest,
  FollowUpTaskType,
  MaterialIntroResponse,
  MaterialSummary,
  OrderScriptResponse,
  OrderSummary,
  ProductIntroResponse,
  ProductSummary,
  QuoteResponse,
  ReorderScriptResponse,
  SampleOrderDetail,
  SampleScriptResponse,
  SampleScriptScenario
} from "@wa-ai/shared";
import { AI_SAFETY_NOTE } from "@wa-ai/shared";
import { findPhoneNumbersInText, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
const WEB_LOGIN_URL = import.meta.env.VITE_WEB_LOGIN_URL || "http://localhost:5173";
const SIDEBAR_ID = "wa-ai-sidebar";
const QUICK_TOOLBAR_ID = "wa-ai-quick-toolbar";
const FLOATING_BUTTON_ID = "wa-ai-floating-button";
const HIDDEN_CLASS = "wa-ai-hidden";
const SIDEBAR_MODE_KEY = "waai_sidebar_mode";
const SIDEBAR_BREAKPOINT = 1280;

type QuickAction = "translate" | "reply" | "quote" | "urge" | "product" | "material" | "sample" | "custom" | "afterSales" | "followUp";
type SidebarTab = "customer" | "ai" | "business" | "ab" | "more";
type BusinessModule = "quote" | "material" | "sample" | "custom" | "order" | "afterSales" | "reorder" | "followUp" | "product";
type SidebarMode = "docked" | "collapsed" | "overlay";
type ReplyVariant = "short" | "professional" | "closing";
type RecognitionStatus = "normal" | "abnormal" | "notChat" | "whatsappNotOpen";
type SidebarAuthState = { status: "checking" | "authenticated" | "anonymous"; user?: AuthUser };
type SupplierScriptResponse = {
  scriptText: string;
  alternativeScripts?: string[];
  riskWarnings: string[];
  missingInfo?: string[];
  createdLogId?: string;
};

let authState: SidebarAuthState = { status: "checking" };
let scriptExperiments: Array<any> = [];
let scriptVariants: Array<any> = [];
let lastScriptUsageId = "";
let sidebarOrganizationId = "";
let sidebarBrands: Array<any> = [];
let quickToolbarObserver: MutationObserver | null = null;
let activeSidebarTab: SidebarTab = "ai";
let activeBusinessModule: BusinessModule = "quote";
let sidebarMode: SidebarMode = "docked";
let offsetRoot: HTMLElement | null = null;
let whatsappContextObserver: MutationObserver | null = null;
let contextRefreshTimer: number | null = null;
let lastContextSignature = "";
let lastMatchSignature = "";

type PhoneParseConfidence = "high" | "medium" | "low" | "none";
type RecentMessage = {
  role: "customer" | "me" | "unknown";
  text: string;
  time: string;
  direction: "in" | "out" | "unknown";
};
type WhatsAppConversationContext = {
  contactName: string | null;
  rawTitle: string | null;
  whatsappNumber: string | null;
  phoneCountry: string | null;
  phoneCountryCode: string | null;
  countryCallingCode: string | null;
  phoneParseConfidence: PhoneParseConfidence;
  recentMessages: RecentMessage[];
  latestCustomerMessage: string | null;
  detectedLanguage: string;
  detectedIntent: string;
  concerns: string[];
  matchedCustomer: any | null;
  isSavedCustomer: boolean;
  suggestedCreatePayload: any | null;
  duplicateWarning: any | null;
};

let currentWhatsAppContext: WhatsAppConversationContext = emptyWhatsAppContext();

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
        <div class="wa-ai-two-cols">
          <label class="wa-ai-field"><span>Brand / store</span><select id="wa-ai-brand-select"><option value="">No brand context</option></select></label>
          <button id="wa-ai-refresh-brands" type="button" class="wa-ai-link-button">Refresh brands</button>
        </div>
        <div class="wa-ai-safety-note">Brand context only filters products/materials and draft policies. It does not switch WhatsApp accounts, sync stores, auto-send, or promise brand policy.</div>
        <div class="wa-ai-auto-context">
          <div><span>Auto context</span><strong id="wa-ai-auto-context-state">Manual paste fallback</strong></div>
          <div><span>Phone</span><strong id="wa-ai-auto-phone">-</strong></div>
          <div><span>Country hint</span><strong id="wa-ai-auto-country">-</strong></div>
          <div><span>Language</span><strong id="wa-ai-auto-language">auto</strong></div>
          <div><span>Intent</span><strong id="wa-ai-auto-intent">unknown</strong></div>
          <div class="wa-ai-auto-context-wide"><span>Latest customer message</span><strong id="wa-ai-auto-latest">No visible customer message detected</strong></div>
        </div>
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
        <div class="wa-ai-analysis-grid">
          <div class="wa-ai-analysis-card"><span>意向分</span><strong id="wa-ai-intent-score">保存客户后可计算</strong></div>
          <div class="wa-ai-analysis-card"><span>推荐动作</span><div id="wa-ai-intent-action">推荐动作仅作为销售建议。</div></div>
        </div>
        <button id="wa-ai-refresh-intent" type="button" class="wa-ai-wide-button wa-ai-secondary-wide">计算意向分</button>
        <div class="wa-ai-analysis-grid">
          <div class="wa-ai-analysis-card"><span>复购预测</span><strong id="wa-ai-reorder-score">保存客户后可查看</strong></div>
          <div class="wa-ai-analysis-card"><span>复购建议</span><div id="wa-ai-reorder-action">建议仅作参考，不会自动发送。</div></div>
        </div>
        <label class="wa-ai-field"><span>复购/唤醒话术草稿</span><textarea id="wa-ai-reorder-script" rows="4"></textarea></label>
        <div class="wa-ai-two-actions">
          <button id="wa-ai-load-reorder" type="button" class="wa-ai-wide-button wa-ai-secondary-wide">查看复购建议</button>
          <button id="wa-ai-generate-reorder" type="button" class="wa-ai-wide-button">生成复购话术</button>
        </div>
        <div class="wa-ai-two-actions">
          <button id="wa-ai-copy-reorder-script" type="button" class="wa-ai-wide-button">复制复购话术</button>
          <button id="wa-ai-insert-reorder-script" type="button" class="wa-ai-wide-button wa-ai-secondary-wide">插入输入框</button>
        </div>
        <div class="wa-ai-divider"></div>
        <div class="wa-ai-section-title">
          <h3>Order center</h3>
          <button id="wa-ai-refresh-orders" type="button" class="wa-ai-link-button">Refresh</button>
        </div>
        <div class="wa-ai-safety-note">Orders are manual records only. Confirm payment, production, logistics and after-sales details before sending any draft.</div>
        <label class="wa-ai-field"><span>Current customer orders</span><select id="wa-ai-order-select"><option value="">Save customer first</option></select></label>
        <div class="wa-ai-analysis-card"><span>Fulfillment alerts</span><div id="wa-ai-fulfillment-alerts">Select an order to check fulfillment alerts.</div></div>
        <div class="wa-ai-two-cols">
          <label class="wa-ai-field"><span>Amount</span><input id="wa-ai-order-amount" type="text" placeholder="1000" /></label>
          <label class="wa-ai-field"><span>Currency</span><input id="wa-ai-order-currency" type="text" value="USD" /></label>
        </div>
        <div class="wa-ai-two-cols">
          <label class="wa-ai-field"><span>Quantity</span><input id="wa-ai-order-quantity" type="text" placeholder="100" /></label>
          <label class="wa-ai-field"><span>Status</span><select id="wa-ai-order-status"><option value="draft">draft</option><option value="pending_payment">pending_payment</option><option value="processing">processing</option><option value="shipped">shipped</option><option value="completed">completed</option></select></label>
        </div>
        <label class="wa-ai-field"><span>Order script draft</span><textarea id="wa-ai-order-script" rows="4"></textarea></label>
        <div class="wa-ai-two-actions">
          <button id="wa-ai-create-order" type="button" class="wa-ai-wide-button wa-ai-secondary-wide">Create order</button>
          <button id="wa-ai-generate-order-script" type="button" class="wa-ai-wide-button">Generate order script</button>
        </div>
        <div class="wa-ai-two-actions">
          <button id="wa-ai-copy-order-script" type="button" class="wa-ai-wide-button">Copy order script</button>
          <button id="wa-ai-insert-order-script" type="button" class="wa-ai-wide-button wa-ai-secondary-wide">Insert draft</button>
        </div>
        <div class="wa-ai-two-actions">
          <button id="wa-ai-load-fulfillment" type="button" class="wa-ai-wide-button wa-ai-secondary-wide">Check fulfillment</button>
          <button id="wa-ai-generate-fulfillment-script" type="button" class="wa-ai-wide-button">Fulfillment draft</button>
        </div>
      </section>

      <section class="wa-ai-section">
        <div class="wa-ai-section-title">
          <h3>素材中心</h3>
          <button id="wa-ai-refresh-materials" type="button" class="wa-ai-link-button">刷新</button>
        </div>
        <div class="wa-ai-safety-note">素材说明只生成草稿，不会自动发送 WhatsApp 消息。证书、物流和付款信息必须人工确认。</div>
        <div class="wa-ai-product-search">
          <input id="wa-ai-material-search" type="search" placeholder="搜索素材标题、描述、标签" />
          <button id="wa-ai-search-materials" type="button">搜索</button>
        </div>
        <div class="wa-ai-two-cols">
          <label class="wa-ai-field">
            <span>素材类型</span>
            <select id="wa-ai-material-type">
              <option value="">全部</option>
              <option value="image">image</option>
              <option value="video">video</option>
              <option value="catalog">catalog</option>
              <option value="size_chart">size_chart</option>
              <option value="buyer_show">buyer_show</option>
              <option value="factory_video">factory_video</option>
              <option value="shipping_proof">shipping_proof</option>
              <option value="payment_proof">payment_proof</option>
              <option value="certificate">certificate</option>
              <option value="other">other</option>
            </select>
          </label>
          <label class="wa-ai-field"><span>选择素材</span><select id="wa-ai-material-select"><option value="">加载素材中...</option></select></label>
        </div>
        <div class="wa-ai-product-meta" id="wa-ai-material-meta">选择素材后显示 URL 和标签。</div>
        <label class="wa-ai-field"><span>素材说明话术</span><textarea id="wa-ai-material-intro" rows="4"></textarea></label>
        <div class="wa-ai-two-actions">
          <button id="wa-ai-copy-material-intro" type="button" class="wa-ai-wide-button">复制素材说明</button>
          <button id="wa-ai-insert-material-intro" type="button" class="wa-ai-wide-button wa-ai-secondary-wide">插入输入框</button>
        </div>
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
        <div class="wa-ai-section-title"><h3>样品单</h3></div>
        <div class="wa-ai-safety-note">样品单只记录销售流程，样品话术只生成草稿，不处理真实支付或物流，也不会自动发送 WhatsApp 消息。</div>
        <input id="wa-ai-sample-id" type="hidden" />
        <label class="wa-ai-field"><span>样品名称</span><input id="wa-ai-sample-name" type="text" placeholder="Blue Dress sample" /></label>
        <div class="wa-ai-two-cols">
          <label class="wa-ai-field"><span>样品费</span><input id="wa-ai-sample-fee" type="number" min="0" step="0.01" /></label>
          <label class="wa-ai-field"><span>运费</span><input id="wa-ai-sample-shipping" type="number" min="0" step="0.01" /></label>
        </div>
        <div class="wa-ai-two-cols">
          <label class="wa-ai-field"><span>币种</span><input id="wa-ai-sample-currency" type="text" value="USD" /></label>
          <label class="wa-ai-field"><span>物流单号</span><input id="wa-ai-sample-tracking" type="text" placeholder="未发货可留空" /></label>
        </div>
        <div class="wa-ai-two-cols">
          <label class="wa-ai-field"><span>预计发货日</span><input id="wa-ai-sample-ship-date" type="date" /></label>
          <label class="wa-ai-field"><span>预计签收日</span><input id="wa-ai-sample-delivery-date" type="date" /></label>
        </div>
        <label class="wa-ai-field">
          <span>样品话术场景</span>
          <select id="wa-ai-sample-scenario">
            <option value="sample_quote">样品报价</option>
            <option value="sample_payment_reminder">样品付款提醒</option>
            <option value="sample_shipped">样品发货通知</option>
            <option value="sample_feedback_follow_up">样品签收反馈跟进</option>
            <option value="sample_to_bulk_order">样品转大货引导</option>
          </select>
        </label>
        <label class="wa-ai-field"><span>样品备注</span><textarea id="wa-ai-sample-notes" rows="3"></textarea></label>
        <label class="wa-ai-field"><span>样品话术草稿</span><textarea id="wa-ai-sample-script" rows="5"></textarea></label>
        <div class="wa-ai-two-actions">
          <button id="wa-ai-save-sample" type="button" class="wa-ai-wide-button">保存样品单</button>
          <button id="wa-ai-generate-sample-script" type="button" class="wa-ai-wide-button wa-ai-secondary-wide">生成样品话术</button>
        </div>
        <div class="wa-ai-two-actions">
          <button id="wa-ai-copy-sample-script" type="button" class="wa-ai-wide-button">复制样品话术</button>
          <button id="wa-ai-insert-sample-script" type="button" class="wa-ai-wide-button wa-ai-secondary-wide">插入输入框</button>
        </div>
        <button id="wa-ai-sample-follow-up" type="button" class="wa-ai-wide-button wa-ai-secondary-wide">设置样品反馈跟进</button>
      </section>

      <section class="wa-ai-section">
        <div class="wa-ai-section-title"><h3>Custom</h3></div>
        <div class="wa-ai-safety-note">Custom request scripts are drafts only. No production scheduling, payment processing, or WhatsApp auto-send.</div>
        <input id="wa-ai-custom-id" type="hidden" />
        <label class="wa-ai-field"><span>Type</span><select id="wa-ai-custom-type">
          <option value="logo">logo</option><option value="packaging">packaging</option><option value="color">color</option><option value="size">size</option><option value="material">material</option><option value="oem">oem</option><option value="odm">odm</option><option value="mixed">mixed</option><option value="other">other</option>
        </select></label>
        <div class="wa-ai-secondary-actions">
          <button id="wa-ai-custom-logo" type="button" data-active="false">Logo not confirmed</button>
          <button id="wa-ai-custom-packaging" type="button" data-active="false">Packaging not confirmed</button>
        </div>
        <div class="wa-ai-two-cols">
          <label class="wa-ai-field"><span>Color</span><input id="wa-ai-custom-color" type="text" /></label>
          <label class="wa-ai-field"><span>Size</span><input id="wa-ai-custom-size" type="text" /></label>
        </div>
        <label class="wa-ai-field"><span>Material</span><input id="wa-ai-custom-material" type="text" /></label>
        <div class="wa-ai-two-cols">
          <label class="wa-ai-field"><span>Quantity</span><input id="wa-ai-custom-quantity" type="number" min="0" /></label>
          <label class="wa-ai-field"><span>MOQ</span><input id="wa-ai-custom-moq" type="number" min="0" /></label>
        </div>
        <div class="wa-ai-two-cols">
          <label class="wa-ai-field"><span>Sample fee</span><input id="wa-ai-custom-sample-fee" type="number" min="0" step="0.01" /></label>
          <label class="wa-ai-field"><span>Status</span><select id="wa-ai-custom-status"><option value="draft">draft</option><option value="waiting_customer_confirm">waiting_customer_confirm</option><option value="sample_making">sample_making</option><option value="sample_confirmed">sample_confirmed</option><option value="bulk_production">bulk_production</option><option value="closed">closed</option><option value="cancelled">cancelled</option></select></label>
        </div>
        <div class="wa-ai-two-cols">
          <label class="wa-ai-field"><span>Sample lead time</span><input id="wa-ai-custom-sample-lead-time" type="text" /></label>
          <label class="wa-ai-field"><span>Bulk lead time</span><input id="wa-ai-custom-bulk-lead-time" type="text" /></label>
        </div>
        <label class="wa-ai-field"><span>File URLs</span><textarea id="wa-ai-custom-files" rows="2" placeholder="one URL per line"></textarea></label>
        <label class="wa-ai-field"><span>Scenario</span><select id="wa-ai-custom-scenario"><option value="custom_confirm">custom_confirm</option><option value="custom_request_files">custom_request_files</option><option value="custom_moq_explain">custom_moq_explain</option><option value="custom_sample_fee">custom_sample_fee</option><option value="custom_sample_lead_time">custom_sample_lead_time</option><option value="custom_bulk_lead_time">custom_bulk_lead_time</option><option value="custom_risk_confirm">custom_risk_confirm</option></select></label>
        <label class="wa-ai-field"><span>Notes</span><textarea id="wa-ai-custom-notes" rows="3"></textarea></label>
        <label class="wa-ai-field"><span>Custom script draft</span><textarea id="wa-ai-custom-script" rows="5"></textarea></label>
        <div class="wa-ai-two-actions">
          <button id="wa-ai-save-custom" type="button" class="wa-ai-wide-button">Save custom request</button>
          <button id="wa-ai-generate-custom-script" type="button" class="wa-ai-wide-button wa-ai-secondary-wide">Generate custom script</button>
        </div>
        <div class="wa-ai-two-actions">
          <button id="wa-ai-copy-custom-script" type="button" class="wa-ai-wide-button">Copy custom script</button>
          <button id="wa-ai-insert-custom-script" type="button" class="wa-ai-wide-button wa-ai-secondary-wide">Insert draft</button>
        </div>
        <button id="wa-ai-custom-follow-up" type="button" class="wa-ai-wide-button wa-ai-secondary-wide">Set custom follow-up</button>
      </section>

      <section class="wa-ai-section">
        <div class="wa-ai-section-title"><h3>After-sales</h3></div>
        <div class="wa-ai-safety-note">After-sales records and scripts are drafts only. They do not refund, reship, confirm responsibility, query logistics, or send WhatsApp messages.</div>
        <input id="wa-ai-after-sales-id" type="hidden" />
        <div class="wa-ai-two-cols">
          <label class="wa-ai-field"><span>Case type</span><select id="wa-ai-after-sales-type">
            <option value="quality_issue">quality_issue</option>
            <option value="shipping_delay">shipping_delay</option>
            <option value="missing_item">missing_item</option>
            <option value="wrong_item">wrong_item</option>
            <option value="refund_request">refund_request</option>
            <option value="return_request">return_request</option>
            <option value="reship_request">reship_request</option>
            <option value="complaint">complaint</option>
            <option value="other">other</option>
          </select></label>
          <label class="wa-ai-field"><span>Priority</span><select id="wa-ai-after-sales-priority">
            <option value="medium">medium</option>
            <option value="low">low</option>
            <option value="high">high</option>
            <option value="urgent">urgent</option>
          </select></label>
        </div>
        <label class="wa-ai-field"><span>Customer claim</span><textarea id="wa-ai-after-sales-claim" rows="3" placeholder="Paste the complaint or problem details"></textarea></label>
        <label class="wa-ai-field"><span>Evidence URLs</span><textarea id="wa-ai-after-sales-evidence" rows="2" placeholder="one image/video/logistics URL per line"></textarea></label>
        <label class="wa-ai-field"><span>Script scenario</span><select id="wa-ai-after-sales-scenario">
          <option value="ask_for_evidence">ask_for_evidence</option>
          <option value="apologize_and_acknowledge">apologize_and_acknowledge</option>
          <option value="explain_shipping_delay">explain_shipping_delay</option>
          <option value="explain_quality_check">explain_quality_check</option>
          <option value="refund_policy_explain">refund_policy_explain</option>
          <option value="reship_arrangement">reship_arrangement</option>
          <option value="solution_confirm">solution_confirm</option>
          <option value="follow_up_after_resolved">follow_up_after_resolved</option>
          <option value="calm_down_complaint">calm_down_complaint</option>
          <option value="request_internal_confirmation">request_internal_confirmation</option>
        </select></label>
        <label class="wa-ai-field"><span>After-sales script draft</span><textarea id="wa-ai-after-sales-script" rows="5"></textarea></label>
        <div class="wa-ai-two-actions">
          <button id="wa-ai-save-after-sales" type="button" class="wa-ai-wide-button">Create after-sales case</button>
          <button id="wa-ai-generate-after-sales-script" type="button" class="wa-ai-wide-button wa-ai-secondary-wide">Generate after-sales script</button>
        </div>
        <div class="wa-ai-two-actions">
          <button id="wa-ai-copy-after-sales-script" type="button" class="wa-ai-wide-button">Copy after-sales script</button>
          <button id="wa-ai-insert-after-sales-script" type="button" class="wa-ai-wide-button wa-ai-secondary-wide">Insert draft</button>
        </div>
      </section>

      <section class="wa-ai-section">
        <div class="wa-ai-section-title"><h3>Supplier / procurement</h3></div>
        <div class="wa-ai-safety-note">Supplier scripts are drafts only. The extension does not contact suppliers, create purchase orders, confirm costs, or apply supplier costs automatically.</div>
        <div class="wa-ai-two-cols">
          <label class="wa-ai-field"><span>Supplier ID</span><input id="wa-ai-supplier-id" type="text" placeholder="optional supplier id" /></label>
          <label class="wa-ai-field"><span>Order ID</span><input id="wa-ai-supplier-order-id" type="text" placeholder="optional order id" /></label>
        </div>
        <label class="wa-ai-field"><span>Product ID</span><input id="wa-ai-supplier-product-id" type="text" placeholder="optional product id; selected product is used if empty" /></label>
        <label class="wa-ai-field"><span>Supplier script scenario</span><select id="wa-ai-supplier-scenario">
          <option value="ask_price">ask_price</option>
          <option value="ask_moq">ask_moq</option>
          <option value="ask_sample_fee">ask_sample_fee</option>
          <option value="ask_lead_time">ask_lead_time</option>
          <option value="ask_bulk_order_cost">ask_bulk_order_cost</option>
          <option value="ask_custom_feasibility">ask_custom_feasibility</option>
          <option value="ask_quality_issue">ask_quality_issue</option>
          <option value="ask_reship_cost">ask_reship_cost</option>
          <option value="negotiate_price">negotiate_price</option>
          <option value="confirm_purchase_details">confirm_purchase_details</option>
        </select></label>
        <label class="wa-ai-field"><span>Supplier draft</span><textarea id="wa-ai-supplier-script" rows="5"></textarea></label>
        <div class="wa-ai-two-actions">
          <button id="wa-ai-generate-supplier-script" type="button" class="wa-ai-wide-button">Generate supplier draft</button>
          <button id="wa-ai-copy-supplier-script" type="button" class="wa-ai-wide-button wa-ai-secondary-wide">Copy supplier draft</button>
        </div>
        <button id="wa-ai-insert-supplier-script" type="button" class="wa-ai-wide-button wa-ai-secondary-wide">Insert draft</button>
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
          <button data-action="material" type="button">发素材</button>
          <button data-action="sample" type="button">样品</button>
          <button data-action="custom" type="button">Custom</button>
          <button data-action="afterSales" type="button">After-sales</button>
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

      <section class="wa-ai-section">
        <div class="wa-ai-section-title">
          <h3>A/B Script Test</h3>
          <button id="wa-ai-refresh-script-tests" type="button" class="wa-ai-link-button">Refresh</button>
        </div>
        <div class="wa-ai-safety-note">A/B scripts are drafts only. Copying or inserting records usage, but the final WhatsApp send action is always manual.</div>
        <label class="wa-ai-field"><span>Active experiment</span><select id="wa-ai-script-experiment-select"><option value="">No active experiment loaded</option></select></label>
        <label class="wa-ai-field"><span>Variant</span><select id="wa-ai-script-variant-select"><option value="">Select experiment first</option></select></label>
        <label class="wa-ai-field"><span>Variant draft</span><textarea id="wa-ai-script-test-draft" rows="5"></textarea></label>
        <div class="wa-ai-two-actions">
          <button id="wa-ai-copy-script-test" type="button" class="wa-ai-wide-button">Copy + record</button>
          <button id="wa-ai-insert-script-test" type="button" class="wa-ai-wide-button wa-ai-secondary-wide">Insert + record</button>
        </div>
        <div class="wa-ai-two-actions">
          <button id="wa-ai-mark-script-replied" type="button" class="wa-ai-wide-button wa-ai-secondary-wide">Mark replied</button>
          <button id="wa-ai-mark-script-quote" type="button" class="wa-ai-wide-button wa-ai-secondary-wide">Mark quote</button>
        </div>
        <div class="wa-ai-two-actions">
          <button id="wa-ai-mark-script-order" type="button" class="wa-ai-wide-button wa-ai-secondary-wide">Mark order</button>
          <button id="wa-ai-mark-script-no-response" type="button" class="wa-ai-wide-button wa-ai-secondary-wide">Mark no response</button>
        </div>
      </section>
    <footer class="wa-ai-footer">
      <div id="wa-ai-recognition-status" class="wa-ai-recognition-status">识别异常，已切换复制粘贴模式</div>
      <div id="wa-ai-status">当前为复制粘贴模式。报价和回复只生成草稿，不会自动发送 WhatsApp 消息。</div>
    </footer>
  `;
  document.body.appendChild(sidebar);

  upgradeSidebarWorkbench(sidebar);
  initializeSidebarMode();
  mountQuickToolbar();
  setupQuickToolbarObserver();
  setupWhatsAppContextObserver();
  bindEvents(toggleButton);
  applyWhatsAppOffset();
  updateRecognitionStatus();
  window.addEventListener("focus", updateRecognitionStatus);
  window.addEventListener("hashchange", updateRecognitionStatus);
  window.addEventListener("resize", handleSidebarResize);
  window.addEventListener("beforeunload", cleanupExtensionObservers);
  void restoreCustomerProfile();
  void checkAuthStatus();
  scheduleWhatsAppContextRefresh();
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

function upgradeSidebarWorkbench(sidebar: HTMLElement) {
  const header = sidebar.querySelector<HTMLElement>(".wa-ai-header");
  if (header) {
    header.innerHTML = `
      <div>
        <p class="wa-ai-kicker">复制粘贴模式 / 已连接后台</p>
        <h2>WhatsApp AI 销售助手</h2>
      </div>
      <div class="wa-ai-header-actions">
        <span class="wa-ai-pill">草稿模式</span>
        <button id="wa-ai-refresh-sidebar" type="button" title="刷新">↻</button>
        <button id="wa-ai-collapse-sidebar" type="button" title="收起">×</button>
      </div>
    `;
  }

  const authPanel = getElement("wa-ai-auth-panel");
  authPanel.classList.add("wa-ai-login-card");
  const contextCard = document.createElement("section");
  contextCard.className = "wa-ai-context-card";
  contextCard.innerHTML = `
    <div class="wa-ai-context-row">
      <div><span>客户</span><strong id="wa-ai-context-customer">未保存</strong></div>
      <div><span>阶段</span><strong id="wa-ai-context-stage">新线索</strong></div>
    </div>
    <div class="wa-ai-context-row">
      <div><span>品牌</span><strong id="wa-ai-context-brand">未选择</strong></div>
      <div><span>意向</span><strong id="wa-ai-context-intent">保存后计算</strong></div>
    </div>
    <p>品牌仅影响产品、素材、知识库和草稿策略，不会切换 WhatsApp 账号。</p>
  `;
  authPanel.insertAdjacentElement("afterend", contextCard);

  const tabs = document.createElement("nav");
  tabs.className = "wa-ai-tabs";
  tabs.innerHTML = `
    <button type="button" data-tab="customer">客户</button>
    <button type="button" data-tab="ai">AI</button>
    <button type="button" data-tab="business">业务</button>
    <button type="button" data-tab="ab">A/B</button>
    <button type="button" data-tab="more">更多</button>
  `;
  contextCard.insertAdjacentElement("afterend", tabs);

  const scroll = sidebar.querySelector<HTMLElement>(".wa-ai-scroll");
  if (!scroll) return;

  const panels = document.createElement("section");
  panels.className = "wa-ai-tab-panels";
  panels.innerHTML = `
    <div class="wa-ai-tab-panel" data-panel="customer"></div>
    <div class="wa-ai-tab-panel" data-panel="ai"></div>
    <div class="wa-ai-tab-panel" data-panel="business"></div>
    <div class="wa-ai-tab-panel" data-panel="ab"></div>
    <div class="wa-ai-tab-panel" data-panel="more"></div>
  `;

  const customerPanel = panels.querySelector<HTMLElement>('[data-panel="customer"]')!;
  const aiPanel = panels.querySelector<HTMLElement>('[data-panel="ai"]')!;
  const businessPanel = panels.querySelector<HTMLElement>('[data-panel="business"]')!;
  const abPanel = panels.querySelector<HTMLElement>('[data-panel="ab"]')!;
  const morePanel = panels.querySelector<HTMLElement>('[data-panel="more"]')!;
  businessPanel.appendChild(createBusinessLauncher());
  morePanel.appendChild(createMorePanel());

  Array.from(sidebar.querySelectorAll<HTMLElement>(".wa-ai-section")).forEach((section) => {
    const module = classifyBusinessModule(section);
    if (section.classList.contains("wa-ai-business-launcher")) return;
    if (section.querySelector("#wa-ai-script-experiment-select")) {
      enhanceAbSection(section);
      abPanel.appendChild(section);
      return;
    }
    if (section.querySelector("#wa-ai-message") || section.querySelector(".wa-ai-replies") || section.querySelector("[data-action]")) {
      aiPanel.appendChild(section);
      return;
    }
    if (section.querySelector("#wa-ai-save-customer")) {
      section.classList.add("wa-ai-customer-lite");
      customerPanel.appendChild(section);
      return;
    }
    if (section.querySelector("#wa-ai-supplier-script")) {
      morePanel.appendChild(section);
      return;
    }
    if (module) {
      section.dataset.businessModule = module;
      section.classList.add("wa-ai-business-module");
      businessPanel.appendChild(section);
      return;
    }
    morePanel.appendChild(section);
  });

  scroll.replaceChildren(panels);

  const bottomBar = document.createElement("section");
  bottomBar.className = "wa-ai-bottom-bar";
  bottomBar.innerHTML = `
    <button type="button" data-toolbar-action="reply">AI 回复</button>
    <button type="button" data-toolbar-action="quote">报价</button>
    <button type="button" id="wa-ai-bottom-save">保存</button>
    <button type="button" data-toolbar-action="more">更多</button>
  `;
  sidebar.insertBefore(bottomBar, sidebar.querySelector(".wa-ai-footer"));
  openSidebarTab("ai");
  showBusinessModule("quote");
  updateContextCard();
}

function createBusinessLauncher() {
  const section = document.createElement("section");
  section.className = "wa-ai-section wa-ai-business-launcher";
  section.innerHTML = `
    <div class="wa-ai-section-title"><h3>业务动作</h3><span>当前客户快捷操作</span></div>
    <div class="wa-ai-business-grid">
      <button type="button" data-business-panel="quote">💬 报价</button>
      <button type="button" data-business-panel="material">🖼 素材</button>
      <button type="button" data-business-panel="sample">🧪 样品</button>
      <button type="button" data-business-panel="custom">🎨 定制</button>
      <button type="button" data-business-panel="order">📦 订单</button>
      <button type="button" data-business-panel="afterSales">🛟 售后</button>
      <button type="button" data-business-panel="reorder">🔁 复购</button>
      <button type="button" data-business-panel="followUp">⏰ 跟进</button>
    </div>
  `;
  return section;
}

function createMorePanel() {
  const section = document.createElement("section");
  section.className = "wa-ai-section";
  section.innerHTML = `
    <div class="wa-ai-section-title"><h3>更多入口</h3><span>复杂管理到 Web 后台完成</span></div>
    <div class="wa-ai-more-grid">
      <button type="button" data-open-web="">打开 Web 后台</button>
      <button type="button" data-open-web="#brands">品牌管理</button>
      <button type="button" data-open-web="#suppliers">供应商</button>
      <button type="button" data-open-web="#profit">利润复盘</button>
      <button type="button" data-open-web="#fulfillment">履约看板</button>
      <button type="button" data-open-web="#script-tests">A/B 实验管理</button>
      <button type="button" id="wa-ai-refresh-cache">刷新缓存</button>
      <button type="button" disabled>退出登录请到 Web 后台</button>
    </div>
    <div class="wa-ai-info-note">仅生成草稿，不会自动发送 WhatsApp 消息。</div>
  `;
  return section;
}

function enhanceAbSection(section: HTMLElement) {
  const safety = section.querySelector<HTMLElement>(".wa-ai-safety-note");
  if (safety) {
    safety.className = "wa-ai-info-note";
    safety.textContent = "A/B 话术仅记录草稿使用，最终发送需手动完成。";
  }
  const copy = document.getElementById("wa-ai-copy-script-test");
  const insert = document.getElementById("wa-ai-insert-script-test");
  if (copy) copy.textContent = "复制并记录";
  if (insert) insert.textContent = "插入并记录";
  ["wa-ai-mark-script-replied", "wa-ai-mark-script-quote", "wa-ai-mark-script-order", "wa-ai-mark-script-no-response"].forEach((id) => {
    document.getElementById(id)?.classList.add("wa-ai-hidden-control");
  });
  const controls = document.createElement("div");
  controls.className = "wa-ai-two-actions";
  controls.innerHTML = `
    <label class="wa-ai-field"><span>标记结果</span><select id="wa-ai-script-outcome-select">
      <option value="customer_replied">已回复</option>
      <option value="quote_created">已报价</option>
      <option value="order_created">已下单</option>
      <option value="no_response">无回复</option>
    </select></label>
    <button id="wa-ai-mark-script-outcome" type="button" class="wa-ai-wide-button wa-ai-secondary-wide">标记结果</button>
  `;
  const draft = document.getElementById("wa-ai-script-test-draft");
  draft?.closest(".wa-ai-field")?.insertAdjacentElement("afterend", controls);
}

function classifyBusinessModule(section: HTMLElement): BusinessModule | null {
  if (section.querySelector("#wa-ai-quote-text")) return "quote";
  if (section.querySelector("#wa-ai-material-select")) return "material";
  if (section.querySelector("#wa-ai-sample-name")) return "sample";
  if (section.querySelector("#wa-ai-custom-type")) return "custom";
  if (section.querySelector("#wa-ai-order-select")) return "order";
  if (section.querySelector("#wa-ai-after-sales-type")) return "afterSales";
  if (section.querySelector("#wa-ai-reorder-script")) return "reorder";
  if (section.querySelector("#wa-ai-follow-up-type")) return "followUp";
  if (section.querySelector("#wa-ai-product-select")) return "product";
  return null;
}

function bindEvents(toggleButton: HTMLButtonElement) {
  toggleButton.addEventListener("click", () => {
    setSidebarMode("docked", { persist: true });
    openSidebarTab(activeSidebarTab || "ai");
  });

  document.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => openSidebarTab(button.dataset.tab as SidebarTab));
  });
  document.querySelectorAll<HTMLButtonElement>("[data-toolbar-action]").forEach((button) => {
    button.addEventListener("click", () => void handleToolbarAction(button.dataset.toolbarAction || "reply"));
  });
  document.querySelectorAll<HTMLButtonElement>("[data-business-panel]").forEach((button) => {
    button.addEventListener("click", () => showBusinessModule(button.dataset.businessPanel as BusinessModule));
  });
  document.querySelectorAll<HTMLButtonElement>("[data-open-web]").forEach((button) => {
    button.addEventListener("click", () => window.open(`${WEB_LOGIN_URL}${button.dataset.openWeb || ""}`, "_blank", "noopener,noreferrer"));
  });
  getElement<HTMLButtonElement>("wa-ai-collapse-sidebar").addEventListener("click", () => {
    setSidebarMode("collapsed", { persist: true });
  });
  getElement<HTMLButtonElement>("wa-ai-refresh-sidebar").addEventListener("click", () => {
    void checkAuthStatus();
    updateRecognitionStatus();
    mountQuickToolbar();
  });
  getElement<HTMLButtonElement>("wa-ai-bottom-save").addEventListener("click", saveCustomerToApi);
  getElement<HTMLButtonElement>("wa-ai-refresh-cache").addEventListener("click", () => {
    void checkAuthStatus();
    setStatus("缓存已刷新。所有草稿仍需人工确认后发送。");
  });

  getElement<HTMLButtonElement>("wa-ai-save-customer").addEventListener("click", saveCustomerToApi);
  getElement<HTMLButtonElement>("wa-ai-refresh-intent").addEventListener("click", () => void loadCustomerIntentScore());
  getElement<HTMLButtonElement>("wa-ai-load-reorder").addEventListener("click", () => void loadReorderPrediction());
  getElement<HTMLButtonElement>("wa-ai-generate-reorder").addEventListener("click", () => void generateReorderScriptFromSidebar());
  getElement<HTMLButtonElement>("wa-ai-copy-reorder-script").addEventListener("click", () => copyTextArea("wa-ai-reorder-script", "复购话术已复制，请人工确认后手动发送。"));
  getElement<HTMLButtonElement>("wa-ai-insert-reorder-script").addEventListener("click", () => insertTextAreaIntoWhatsApp("wa-ai-reorder-script"));
  getElement<HTMLButtonElement>("wa-ai-refresh-orders").addEventListener("click", () => void loadOrdersForCurrentCustomer());
  getElement<HTMLButtonElement>("wa-ai-create-order").addEventListener("click", () => void createOrderFromSidebar());
  getElement<HTMLButtonElement>("wa-ai-generate-order-script").addEventListener("click", () => void generateOrderScriptFromSidebar());
  getElement<HTMLButtonElement>("wa-ai-load-fulfillment").addEventListener("click", () => void loadOrderFulfillmentFromSidebar());
  getElement<HTMLButtonElement>("wa-ai-generate-fulfillment-script").addEventListener("click", () => void generateFulfillmentScriptFromSidebar());
  getElement<HTMLButtonElement>("wa-ai-copy-order-script").addEventListener("click", () => copyTextArea("wa-ai-order-script", "Order script copied. Please confirm manually before sending."));
  getElement<HTMLButtonElement>("wa-ai-insert-order-script").addEventListener("click", () => insertTextAreaIntoWhatsApp("wa-ai-order-script"));
  getElement<HTMLButtonElement>("wa-ai-open-login").addEventListener("click", () => {
    window.open(WEB_LOGIN_URL, "_blank", "noopener,noreferrer");
  });
  getElement<HTMLButtonElement>("wa-ai-refresh-brands").addEventListener("click", () => void loadBrandsForSidebar());
  getElement<HTMLSelectElement>("wa-ai-brand-select").addEventListener("change", () => {
    void loadProducts(getInput("wa-ai-product-search").value);
    void loadMaterials(getInput("wa-ai-material-search").value);
    setStatus("Brand context changed. Drafts will use this brand after manual confirmation; no WhatsApp account was switched.");
  });
  getElement<HTMLButtonElement>("wa-ai-refresh-products").addEventListener("click", () => void loadProducts());
  getElement<HTMLButtonElement>("wa-ai-search-products").addEventListener("click", () => void loadProducts(getInput("wa-ai-product-search").value));
  getInput("wa-ai-product-search").addEventListener("keydown", (event) => {
    if (event.key === "Enter") void loadProducts(getInput("wa-ai-product-search").value);
  });
  getElement<HTMLSelectElement>("wa-ai-product-select").addEventListener("change", updateSelectedProductMeta);
  getElement<HTMLButtonElement>("wa-ai-refresh-materials").addEventListener("click", () => void loadMaterials());
  getElement<HTMLButtonElement>("wa-ai-search-materials").addEventListener("click", () => void loadMaterials(getInput("wa-ai-material-search").value));
  getInput("wa-ai-material-search").addEventListener("keydown", (event) => {
    if (event.key === "Enter") void loadMaterials(getInput("wa-ai-material-search").value);
  });
  getElement<HTMLSelectElement>("wa-ai-material-type").addEventListener("change", () => void loadMaterials(getInput("wa-ai-material-search").value));
  getElement<HTMLSelectElement>("wa-ai-material-select").addEventListener("change", updateSelectedMaterialMeta);
  getElement<HTMLButtonElement>("wa-ai-copy-product-intro").addEventListener("click", () => copyTextArea("wa-ai-product-intro", "产品介绍已复制，请手动发送。"));
  getElement<HTMLButtonElement>("wa-ai-insert-product-intro").addEventListener("click", () => insertTextAreaIntoWhatsApp("wa-ai-product-intro"));
  getElement<HTMLButtonElement>("wa-ai-copy-quote").addEventListener("click", () => copyTextArea("wa-ai-quote-text", "报价文案已复制，请手动发送。"));
  getElement<HTMLButtonElement>("wa-ai-insert-quote").addEventListener("click", () => insertTextAreaIntoWhatsApp("wa-ai-quote-text"));
  getElement<HTMLButtonElement>("wa-ai-copy-material-intro").addEventListener("click", () => copyTextArea("wa-ai-material-intro", "素材说明已复制，请手动发送。"));
  getElement<HTMLButtonElement>("wa-ai-insert-material-intro").addEventListener("click", () => insertTextAreaIntoWhatsApp("wa-ai-material-intro"));
  getElement<HTMLButtonElement>("wa-ai-save-quote").addEventListener("click", () => void saveQuoteToCustomer());
  getElement<HTMLSelectElement>("wa-ai-follow-up-type").addEventListener("change", updateFollowUpScript);
  getElement<HTMLButtonElement>("wa-ai-save-follow-up").addEventListener("click", () => void saveFollowUpTask());
  getElement<HTMLButtonElement>("wa-ai-save-sample").addEventListener("click", () => void saveSampleOrderFromSidebar());
  getElement<HTMLButtonElement>("wa-ai-generate-sample-script").addEventListener("click", () => void generateSampleScriptFromSidebar());
  getElement<HTMLButtonElement>("wa-ai-copy-sample-script").addEventListener("click", () => copyTextArea("wa-ai-sample-script", "样品话术已复制，请人工确认后手动发送。"));
  getElement<HTMLButtonElement>("wa-ai-insert-sample-script").addEventListener("click", () => insertTextAreaIntoWhatsApp("wa-ai-sample-script"));
  getElement<HTMLButtonElement>("wa-ai-sample-follow-up").addEventListener("click", seedSampleFeedbackFollowUp);
  getElement<HTMLButtonElement>("wa-ai-save-custom").addEventListener("click", () => void saveCustomRequestFromSidebar());
  getElement<HTMLButtonElement>("wa-ai-generate-custom-script").addEventListener("click", () => void generateCustomScriptFromSidebar());
  getElement<HTMLButtonElement>("wa-ai-copy-custom-script").addEventListener("click", () => copyTextArea("wa-ai-custom-script", "Custom script copied. Please confirm manually before sending."));
  getElement<HTMLButtonElement>("wa-ai-insert-custom-script").addEventListener("click", () => insertTextAreaIntoWhatsApp("wa-ai-custom-script"));
  getElement<HTMLButtonElement>("wa-ai-custom-follow-up").addEventListener("click", seedCustomFollowUp);
  getElement<HTMLButtonElement>("wa-ai-save-after-sales").addEventListener("click", () => void createAfterSalesFromSidebar());
  getElement<HTMLButtonElement>("wa-ai-generate-after-sales-script").addEventListener("click", () => void generateAfterSalesScriptFromSidebar());
  getElement<HTMLButtonElement>("wa-ai-copy-after-sales-script").addEventListener("click", () => copyTextArea("wa-ai-after-sales-script", "After-sales script copied. Confirm policy and facts before sending."));
  getElement<HTMLButtonElement>("wa-ai-insert-after-sales-script").addEventListener("click", () => insertTextAreaIntoWhatsApp("wa-ai-after-sales-script"));
  getElement<HTMLButtonElement>("wa-ai-generate-supplier-script").addEventListener("click", () => void generateSupplierScriptFromSidebar());
  getElement<HTMLButtonElement>("wa-ai-copy-supplier-script").addEventListener("click", () => copyTextArea("wa-ai-supplier-script", "Supplier draft copied. Confirm price, MOQ, lead time, quality and cost before contacting the supplier manually."));
  getElement<HTMLButtonElement>("wa-ai-insert-supplier-script").addEventListener("click", () => insertTextAreaIntoWhatsApp("wa-ai-supplier-script"));
  getElement<HTMLButtonElement>("wa-ai-refresh-script-tests").addEventListener("click", () => void loadScriptExperimentsForSidebar());
  getElement<HTMLSelectElement>("wa-ai-script-experiment-select").addEventListener("change", () => void loadSelectedScriptExperiment());
  getElement<HTMLSelectElement>("wa-ai-script-variant-select").addEventListener("change", updateSelectedScriptVariantDraft);
  getElement<HTMLButtonElement>("wa-ai-copy-script-test").addEventListener("click", () => void recordScriptUsageFromSidebar("copy"));
  getElement<HTMLButtonElement>("wa-ai-insert-script-test").addEventListener("click", () => void recordScriptUsageFromSidebar("insert"));
  getElement<HTMLButtonElement>("wa-ai-mark-script-replied").addEventListener("click", () => void markScriptUsageOutcomeFromSidebar("customer_replied"));
  getElement<HTMLButtonElement>("wa-ai-mark-script-quote").addEventListener("click", () => void markScriptUsageOutcomeFromSidebar("quote_created"));
  getElement<HTMLButtonElement>("wa-ai-mark-script-order").addEventListener("click", () => void markScriptUsageOutcomeFromSidebar("order_created"));
  getElement<HTMLButtonElement>("wa-ai-mark-script-no-response").addEventListener("click", () => void markScriptUsageOutcomeFromSidebar("no_response"));
  getElement<HTMLButtonElement>("wa-ai-mark-script-outcome").addEventListener("click", () => void markScriptUsageOutcomeFromSidebar(getSelect("wa-ai-script-outcome-select").value));
  document.addEventListener("input", (event) => {
    if ((event.target as HTMLElement).closest(`#${SIDEBAR_ID}`)) updateContextCard();
  });
  document.addEventListener("change", (event) => {
    if ((event.target as HTMLElement).closest(`#${SIDEBAR_ID}`)) updateContextCard();
  });
  document.querySelectorAll<HTMLButtonElement>("[data-follow-up-days]").forEach((button) => {
    button.addEventListener("click", () => {
      setFollowUpDate(Number(button.dataset.followUpDays || "1"));
      updateFollowUpScript();
    });
  });
  bindToggleButton("wa-ai-quote-include-shipping", "含运费", "不含运费");
  bindToggleButton("wa-ai-quote-stock-known", "库存已确认", "库存未知");
  bindToggleButton("wa-ai-custom-logo", "Logo required", "Logo not confirmed");
  bindToggleButton("wa-ai-custom-packaging", "Packaging required", "Packaging not confirmed");

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
      if (action === "material") return generateSelectedMaterialIntro();
      if (action === "quote") return generateQuoteDraft();
      if (action === "sample") return generateSampleScriptFromSidebar("sample_quote");
      if (action === "custom") return generateCustomScriptFromSidebar("custom_confirm");
      if (action === "afterSales") return generateAfterSalesScriptFromSidebar("apologize_and_acknowledge");
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

function openSidebarTab(tab: SidebarTab) {
  activeSidebarTab = tab;
  document.documentElement.classList.remove(HIDDEN_CLASS);
  document.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((button) => {
    button.dataset.active = String(button.dataset.tab === tab);
  });
  document.querySelectorAll<HTMLElement>(".wa-ai-tab-panel").forEach((panel) => {
    panel.dataset.active = String(panel.dataset.panel === tab);
  });
  applyWhatsAppOffset();
}

function showBusinessModule(module: BusinessModule) {
  activeBusinessModule = module;
  openSidebarTab("business");
  document.querySelectorAll<HTMLButtonElement>("[data-business-panel]").forEach((button) => {
    button.dataset.active = String(button.dataset.businessPanel === module);
  });
  document.querySelectorAll<HTMLElement>("[data-business-module]").forEach((section) => {
    section.dataset.active = String(section.dataset.businessModule === module);
  });
}

async function handleToolbarAction(action: string) {
  setSidebarMode("docked", { persist: true });
  if (action === "more") {
    openSidebarTab("more");
    return;
  }
  if (action === "quote") {
    showBusinessModule("quote");
    return;
  }
  if (action === "material") {
    showBusinessModule("material");
    return;
  }
  if (action === "translate") {
    openSidebarTab("ai");
    seedSelectedTextIntoMessage();
    await handleQuickAction("translate");
    return;
  }
  openSidebarTab("ai");
  seedSelectedTextIntoMessage();
  await handleQuickAction("reply");
}

function updateContextCard() {
  const customer = document.getElementById("wa-ai-customer") as HTMLInputElement | null;
  const stage = document.getElementById("wa-ai-stage") as HTMLSelectElement | null;
  const brand = document.getElementById("wa-ai-brand-select") as HTMLSelectElement | null;
  const intent = document.getElementById("wa-ai-intent-score");
  const set = (id: string, value: string) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value || "-";
  };
  set("wa-ai-context-customer", customer?.value || "未保存");
  set("wa-ai-context-stage", stage?.selectedOptions[0]?.textContent || stage?.value || "新线索");
  set("wa-ai-context-brand", brand?.selectedOptions[0]?.textContent || "未选择");
  set("wa-ai-context-intent", intent?.textContent || "保存后计算");
}

function seedSelectedTextIntoMessage() {
  const selectedText = window.getSelection()?.toString().trim();
  const message = document.getElementById("wa-ai-message") as HTMLTextAreaElement | null;
  if (selectedText && message && !message.value.trim()) message.value = selectedText;
  else if (currentWhatsAppContext.latestCustomerMessage && message && !message.value.trim()) {
    message.value = currentWhatsAppContext.latestCustomerMessage;
  }
}

function findWhatsAppInputContainer() {
  const input = document.querySelector<HTMLElement>(
    'footer [contenteditable="true"], [data-testid="conversation-compose-box-input"], div[role="textbox"][contenteditable="true"]'
  );
  if (!input) return null;
  if (input.getBoundingClientRect().width < 120) return null;
  return input.closest<HTMLElement>("footer") || input.parentElement;
}

function mountQuickToolbar() {
  const existing = document.getElementById(QUICK_TOOLBAR_ID);
  const floating = document.getElementById(FLOATING_BUTTON_ID);
  const container = findWhatsAppInputContainer();
  if (!container || document.documentElement.classList.contains(HIDDEN_CLASS) && !document.getElementById(SIDEBAR_ID)) {
    existing?.remove();
    fallbackFloatingAiButton();
    return;
  }
  floating?.remove();
  if (existing && existing.parentElement === container) return;
  existing?.remove();
  const toolbar = document.createElement("div");
  toolbar.id = QUICK_TOOLBAR_ID;
  toolbar.className = "wa-ai-quick-toolbar";
  toolbar.innerHTML = `
    <button type="button" data-toolbar-action="reply">✨ AI 回复</button>
    <button type="button" data-toolbar-action="translate">🌐 翻译</button>
    <button type="button" data-toolbar-action="quote">💬 报价</button>
    <button type="button" data-toolbar-action="material">🖼 素材</button>
    <button type="button" data-toolbar-action="more">⋯ 更多</button>
  `;
  toolbar.querySelectorAll<HTMLButtonElement>("[data-toolbar-action]").forEach((button) => {
    button.addEventListener("click", () => void handleToolbarAction(button.dataset.toolbarAction || "reply"));
  });
  container.insertBefore(toolbar, container.firstChild);
}

function unmountQuickToolbar() {
  document.getElementById(QUICK_TOOLBAR_ID)?.remove();
  document.getElementById(FLOATING_BUTTON_ID)?.remove();
}

function fallbackFloatingAiButton() {
  if (document.getElementById(FLOATING_BUTTON_ID)) return;
  if (location.hostname !== "web.whatsapp.com") return;
  const button = document.createElement("button");
  button.id = FLOATING_BUTTON_ID;
  button.type = "button";
  button.textContent = "AI";
  button.title = "打开 WhatsApp AI 工作台";
  button.addEventListener("click", () => {
    setSidebarMode("docked", { persist: true });
    openSidebarTab("ai");
  });
  document.body.appendChild(button);
}

function setupQuickToolbarObserver() {
  if (quickToolbarObserver) return;
  quickToolbarObserver = new MutationObserver(() => {
    window.requestAnimationFrame(() => {
      applyWhatsAppOffset();
      if (detectRecognitionStatus() === "normal") mountQuickToolbar();
      else unmountQuickToolbar();
    });
  });
  quickToolbarObserver.observe(document.body, { childList: true, subtree: true });
}

function setupWhatsAppContextObserver() {
  if (whatsappContextObserver) return;
  whatsappContextObserver = new MutationObserver(() => scheduleWhatsAppContextRefresh());
  whatsappContextObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
}

function scheduleWhatsAppContextRefresh(delay = 450) {
  if (contextRefreshTimer) window.clearTimeout(contextRefreshTimer);
  contextRefreshTimer = window.setTimeout(() => {
    contextRefreshTimer = null;
    void refreshWhatsAppContext();
  }, delay);
}

async function refreshWhatsAppContext() {
  const detected = detectCurrentWhatsAppConversation();
  const recentMessages = readRecentVisibleMessages(10);
  const latestCustomerMessage = [...recentMessages].reverse().find((message) => message.role === "customer")?.text || null;
  const detectedLanguage = detectMessageLanguage(latestCustomerMessage || "", detected.phoneCountryCode);
  const intent = detectCustomerIntent(latestCustomerMessage || "");
  const nextContext: WhatsAppConversationContext = {
    ...currentWhatsAppContext,
    ...detected,
    recentMessages,
    latestCustomerMessage,
    detectedLanguage,
    detectedIntent: intent.intent,
    concerns: intent.concerns,
    matchedCustomer: currentWhatsAppContext.matchedCustomer,
    isSavedCustomer: currentWhatsAppContext.isSavedCustomer,
    suggestedCreatePayload: currentWhatsAppContext.suggestedCreatePayload,
    duplicateWarning: currentWhatsAppContext.duplicateWarning
  };
  const signature = JSON.stringify({
    contactName: nextContext.contactName,
    whatsappNumber: nextContext.whatsappNumber,
    latestCustomerMessage: nextContext.latestCustomerMessage,
    messages: nextContext.recentMessages.map((message) => `${message.direction}:${message.text}`).join("|")
  });
  if (signature === lastContextSignature) return;
  lastContextSignature = signature;
  currentWhatsAppContext = nextContext;
  applyDetectedContextToForm(false);
  renderAutoContext();
  await matchCurrentCustomer();
}

function detectCurrentWhatsAppConversation() {
  const rawTitle = firstText([
    'header span[title]',
    'header [data-testid="conversation-info-header-chat-title"]',
    'header [role="button"] span[dir="auto"]',
    'header span[dir="auto"]',
    '[data-testid="conversation-info-header"] span[dir="auto"]',
    '[aria-selected="true"] span[title]',
    '[aria-selected="true"] span[dir="auto"]'
  ]);
  const phone = parsePhoneNumberFromTextLocal(rawTitle || "");
  return {
    contactName: cleanContactName(rawTitle, phone.raw),
    rawTitle,
    whatsappNumber: phone.e164,
    phoneCountry: phone.countryName,
    phoneCountryCode: phone.countryCode,
    countryCallingCode: phone.countryCallingCode,
    phoneParseConfidence: phone.confidence
  };
}

function readRecentVisibleMessages(limit = 10): RecentMessage[] {
  const main = document.querySelector<HTMLElement>("main") || document.querySelector<HTMLElement>('[role="main"]');
  if (!main) return [];
  const nodes = Array.from(main.querySelectorAll<HTMLElement>(".message-in, .message-out, [data-testid='msg-container'], [role='row']"));
  const messages = nodes
    .map((node) => messageFromNode(node))
    .filter((message): message is RecentMessage => Boolean(message && message.text && !isSystemMessage(message.text)));
  return messages.slice(-limit);
}

function messageFromNode(node: HTMLElement): RecentMessage | null {
  const className = node.className?.toString() || "";
  const direction: RecentMessage["direction"] = className.includes("message-out") ? "out" : className.includes("message-in") ? "in" : "unknown";
  const role: RecentMessage["role"] = direction === "out" ? "me" : direction === "in" ? "customer" : "unknown";
  const textNode = node.querySelector<HTMLElement>(".selectable-text, span[dir='ltr'], span[dir='auto'], div[dir='auto']");
  const text = cleanVisibleText(textNode?.innerText || node.innerText || "");
  if (!text) return null;
  const time = firstTextFromNode(node, ["[data-pre-plain-text]", "time", "span[aria-label*=':']"]) || "";
  return { role, text, time, direction };
}

async function matchCurrentCustomer() {
  if (authState.status !== "authenticated") return;
  const signature = JSON.stringify({
    organizationId: sidebarOrganizationId,
    contactName: currentWhatsAppContext.contactName,
    whatsappNumber: currentWhatsAppContext.whatsappNumber,
    phoneCountry: currentWhatsAppContext.phoneCountry
  });
  if (signature === lastMatchSignature) return;
  lastMatchSignature = signature;
  if (!currentWhatsAppContext.contactName && !currentWhatsAppContext.whatsappNumber) return;
  try {
    const response = await apiFetch("/api/customers/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: sidebarOrganizationId || undefined,
        contactName: currentWhatsAppContext.contactName,
        whatsappNumber: currentWhatsAppContext.whatsappNumber,
        phoneCountry: currentWhatsAppContext.phoneCountry,
        phoneCountryCode: currentWhatsAppContext.phoneCountryCode,
        source: "whatsapp_web"
      })
    });
    if (!response.ok) throw new Error("match failed");
    const result = (await response.json()) as any;
    currentWhatsAppContext = {
      ...currentWhatsAppContext,
      matchedCustomer: result.customer || null,
      isSavedCustomer: Boolean(result.matched && result.customer),
      suggestedCreatePayload: result.suggestedCreatePayload || null,
      duplicateWarning: result.duplicateWarning || null
    };
    applyMatchedCustomerToForm();
    renderAutoContext();
    updateContextCard();
  } catch {
    currentWhatsAppContext = {
      ...currentWhatsAppContext,
      matchedCustomer: null,
      isSavedCustomer: false
    };
    renderAutoContext();
  }
}

function applyDetectedContextToForm(force: boolean) {
  const name = getInput("wa-ai-customer");
  const phone = getInput("wa-ai-whatsapp-number");
  const country = getInput("wa-ai-country");
  const language = getSelect("wa-ai-language");
  const latest = getTextArea("wa-ai-latest-summary");
  const message = getTextArea("wa-ai-message");
  if ((force || !name.value.trim()) && currentWhatsAppContext.contactName) name.value = currentWhatsAppContext.contactName;
  if ((force || !phone.value.trim()) && currentWhatsAppContext.whatsappNumber) phone.value = currentWhatsAppContext.whatsappNumber;
  if ((force || !country.value.trim()) && currentWhatsAppContext.phoneCountry) country.value = currentWhatsAppContext.phoneCountry;
  if (language.value === "auto" && currentWhatsAppContext.detectedLanguage) language.value = currentWhatsAppContext.detectedLanguage;
  if (!latest.value.trim() && currentWhatsAppContext.latestCustomerMessage) latest.value = currentWhatsAppContext.latestCustomerMessage;
  if (!message.value.trim() && currentWhatsAppContext.latestCustomerMessage) message.value = currentWhatsAppContext.latestCustomerMessage;
  updateContextCard();
}

function applyMatchedCustomerToForm() {
  const customer = currentWhatsAppContext.matchedCustomer;
  if (!customer) {
    applyDetectedContextToForm(false);
    getInput("wa-ai-customer-id").value = "";
    return;
  }
  getInput("wa-ai-customer-id").value = customer.id || "";
  getInput("wa-ai-customer").value = customer.name || currentWhatsAppContext.contactName || "";
  getInput("wa-ai-whatsapp-number").value = customer.whatsappNumber || currentWhatsAppContext.whatsappNumber || "";
  getInput("wa-ai-country").value = customer.country || currentWhatsAppContext.phoneCountry || "";
  if (customer.language) getSelect("wa-ai-language").value = customer.language;
  if (customer.stage) getSelect("wa-ai-stage").value = customer.stage;
  if (Array.isArray(customer.tags)) getInput("wa-ai-tags").value = customer.tags.join(", ");
  getInput("wa-ai-interested-product").value = customer.interestedProduct || "";
  getTextArea("wa-ai-latest-summary").value = customer.latestSummary || currentWhatsAppContext.latestCustomerMessage || "";
  getTextArea("wa-ai-notes").value = customer.notes || "";
  if (customer.brandId) getElement<HTMLSelectElement>("wa-ai-brand-select").value = customer.brandId;
  if (customer.intentScore !== undefined) getElement("wa-ai-intent-score").textContent = `${customer.intentScore} / ${customer.intentLevel || "low"}`;
}

function renderAutoContext() {
  setText("wa-ai-auto-context-state", currentWhatsAppContext.isSavedCustomer ? "Matched saved customer" : currentWhatsAppContext.contactName ? "New customer / not saved" : "Manual paste fallback");
  setText("wa-ai-auto-phone", currentWhatsAppContext.whatsappNumber || "-");
  setText(
    "wa-ai-auto-country",
    currentWhatsAppContext.phoneCountry
      ? `根据手机号推测国家: ${currentWhatsAppContext.phoneCountry} (${currentWhatsAppContext.phoneParseConfidence})`
      : "-"
  );
  setText("wa-ai-auto-language", currentWhatsAppContext.detectedLanguage || "auto");
  setText("wa-ai-auto-intent", [currentWhatsAppContext.detectedIntent, ...currentWhatsAppContext.concerns].filter(Boolean).join(" / ") || "unknown");
  setText("wa-ai-auto-latest", currentWhatsAppContext.latestCustomerMessage || "No visible customer message detected");
}

function setText(id: string, value: string) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function emptyWhatsAppContext(): WhatsAppConversationContext {
  return {
    contactName: null,
    rawTitle: null,
    whatsappNumber: null,
    phoneCountry: null,
    phoneCountryCode: null,
    countryCallingCode: null,
    phoneParseConfidence: "none",
    recentMessages: [],
    latestCustomerMessage: null,
    detectedLanguage: "auto",
    detectedIntent: "unknown",
    concerns: [],
    matchedCustomer: null,
    isSavedCustomer: false,
    suggestedCreatePayload: null,
    duplicateWarning: null
  };
}

function parsePhoneNumberFromTextLocal(input: string) {
  const text = cleanVisibleText(input);
  const empty = {
    raw: null as string | null,
    e164: null as string | null,
    countryCallingCode: null as string | null,
    countryCode: null as string | null,
    countryName: null as string | null,
    confidence: "none" as PhoneParseConfidence
  };
  if (!text) return empty;
  const found = findPhoneNumbersInText(text)[0];
  const phone = found?.number || parsePhoneNumberFromString(text);
  if (!phone) return empty;
  const countryCode = phone.country || null;
  const countryCallingCode = phone.countryCallingCode || null;
  const valid = phone.isValid();
  const confidence: PhoneParseConfidence = valid && countryCode && countryCallingCode && !["1", "7"].includes(countryCallingCode)
    ? "high"
    : valid && (countryCode || countryCallingCode)
      ? "medium"
      : "low";
  return {
    raw: found ? text.slice(found.startsAt, found.endsAt) : text,
    e164: phone.number || null,
    countryCallingCode,
    countryCode,
    countryName: countryCode ? countryDisplayName(countryCode) : null,
    confidence
  };
}

function countryDisplayName(code: CountryCode) {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
}

function firstText(selectors: string[]) {
  for (const selector of selectors) {
    const element = document.querySelector<HTMLElement>(selector);
    const text = cleanVisibleText(element?.getAttribute("title") || element?.getAttribute("aria-label") || element?.innerText || "");
    if (text) return text;
  }
  return null;
}

function firstTextFromNode(root: HTMLElement, selectors: string[]) {
  for (const selector of selectors) {
    const element = root.querySelector<HTMLElement>(selector);
    const text = cleanVisibleText(element?.getAttribute("data-pre-plain-text") || element?.getAttribute("aria-label") || element?.innerText || "");
    if (text) return text;
  }
  return null;
}

function cleanContactName(title: string | null, rawPhone: string | null) {
  const text = cleanVisibleText(title || "");
  if (!text) return null;
  if (rawPhone && text.replace(rawPhone, "").trim()) return text.replace(rawPhone, "").trim();
  return text;
}

function cleanVisibleText(value: string) {
  return value.replace(/\u200e|\u200f/g, "").replace(/\s+/g, " ").trim();
}

function isSystemMessage(text: string) {
  return /end-to-end encrypted|messages and calls are encrypted|today|yesterday|unread messages|missed voice call/i.test(text) && text.length < 120;
}

function detectMessageLanguage(text: string, countryCode: string | null) {
  const value = text.trim();
  if (/[\u0600-\u06ff]/.test(value)) return "Arabic";
  if (/[\u4e00-\u9fff]/.test(value)) return "Chinese";
  if (/\b(cu[aá]nto|precio|env[ií]o|gracias|hola)\b/i.test(value)) return "Spanish";
  if (/\b(pre[cç]o|obrigado|frete|ol[aá])\b/i.test(value)) return "Portuguese";
  if (countryCode === "MX" || countryCode === "CO" || countryCode === "ES" || countryCode === "PE") return "Spanish";
  if (countryCode === "BR" || countryCode === "PT") return "Portuguese";
  if (countryCode === "SA" || countryCode === "AE" || countryCode === "EG") return "Arabic";
  if (countryCode === "CN") return "Chinese";
  return "English";
}

function detectCustomerIntent(text: string) {
  const value = text.toLowerCase();
  const hits: string[] = [];
  const rules: Array<[string, RegExp]> = [
    ["price", /\b(price|precio|cu[aá]nto|cost|quote)\b|价格|多少钱/],
    ["moq", /\bmoq\b|起订量|minimum order/],
    ["shipping", /\b(shipping|freight|env[ií]o|delivery fee)\b|运费/],
    ["lead_time", /\b(lead time|delivery time|entrega|交期)\b/],
    ["sample", /\b(sample|muestra)\b|样品/],
    ["custom", /\b(logo|packaging|oem|odm|custom)\b|定制|包装/],
    ["material", /\b(photo|video|catalog|material)\b|素材|图片|视频/],
    ["too_expensive", /\b(too expensive|expensive|price high)\b|太贵/],
    ["payment", /\b(payment|paypal|bank transfer|paid)\b|付款|支付/],
    ["logistics", /\b(tracking|logistics|shipped|parcel)\b|物流|快递/],
    ["after_sales", /\b(refund|return|broken|quality|complaint)\b|退款|退货|质量|投诉/],
    ["reorder", /\b(reorder|repeat|restock)\b|复购|补货|再来/]
  ];
  for (const [name, pattern] of rules) {
    if (pattern.test(value)) hits.push(name);
  }
  return {
    intent: hits[0] || "unknown",
    concerns: hits.slice(1, 5)
  };
}

async function checkAuthStatus() {
  try {
    const response = await apiFetch("/api/auth/me");
    if (!response.ok) throw new Error("not authenticated");
    const result = (await response.json()) as { user: AuthUser };
    authState = { status: "authenticated", user: result.user };
    renderAuthState();
    await loadBrandsForSidebar();
    await loadProducts();
    await loadMaterials();
    await loadScriptExperimentsForSidebar();
    scheduleWhatsAppContextRefresh();
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
    "wa-ai-refresh-brands",
    "wa-ai-brand-select",
    "wa-ai-refresh-intent",
    "wa-ai-load-reorder",
    "wa-ai-generate-reorder",
    "wa-ai-copy-reorder-script",
    "wa-ai-insert-reorder-script",
    "wa-ai-reorder-script",
    "wa-ai-refresh-orders",
    "wa-ai-order-select",
    "wa-ai-order-amount",
    "wa-ai-order-currency",
    "wa-ai-order-quantity",
    "wa-ai-order-status",
    "wa-ai-order-script",
    "wa-ai-create-order",
    "wa-ai-generate-order-script",
    "wa-ai-load-fulfillment",
    "wa-ai-generate-fulfillment-script",
    "wa-ai-copy-order-script",
    "wa-ai-insert-order-script",
    "wa-ai-refresh-products",
    "wa-ai-search-products",
    "wa-ai-product-search",
    "wa-ai-product-select",
    "wa-ai-copy-product-intro",
    "wa-ai-insert-product-intro",
    "wa-ai-refresh-materials",
    "wa-ai-search-materials",
    "wa-ai-material-search",
    "wa-ai-material-type",
    "wa-ai-material-select",
    "wa-ai-copy-material-intro",
    "wa-ai-insert-material-intro",
    "wa-ai-copy-quote",
    "wa-ai-insert-quote",
    "wa-ai-save-quote",
    "wa-ai-follow-up-type",
    "wa-ai-follow-up-remind-at",
    "wa-ai-follow-up-script",
    "wa-ai-save-follow-up",
    "wa-ai-sample-name",
    "wa-ai-sample-fee",
    "wa-ai-sample-shipping",
    "wa-ai-sample-currency",
    "wa-ai-sample-tracking",
    "wa-ai-sample-ship-date",
    "wa-ai-sample-delivery-date",
    "wa-ai-sample-scenario",
    "wa-ai-sample-notes",
    "wa-ai-save-sample",
    "wa-ai-generate-sample-script",
    "wa-ai-copy-sample-script",
    "wa-ai-insert-sample-script",
    "wa-ai-sample-follow-up",
    "wa-ai-custom-type",
    "wa-ai-custom-logo",
    "wa-ai-custom-packaging",
    "wa-ai-custom-color",
    "wa-ai-custom-size",
    "wa-ai-custom-material",
    "wa-ai-custom-quantity",
    "wa-ai-custom-moq",
    "wa-ai-custom-sample-fee",
    "wa-ai-custom-status",
    "wa-ai-custom-sample-lead-time",
    "wa-ai-custom-bulk-lead-time",
    "wa-ai-custom-files",
    "wa-ai-custom-scenario",
    "wa-ai-custom-notes",
    "wa-ai-save-custom",
    "wa-ai-generate-custom-script",
    "wa-ai-copy-custom-script",
    "wa-ai-insert-custom-script",
    "wa-ai-custom-follow-up",
    "wa-ai-after-sales-type",
    "wa-ai-after-sales-priority",
    "wa-ai-after-sales-claim",
    "wa-ai-after-sales-evidence",
    "wa-ai-after-sales-scenario",
    "wa-ai-after-sales-script",
    "wa-ai-save-after-sales",
    "wa-ai-generate-after-sales-script",
    "wa-ai-copy-after-sales-script",
    "wa-ai-insert-after-sales-script",
    "wa-ai-supplier-id",
    "wa-ai-supplier-order-id",
    "wa-ai-supplier-product-id",
    "wa-ai-supplier-scenario",
    "wa-ai-supplier-script",
    "wa-ai-generate-supplier-script",
    "wa-ai-copy-supplier-script",
    "wa-ai-insert-supplier-script",
    "wa-ai-refresh-script-tests",
    "wa-ai-script-experiment-select",
    "wa-ai-script-variant-select",
    "wa-ai-script-test-draft",
    "wa-ai-copy-script-test",
    "wa-ai-insert-script-test",
    "wa-ai-mark-script-replied",
    "wa-ai-mark-script-quote",
    "wa-ai-mark-script-order",
    "wa-ai-mark-script-no-response"
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

type ExtensionApiResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  body: string;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
};

async function apiFetch(path: string, init: RequestInit = {}): Promise<ExtensionApiResponse> {
  const response = await chrome.runtime.sendMessage({
    type: "WA_AI_API_FETCH",
    path,
    init: {
      method: init.method,
      headers: plainHeaders(init.headers),
      body: typeof init.body === "string" ? init.body : null
    }
  });
  if (response.status === 401) {
    authState = { status: "anonymous" };
    renderAuthState();
  }
  if (response.status === 403) {
    setStatus("权限不足，请在 Web 后台确认组织角色或客户归属。");
  }
  return {
    ...response,
    json: async () => JSON.parse(response.body),
    text: async () => response.body
  };
}

function plainHeaders(headers: HeadersInit | undefined): Record<string, string> | undefined {
  if (!headers) return undefined;
  if (headers instanceof Headers) return Object.fromEntries(headers.entries());
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  return headers;
}

async function loadBrandsForSidebar() {
  if (!ensureAuthenticated()) return;
  const select = getElement<HTMLSelectElement>("wa-ai-brand-select");
  try {
    if (!sidebarOrganizationId) {
      const orgResponse = await apiFetch("/api/organizations");
      if (orgResponse.ok) {
        const organizations = (await orgResponse.json()) as Array<{ id: string; name: string }>;
        sidebarOrganizationId = organizations[0]?.id || "";
      }
    }
    if (!sidebarOrganizationId) {
      sidebarBrands = [];
      select.replaceChildren(option("", "No organization brand"));
      return;
    }
    const response = await apiFetch(`/api/brands?organizationId=${encodeURIComponent(sidebarOrganizationId)}&status=active&pageSize=50`);
    if (!response.ok) throw new Error("brands failed");
    sidebarBrands = (await response.json()) as Array<any>;
    select.replaceChildren(option("", "No brand context"), ...sidebarBrands.map((brand) => option(brand.id, brand.displayName || brand.name)));
  } catch {
    sidebarBrands = [];
    select.replaceChildren(option("", "Brand load failed"));
    setStatus("Brand/store list failed to load. AI drafts can still run without brand context.");
  }
}

async function loadProducts(query = "") {
  if (!ensureAuthenticated()) return;
  const select = getElement<HTMLSelectElement>("wa-ai-product-select");
  try {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    const brandId = selectedBrandId();
    if (brandId) params.set("brandId", brandId);
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

async function loadMaterials(query = "") {
  if (!ensureAuthenticated()) return;
  const select = getElement<HTMLSelectElement>("wa-ai-material-select");
  try {
    const params = new URLSearchParams();
    const type = getElement<HTMLSelectElement>("wa-ai-material-type").value;
    const language = mapCustomerLanguageToMaterialLanguage(getSelect("wa-ai-language").value);
    const product = selectedProduct();
    if (query.trim()) params.set("q", query.trim());
    if (type) params.set("type", type);
    if (language) params.set("language", language);
    if (product) params.set("productId", product.id);
    const brandId = selectedBrandId();
    if (brandId) params.set("brandId", brandId);
    const response = await apiFetch(`/api/materials${params.toString() ? `?${params.toString()}` : ""}`);
    if (!response.ok) throw new Error("materials failed");
    const materials = (await response.json()) as MaterialSummary[];
    select.replaceChildren(option("", materials.length > 0 ? "请选择素材" : "暂无素材"), ...materials.map((material) => option(material.id, `${material.title} · ${material.type}`)));
    select.dataset.materials = JSON.stringify(materials);
    updateSelectedMaterialMeta();
  } catch {
    select.replaceChildren(option("", "素材加载失败"));
    setStatus("素材中心加载失败，请确认 Web 后台已登录，且 API 已启动。");
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

async function saveSampleOrderFromSidebar(options: { silent?: boolean } = {}) {
  if (!ensureAuthenticated()) return null;
  const customerId = getInput("wa-ai-customer-id").value.trim();
  if (!customerId) {
    setStatus("请先保存客户后再创建样品单。");
    return null;
  }
  const sampleName = getInput("wa-ai-sample-name").value.trim();
  if (!sampleName) {
    setStatus("请填写样品名称。");
    return null;
  }

  setButtonsBusy(true);
  try {
    const sampleId = getInput("wa-ai-sample-id").value.trim();
    const payload = buildSampleOrderPayload(customerId);
    const response = await apiFetch(sampleId ? `/api/sample-orders/${sampleId}` : "/api/sample-orders", {
      method: sampleId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error("sample order failed");
    const saved = (await response.json()) as SampleOrderDetail;
    getInput("wa-ai-sample-id").value = saved.id;
    if (!options.silent) setStatus("样品单已保存。系统只记录销售流程，不处理真实支付或物流，也不会自动发送 WhatsApp 消息。");
    return saved;
  } catch {
    setStatus("样品单保存失败，请确认客户和产品属于当前账号，并检查必填项。");
    return null;
  } finally {
    setButtonsBusy(false);
  }
}

async function generateSampleScriptFromSidebar(forcedScenario?: SampleScriptScenario) {
  if (!ensureAuthenticated()) return;
  const sample = await saveSampleOrderFromSidebar({ silent: true });
  if (!sample?.id) return;

  setButtonsBusy(true);
  try {
    const scenario = forcedScenario || (getSelect("wa-ai-sample-scenario").value as SampleScriptScenario);
    const response = await apiFetch(`/api/sample-orders/${sample.id}/script`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scenario,
        customerLanguage: getSelect("wa-ai-language").value,
        productContext: buildProductContext("sample"),
        useKnowledgeBase: true
      })
    });
    if (!response.ok) throw new Error("sample script failed");
    const result = (await response.json()) as SampleScriptResponse;
    const knowledgeUsed = result.knowledgeUsed || [];
    getTextArea("wa-ai-sample-script").value = result.scriptText;
    getReplyTextArea("professional").value = result.scriptText;
    renderRisks(result.riskWarnings);
    setStatus(`样品话术草稿已生成。${knowledgeUsed.length ? `已引用知识库：${knowledgeUsed.join("、")}。` : ""}请人工确认费用、运费、付款账户和物流信息后再发送。`);
  } catch {
    setStatus("样品话术生成失败，请确认样品单属于当前账号，并且 API 已启动。");
  } finally {
    setButtonsBusy(false);
  }
}

function seedSampleFeedbackFollowUp() {
  const customerId = getInput("wa-ai-customer-id").value.trim();
  if (!customerId) return setStatus("请先保存客户后再设置样品反馈跟进。");
  getSelect("wa-ai-follow-up-type").value = "样品反馈";
  const deliveryDate = getInput("wa-ai-sample-delivery-date").value;
  if (deliveryDate && !Number.isNaN(Date.parse(deliveryDate))) {
    getInput("wa-ai-follow-up-remind-at").value = toDateTimeLocal(new Date(`${deliveryDate}T10:00:00`).toISOString());
  } else {
    setFollowUpDate(7);
  }
  getTextArea("wa-ai-follow-up-script").value =
    getTextArea("wa-ai-sample-script").value ||
    "Hi, did you receive and check the sample? Please share your feedback. This is only a draft and will not be sent automatically.";
  setStatus("已填入样品反馈跟进提醒草稿，请确认提醒时间后点击保存跟进提醒。");
}

async function saveCustomRequestFromSidebar(options: { silent?: boolean } = {}) {
  if (!ensureAuthenticated()) return null;
  const customerId = getInput("wa-ai-customer-id").value.trim();
  if (!customerId) {
    setStatus("Please save the customer before creating a custom request.");
    return null;
  }

  setButtonsBusy(true);
  try {
    const customId = getInput("wa-ai-custom-id").value.trim();
    const response = await apiFetch(customId ? `/api/custom-requests/${customId}` : "/api/custom-requests", {
      method: customId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildCustomRequestPayload(customerId))
    });
    if (!response.ok) throw new Error("custom request failed");
    const saved = (await response.json()) as CustomRequestDetail;
    getInput("wa-ai-custom-id").value = saved.id;
    if (!options.silent) setStatus("Custom request saved. Scripts remain drafts only and will not auto-send WhatsApp messages.");
    return saved;
  } catch {
    setStatus("Custom request save failed. Please confirm customer/product ownership and required fields.");
    return null;
  } finally {
    setButtonsBusy(false);
  }
}

async function generateCustomScriptFromSidebar(forcedScenario?: CustomScriptScenario) {
  if (!ensureAuthenticated()) return;
  const item = await saveCustomRequestFromSidebar({ silent: true });
  if (!item?.id) return;
  setButtonsBusy(true);
  try {
    const scenario = forcedScenario || (getSelect("wa-ai-custom-scenario").value as CustomScriptScenario);
    const response = await apiFetch(`/api/custom-requests/${item.id}/script`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scenario,
        customerLanguage: getSelect("wa-ai-language").value,
        productContext: buildProductContext("custom")
      })
    });
    if (!response.ok) throw new Error("custom script failed");
    const result = (await response.json()) as CustomScriptResponse;
    const knowledgeUsed = result.knowledgeUsed || [];
    getTextArea("wa-ai-custom-script").value = result.scriptText;
    getReplyTextArea("professional").value = result.scriptText;
    renderRisks(result.riskWarnings);
    setStatus(`Custom script draft generated. ${knowledgeUsed.length ? `Knowledge used: ${knowledgeUsed.join(", ")}. ` : ""}Confirm MOQ, fees, lead time, files, and feasibility before sending.`);
  } catch {
    setStatus("Custom script generation failed. Please confirm the request belongs to the current account and API is running.");
  } finally {
    setButtonsBusy(false);
  }
}

function seedCustomFollowUp() {
  const customerId = getInput("wa-ai-customer-id").value.trim();
  if (!customerId) return setStatus("Please save the customer before setting custom follow-up.");
  getSelect("wa-ai-follow-up-type").value = "普通提醒";
  setFollowUpDate(2);
  getTextArea("wa-ai-follow-up-script").value =
    getTextArea("wa-ai-custom-script").value ||
    "Hi, may I confirm the customization details and files? This is only a draft and will not be sent automatically.";
  setStatus("Custom follow-up draft is ready. Confirm the time and click save follow-up.");
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

async function generateSelectedMaterialIntro() {
  if (!ensureAuthenticated()) return;
  const material = selectedMaterial();
  if (!material) return setStatus("请先选择素材。");

  setButtonsBusy(true);
  try {
    const response = await apiFetch(`/api/materials/${material.id}/intro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerLanguage: getSelect("wa-ai-language").value,
        productContext: buildProductContext("material"),
        scenario: getTextArea("wa-ai-message").value,
        useKnowledgeBase: true
      })
    });
    if (!response.ok) throw new Error("material intro failed");
    const result = (await response.json()) as MaterialIntroResponse;
    getTextArea("wa-ai-material-intro").value = result.introText;
    getReplyTextArea("professional").value = result.introText;
    renderRisks(result.riskWarnings);
    setStatus(`素材说明草稿已生成。${result.knowledgeUsed?.length ? `已引用知识库：${result.knowledgeUsed.join("、")}。` : ""}请人工确认后发送。`);
  } catch {
    setStatus("素材说明生成失败，请确认素材属于当前账号且 API 已启动。");
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
    const brandId = selectedBrandId();
    if (brandId) {
      await apiFetch(`/api/brands/${encodeURIComponent(brandId)}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType: "customer", entityId: saved.id, confirm: true })
      });
    }
    await storeCustomerProfile(saved);
    await loadCustomerIntentScore();
    await loadReorderPrediction();
    lastMatchSignature = "";
    scheduleWhatsAppContextRefresh(150);
    setStatus(`客户已保存：${saved.name}`);
  } catch {
    setStatus("客户保存失败。请确认本地 API 和 PostgreSQL 已启动。");
  }
}

async function loadCustomerIntentScore() {
  if (!ensureAuthenticated()) return;
  const customerId = getInput("wa-ai-customer-id").value.trim();
  if (!customerId) {
    renderCustomerIntent(null);
    setStatus("保存客户后可计算意向分。推荐动作只作为销售建议，不会自动发送消息。");
    return;
  }
  try {
    const response = await apiFetch(`/api/customers/${customerId}/intent`);
    if (!response.ok) throw new Error("intent failed");
    renderCustomerIntent((await response.json()) as CustomerIntentResponse);
  } catch {
    renderCustomerIntent(null);
    setStatus("意向分加载失败，请确认客户属于当前账号。");
  }
}

async function loadReorderPrediction() {
  if (!ensureAuthenticated()) return;
  const customerId = getInput("wa-ai-customer-id").value.trim();
  if (!customerId) {
    renderReorderPrediction(null);
    setStatus("请先保存客户后使用复购预测。复购建议只作销售辅助判断。");
    return;
  }
  setButtonsBusy(true);
  try {
    await apiFetch("/api/predictions/customers/recalculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId })
    });
    const response = await apiFetch(`/api/predictions/customers?status=open&pageSize=20`);
    if (!response.ok) throw new Error("prediction failed");
    const rows = (await response.json()) as CustomerPredictionSummary[];
    const prediction = rows
      .filter((item) => item.customerId === customerId)
      .sort((a, b) => b.score - a.score)[0] || null;
    renderReorderPrediction(prediction);
    setStatus("复购预测已加载。不会自动创建任务或发送 WhatsApp 消息。");
  } catch {
    renderReorderPrediction(null);
    setStatus("复购预测加载失败，请确认客户归属和角色权限。");
  } finally {
    setButtonsBusy(false);
  }
}

async function generateReorderScriptFromSidebar() {
  if (!ensureAuthenticated()) return;
  const customerId = getInput("wa-ai-customer-id").value.trim();
  if (!customerId) return setStatus("请先保存客户后生成复购话术。");
  setButtonsBusy(true);
  try {
    const response = await apiFetch("/api/ai/reorder-script", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        productId: selectedProduct()?.id || null,
        brandId: selectedBrandId() || null,
        reminderType: "reorder",
        targetLanguage: getSelect("wa-ai-language").value,
        tone: "professional"
      })
    });
    if (!response.ok) throw new Error("reorder script failed");
    const result = (await response.json()) as ReorderScriptResponse;
    getTextArea("wa-ai-reorder-script").value = result.scriptText;
    getTextArea("wa-ai-follow-up-script").value = result.scriptText;
    renderRisks(result.riskWarnings);
    setStatus("复购话术草稿已生成，请确认价格、库存、优惠、交期和客户历史后手动发送。");
  } catch {
    setStatus("复购话术生成失败，请确认客户权限和 API 服务。");
  } finally {
    setButtonsBusy(false);
  }
}

async function loadOrdersForCurrentCustomer() {
  if (!ensureAuthenticated()) return;
  const customerId = getInput("wa-ai-customer-id").value.trim();
  const select = getElement<HTMLSelectElement>("wa-ai-order-select");
  if (!customerId) {
    select.innerHTML = `<option value="">Save customer first</option>`;
    return setStatus("Save the customer before using order center.");
  }
  try {
    const response = await apiFetch(`/api/orders?customerId=${encodeURIComponent(customerId)}&pageSize=20`);
    if (!response.ok) throw new Error("orders failed");
    const orders = (await response.json()) as OrderSummary[];
    select.innerHTML = orders.length
      ? orders.map((order) => `<option value="${escapeHtml(order.id)}">${escapeHtml(`${order.orderNo} / ${order.orderStatus} / ${order.paymentStatus}`)}</option>`).join("")
      : `<option value="">No orders yet</option>`;
    setStatus("Orders loaded. They are manual records only.");
  } catch {
    setStatus("Order list failed to load. Check customer permission and login state.");
  }
}

async function createOrderFromSidebar() {
  if (!ensureAuthenticated()) return;
  const customerId = getInput("wa-ai-customer-id").value.trim();
  if (!customerId) return setStatus("Save the customer before creating an order.");
  setButtonsBusy(true);
  try {
    const response = await apiFetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        productId: selectedProduct()?.id || null,
        orderType: "normal",
        amount: getInput("wa-ai-order-amount").value.trim() || null,
        currency: getInput("wa-ai-order-currency").value.trim() || "USD",
        quantity: getInput("wa-ai-order-quantity").value.trim() || null,
        orderStatus: getSelect("wa-ai-order-status").value,
        paymentStatus: "unpaid",
        productionStatus: "not_started",
        shippingStatus: "pending",
        afterSalesStatus: "none",
        title: "WhatsApp customer order"
      })
    });
    if (!response.ok) throw new Error("create order failed");
    const order = (await response.json()) as OrderSummary & { riskWarnings?: string[] };
    const brandId = selectedBrandId();
    if (brandId) {
      await apiFetch(`/api/brands/${encodeURIComponent(brandId)}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType: "order", entityId: order.id, confirm: true })
      });
    }
    getElement<HTMLSelectElement>("wa-ai-order-select").innerHTML = `<option value="${escapeHtml(order.id)}">${escapeHtml(`${order.orderNo} / ${order.orderStatus}`)}</option>`;
    renderRisks(order.riskWarnings || ["Order created manually. Confirm payment, production, shipping and after-sales details."]);
    setStatus("Order created as a manual record. No WhatsApp message was sent.");
  } catch {
    setStatus("Order creation failed. Check customer/product permission.");
  } finally {
    setButtonsBusy(false);
  }
}

async function generateOrderScriptFromSidebar() {
  if (!ensureAuthenticated()) return;
  const orderId = getElement<HTMLSelectElement>("wa-ai-order-select").value;
  if (!orderId) return setStatus("Select or create an order first.");
  setButtonsBusy(true);
  try {
    const response = await apiFetch("/api/ai/order-script", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        brandId: selectedBrandId() || null,
        scenario: getSelect("wa-ai-order-status").value === "pending_payment" ? "payment_reminder" : "order_confirm",
        targetLanguage: getSelect("wa-ai-language").value,
        tone: "professional"
      })
    });
    if (!response.ok) throw new Error("order script failed");
    const result = (await response.json()) as OrderScriptResponse;
    getTextArea("wa-ai-order-script").value = result.scriptText;
    renderRisks(result.riskWarnings);
    setStatus("Order script generated as draft only. Confirm facts before manually sending.");
  } catch {
    setStatus("Order script generation failed. Check order permission.");
  } finally {
    setButtonsBusy(false);
  }
}

async function loadOrderFulfillmentFromSidebar() {
  if (!ensureAuthenticated()) return;
  const orderId = getElement<HTMLSelectElement>("wa-ai-order-select").value;
  if (!orderId) return setStatus("Select or create an order first.");
  try {
    const response = await apiFetch(`/api/orders/${encodeURIComponent(orderId)}/fulfillment`);
    if (!response.ok) throw new Error("fulfillment failed");
    const result = await response.json() as { alerts: Array<{ level: string; alertType: string; recommendedAction?: string | null }>; recommendedActions?: string[] };
    getElement<HTMLDivElement>("wa-ai-fulfillment-alerts").textContent = result.alerts.length
      ? result.alerts.map((alert) => `${alert.level}: ${alert.alertType} - ${alert.recommendedAction || ""}`).join(" | ")
      : "No open fulfillment alerts. Still confirm payment, production, shipping and after-sales details manually.";
    setStatus("Fulfillment alerts loaded. The extension does not update order status automatically.");
  } catch {
    setStatus("Fulfillment check failed. Check order permission.");
  }
}

async function generateFulfillmentScriptFromSidebar() {
  if (!ensureAuthenticated()) return;
  const orderId = getElement<HTMLSelectElement>("wa-ai-order-select").value;
  if (!orderId) return setStatus("Select or create an order first.");
  setButtonsBusy(true);
  try {
    const scenario = getSelect("wa-ai-order-status").value === "pending_payment" ? "payment_follow_up" : "delivery_follow_up";
    const response = await apiFetch("/api/ai/order-fulfillment-script", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, brandId: selectedBrandId() || null, scenario, targetLanguage: getSelect("wa-ai-language").value, tone: "professional" })
    });
    if (!response.ok) throw new Error("fulfillment script failed");
    const result = (await response.json()) as OrderScriptResponse;
    getTextArea("wa-ai-order-script").value = result.scriptText;
    renderRisks(result.riskWarnings);
    setStatus("Fulfillment script generated as draft only. No WhatsApp message was sent.");
  } catch {
    setStatus("Fulfillment script generation failed. Check order permission.");
  } finally {
    setButtonsBusy(false);
  }
}

async function createAfterSalesFromSidebar() {
  if (!ensureAuthenticated()) return;
  const customerId = getInput("wa-ai-customer-id").value.trim();
  if (!customerId) return setStatus("Save the customer before creating an after-sales case.");
  setButtonsBusy(true);
  try {
    const response = await apiFetch("/api/after-sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        orderId: getElement<HTMLSelectElement>("wa-ai-order-select").value || null,
        productId: selectedProduct()?.id || null,
        caseType: getSelect("wa-ai-after-sales-type").value,
        priority: getSelect("wa-ai-after-sales-priority").value,
        description: getTextArea("wa-ai-after-sales-claim").value || null,
        customerClaim: getTextArea("wa-ai-after-sales-claim").value || null,
        evidenceUrls: parseLines(getTextArea("wa-ai-after-sales-evidence").value)
      })
    });
    if (!response.ok) throw new Error("after-sales create failed");
    const result = (await response.json()) as { id: string; caseNo: string; riskWarnings?: string[] };
    const brandId = selectedBrandId();
    if (brandId) {
      await apiFetch(`/api/brands/${encodeURIComponent(brandId)}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType: "after_sales", entityId: result.id, confirm: true })
      });
    }
    getInput("wa-ai-after-sales-id").value = result.id;
    renderRisks(result.riskWarnings || ["After-sales case created manually. Confirm policy, responsibility, refund, reship and evidence before messaging."]);
    setStatus(`After-sales case ${result.caseNo} created. No refund, reshipment, responsibility attribution, or WhatsApp message was triggered.`);
  } catch {
    setStatus("After-sales case creation failed. Check customer/order/product permission.");
  } finally {
    setButtonsBusy(false);
  }
}

async function generateAfterSalesScriptFromSidebar(scenario?: string) {
  if (!ensureAuthenticated()) return;
  let afterSalesCaseId = getInput("wa-ai-after-sales-id").value.trim();
  if (!afterSalesCaseId) {
    const created = await createAfterSalesForScript();
    if (!created) return;
    afterSalesCaseId = created;
  }
  setButtonsBusy(true);
  try {
    const response = await apiFetch("/api/ai/after-sales-script", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        afterSalesCaseId,
        brandId: selectedBrandId() || null,
        scenario: scenario || getSelect("wa-ai-after-sales-scenario").value,
        targetLanguage: getSelect("wa-ai-language").value,
        tone: "professional"
      })
    });
    if (!response.ok) throw new Error("after-sales script failed");
    const result = (await response.json()) as AfterSalesScriptResponse;
    getTextArea("wa-ai-after-sales-script").value = result.scriptText;
    getTextArea("wa-ai-follow-up-script").value = result.scriptText;
    renderRisks(result.riskWarnings);
    setStatus("After-sales script generated as a draft only. Confirm responsibility, policy, refund, reship, logistics and evidence before manually sending.");
  } catch {
    setStatus("After-sales script generation failed. Check after-sales permission.");
  } finally {
    setButtonsBusy(false);
  }
}

async function createAfterSalesForScript() {
  const customerId = getInput("wa-ai-customer-id").value.trim();
  if (!customerId) {
    setStatus("Save the customer before using after-sales scripts.");
    return null;
  }
  try {
    const response = await apiFetch("/api/after-sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        orderId: getElement<HTMLSelectElement>("wa-ai-order-select").value || null,
        productId: selectedProduct()?.id || null,
        caseType: getSelect("wa-ai-after-sales-type").value,
        priority: getSelect("wa-ai-after-sales-priority").value,
        description: getTextArea("wa-ai-after-sales-claim").value || "After-sales case created from WhatsApp sidebar draft flow.",
        customerClaim: getTextArea("wa-ai-after-sales-claim").value || null,
        evidenceUrls: parseLines(getTextArea("wa-ai-after-sales-evidence").value)
      })
    });
    if (!response.ok) throw new Error("after-sales create failed");
    const result = (await response.json()) as { id: string };
    getInput("wa-ai-after-sales-id").value = result.id;
    return result.id;
  } catch {
    setStatus("Create an after-sales case first, or check customer/order permission.");
    return null;
  }
}

async function generateSupplierScriptFromSidebar() {
  if (!ensureAuthenticated()) return;
  setButtonsBusy(true);
  try {
    const response = await apiFetch("/api/ai/supplier-script", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId: getInput("wa-ai-supplier-id").value.trim() || null,
        productId: getInput("wa-ai-supplier-product-id").value.trim() || selectedProduct()?.id || null,
        orderId: getInput("wa-ai-supplier-order-id").value.trim() || getElement<HTMLSelectElement>("wa-ai-order-select").value || null,
        brandId: selectedBrandId() || null,
        scenario: getSelect("wa-ai-supplier-scenario").value,
        targetLanguage: getSelect("wa-ai-language").value,
        tone: "professional"
      })
    });
    if (!response.ok) throw new Error("supplier script failed");
    const result = (await response.json()) as SupplierScriptResponse;
    getTextArea("wa-ai-supplier-script").value = result.scriptText;
    renderRisks(result.riskWarnings);
    setStatus("Supplier draft generated. No supplier was contacted, no purchase order was created, and no cost was applied.");
  } catch {
    setStatus("Supplier draft generation failed. Check supplier/product/order permission.");
  } finally {
    setButtonsBusy(false);
  }
}

async function loadScriptExperimentsForSidebar() {
  if (!ensureAuthenticated()) return;
  try {
    const response = await apiFetch("/api/script-experiments?status=active&pageSize=20");
    if (!response.ok) throw new Error("script experiments failed");
    scriptExperiments = (await response.json()) as Array<any>;
    const select = getElement<HTMLSelectElement>("wa-ai-script-experiment-select");
    select.innerHTML = `<option value="">Select active experiment</option>${scriptExperiments.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)} / ${escapeHtml(item.scenario)}</option>`).join("")}`;
    scriptVariants = [];
    getElement<HTMLSelectElement>("wa-ai-script-variant-select").innerHTML = `<option value="">Select experiment first</option>`;
    getTextArea("wa-ai-script-test-draft").value = "";
    setStatus("A/B script experiments loaded. Drafts still require manual copy or insert.");
  } catch {
    setStatus("A/B script experiments failed to load or permission is insufficient.");
  }
}

async function loadSelectedScriptExperiment() {
  const experimentId = getElement<HTMLSelectElement>("wa-ai-script-experiment-select").value;
  if (!experimentId) return;
  try {
    const response = await apiFetch(`/api/script-experiments/${encodeURIComponent(experimentId)}`);
    if (!response.ok) throw new Error("script experiment detail failed");
    const detail = (await response.json()) as any;
    scriptVariants = (detail.variants || []).filter((variant: any) => variant.enabled);
    const select = getElement<HTMLSelectElement>("wa-ai-script-variant-select");
    select.innerHTML = `<option value="">Select variant</option>${scriptVariants.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.versionLabel)} / ${escapeHtml(item.title)}</option>`).join("")}`;
    getTextArea("wa-ai-script-test-draft").value = "";
    lastScriptUsageId = "";
    setStatus("A/B script variants loaded. Copy or insert records usage only; it does not send WhatsApp messages.");
  } catch {
    setStatus("A/B script experiment detail failed to load.");
  }
}

function updateSelectedScriptVariantDraft() {
  const variant = selectedScriptVariant();
  getTextArea("wa-ai-script-test-draft").value = variant?.content || "";
}

async function recordScriptUsageFromSidebar(mode: "copy" | "insert") {
  if (!ensureAuthenticated()) return;
  const variant = selectedScriptVariant();
  const experimentId = getElement<HTMLSelectElement>("wa-ai-script-experiment-select").value;
  if (!variant || !experimentId) return setStatus("Select an active experiment and variant first.");
  try {
    const usedText = getTextArea("wa-ai-script-test-draft").value || variant.content;
    const response = await apiFetch("/api/script-usages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        experimentId,
        variantId: variant.id,
        customerId: getInput("wa-ai-customer-id").value.trim() || null,
        scenario: scriptExperiments.find((item) => item.id === experimentId)?.scenario || "first_reply",
        channel: "extension",
        usedText
      })
    });
    if (!response.ok) throw new Error("script usage failed");
    const result = (await response.json()) as { id: string };
    lastScriptUsageId = result.id;
    if (mode === "copy") {
      await navigator.clipboard.writeText(usedText);
      setStatus("A/B draft copied and usage recorded. Please manually confirm and send in WhatsApp.");
    } else {
      getTextArea("wa-ai-script-test-draft").value = usedText;
      insertTextAreaIntoWhatsApp("wa-ai-script-test-draft");
      setStatus("A/B draft inserted and usage recorded. It was not automatically sent.");
    }
  } catch {
    setStatus("A/B script usage record failed. Check customer or experiment permission.");
  }
}

async function markScriptUsageOutcomeFromSidebar(outcome: string) {
  if (!lastScriptUsageId) return setStatus("Copy or insert a script variant first, then mark outcome manually.");
  try {
    const response = await apiFetch(`/api/script-usages/${encodeURIComponent(lastScriptUsageId)}/outcome`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome })
    });
    if (!response.ok) throw new Error("outcome failed");
    setStatus(`A/B script outcome marked as ${outcome}.`);
  } catch {
    setStatus("A/B script outcome update failed.");
  }
}

function selectedScriptVariant() {
  const variantId = getElement<HTMLSelectElement>("wa-ai-script-variant-select").value;
  return scriptVariants.find((variant) => variant.id === variantId);
}

async function handleQuickAction(action: Exclude<QuickAction, "product" | "quote">) {
  const manualMessage = getTextArea("wa-ai-message").value.trim();
  const customerMessage = currentWhatsAppContext.latestCustomerMessage || manualMessage;
  if (!customerMessage) return setStatus("请先粘贴客户消息，或读取选中文本。");

  setButtonsBusy(true);
  try {
    const result = await requestAiReply({
      customerMessage,
      targetLanguage: getSelect("wa-ai-language").value,
      scenario: actionScenarioMap[action],
      productContext: buildProductContext(action),
      productId: selectedProduct()?.id || undefined,
      customerId: getInput("wa-ai-customer-id").value.trim() || undefined,
      latestCustomerMessage: currentWhatsAppContext.latestCustomerMessage || undefined,
      recentMessages: currentWhatsAppContext.recentMessages,
      contactName: currentWhatsAppContext.contactName || undefined,
      whatsappNumber: currentWhatsAppContext.whatsappNumber || undefined,
      phoneCountry: currentWhatsAppContext.phoneCountry || undefined,
      matchedCustomerId: currentWhatsAppContext.matchedCustomer?.id || undefined,
      useKnowledgeBase: true
    } as AiReplyRequest & Record<string, unknown>);
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
  const brandId = selectedBrandId();
  const response = await apiFetch("/api/ai/reply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, brandId: brandId || undefined })
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
  if (result.knowledgeUsed.length > 0) setStatus(`已引用知识库：${result.knowledgeUsed.join("、")}。请人工确认后发送。`);
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

function selectedBrandId() {
  return getElement<HTMLSelectElement>("wa-ai-brand-select").value || "";
}

function selectedProductLabel() {
  const product = selectedProduct();
  return product ? `${product.name} (${product.sku})` : "";
}

function updateSelectedMaterialMeta() {
  const material = selectedMaterial();
  const root = getElement("wa-ai-material-meta");
  if (!material) {
    root.textContent = "选择素材后显示 URL 和标签。";
    return;
  }
  root.textContent = `${material.type} · ${material.url} · ${material.tags.join(" / ") || "无标签"}`;
}

function selectedMaterial() {
  const select = getElement<HTMLSelectElement>("wa-ai-material-select");
  const materials = JSON.parse(select.dataset.materials || "[]") as MaterialSummary[];
  return materials.find((material) => material.id === select.value);
}

function mapCustomerLanguageToMaterialLanguage(value: string) {
  const text = value.toLowerCase();
  if (text.includes("spanish")) return "es";
  if (text.includes("portuguese")) return "pt";
  if (text.includes("arabic")) return "ar";
  if (text.includes("french")) return "fr";
  if (text.includes("russian")) return "ru";
  if (text.includes("chinese")) return "zh";
  if (text.includes("english")) return "en";
  return "";
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

function renderCustomerIntent(result: CustomerIntentResponse | null) {
  getElement("wa-ai-intent-score").textContent = result ? `${result.intentScore} · ${result.intentLevel}` : "保存客户后可计算";
  getElement("wa-ai-intent-action").textContent = result ? result.recommendedAction : "推荐动作仅作为销售建议。";
}

function renderReorderPrediction(result: CustomerPredictionSummary | null) {
  getElement("wa-ai-reorder-score").textContent = result ? `${result.score} / ${result.level} / ${result.predictionType}` : "保存客户后可查看";
  getElement("wa-ai-reorder-action").textContent = result?.recommendedAction || "建议仅作参考，不会自动发送。";
  if (result?.suggestedScript) getTextArea("wa-ai-reorder-script").value = result.suggestedScript;
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
  const suggested = currentWhatsAppContext.suggestedCreatePayload || {};
  return {
    name: getInput("wa-ai-customer").value || suggested.name || currentWhatsAppContext.contactName || "",
    whatsappNumber: getInput("wa-ai-whatsapp-number").value || suggested.whatsappNumber || currentWhatsAppContext.whatsappNumber || "",
    country: getInput("wa-ai-country").value || suggested.country || currentWhatsAppContext.phoneCountry || "",
    language: getSelect("wa-ai-language").value === "auto" ? currentWhatsAppContext.detectedLanguage || null : getSelect("wa-ai-language").value,
    tags: parseTags(getInput("wa-ai-tags").value),
    stage: getSelect("wa-ai-stage").value,
    interestedProduct: getInput("wa-ai-interested-product").value,
    latestSummary: getTextArea("wa-ai-latest-summary").value || currentWhatsAppContext.latestCustomerMessage || "",
    nextFollowUpAt: getInput("wa-ai-next-follow-up").value ? new Date(getInput("wa-ai-next-follow-up").value).toISOString() : null,
    notes: getTextArea("wa-ai-notes").value
  };
}

function buildSampleOrderPayload(customerId: string) {
  return {
    customerId,
    productId: selectedProduct()?.id || null,
    sampleName: getInput("wa-ai-sample-name").value,
    sampleFee: getInput("wa-ai-sample-fee").value || null,
    shippingCost: getInput("wa-ai-sample-shipping").value || null,
    currency: getInput("wa-ai-sample-currency").value || "USD",
    trackingNumber: getInput("wa-ai-sample-tracking").value || null,
    expectedShipDate: getInput("wa-ai-sample-ship-date").value || null,
    expectedDeliveryDate: getInput("wa-ai-sample-delivery-date").value || null,
    notes: getTextArea("wa-ai-sample-notes").value || null
  };
}

function buildCustomRequestPayload(customerId: string) {
  return {
    customerId,
    productId: selectedProduct()?.id || null,
    requestType: getSelect("wa-ai-custom-type").value,
    logoRequired: isToggleActive("wa-ai-custom-logo"),
    packagingRequired: isToggleActive("wa-ai-custom-packaging"),
    colorRequirement: getInput("wa-ai-custom-color").value || null,
    sizeRequirement: getInput("wa-ai-custom-size").value || null,
    materialRequirement: getInput("wa-ai-custom-material").value || null,
    quantity: getInput("wa-ai-custom-quantity").value || null,
    moq: getInput("wa-ai-custom-moq").value || null,
    sampleFee: getInput("wa-ai-custom-sample-fee").value || null,
    sampleLeadTime: getInput("wa-ai-custom-sample-lead-time").value || null,
    bulkLeadTime: getInput("wa-ai-custom-bulk-lead-time").value || null,
    files: getTextArea("wa-ai-custom-files").value.split(/\n/).map((item) => item.trim()).filter(Boolean),
    status: getSelect("wa-ai-custom-status").value,
    notes: getTextArea("wa-ai-custom-notes").value || null
  };
}

function buildProductContext(action: QuickAction) {
  const manualContext = getTextArea("wa-ai-product-context").value.trim();
  if (action === "material") {
    return [
      "用户点击了发素材，需要生成素材说明草稿，不得编造价格、库存、交期、证书真实性、物流时效或付款账户。",
      manualContext
    ].filter(Boolean).join("\n");
  }
  if (action === "sample") {
    return [
      "用户点击了样品，需要生成样品流程话术草稿，不得编造样品费、运费、交期、付款方式、样品费抵扣规则或物流时效。",
      manualContext
    ].filter(Boolean).join("\n");
  }
  if (action === "custom") {
    return [
      "User clicked custom request. Generate a draft only. Do not invent MOQ, sample fee, sample lead time, bulk lead time, customization feasibility, payment terms, or file readiness.",
      manualContext
    ].filter(Boolean).join("\n");
  }
  if (action === "afterSales") {
    return [
      "User clicked after-sales. Generate a draft only. Do not promise refunds, reshipments, compensation, responsibility, logistics status, or after-sales policy.",
      manualContext
    ].filter(Boolean).join("\n");
  }
  const labels: Record<Exclude<QuickAction, "material" | "sample" | "custom" | "afterSales">, string> = {
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
  const prefixMap: Partial<Record<QuickAction, string>> = {
    translate: "中文翻译和回复草稿已生成。",
    reply: "三种多语言回复草稿已生成。",
    quote: "报价草稿已生成。",
    urge: "催单回复草稿已生成。",
    product: "产品介绍草稿已生成。",
    sample: "样品话术草稿已生成。",
    custom: "Custom script draft generated.",
    afterSales: "After-sales script draft generated.",
    followUp: "跟进草稿已生成。"
  };
  return `${prefixMap[action] || "素材说明草稿已生成。"}${risks[0] ? ` ${risks[0]}` : ""}`;
}

function parseTiers(value: string) {
  return value.split(/\n/).map((line) => {
    const [quantity, unitPrice] = line.split(/,|\//).map((item) => item.trim());
    return { quantity: Number(quantity), unitPrice };
  }).filter((tier) => tier.quantity > 0 && Number(tier.unitPrice) > 0);
}

function parseLines(value: string) {
  return value.split(/\n/).map((item) => item.trim()).filter(Boolean);
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
  if (profile.customerId) void loadCustomerIntentScore();
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

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[char] || char);
}

function initializeSidebarMode() {
  const storedMode = localStorage.getItem(SIDEBAR_MODE_KEY);
  const preferredMode: SidebarMode = storedMode === "collapsed" ? "collapsed" : "docked";
  setSidebarMode(window.innerWidth < SIDEBAR_BREAKPOINT ? "collapsed" : preferredMode, { persist: false });
}

function handleSidebarResize() {
  if (window.innerWidth < SIDEBAR_BREAKPOINT && sidebarMode === "docked") {
    setSidebarMode("collapsed", { persist: false });
    return;
  }
  applyWhatsAppOffset();
  mountQuickToolbar();
}

function setSidebarMode(mode: SidebarMode, options: { persist?: boolean } = {}) {
  const nextMode: SidebarMode = mode === "docked" && window.innerWidth < SIDEBAR_BREAKPOINT ? "overlay" : mode;
  sidebarMode = nextMode;
  document.documentElement.classList.toggle(HIDDEN_CLASS, nextMode === "collapsed");
  document.body.classList.toggle("waai-sidebar-open", nextMode !== "collapsed");
  document.body.classList.toggle("waai-sidebar-collapsed", nextMode === "collapsed");
  document.body.classList.toggle("waai-sidebar-overlay", nextMode === "overlay");
  if (options.persist) {
    localStorage.setItem(SIDEBAR_MODE_KEY, mode === "collapsed" ? "collapsed" : "docked");
  }
  applyWhatsAppOffset();
  mountQuickToolbar();
}

function findWhatsAppRoot() {
  return (
    document.getElementById("app") ||
    document.querySelector<HTMLElement>('[data-testid="app"]') ||
    document.querySelector<HTMLElement>('div[role="application"]')
  );
}

function resetWhatsAppRootOffset(root: HTMLElement | null) {
  if (!root) return;
  root.style.width = "";
  root.style.maxWidth = "";
  root.style.marginRight = "";
  root.style.transition = "";
  root.style.overflowX = "";
  root.removeAttribute("data-waai-docked");
}

function applyWhatsAppOffset() {
  if (offsetRoot && offsetRoot !== findWhatsAppRoot()) {
    resetWhatsAppRootOffset(offsetRoot);
    offsetRoot = null;
  }

  const appRoot = findWhatsAppRoot();
  if (!appRoot) {
    document.body.classList.toggle("waai-sidebar-overlay", sidebarMode !== "collapsed");
    return;
  }
  offsetRoot = appRoot;

  if (sidebarMode !== "docked" || window.innerWidth < SIDEBAR_BREAKPOINT) {
    resetWhatsAppRootOffset(appRoot);
    return;
  }

  appRoot.dataset.waaiDocked = "true";
  appRoot.style.width = "calc(100vw - var(--waai-sidebar-width))";
  appRoot.style.maxWidth = "calc(100vw - var(--waai-sidebar-width))";
  appRoot.style.marginRight = "var(--waai-sidebar-width)";
  appRoot.style.overflowX = "hidden";
  appRoot.style.transition = "width 0.2s ease, max-width 0.2s ease, margin-right 0.2s ease";
}

function cleanupSidebarLayout() {
  resetWhatsAppRootOffset(offsetRoot || findWhatsAppRoot());
  document.body.classList.remove("waai-sidebar-open", "waai-sidebar-collapsed", "waai-sidebar-overlay");
}

function cleanupExtensionObservers() {
  cleanupSidebarLayout();
  quickToolbarObserver?.disconnect();
  whatsappContextObserver?.disconnect();
  if (contextRefreshTimer) window.clearTimeout(contextRefreshTimer);
}

createSidebar();

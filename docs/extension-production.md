# Chrome Extension Production Build

Current release target: `v1.0-enterprise`.

The Chrome Extension is Manifest V3 and runs only on:

```text
https://web.whatsapp.com/*
```

It does not auto-send WhatsApp messages, does not bulk send, and does not click the WhatsApp send button. It only generates drafts that the salesperson can copy or insert, then manually review and send.

## V4-O WhatsApp Auto Context Recognition

- The content script detects only the currently visible WhatsApp conversation.
- It reads the visible chat title/header to infer `contactName`.
- If the title contains a phone number, it normalizes the number with `libphonenumber-js` and records E.164, country calling code, country code, country name and confidence.
- The country label is only a hint: show it as `根据手机号推测国家`, never as verified customer location.
- It reads at most 10 visible message bubbles from the current chat window and tries to classify them as `customer`, `me`, or `unknown`.
- The latest visible customer message is used as AI reply context. If detection fails, the manual paste textarea remains the fallback.
- The extension calls `POST /api/customers/match` with the visible contact name and phone number. A matched customer fills the ContextCard; an unmatched contact shows `New customer / not saved` and can be saved manually.

## Chrome 插件中文化 Docked 工作台

- 插件采用三层结构：WhatsApp 输入框快捷工具条、右侧 Docked AI 工作台、Web 后台复杂管理入口。
- 右侧面板打开时会给 WhatsApp 主界面让出 `390px` 空间，避免遮挡聊天内容、输入框和发送按钮。
- 浏览器宽度小于 `1280px` 时自动收起，只显示右侧浮动 `AI` 按钮；点击后以 overlay 方式临时打开面板。
- 面板统一使用简体中文，Tab 分为：客户信息、AI 回复、业务操作、A/B 测试、更多。
- 顶部 ContextCard 显示当前客户、阶段、品牌和意向，并提供保存客户、刷新、更新阶段三个高频操作。
- 中部 AI 回复区展示最近客户消息、模型选择、草稿生成、复制、插入和风险提示。
- 底部快捷栏固定展示：AI 回复、翻译、报价、素材、更多。
- A/B 测试不再常驻展开，标记结果合并为下拉菜单：已回复、已报价、已下单、无回复。
- 插件只生成、复制或插入草稿，不会自动发送 WhatsApp 消息，也不会模拟点击发送按钮。

排查工具条或面板样式：

1. 如果右侧面板遮挡聊天，检查 `body.waai-sidebar-open` 是否存在，以及 `#app[data-waai-docked="true"]` 是否设置了右侧让位宽度。
2. 如果小屏没有自动收起，检查浏览器宽度是否低于 `1280px`，以及 `localStorage.waai_sidebar_mode` 是否为 `collapsed`。
3. 如果输入框快捷工具条不显示，检查 WhatsApp 输入框 DOM selector 是否仍匹配，失败时应显示右侧浮动 `AI` 按钮。
4. 如果插入草稿失败，仍可复制草稿后手动粘贴；插件不会点击 WhatsApp 原生发送按钮。

Troubleshooting:

1. If the toolbar appears but context stays empty, open DevTools and check whether WhatsApp changed header/message DOM selectors.
2. If phone parsing fails, verify the visible title includes a full international number such as `+62 ...`.
3. If customer matching fails, verify the Web backend login session and organization membership.
4. If the extension falls back to manual paste, the user can still paste the message and generate drafts normally.

## AI Provider Selection

- The AI tab includes a model selector for `DeepSeek V4 fastest`, `instant`, `thinking`, `DeepSeek V4 thinking`, `ChatGPT 5.5 instant`, and `ChatGPT 5.5 thinking`.
- The selected value is sent to the backend as draft-generation context only. The backend AIService chooses an encrypted database key first, then environment fallback keys.
- Database AI keys are managed only by `goseashop@gmail.com` in the Web backend. The extension never sees plaintext keys.
- The backend tries active DeepSeek V4 keys before ChatGPT 5.5 fallback keys for the same mode unless the user explicitly selects a ChatGPT model.
- AI output remains a draft. The extension can copy or insert text into the WhatsApp input box but must not auto-send, bulk-send, call the WhatsApp official API, or simulate the send button.

## V4-F Order Center Sidebar

- The sidebar can load current customer orders, create a manual order record, and generate an order script draft.
- These actions require a saved customer and a logged-in Web backend session.
- The extension does not process payment, query logistics, update WhatsApp automatically, group send, or click any WhatsApp send button.
- If the API returns `403`, the sidebar shows a permission/login message and the user must adjust access in the Web backend.

## V4-I Reorder Operations Sidebar Notes

- V4-I keeps full campaign and playbook management in the Web backend.
- The extension may display lightweight current-customer reorder suggestions and drafts when the saved customer is available.
- If the API returns `403`, the sidebar should show a permission/login message.
- The extension still does not auto-send WhatsApp messages, bulk send, auto-create tasks, or click the WhatsApp send button.

## 1. Build for IP Staging

From the repository root:

```bash
npm ci
VITE_API_BASE_URL=http://187.77.138.174 VITE_WEB_LOGIN_URL=http://187.77.138.174 npm run build -w @wa-ai/extension
```

Output directory:

```text
apps/extension/dist
```

## 2. Build for Future HTTPS Domains

```bash
npm ci
VITE_API_BASE_URL=https://api.yourdomain.com VITE_WEB_LOGIN_URL=https://app.yourdomain.com npm run build -w @wa-ai/extension
```

## 3. Load the Extension

1. Open Chrome.
2. Go to `chrome://extensions`.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select `apps/extension/dist`.
6. Open `https://web.whatsapp.com`.

Expected:

- The sidebar appears on the right side of WhatsApp Web.
- The sidebar calls `/api/auth/me` on startup.
- If logged in, it shows the current user.
- If not logged in, it shows `请先登录 Web 后台` and an open-login button.

## 4. Find the Extension ID

1. Open `chrome://extensions`.
2. Find `WhatsApp AI Sales Assistant V1`.
3. Copy the `ID` shown on the extension card.
4. On the server, set:

```env
CHROME_EXTENSION_ORIGIN=chrome-extension://<extension-id>
```

Restart API:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d api
```

## 5. Required Manifest Permissions

`apps/extension/public/manifest.json` must include:

```json
{
  "host_permissions": [
    "http://187.77.138.174/*",
    "https://api.yourdomain.com/*",
    "https://web.whatsapp.com/*"
  ],
  "content_scripts": [
    {
      "matches": ["https://web.whatsapp.com/*"]
    }
  ]
}
```

The extension must not request broad hosts such as `<all_urls>`.

## 6. API Base URL

The content script reads:

```text
VITE_API_BASE_URL
```

The popup login button reads:

```text
VITE_WEB_LOGIN_URL
```

Do not hardcode production secrets into the extension.

## 7. Cookie and CORS Checklist

For IP staging:

```env
WEB_ORIGIN=http://187.77.138.174
API_ORIGIN=http://187.77.138.174
CORS_ORIGINS=http://187.77.138.174
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
COOKIE_DOMAIN=
```

For future HTTPS:

```env
WEB_ORIGIN=https://app.yourdomain.com
API_ORIGIN=https://api.yourdomain.com
CORS_ORIGINS=https://app.yourdomain.com,https://api.yourdomain.com
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
COOKIE_DOMAIN=.yourdomain.com
CHROME_EXTENSION_ORIGIN=chrome-extension://<extension-id>
```

All extension fetch calls must use:

```ts
credentials: "include"
```

## 8. Troubleshooting

Sidebar shows not logged in:

- Confirm you logged in at `http://187.77.138.174` in the same Chrome profile.
- Open DevTools on WhatsApp Web and inspect `/api/auth/me`.
- Confirm response is not blocked by CORS.
- Confirm the `wa_ai_session` cookie exists for the API origin.

CORS error:

- Add Web origin to `CORS_ORIGINS`.
- Add fixed extension origin to `CHROME_EXTENSION_ORIGIN`.
- Restart API.

403 permission denied:

- V4-D protected APIs return `403` when the current role cannot access a customer, organization resource, report, export, or AI action.
- The sidebar displays a permission-denied message and does not try to bypass permissions.
- Confirm the user's organization role, customer owner/assignee/collaborators, and organization membership in the Web backend.

V4-E reorder prediction:

- The sidebar shows a saved customer's reorder prediction and can generate a reorder/reactivation draft through `/api/ai/reorder-script`.
- The draft is copied or inserted only after the user clicks a button.
- The extension never sends WhatsApp messages, never creates marketing campaigns, and never simulates the WhatsApp send button.
- If the customer is not saved, the sidebar asks the user to save the customer before using reorder prediction.

V4-G order fulfillment:

- The sidebar can load current customer orders, check fulfillment alerts, and generate fulfillment draft text through `/api/orders/:id/fulfillment` and `/api/ai/order-fulfillment-script`.
- The extension does not update order status automatically.
- The extension does not create fulfillment tasks automatically.
- Fulfillment drafts must be copied or inserted by user action and manually reviewed before sending.

Cookie not sent:

- IP staging must use `COOKIE_SECURE=false`, `COOKIE_SAME_SITE=lax`.
- HTTPS must use `COOKIE_SECURE=true`, `COOKIE_SAME_SITE=none`.
- Fetch must include `credentials: "include"`.

Extension uses old API URL:

- Rebuild with `VITE_API_BASE_URL=http://187.77.138.174`.
- Reload the unpacked extension in `chrome://extensions`.

Remote JS risk:

- Manifest V3 build must use bundled local files from `apps/extension/dist`.
- Do not add remotely hosted JavaScript.

## V4-H Profit Review Extension Note

The Chrome extension does not expose full cost details by default. If a profit endpoint returns `403`, the sidebar should show a permission message and direct users to the Web backend. Profit review never sends WhatsApp messages automatically.

## V4-J After-sales Note

The Chrome extension remains a draft-only assistant. V4-J after-sales APIs are available to the Web backend; a richer dedicated sidebar after-sales panel is a future UX improvement. Existing sidebar order/fulfillment/customer workflows must continue to use credentials: include, show 403 permission errors, and never auto-send, bulk-send, or click WhatsApp send buttons.

## V4-K A/B Script Testing Note

The sidebar can load active A/B script experiments, display enabled variants, copy or insert a selected draft, and record `used_draft` through `/api/script-usages`. It can also manually mark lightweight outcomes such as customer replied, quote created, order created, or no response.

This is usage tracking only. The extension never auto-sends WhatsApp messages, never bulk-sends, never clicks the WhatsApp send button, and never decides the customer outcome automatically.

## V4-L Supplier / Procurement Note

The sidebar includes a lightweight supplier draft generator that calls `/api/ai/supplier-script`. It can generate, copy, or insert supplier/procurement drafts for price, MOQ, sample fee, lead time, bulk cost, custom feasibility, quality issue, reship cost, negotiation, and purchase-detail confirmation.

This is draft generation only. The extension never contacts suppliers, never creates purchase orders, never applies supplier costs, never makes supplier payments, never auto-sends WhatsApp messages, never bulk-sends, and never clicks the WhatsApp send button.

## V4-M Brand / Store Note

The sidebar includes a brand/store selector. After login it loads active brands from the user's organization, lets the salesperson choose a current brand, and passes `brandId` into supported AI draft APIs. The selected brand also filters products and materials where the API supports brand filtering.

If a customer is saved while a brand is selected, the extension can manually assign that brand to the customer. Created orders and after-sales cases can also be manually assigned to the selected brand. These assignments are record updates only; they do not switch WhatsApp accounts, sync store orders, call store APIs, or send any messages.

If the API returns `403`, the sidebar shows a permission message. The extension must continue using `credentials: "include"` and must never auto-send WhatsApp messages, bulk-send, simulate clicking the send button, or bypass brand/organization permissions.

## V5 Enterprise Extension Notes

- The Chrome extension continues to use Web login cookies with `credentials: include`.
- Enterprise context is advisory only; plugin-side AI drafts must still be manually copied/inserted and sent by the salesperson.
- The extension must keep `content_scripts.matches` limited to `https://web.whatsapp.com/*` and must not simulate the WhatsApp send button.
- If an enterprise or brand-context API returns `403`, show a permission message instead of exposing organization data.

## V5 Extension UI Refresh

The production extension uses a WhatsApp-native quick toolbar plus a right-side AI workbench:

- The quick toolbar is mounted near the WhatsApp chat input when a chat window exists.
- The toolbar includes `AI 回复`, `翻译`, `报价`, `素材`, and `更多`.
- If the WhatsApp input container cannot be found, the extension falls back to a floating `AI` button.
- The right-side workbench uses tabs: `客户`, `AI`, `业务`, `A/B`, and `更多`.
- The `业务` tab shows compact action panels for quote, material, sample, custom, order, after-sales, reorder, and follow-up workflows.
- The `A/B` tab uses `复制并记录`, `插入并记录`, and one outcome dropdown.

Troubleshooting:

- If the toolbar does not appear, open an actual chat thread and refresh WhatsApp Web.
- If it still does not appear, check that `content_scripts.matches` includes only `https://web.whatsapp.com/*` and reload the unpacked extension.
- If insertion fails, copy the draft manually. The extension never clicks the WhatsApp send button.
- If the sidebar shows `403`, confirm the Web backend role, organization membership, and customer ownership.

## Mockup-aligned Chinese AI Workbench

The Chrome extension sidebar now follows the WhatsApp-style mockup layout for Chinese cross-border sales users:

- The sidebar is docked on the right and the WhatsApp main area reserves space, so chat messages and the input box are not covered.
- The header shows draft mode, backend connection state, refresh, settings, and collapse controls.
- The customer context card shows customer name, WhatsApp number, saved/matched state, stage, intent level, brand/store, and inferred country.
- Tabs are grouped as `客户信息`, `AI 回复`, `业务操作`, `A/B 测试`, and `更多`.
- The AI tab includes latest customer message, model selector, AI draft area, copy/insert actions, and risk warnings.
- The model selector supports DeepSeek V4 and ChatGPT 5.5 instant/thinking modes through the backend AIService.
- The bottom quick bar keeps high-frequency actions visible: `AI 回复`, `翻译`, `报价`, `素材`, `更多`.
- The `更多` tab is for navigation and lightweight status only. Complex supplier, profit, fulfillment, brand, and A/B management should open in the Web backend.
- `goseashop@gmail.com` can see a masked AI Key usage card with request and token counters. Plaintext keys are never shown in the extension.

Safety behavior remains unchanged:

- AI output is only a draft.
- Insert only fills the WhatsApp input box.
- The extension never auto-sends, bulk-sends, clicks the WhatsApp send button, switches WhatsApp accounts, or bypasses permissions.

Responsive behavior:

- At widths below `1280px`, the full sidebar auto-collapses to the floating `AI` button.
- Clicking the floating `AI` button opens a temporary overlay with a close button.
- The quick toolbar falls back to the floating `AI` button when the WhatsApp input container cannot be found.

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

Troubleshooting:

1. If the toolbar appears but context stays empty, open DevTools and check whether WhatsApp changed header/message DOM selectors.
2. If phone parsing fails, verify the visible title includes a full international number such as `+62 ...`.
3. If customer matching fails, verify the Web backend login session and organization membership.
4. If the extension falls back to manual paste, the user can still paste the message and generate drafts normally.

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

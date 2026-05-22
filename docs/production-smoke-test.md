# Production Smoke Test

## OpenAI / ChatGPT Key-Pool Smoke Test

1. In server `.env.production`, configure either `OPENAI_API_KEY` or `OPENAI_API_KEYS`.
2. Recommended multi-key format:
   ```env
   OPENAI_API_KEYS=key_1,key_2,key_3
   OPENAI_MODEL=gpt-4o-mini
   ```
3. Restart the API container after changing `.env.production`.
4. Open Web or the Chrome extension and generate an AI reply or translation.
   - Expected: output is a natural translation/draft instead of local placeholder text.
   - Expected: no OpenAI key appears in browser devtools, logs, CSV export, or API responses.
5. If one key is exhausted or rate-limited, keep the next key valid and generate again.
   - Expected: API falls through to the next configured key.
   - Expected: if all keys fail, the API returns a local fallback draft with a warning.

## V4-O Chrome Extension Auto Context Smoke Test

1. Open `https://web.whatsapp.com` and select one active chat.
   - Expected: the quick toolbar is visible and the sidebar ContextCard shows the current contact or `New customer / not saved`.
2. Select a chat whose title contains an international phone number.
   - Expected: the sidebar shows E.164 phone and `根据手机号推测国家`.
3. Send/receive visible test messages in the open chat.
   - Expected: the sidebar detects up to 10 visible recent messages and uses the latest customer message for AI reply.
4. Switch to another chat.
   - Expected: context refreshes once after debounce; duplicate toolbars or sidebars are not injected.
5. Click `AI 回复`.
   - Expected: AI uses detected latest customer message when present; manual paste still works if detection fails.
6. Click insert draft.
   - Expected: the draft is inserted into the WhatsApp input box only. The extension does not click send, auto-send, bulk-send, or call WhatsApp official APIs.
7. Save an unmatched customer.
   - Expected: the suggested payload includes contact name, WhatsApp number, phone-country hint and latest visible customer message; after save, matching refreshes.

## V4-C/V4-D/V4-E/V4-F Regression Additions

Run these after the existing login, CRM, product, quote, follow-up, import/export, and extension checks:

1. AI advanced next action
   - Open Web backend AI sales suggestion page or call `POST /api/ai/next-action` with an accessible `customerId`.
   - Expected: returns `recommendedAction`, `suggestedScript`, `riskWarnings`, and `createdLogId`.
   - Failure checks: verify login, organization membership, and customer assignment.

2. AI risk check
   - Submit text containing `lowest price` or `always in stock`.
   - Expected: `riskLevel=high`, risky phrases are listed, and a safe rewrite is returned.
   - Failure checks: verify API logs and that forbidden-expression knowledge rows are enabled if used.

3. Sensitive operation confirmation
   - Try deleting a test customer without `confirm=true`.
   - Expected: API returns `CONFIRM_REQUIRED`.
   - Retry with `confirm=true` only for disposable test data.

4. Organization export scope
   - As owner, create normal and sensitive export jobs.
   - As manager, verify normal export works and sensitive export returns `403`.
   - As sales/support, verify organization export creation returns `403`.

5. Audit and risk events
   - Open audit logs and risk events pages.
   - Expected: high/medium events such as missing confirmation or sensitive export attempts are visible to owner/manager only.

## V4-I Reorder Operations Regression Additions

1. Reorder opportunities
   - Open Web backend `Reorder ops`.
   - Click `Recalculate scope`.
   - Expected: accessible old customers, dormant customers, replenishment, related product and high-value opportunities appear.

2. Manual task creation
   - Pick one open opportunity and click `Create FollowUpTask`.
   - Expected: a follow-up task is created only after the user click; no WhatsApp message is sent.

3. AI reorder operation script
   - Generate a `new_product_recommendation` or `replenishment_check` draft.
   - Expected: response includes `riskWarnings`; it does not claim previous purchase history unless completed order data exists.

4. Campaigns and playbooks
   - Create one campaign and one playbook.
   - Delete each with confirmation.
   - Expected: records are scoped to the current user/organization and deletion writes audit logs.

5. Security boundary
   - Confirm there is no automatic marketing, no bulk task creation, no automatic WhatsApp send, and no simulated send-button click.

6. Chrome extension permission handling
   - Use a role/customer combination without access.
   - Expected: sidebar shows permission denied and does not auto-send, bulk-send, or simulate any WhatsApp send-button click.

7. V4-E business prediction
   - Call `POST /api/predictions/customers/recalculate` with an accessible `customerId`.
   - Expected: response contains created/updated counts, and `GET /api/predictions/customers` returns prediction rows.
   - Failure checks: verify customer ownership, assignment, collaborators, organization membership, and role.

8. V4-E reorder reminder
   - Create a reminder with `POST /api/reorder-reminders`.
   - Expected: reminder is `pending`; no `FollowUpTask` is created until `POST /api/reorder-reminders/:id/create-follow-up-task` is called manually.
   - Failure checks: verify `customerId` access and `remindAt` ISO date.

9. V4-E reorder script
   - Call `POST /api/ai/reorder-script` with an accessible `customerId`.
   - Expected: returns `scriptText`, `riskWarnings`, and optional `knowledgeUsed`; text does not invent previous purchase history, price, inventory, discount, or urgency.
   - Failure checks: verify login and knowledge/product access.

10. V4-F order center
   - Create one manual order in Web backend.
   - Convert one saved quote to an order.
   - Convert one sample order to a bulk order draft.
   - Convert one custom request to an order draft.
   - Update payment, production, shipping and after-sales status.
   - Expected: each operation returns/saves risk warnings and writes audit logs. No payment is processed and no logistics API is called.

11. V4-F order script and extension
   - Generate an order script from Web backend and Chrome sidebar.
   - Expected: script is editable/copyable draft only, with payment/logistics/after-sales confirmation warnings.
   - Confirm no automatic WhatsApp sending, bulk sending or send-button clicking occurs.

Current release target: `v1.0-enterprise`.

Use this checklist after deployment to `http://187.77.138.174`.

Setup:

```bash
export BASE_URL=http://187.77.138.174
export COOKIE_FILE=/tmp/wa-ai-cookie.txt
```

Do not write real passwords into this file. Replace placeholders only in your terminal.

## 1. API Health

Operation:

```bash
curl -i "$BASE_URL/api/health"
```

Expected:

- HTTP `200`.
- Response contains `ok: true`.

Troubleshooting:

- Check Nginx config.
- Check `docker compose ... ps`.
- Check `docker compose ... logs -f api`.

## 2. Web Dashboard Login Page

Operation:

Open:

```text
http://187.77.138.174
```

Expected:

- Web dashboard loads.
- If not logged in, login form is visible.

Troubleshooting:

- Check Nginx `/` proxy to `127.0.0.1:3000`.
- Check `web` container status.

## 3. Login API

Operation:

```bash
curl -i -c "$COOKIE_FILE" \
  -H "Content-Type: application/json" \
  -d '{"email":"<admin-email>","password":"<admin-password>"}' \
  "$BASE_URL/api/auth/login"
```

Expected:

- HTTP `200`.
- Response contains user email/name.
- `Set-Cookie` contains `wa_ai_session`.

Troubleshooting:

- Confirm `npm run db:seed` was executed.
- Confirm `ADMIN_EMAIL` and `ADMIN_PASSWORD` were set before seed.
- Check API logs for validation errors.

## 4. Current User

Operation:

```bash
curl -i -b "$COOKIE_FILE" "$BASE_URL/api/auth/me"
```

Expected:

- HTTP `200`.
- Response contains the current user.

Troubleshooting:

- If `401`, check cookie file and cookie settings.
- IP staging should use `COOKIE_SECURE=false` and `COOKIE_SAME_SITE=lax`.

## 5. Create Customer

Operation:

```bash
curl -i -b "$COOKIE_FILE" \
  -H "Content-Type: application/json" \
  -d '{"name":"Maria Smoke","whatsappNumber":"+5215550001111","country":"Mexico","language":"Spanish","tags":["new","high-intent"],"stage":"new-lead","notes":"Smoke test customer"}' \
  "$BASE_URL/api/customers"
```

Expected:

- HTTP `200` or `201`.
- Response contains customer `id`.
- Customer belongs to the current user.

Troubleshooting:

- If `401`, login again.
- If validation fails, check required fields.

## 6. Create Product

Operation:

```bash
curl -i -b "$COOKIE_FILE" \
  -H "Content-Type: application/json" \
  -d '{"name":"Blue Dress","sku":"BD-SMOKE-001","category":"Dress","colors":["Blue"],"sizes":["S","M","L"],"material":"Cotton blend","moq":100,"suggestedPrice":"12.50","minPrice":"10.00","leadTime":"15 days","sellingPoints":["Comfortable fabric","Stable quality"],"introEn":"This blue dress is suitable for retail and wholesale orders."}' \
  "$BASE_URL/api/products"
```

Expected:

- HTTP `200` or `201`.
- Response contains product `id`.

Troubleshooting:

- If duplicate SKU fails, use a new SKU.
- Confirm the user is logged in.

## 7. Generate Product Intro

Operation:

```bash
curl -i -b "$COOKIE_FILE" \
  -H "Content-Type: application/json" \
  -d '{"targetLanguage":"Spanish","customerMessage":"Can you send details?"}' \
  "$BASE_URL/api/products/<product-id>/intro"
```

Expected:

- Response contains intro draft.
- Risk warnings remind the salesperson to confirm price, stock, and lead time if needed.
- No message is sent to WhatsApp.

Troubleshooting:

- Confirm `<product-id>` belongs to the logged-in user.
- Check API logs.

## 8. Generate and Save Quote

Generate:

```bash
curl -i -b "$COOKIE_FILE" \
  -H "Content-Type: application/json" \
  -d '{"customerId":"<customer-id>","productId":"<product-id>","quantity":100,"unitPrice":"12.50","currency":"USD","shippingCost":"30","moq":100,"leadTime":"15 days","includeShipping":false,"targetLanguage":"Spanish","stockKnown":false,"promiseStock":false,"attachmentSelected":false}' \
  "$BASE_URL/api/quotes/generate"
```

Save:

```bash
curl -i -b "$COOKIE_FILE" \
  -H "Content-Type: application/json" \
  -d '{"customerId":"<customer-id>","productId":"<product-id>","quantity":100,"unitPrice":"12.50","currency":"USD","shippingCost":"30","moq":100,"leadTime":"15 days","includeShipping":false,"targetLanguage":"Spanish","stockKnown":false,"promiseStock":false,"attachmentSelected":false}' \
  "$BASE_URL/api/quotes"
```

Expected:

- Quote draft is generated.
- Saved quote returns an `id`.
- Risk warnings mention draft-only and stock confirmation.

Troubleshooting:

- Confirm customer and product belong to the logged-in user.
- Confirm numeric fields are valid.

## 9. Create Follow-Up Task

Operation:

```bash
curl -i -b "$COOKIE_FILE" \
  -H "Content-Type: application/json" \
  -d '{"customerId":"<customer-id>","taskType":"报价后跟�?,"remindAt":"2030-01-02T10:00:00.000Z","recommendedScript":"Hi, just checking if you reviewed the quotation. This is only a draft; please confirm price, stock, lead time, and shipping before sending."}' \
  "$BASE_URL/api/follow-ups"
```

Expected:

- HTTP `200` or `201`.
- Response contains task `id`.
- Script is draft-only.

Troubleshooting:

- Confirm customer belongs to the logged-in user.
- Confirm `remindAt` is ISO datetime.

## 10. Dashboard Shows Follow-Up

Operation:

```bash
curl -i -b "$COOKIE_FILE" "$BASE_URL/api/follow-ups/dashboard"
```

Expected:

- Dashboard data includes today/upcoming/overdue follow-up sections.
- Data is scoped to current user.

Troubleshooting:

- Confirm task status is `pending`.
- Confirm reminder time falls into the expected bucket.

## 11. Chrome Extension Login State

Operation:

1. Build extension:

```bash
VITE_API_BASE_URL=http://187.77.138.174 VITE_WEB_LOGIN_URL=http://187.77.138.174 npm run build -w @wa-ai/extension
```

2. Load `apps/extension/dist` in Chrome.
3. Login at `http://187.77.138.174`.
4. Open `https://web.whatsapp.com`.

Expected:

- Sidebar starts and calls `/api/auth/me`.
- Logged-in state shows current user.
- Logged-out state shows `请先登录 Web 后台`.

Troubleshooting:

- Confirm extension host permissions include `http://187.77.138.174/*`.
- Confirm fetch uses `credentials: "include"`.
- Check cookie settings and CORS.

## 12. Sidebar Generates Reply Draft

Operation:

1. Paste customer message into sidebar, for example `How much for 100 pcs?`.
2. Click generate reply.

Expected:

- Translation, intent, concerns, and reply drafts are shown.
- Content is editable/copyable.
- No WhatsApp message is sent automatically.

Troubleshooting:

- Check `/api/ai/reply` network request.
- Confirm API is reachable from the extension.

## 13. Account Isolation

Operation:

Login as user A and user B into separate cookie files:

```bash
curl -i -c /tmp/wa-ai-a.txt -H "Content-Type: application/json" -d '{"email":"<user-a-email>","password":"<user-a-password>"}' "$BASE_URL/api/auth/login"
curl -i -c /tmp/wa-ai-b.txt -H "Content-Type: application/json" -d '{"email":"<user-b-email>","password":"<user-b-password>"}' "$BASE_URL/api/auth/login"
```

Use user B cookie to access user A resources:

```bash
curl -i -b /tmp/wa-ai-b.txt "$BASE_URL/api/customers/<user-a-customer-id>"
curl -i -b /tmp/wa-ai-b.txt "$BASE_URL/api/products/<user-a-product-id>"
curl -i -b /tmp/wa-ai-b.txt "$BASE_URL/api/quotes/<user-a-quote-id>"
curl -i -b /tmp/wa-ai-b.txt "$BASE_URL/api/follow-ups/<user-a-task-id>"
```

Expected:

- Requests are rejected or return `404`.
- User A data is not exposed.

Troubleshooting:

- Check owner filters in API logs.
- Re-run automated API tests locally.

## 14. No WhatsApp Auto-Send Logic

Operation:

```bash
rg -n "click\\(|dispatchEvent|KeyboardEvent|compose-btn-send|send button|bulk send|auto[- ]?send|automatic send|自动发送|群发|setInterval\\(" apps packages
```

Expected:

- No code clicks WhatsApp send buttons.
- No auto-send, bulk-send, or scheduled-send logic.
- Matches may include safety copy like `不会自动发送` and tests that assert no auto-send behavior.

Troubleshooting:

- If a real sending implementation appears, remove it before deployment.
- Keep copy/insert behavior draft-only and user-confirmed.

## 15. V4-G Order Fulfillment Board

Operation:

1. Create or open an order in `Orders`.
2. Set `paymentStatus=unpaid` and `orderStatus=pending_payment`.
3. Open `Fulfillment`.
4. Click refresh or recalculate fulfillment alerts.
5. Open the order and generate a fulfillment draft.

Expected:

- The order appears in pending payment.
- Fulfillment alerts appear for overdue payment when applicable.
- Alert status can be resolved or dismissed manually.
- Fulfillment follow-up task is created only after clicking the button.
- Fulfillment draft is editable/copyable and no WhatsApp message is sent.

Troubleshooting:

- Check `/api/orders/fulfillment-board`.
- Check `/api/orders/:id/fulfillment`.
- Check `/api/ai/order-fulfillment-script`.
- Confirm the order belongs to the current user or current organization scope.

## V4-H Profit Review Smoke Test

1. Login as owner or manager.
2. Open `Profit review`.
3. Select an order and enter cost fields.
4. Confirm total cost, gross profit, and gross margin are calculated.
5. Confirm low-margin or loss warnings appear when margin is low or negative.
6. Confirm `support` cannot access profit APIs.
7. Confirm AI profit review says it is operational advice only and not accounting or tax advice.
8. Confirm no WhatsApp message is sent automatically.

## V4-J After-sales Smoke Test

1. Log in to the Web backend.
2. Open After sales.
3. Create a case for an owned customer/order.
4. Confirm the case appears in the list and customer detail.
5. Try closing without notes/confirmation and confirm it is rejected.
6. Confirm responsibility and final solution only after confirm=true.
7. Generate an after-sales script and verify it is a draft with refund/reship/company-policy warnings.
8. Create an after-sales FollowUpTask manually.
9. Confirm no WhatsApp message is sent automatically.

## V4-K A/B Script Testing Smoke Test

1. Log in as owner or manager.
2. Open `A/B scripts`.
3. Create an active experiment for `price_reply`.
4. Add variants A, B and C, or use AI generate and manually save the variants.
5. Open the experiment detail and confirm stats show sample-size warnings before enough usage exists.
6. Select a variant and click `Copy + record used_draft`; confirm a usage record appears.
7. Mark the usage as `customer_replied`, `quote_created`, `order_created` or `no_response` manually.
8. Open `https://web.whatsapp.com`, refresh the extension sidebar, select the active experiment and variant, then copy or insert the draft.
9. Confirm the extension records usage but does not auto-send, bulk-send or click the WhatsApp send button.
10. Confirm cross-organization experiment, variant and usage IDs are rejected by API tests.

## V4-L Supplier / Procurement Smoke Test

1. Log in as owner or manager.
2. Open `Suppliers`.
3. Create a supplier with status `candidate` or `active`.
4. Add a supplier contact and confirm sensitive contact fields are visible only to permitted roles.
5. Add a supplier quote with MOQ, unit cost, currency and lead time.
6. Add a purchase note and supplier risk record.
7. Apply the supplier quote to an order cost with `confirm=true`; confirm the cost remains manual and not auto-confirmed.
8. Generate a supplier draft for price, MOQ or lead time and confirm it includes warnings to confirm price, MOQ, quality, lead time and cost.
9. Open the Chrome extension sidebar and generate a supplier draft; confirm it can be copied/inserted but no supplier is contacted and no WhatsApp message is sent.
10. Confirm cross-organization supplier, quote, product and order IDs are rejected.

## V4-M Brand / Store Smoke Test

1. Log in as owner or manager.
2. Open `Brands / stores`.
3. Create an active brand with default language and currency.
4. Link one product, one material, one organization knowledge entry and one script to the brand.
5. Add brand rules for quote rule, payment method, logistics and after-sales policy.
6. Assign the brand to a customer with manual confirmation.
7. Generate an AI reply with `brandId`; confirm the response includes `brandUsed`, `brandRulesUsed`, `knowledgeUsed` and brand risk warnings.
8. Generate order, fulfillment, after-sales, reorder operation, supplier and A/B script drafts with `brandId`; confirm they remain drafts and include brand usage metadata where supported.
9. Open the Chrome extension sidebar, select the brand, confirm product/material lists are brand-filtered, and generate an AI draft.
10. Confirm inactive/archived brands do not appear by default in the sidebar.
11. Confirm cross-organization brand, product, material, knowledge, script and assignment IDs are rejected.
12. Confirm the extension does not switch WhatsApp accounts, call store APIs, auto-send WhatsApp messages, bulk-send, or click the WhatsApp send button.

## V5 Enterprise Smoke Test

- Log in as owner/manager and open the Web `Enterprise` entry.
- Create an organization unit, generate an enterprise report, and confirm an `EnterpriseAuditLog` entry appears.
- Open enterprise brand context for an active brand and confirm `brandUsed`, `brandRulesUsed`, and risk warnings are visible.
- Confirm sales/support cannot manage enterprise units or generate enterprise reports.
- Confirm no WhatsApp message is sent automatically from any V5 workflow.

## V5 Extension UI Refresh Smoke Test

1. Open `https://web.whatsapp.com` and select a real chat.
2. Confirm the quick toolbar appears near the WhatsApp input area with `AI 回复`, `翻译`, `报价`, `素材`, and `更多`.
3. Switch away from a chat and confirm the toolbar hides or falls back to the floating `AI` button.
4. Switch chats repeatedly and confirm only one toolbar is injected.
5. Click `AI 回复` and confirm the right workbench opens on the `AI` tab.
6. Click `翻译` and confirm it stays in the `AI` tab and does not send a message.
7. Click `报价` and confirm the workbench opens the `业务` tab with the quote panel.
8. Click `素材` and confirm the workbench opens the material panel.
9. Click `更多` and confirm Web backend shortcuts are shown.
10. Open the `A/B` tab and confirm result marking uses one dropdown.
11. Insert any draft and confirm it only fills the input box; it does not click the WhatsApp send button.
12. Confirm no auto-send, bulk-send, simulated send-button click, or WhatsApp official API call occurs.

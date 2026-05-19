# Production Smoke Test

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
  -d '{"customerId":"<customer-id>","taskType":"报价后跟进","remindAt":"2030-01-02T10:00:00.000Z","recommendedScript":"Hi, just checking if you reviewed the quotation. This is only a draft; please confirm price, stock, lead time, and shipping before sending."}' \
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

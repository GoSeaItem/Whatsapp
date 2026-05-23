# V6 Enterprise Intelligent Operations

V6 upgrades the V5 enterprise platform into an intelligent-operations layer while keeping all existing V4/V5 sales, order, fulfillment, profit, reorder, after-sales, A/B testing, supplier, brand, AI key and Chrome extension boundaries.

## Scope

- Multi-channel unified customer view across WhatsApp, Telegram, WeChat, email, Instagram and future channels.
- Team and department foundations for enterprise operations.
- Conversation history and interaction logs for current business context and audit.
- AI key usage detail logs for DeepSeek V4 and ChatGPT 5.5 instant/thinking modes.
- Web backend entry: `V6 智能运营`.

## Data Models

- `MultiChannelCustomer`: organization-scoped customer identity across channels, with preferred language, currency, brand, owner and assigned user fields.
- `Department`: organization department tree foundation.
- `Team`: team records linked to an organization and optional department.
- `Permission`: organization-scoped permission key catalog. V6 reuses existing `Role` and `EnterpriseRole` for role assignments.
- `ConversationHistory`: channel, direction, sender role, message text, language and metadata for visible business messages.
- `InteractionLog`: business actions such as AI suggestions, quotes, orders, after-sales, reorder and supplier interactions.
- `AIKeyUsageLog`: per-call provider, mode, model, token count, success/error and timestamp for server-side AI key usage.

## APIs

- `GET /api/enterprise/v6/overview`
- `GET /api/enterprise/multi-channel-customers`
- `POST /api/enterprise/multi-channel-customers`
- `GET /api/enterprise/conversation-history`
- `POST /api/enterprise/conversation-history`
- `GET /api/enterprise/interaction-logs`
- `POST /api/enterprise/interaction-logs`
- `GET /api/enterprise/ai-key-usage`

All endpoints require login and organization membership. Writes require organization write permission where the operation changes enterprise records.

## AI Model Routing

The existing AI provider layer remains the single dispatch path:

- DeepSeek V4 models are prioritized when available.
- ChatGPT 5.5 instant/thinking remain fallback choices.
- Usage is now written to both aggregate key counters and `AIKeyUsageLog`.
- Plaintext keys are never returned to the Web app or Chrome extension.

## Safety Boundaries

V6 does not add WhatsApp official API integration, automatic WhatsApp sending, bulk sending, simulated send-button clicks, automatic supplier contact, automatic payment, automatic refund, automatic shipment, automatic cost confirmation, or automatic promises about price, inventory, lead time, shipping, payment, logistics, after-sales, suppliers, brands or stores.

All AI content is draft-only and must be manually reviewed by a salesperson or administrator before sending or acting.

## Known Limits

- V6 stores foundations for Telegram, WeChat and email, but it does not yet connect external channel APIs.
- Department/team membership is a foundation; advanced enterprise IAM, SSO, LDAP and approval workflow engines remain future work.
- Conversation history is intended for business-context summaries and does not perform background bulk chat scraping.
- Excel export and advanced BI dashboards are still later enterprise enhancements; current export remains CSV-focused unless an existing module already supports another format.

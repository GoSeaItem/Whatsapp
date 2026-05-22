# Known Issues

Current release target: `v1.0-enterprise`.

## V5 Enterprise Platform

- V5 adds enterprise organization units, role overlays, audit logs, reports, and brand-context lookup. It does not yet implement a full enterprise IAM/SSO directory, complex approval engine, or asynchronous big-data reporting queue.
- `EnterpriseResourceLink` is a safe foundation for cross-organization resource sharing; broader cross-organization data sharing remains conservative and should be expanded in a dedicated hardening pass.
- Enterprise import/export coverage for all V5 entities should be extended later under the existing sensitive-export and audit rules.
- Legacy mojibake strings still exist in older seed/demo data and some historical V1/V2 text. User-facing critical V5 pages avoid those strings, but a full localization cleanup is still recommended.
- Chrome extension UI now uses a quick toolbar and tabbed workbench, but older low-frequency form labels still include some legacy text from earlier versions. Core navigation and new high-frequency actions use the refreshed labels.
- Safety boundaries remain unchanged: no automatic WhatsApp sending, no bulk sending, no send-button simulation, no automatic customer/supplier contact, no real payment/logistics/procurement, and no automatic commercial promises.

## V4-N Full-chain Release Review

- V4-N is a stabilization and release-marking pass only. No new business modules are added.
- P2/P3 follow-ups after this pass: deepen brand context in the remaining V4-C advanced decision endpoints; complete import/export coverage for newer V4 resources such as brands, supplier details, after-sales cases, A/B script tests, profit exports, and fulfillment alerts; continue cleaning legacy mojibake text in older V1/V2 known-issue sections.
- Dependency audit currently reports 5 moderate npm advisories. `npm audit fix --force` was not applied during release review because it may introduce breaking dependency upgrades; handle in a dedicated dependency-maintenance pass.
- Release boundaries remain unchanged: no WhatsApp official API, no automatic sending, no bulk sending, no simulated send-button click, no automatic customer/supplier contact, no real payment, no real logistics, no full ERP, no full finance system, no automatic refund, no automatic shipment, no automatic inventory confirmation, no automatic cost confirmation, no store API sync, and no WhatsApp account switching.

## V4-M Multi-brand / Multi-store Management

- Brand/store management is an internal context layer only. It does not switch WhatsApp accounts, connect store APIs, sync store orders, or send messages.
- Brand product/material/knowledge/script links are manual. Existing records are not auto-classified into brands.
- `BrandAssignment` can record brand context for customers, orders, after-sales and other entities, but users must confirm changes manually.
- `POST /api/ai/reply`, order scripts, fulfillment scripts, after-sales scripts, reorder operation scripts, supplier drafts, and A/B variant generation use brand context now. Some V4-C advanced decision endpoints still need a later hardening pass for full brand rule merging.
- Brand import/export is documented as a future V4-A extension and is not fully wired in this lightweight pass.
- If brand rules conflict with organization rules, the system warns the salesperson but does not resolve the conflict automatically.
- Chrome sidebar brand support is intentionally lightweight: it filters product/material choices and passes brand context for drafts, but full brand resource management stays in the Web backend.

## V4-L Supplier / Procurement Collaboration

- V4-L is a lightweight supplier and procurement record module, not a purchase ERP, inventory system, supplier payment system, or automatic procurement workflow.
- Supplier quotes are cost references only. Applying a supplier quote to `OrderCost` requires manual confirmation and does not confirm the true cost.
- Supplier contacts are sensitive fields. Low-permission users see redacted summaries unless granted sensitive contact access.
- Supplier links are available through API; the Web UI focuses on supplier profile, contacts, quotes, notes, risks, quote-to-cost, and draft generation.
- Supplier import/export is documented as a future V4-A extension and is not fully wired in this lightweight pass.
- Chrome sidebar supplier support is draft generation only. It does not contact suppliers, create purchase orders, apply costs, auto-send WhatsApp messages, bulk send, or click WhatsApp send buttons.

## V4-I Reorder Operations

- V4-I is rule-based and does not use machine learning. Scores are prioritization signals, not guaranteed conversion.
- Reorder campaigns are grouping and planning records only. They do not send messages, create bulk tasks, or trigger marketing automation.
- Holiday/activity reminders are lightweight and require manual configuration; the system does not include a full holiday calendar.
- New-product recommendations avoid claiming “new arrival” unless the product data clearly supports it.
- CSV import/export for reorder opportunities, campaigns, and playbooks is documented as a later V4-A follow-up.
- Chrome sidebar integration remains lightweight; full campaign/playbook management is handled in the Web backend.

## V4-H Profit and Cost Review

- V4-H is a lightweight sales operation review, not a finance, accounting, tax, payment, or reconciliation module.
- Costs are manually entered and manually confirmed. The system cannot verify true product cost, payment fees, refunds, reship costs, or bank settlement.
- Currency conversion is not automatic. If order and cost currencies differ, users must manually convert before reviewing margin.
- Profit import/export is documented as a future V4-A follow-up; current V4-H focuses on API, Web review, permission, and audit.
- Chrome sidebar does not expose full cost details by default; sensitive profit review should be handled in the Web backend.

## V4-G Order Fulfillment Board

- Fulfillment alerts are rule-based snapshots and live calculations; they do not query real logistics or payment providers.
- Batch alert recalculation is synchronous and limited to a bounded set of orders. A background queue can be added later.
- Fulfillment board export and alert export are not fully wired into V4-A yet; add them in a later import/export pass.
- The board does not automatically update order status. Users must manually update payment, production, shipping, and after-sales status.
- Chrome sidebar fulfillment integration is lightweight and does not expose the full kanban/detail workflow.
- Delivered orders can inform reorder suggestions, but V4-G does not automatically create reorder reminders.

## V4-F Order Center

- Order center is lightweight manual tracking, not ERP.
- Files are URL strings only; no upload or object storage yet.
- The system does not process online payment, query real logistics, automatically confirm payment, or automatically promise shipping.
- Delivered/completed order linkage with reorder prediction is advisory in V4-F; no automatic reorder reminder is created.
- Order import/export is not fully wired into V4-A yet and should be added in a later data import/export pass.
- Chrome sidebar order integration is intentionally lightweight and does not expose the full order detail page.

## V4-E Business Prediction and Reorder Reminders

- V4-E uses deterministic rules, not machine learning. Scores help prioritize work but do not predict guaranteed conversion.
- The system has no real order center, so reorder predictions are based on quotes, samples, custom requests, stages, tags, notes, summaries, and follow-up history. It must not claim the customer purchased before unless real order data is added later.
- Product opportunity signals are lightweight and depend on accumulated product, quote, sample, custom request, and material data.
- Reorder reminders are separate from `FollowUpTask` until the user explicitly creates a follow-up task.
- Chrome sidebar integration is intentionally lightweight: it can show/generate reorder drafts but does not expose the full prediction dashboard.
- V4-E does not add automatic marketing, automatic WhatsApp sending, bulk sending, simulated send-button clicking, payment, finance, procurement prediction, or full order management.

## V4-D Advanced Permissions and Audit

- Permission rules are intentionally fixed by role (`owner`, `manager`, `sales`, `support`). V4-D does not provide custom per-organization permission editing.
- Sensitive operation confirmation is enforced in the main API paths. Any future destructive endpoint must explicitly call the shared confirmation utility before release.
- Risk events are available in the Web backend only; there is no external notification channel in V4-D.
- Manager audit views may redact sensitive metadata; owner review is required for full sensitive export/audit workflows.
- Chrome extension permission failures show a friendly `403` message, but detailed role changes must be handled in the Web backend.

## V4-C AI Advanced Enhancement

- AI advanced outputs are rule/template based in this version. They can be upgraded to a real LLM later, but still must keep draft-only behavior.
- `AIActionSuggestionLog` stores sanitized snapshots for troubleshooting, not full raw chat transcripts.
- Follow-up plans do not create tasks unless `createTasks=true`; they never send WhatsApp messages automatically.


Current development track: `V4-B Cross-organization reports`.

## V4-B Cross-organization Reports

- V4-B report jobs are generated synchronously and stored as `ReportJob`; a background queue and scheduled report delivery are later improvements.
- Current report scope is one selected organization per request. Cross-organization comparison across multiple organization IDs is a later iteration.
- Excel export is Excel-compatible tabular output from the same report dataset, not a styled `.xlsx` workbook.
- `quotedNoFollowUpCustomers` still means customers with quote records and no pending follow-up task. It is not a true WhatsApp reply/read signal.
- Reports are sales-management aids only and do not represent guaranteed conversion.
- V4-B does not add WhatsApp official API integration, automatic WhatsApp sending, bulk sending, simulated send-button clicking, billing, payment, finance, or full order management.

## V4-A Organization Import/Export Jobs

- V4-A processes import/export jobs synchronously and records task status immediately. A background queue, retry worker, and persistent file storage are later improvements.
- Export jobs currently return a task record and generated file path placeholder. Direct persisted file download storage is not implemented yet.
- V4-A keeps CSV as the supported working format. Excel export/import is not implemented in this iteration.
- Organization product/material imports create personal records owned by the operator and then share them into the selected organization.
- Organization import duplicate detection is exact-match only for WhatsApp number, email, social links, and organization product SKU. Fuzzy matching and merge workflows remain future work.
- `sales` and `support` can view organization resources but cannot create organization import/export jobs.
- V4-A does not add WhatsApp official API integration, automatic WhatsApp sending, bulk sending, simulated send-button clicking, billing, payment, finance, or a full order system.

## V3-H Manager Team Dashboard

- Team dashboard is scoped to one selected organization and is visible only to `owner` / `manager`.
- KPI data is generated live from existing customer, quote, follow-up, and member records; there is no cached analytics table yet.
- `quotedNoFollowUpCustomers` currently means the customer has quote records and no pending follow-up task. It is not a true WhatsApp read/unread or reply-status signal.
- Team high-intent rows intentionally hide WhatsApp numbers and email addresses.
- This is not a finance, profit, performance-pay, order, procurement, or boss-dashboard module.

## V4-J After-sales and Exception Management

- V4-J stores evidence as URL text only. It does not upload files, scan attachments, verify screenshots, or store protected media.
- After-sales cases can optionally sync refund/reship/compensation records into `OrderCost`, but this requires manual confirmation and is still an operational record, not accounting.
- AI after-sales scripts are template/rule based with knowledge lookup. They cannot replace manual confirmation of company policy, responsibility, refund, reshipment, compensation, or logistics status.
- After-sales CSV import/export is not fully implemented in this round; organization export and sensitive field handling should be added later through the V4-D/V4-A import-export pipeline.
- Chrome sidebar has existing order, fulfillment, reorder, sample and custom workflows. A richer dedicated after-sales sidebar view is a future UX improvement.
- No automatic refund, reshipment, compensation, responsibility attribution, WhatsApp auto-send, bulk send, or simulated send-button click is introduced.

## V4-K A/B Script Testing

- V4-K is a lightweight script test module, not a statistically rigorous experiment platform.
- `bestVariant` is shown only when each candidate has enough `used_draft` records; small samples are directional only.
- Outcomes such as customer reply, quote created, order created, payment received and reorder created are primarily manual labels in this version.
- Automatic attribution from downstream quotes/orders is intentionally deferred to avoid overwriting salesperson judgment.
- Chrome Extension records usage only after manual copy/insert. It does not auto-send, bulk-send, auto-click WhatsApp send buttons or automatically decide outcomes.
- Experiment and usage exports/imports are noted as a future V4-A extension and are not fully wired in this lightweight pass.

## V3-G Audit Logs

- Audit logs are organization scoped. Legacy personal-only V1/V2 operations without `organizationId` are intentionally not written into organization audit logs.
- `actorId` is kept for compatibility with V3-E/V3-F records; new writes also set `userId`.
- Audit CSV export is available from `/api/audit-logs?organizationId=...&format=csv` and only includes rows visible to the current role.
- Logs are read-only in V3-G. Retention policies, tamper-proof storage, advanced diff views, and full compliance reporting are later tasks.
- V3-G does not add WhatsApp automation, bulk sending, simulated send-button clicking, billing, payment, finance, order management, or boss dashboard features.

## V3-F Organization Shared Products and Materials

- Shared products/materials are links to existing personal records. Adding a shared resource requires the current user to own the underlying product/material.
- `owner` / `manager` can update the underlying shared product/material through the organization page; `sales` / `support` are read-only.
- Quote generation can use organization-shared products when `organizationId` is provided. Full organization-scoped quote records are still a later V3 task.
- Shared material integration is available through Web API/page. Chrome sidebar organization resource pickers are still a later UX improvement.
- V3-F still uses URL text for materials and does not add true file upload, object storage, inventory, procurement, finance, order management, payment, or WhatsApp automation.

## V3-E Organization Shared Knowledge and Scripts

- Organization shared knowledge and scripts are scoped by `organizationId`; `owner` / `manager` can write, while `sales` / `support` are read-only.
- AI reply lookup can reference enabled organization knowledge when `organizationId` is provided, and returns `[Org]` in `knowledgeUsed`.
- Shared script records are currently managed and searchable, but full script recommendation/ranking inside the AI reply flow is still a later improvement.
- `AuditLog` now records organization knowledge/script create, update, and delete events with before/after JSON; full compliance retention and immutable storage are later tasks.
- V3-E does not add billing, payment, order management, finance, boss dashboard, WhatsApp official API integration, automatic WhatsApp sending, bulk sending, or simulated send-button clicking.

## V3-D Duplicate Customer Collision Detection

- Duplicate checks are exact-match only for WhatsApp number, email, and social links. Phone normalization, fuzzy matching, nickname matching, and merge suggestions are not implemented yet.
- Cross-organization duplicate customers are allowed by design. V3-D only blocks duplicates within the same personal scope or same organization.
- `CustomerDuplicateEventLog` records duplicate checks, blocked saves, and skipped imports, but it is not a complete audit log or merge history.
- Formal customer CSV import defaults to `skipDuplicates=true`; `skipDuplicates=false` reports duplicate rows as errors but still does not overwrite other users' customers.
- The Web duplicate prompt shows owner/assigned user IDs. A richer member-name display is a later UX improvement.
- V3-D does not add automatic assignment, customer pool, lead claiming, customer merge, billing, payment, order management, finance, boss dashboard, or WhatsApp automation.

## V3-C Customer Ownership and Assignment

- V3-C keeps `Customer.organizationId` optional for backward compatibility with existing V1/V2 personal customers; organization-scoped customers are created by passing `organizationId`.
- Customer ownership and assignment constraints are enforced in the API layer. The database stores references and indexes, but business-role checks remain application logic.
- `assignedTo` and `collaborators` currently use user IDs in the Web form; a member picker with names/emails is a later UX improvement.
- Assignment history is recorded in `CustomerAssignmentLog`; V3-G also records organization-context customer create/update/delete snapshots. Personal-only customer edits remain outside organization audit logs.
- `support` and collaborators can view assigned customer records but cannot edit or delete them in V3-C.
- Duplicate collision checks cover WhatsApp number, email, and social links within the current personal or organization scope; fuzzy matching and merge workflows are not implemented yet.
- Related quote/follow-up/sample/custom records still mostly follow their existing personal ownership rules. Full organization-shared downstream records are a later V3 task.
- V3-C does not add automatic customer assignment, customer pool, lead claiming, team analytics, payments, orders, finance, or WhatsApp automation.

## V3-B Role Permission Management

- V3-B role checks apply when a request carries organization context through `organizationId` query/body or `x-organization-id` header.
- Existing V1/V2 personal data APIs remain personally isolated when no organization context is provided; V3-B does not yet convert those records into organization-shared resources.
- `Role` stores role descriptions and fixed role names only. It is not yet a custom permission matrix.
- `sales` and `support` are read-only for organization-context resource writes; frontend hides/disables actions, but API middleware is the source of truth.
- Role deletion is owner-only. Default roles can be recreated by listing roles for the organization if missing.
- V3-B still does not implement billing, payment, order management, department hierarchy, advanced audit retention, or WhatsApp automation.

## V3-A Organization and Team Members

- V3-A only adds the organization/member foundation. Customer, product, quote, follow-up, knowledge base, material, sample order, custom request, import, and export data remain personally isolated by the current logged-in user.
- Organization data sharing rules are not implemented yet. Future V3 work needs explicit sharing fields and query rules before any V1/V2 records can become organization-shared.
- Member invitations by email are not implemented. V3-A adds existing users by `userId` only.
- Team/department hierarchy, advanced audit retention, approval workflows, team dashboards, billing, payment, and order management remain out of scope.
- Organization owner deletion currently deletes the organization and its membership rows. It does not delete personal customer/product/business records.
- No WhatsApp automatic sending, bulk sending, or simulated send-button clicking is introduced by V3-A.

## V2-G 全链路联调
- V2-G 只做全链路联调、版本标记、稳定性检查和文档收尾，不新增新模块。
- 当前项目仍是个人账号隔离，不做团队、角色、部门权限。
- Chrome 插件仍需手动加载构建产物，未发布到 Chrome Web Store。
- 服务器 IP staging 可以运行，但正式内测建议后续绑定域名和 HTTPS，以减少 Cookie / CORS / Chrome Extension 登录态不稳定。
- `npm install` 当前提示 5 个 moderate dependency audit items；未执行 `npm audit fix --force`，避免引入破坏性升级，建议 V3 开始前单独评估依赖升级。
- V2 之后建议进入 V3 团队协作版，再评估团队共享、角色权限和协作工作流。

## V2-F 数据导入导出
- V2-F 只支持 CSV，不支持 Excel、复杂字段映射器、批量编辑器或跨系统同步。
- 导入 CSV 需要按模板字段填写；样品单和定制需求必须能匹配当前登录用户下的客户，知识库/素材/样品单/定制需求中的 `productSku` 必须能匹配当前登录用户下的产品。
- 客户重复判断目前只按同一用户下 `whatsappNumber` 跳过；产品重复判断目前只按同一用户下 `sku` 跳过，暂不做模糊合并。
- CSV 导出已对公式注入做前缀转义，但业务员仍应避免把导出的 CSV 当作可执行脚本或宏文件使用。
- 导入导出不会处理真实文件上传、对象存储、素材下载或 Excel 格式转换。
- 导入导出只做数据迁移和分析辅助，不会自动发送 WhatsApp 消息，也不会自动群发或模拟点击发送按钮。

## V2-E 定制需求管理

- 定制需求只做销售需求记录、状态管理和话术草稿，不处理真实生产排期、工厂排产、设计稿审核、完整订单履约或支付系统。
- `files` 字段目前只保存 URL 文本，不做真实文件上传、对象存储、病毒扫描、图片压缩、文件权限或 CDN。
- 定制话术采用规则模板和轻量知识库引用，不能替代业务员确认 MOQ、打样费、打样周期、大货周期、付款方式、定制能力、客户文件可生产性和售后规则。
- 定制需求与跟进提醒是轻量联动，只能预填提醒任务和话术草稿，不会自动发送 WhatsApp 消息。
- 定制需求与意向评分是规则加减分，不代表客户一定成交，也不会自动触发跟进消息。
- 产品详情页尚未独立建设，因此按产品查看关联定制需求暂时通过定制需求列表筛选完成。

## V2-D 样品单管理

- 样品单只做销售流程记录，不处理真实支付、退款、收款对账、物流查询或完整订单履约。
- 样品费是否可抵扣大货款目前没有结构化字段，只能在话术风险提醒中要求业务员人工确认。
- 物流单号仅作为文本记录，系统不会调用物流 API，也不会保证到货时间。
- 样品签收后的跟进提醒为轻量联动，侧边栏会预填跟进草稿和时间，仍需业务员手动保存任务。
- 产品详情页尚未独立建设，因此关联产品下的样品单列表暂未单独展示；客户详情和样品单页面已覆盖 V2-D 主要入口。
- 样品话术采用规则模板和轻量知识库引用，不能替代业务员确认样品费、运费、交期、付款账户、物流时效和样品费抵扣规则。

## V2-A AI 公司知识库

- 知识库检索目前采用规则匹配和排序，暂不做向量检索、语义召回、知识分块或相似度阈值。
- 知识库只按个人账号隔离，暂不做团队共享、角色权限或部门知识库。
- 禁用表达只做风险提醒，不强制阻止生成；业务员必须人工确认并修改草稿。
- 如果知识库内容与产品字段、报价字段冲突，系统只提醒确认，不自动判断哪一方正确。
- 知识库不能替代业务员确认价格、库存、交期、运费、付款和售后承诺。

## V2-B 素材中心

- 素材中心目前只支持 URL 文本维护，不做真实文件上传、对象存储、图片压缩、视频转码或素材 CDN。
- 素材 URL 的可访问性、版权、证书真实性、付款账户真实性和物流截图真实性仍需业务员人工确认。
- 素材说明生成采用规则模板和轻量知识库引用，暂不做真实多模态识别或素材内容自动审核。
- 侧边栏可以复制或插入素材说明草稿，但不会自动发送 WhatsApp 消息，也不会自动上传或转发素材文件。
- 素材只做个人账号隔离，暂不做团队素材库、素材审批或部门权限。

## V2-C 客户意向评分

- 意向评分目前只做规则评分，不做机器学习、预测模型、A/B 测试或成交概率建模。
- 评分为动态计算结果，暂不写入 `Customer` 固定字段；规则调整后历史展示会随规则变化。
- 暂未实现产品介绍/素材发送使用日志，相关互动加分仅预留，未强行 tracking。
- 高意向客户只作为销售优先级参考，不代表客户一定成交，也不会自动触发 WhatsApp 消息。
- 评分依赖客户摘要、备注、报价和跟进数据质量，数据较少时可能不准确。

## V1 延续限制

- AI 回复、产品介绍、报价和跟进话术仍然只生成草稿，不自动发送 WhatsApp 消息。
- Chrome 插件仍需手动加载构建产物，未发布到 Chrome Web Store。
- 产品图片/视频仍使用 URL 文本维护，真实文件上传和素材对象存储放到后续版本。
- 产品库存字段尚未建模，报价和产品介绍中必须继续提示业务员确认库存。
- 跟进提醒只做任务提示和话术草稿，暂不做浏览器通知、日历同步或 WhatsApp 自动提醒。

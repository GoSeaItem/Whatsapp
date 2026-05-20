# Known Issues

Current release target: `v0.4-v2-sales-enhancement`.

Current development track: `V3-H Manager team dashboard`.

## V3-H Manager Team Dashboard

- Team dashboard is scoped to one selected organization and is visible only to `owner` / `manager`.
- KPI data is generated live from existing customer, quote, follow-up, and member records; there is no cached analytics table yet.
- `quotedNoFollowUpCustomers` currently means the customer has quote records and no pending follow-up task. It is not a true WhatsApp read/unread or reply-status signal.
- Team high-intent rows intentionally hide WhatsApp numbers and email addresses.
- This is not a finance, profit, performance-pay, order, procurement, or boss-dashboard module.

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

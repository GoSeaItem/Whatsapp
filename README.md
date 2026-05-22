# WhatsApp AI 销售助手 V1

Current version: `v1.0-enterprise`

Current development stage: `V5 Enterprise Platform`

## v1.0-enterprise

`v1.0-enterprise` upgrades the V4 growth-ops system into an enterprise platform layer: multi-organization units, enterprise role overlays, centralized enterprise audit logs, enterprise reports, cross-organization resource-link placeholders, and enterprise brand context for AI drafts.

- Added `OrganizationUnit` for subsidiaries, branches, and business units under an organization.
- Added `EnterpriseRole` for enterprise permission overlays and centralized role-matrix documentation.
- Added `EnterpriseAuditLog` for enterprise-level organization, member, role, report, and brand-context operations.
- Added `EnterpriseReport` for KPI snapshots across customers, orders, brands, suppliers, after-sales, roles, and team activity.
- Added `EnterpriseResourceLink` as a safe foundation for future cross-organization resource sharing.
- Added APIs under `/api/enterprise/*` for organization units, members, roles, reports, audit logs, and enterprise brand context.
- Added Web entry `Enterprise` for enterprise organization units, members, role overlays, reports, AI brand context, and audit trail.

Safety boundary remains unchanged: no WhatsApp official API, no automatic sending, no bulk sending, no simulated send-button click, no automatic customer or supplier contact, no automatic payment/refund/shipment/procurement, and no automatic promise of price, stock, lead time, freight, payment, logistics, after-sales, cost, supplier, brand, or store policy. All AI output remains draft-only and must be manually checked by a salesperson or administrator.

Docs: [enterprise platform](docs/enterprise-platform.md), [enterprise permissions and audit](docs/enterprise-permissions-audit.md), [enterprise reports](docs/enterprise-reports.md), [enterprise audit](docs/enterprise-audit.md).

## ChatGPT / OpenAI Key 池

API 已支持真实 OpenAI / ChatGPT 草稿生成。生产环境可在服务器 `.env.production` 中配置一个或多个 key：

```env
OPENAI_API_KEYS=key_1,key_2,key_3
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_TIMEOUT_MS=30000
```

也兼容单 key：

```env
OPENAI_API_KEY=key_single
```

当某个 key 额度用完、触发 429 限流、认证失败或 OpenAI 临时不可用时，后端会自动尝试下一个 key。所有 key 只保存在服务器环境变量中，不会返回给前端或 Chrome 插件。若未配置 key，系统会回退到本地规则草稿，仍然保持“只生成草稿、不自动发送 WhatsApp”。

## Chrome 插件 UI：快捷工具条 + AI 工作台

Chrome 插件已升级为 WhatsApp 页面快捷工具条 + 右侧 AI 工作台：

- WhatsApp 聊天输入框附近显示轻量工具条：`AI 回复`、`翻译`、`报价`、`素材`、`更多`。
- 找不到输入框容器时降级为右下角浮动 `AI` 按钮。
- 右侧 AI 工作台使用 `客户`、`AI`、`业务`、`A/B`、`更多` Tab，不再默认展开所有模块。
- A/B 话术结果标记合并为一个下拉菜单。
- 插入草稿只写入 WhatsApp 输入框，不点击发送按钮。
- 插件仍然不接入 WhatsApp 官方 API、不自动发送、不自动群发、不模拟点击发送按钮。

生产说明见：[docs/extension-production.md](docs/extension-production.md)。

## v0.6-v4-growth-ops

`v0.6-v4-growth-ops` 汇总 V4-A 到 V4-M：组织级导入导出、跨组织报表、AI 高级增强、高级权限与审计、经营预测与复购提醒、订单中心、履约看板、利润与成本复盘、复购运营、售后异常、A/B 话术测试、供应商/采购协同、多品牌/多店铺管理。

V4 仍保持产品安全边界：不接入 WhatsApp 官方 API，不自动发送 WhatsApp 消息，不自动群发，不模拟点击发送按钮，不自动联系客户或供应商，不做真实支付、真实物流、完整 ERP、完整财务系统、店铺 API 同步或 WhatsApp 账号自动切换。所有 AI 内容都是草稿或建议，业务员必须人工确认价格、库存、交期、运费、付款、物流、售后、成本、供应商和品牌政策后再发送或执行。

面向中国跨境电商业务员和外贸销售人员的 WhatsApp Web 销售辅助原型。V1 采用 Web 后台 + Chrome Extension 侧边栏 + Desktop 复制粘贴工作流，帮助业务员更快翻译客户消息、生成专业回复、管理客户标签、发送产品介绍、生成报价并设置跟进提醒。

## V4-M 多品牌 / 多店铺管理

V4-M 支持一个组织下维护多个品牌、店铺或业务线。业务员可以在 Web 后台管理品牌资料、品牌资源和品牌规则，也可以在 Chrome 侧边栏选择当前品牌，让 AI 草稿、产品筛选、素材筛选、报价规则、付款说明和售后政策优先使用品牌上下文。

- 新增 `Brand`，记录品牌/店铺名称、展示名、Logo、网址、默认语言、默认币种、国家、状态和备注。
- 新增 `BrandProduct`、`BrandMaterial`、`BrandKnowledgeBase`、`BrandScript`，将产品、素材、知识库和话术关联到品牌。
- 新增 `BrandRule`，维护品牌级报价规则、付款方式、售后政策、物流说明、禁用表达和 FAQ。
- 新增 `BrandAssignment`，手动将品牌分配给客户、报价、订单、售后、复购机会、供应商、样品单和定制需求。
- 新增 API：`/api/brands`、`/api/brand-products`、`/api/brand-materials`、`/api/brand-knowledge-bases`、`/api/brand-scripts`、`/api/brand-rules`、`/api/brands/context`。
- Web 后台新增 `Brands / stores` 入口；Chrome 插件侧边栏新增品牌选择器。
- AI 回复、订单话术、履约话术、售后话术、复购运营话术、供应商草稿和 A/B 话术版本生成已支持 `brandId`，返回 `brandUsed` 和 `brandRulesUsed`；部分 V4-C 高级决策端点会继续做更深品牌规则接入。
- 不做多 WhatsApp 账号自动切换、不做店铺 API 对接、不自动同步订单、不自动发送消息、不自动群发。

详细说明见：[docs/v4-brand-store-management.md](docs/v4-brand-store-management.md)。

## V4-L 供应商 / 采购协同，轻量版

V4-L 在产品、订单、样品、定制、售后和利润复盘基础上增加轻量供应商与采购协同。它只做供应商资料、联系人、供应商报价、采购备注、供应商风险、业务对象关联、成本参考和采购沟通草稿，不做完整采购 ERP、库存系统、供应商付款或自动采购。

- 新增 `Supplier`，记录供应商基础资料、标签、评分、状态、风险等级和备注。
- 新增 `SupplierContact`，记录供应商联系人；联系方式属于敏感字段，导出和展示需按权限控制。
- 新增 `SupplierQuote`，记录供应商 MOQ、单位成本、币种、交期、样品费、打样周期和大货周期。
- 新增 `PurchaseNote`，记录产品、订单、样品、定制和售后相关采购备注。
- 新增 `SupplierRisk`，记录交期、质量、价格、配合度、付款风险和复核风险。
- 新增 `SupplierLink`，将供应商关联到产品、订单、样品单、定制需求和售后案例。
- 新增 API：`/api/suppliers`、`/api/supplier-contacts`、`/api/supplier-quotes`、`/api/purchase-notes`、`/api/supplier-risks`、`/api/supplier-links`。
- 新增 AI API：`POST /api/ai/supplier-script`，生成询价、MOQ、样品费、交期、大货成本、定制可行性、质量问题、补发成本、议价和采购细节确认草稿。
- Web 后台新增 `Suppliers` 入口；Chrome 插件侧边栏新增供应商草稿生成入口。
- 供应商报价应用到订单成本必须 `confirm=true`，不会自动确认真实成本、不会自动下采购单、不会自动联系供应商。

详细说明见：[docs/v4-supplier-procurement.md](docs/v4-supplier-procurement.md)。

## V4-K A/B 话术测试，轻量版

V4-K 在 AI 回复、公共话术库、CRM、报价、订单、复购和售后能力基础上增加轻量 A/B 话术测试。它只记录草稿版本、使用次数、人工标记结果和轻量转化统计，不做复杂实验平台、自动营销、自动群发或 WhatsApp 自动发送。

- 新增 `ScriptExperiment`，按销售场景、语言、客户阶段维护话术实验。
- 新增 `ScriptVariant`，为同一实验维护 A/B/C 话术版本，支持启用/禁用。
- 新增 `ScriptUsage`，记录业务员手动复制/插入草稿后的使用记录和人工标记结果。
- 新增 API：`/api/script-experiments`、`/api/script-experiments/:id/variants`、`/api/script-variants/:id`、`/api/script-usages`、`/api/script-usages/:id/outcome`、`/api/script-experiments/:id/stats`。
- 新增 AI API：`POST /api/ai/script-experiments/generate-variants`，生成 A/B/C 三种草稿策略。
- Web 后台新增 `A/B scripts` 入口，可管理实验、版本、统计和使用记录。
- Chrome 插件侧边栏新增 A/B 话术选择；复制/插入时仅记录 `used_draft`，最终发送仍由业务员手动完成。
- 统计包含回复率、报价转化率、订单转化率、付款转化率、复购转化率、无回复率；样本量不足时只做方向参考。
- 不编造价格、库存、交期、运费、优惠或虚假紧迫感；所有话术都是草稿。

详细说明见：[docs/v4-script-ab-testing.md](docs/v4-script-ab-testing.md)。

## V4-J 售后与异常管理

V4-J 在订单中心、履约看板、利润复盘和复购运营基础上增加轻量售后记录与异常处理。它只做售后案例记录、状态管理、风险提醒、成本联动建议、跟进任务和话术草稿，不做自动退款、自动补发、真实物流查询或 WhatsApp 自动发送。

- 新增 `AfterSalesCase`，记录质量问题、物流延误、少发/错发、退款请求、退货请求、补发请求、投诉和其他售后异常。
- 新增 `AfterSalesEvent`，记录创建、状态变化、责任归因、方案变化、退款/补发记录、跟进任务和 AI 话术生成等事件时间线。
- 新增 API：`GET /api/after-sales`、`POST /api/after-sales`、`GET /api/after-sales/:id`、`PATCH /api/after-sales/:id`、`DELETE /api/after-sales/:id`。
- 新增状态、责任和方案 API：`PATCH /api/after-sales/:id/status`、`PATCH /api/after-sales/:id/responsibility`、`PATCH /api/after-sales/:id/solution`。
- 新增售后跟进 API：`POST /api/after-sales/:id/create-follow-up-task`，必须用户手动确认。
- 新增 AI 售后话术 API：`POST /api/ai/after-sales-script`，覆盖请求证据、安抚、物流延误解释、质量核实、退款政策说明、补发安排、方案确认、售后回访、投诉安抚和内部确认。
- Web 后台新增 `After sales` 入口；客户详情中显示当前客户售后案例，并可跳转创建/处理售后。
- 退款、补发、赔偿、责任归因和关闭售后都要求人工确认，并写入 `AuditLog`；AI 话术生成写入 `AIActionSuggestionLog`。
- 不自动承诺退款、补发、赔偿、责任归因、物流状态或售后政策；涉及公司政策和主管意见时必须提醒业务员确认。

详细说明见：[docs/v4-after-sales.md](docs/v4-after-sales.md)。

## V4-I 复购运营增强

V4-I 在复购预测、订单中心和利润复盘基础上增加老客户复购运营能力。它只做机会识别、计划建议、话术草稿和手动创建跟进任务，不做自动营销、自动群发或自动发送 WhatsApp 消息。

- 新增 `ReorderCampaign`，用于按老客户复购、沉睡唤醒、新品/关联产品推荐、补货、节日、高价值客户等场景分组管理复购运营活动。
- 新增 `ReorderOpportunity`，记录客户复购机会、沉睡唤醒机会、新品/关联产品推荐、补货提醒、高价值客户和流失风险。
- 新增 `ReorderPlaybook`，维护复购运营话术模板，支持组织级和个人级使用。
- 新增 API：`GET /api/reorder/opportunities`、`POST /api/reorder/opportunities/recalculate`、`PATCH /api/reorder/opportunities/:id`、`POST /api/reorder/opportunities/:id/create-follow-up-task`。
- 新增活动和模板 API：`/api/reorder/campaigns`、`/api/reorder/playbooks`。
- 新增 AI 复购运营话术 API：`POST /api/ai/reorder-operation-script`，覆盖复购、沉睡唤醒、关联产品推荐、补货确认、节日问候、高价值客户维护和流失挽回。
- Web 后台新增 `Reorder ops` 入口，可查看复购机会池、创建复购活动、维护复购话术模板、生成草稿和手动转 `FollowUpTask`。
- 复购机会计算遵守组织、角色、客户归属和账号隔离；`owner/manager` 可看团队，`sales/support` 只能看自己可访问客户。
- 机会转跟进任务必须 `confirm=true`，并写入 `AuditLog`；AI 话术生成写入 `AIActionSuggestionLog`。
- 不编造客户购买历史、库存、价格、优惠、交期或新品；没有订单数据时只说“之前咨询过/沟通过”，不能说“之前购买过”。

详细说明见：[docs/v4-reorder-operations.md](docs/v4-reorder-operations.md)。

## V4-H 利润与成本复盘，轻量版

V4-H 在订单中心基础上增加轻量成本和预计毛利复盘，帮助业务员、主管和 owner 识别低毛利、亏损和成本未确认订单。该模块只做销售经营参考，不做完整财务系统、会计报表、税务申报、自动对账或真实支付。

- 新增 `OrderCost`，记录商品成本、包装成本、国内运费、国际运费、支付手续费、平台费、退款金额、补发成本和其他成本。
- 新增利润 API：`GET /api/orders/:id/cost`、`PUT /api/orders/:id/cost`、`PATCH /api/orders/:id/cost/confirm`、`DELETE /api/orders/:id/cost`。
- 新增分析 API：`GET /api/profit/orders`、`GET /api/profit/summary`、`GET /api/profit/by-product`、`GET /api/profit/by-customer`、`GET /api/profit/by-salesperson`。
- 新增 AI 利润复盘 API：`POST /api/ai/profit-review`，只给经营建议，不做财务或税务结论。
- Web 后台新增 `Profit review` 入口，可查看总销售额、总成本、毛利、平均毛利率、低毛利订单、成本未确认订单，并编辑/确认订单成本。
- 权限：`owner/manager` 可查看团队利润并编辑/确认成本；`sales` 默认只能查看自己可访问订单利润；`support` 默认不能查看利润。
- 成本确认、删除、AI 复盘写入审计/AI 日志；删除成本必须 `confirm=true`。
- 不自动确认真实成本、不自动确认收款、不做税务建议、不导出密钥、不自动发送 WhatsApp 消息。

详细说明见：[docs/v4-profit-review.md](docs/v4-profit-review.md)。

## V4-G 订单履约看板

V4-G 在订单中心基础上增加履约看板，帮助业务员和主管发现待付款、待生产、生产延迟、待发货、已发货待签收、物流延迟、售后中和已完成订单。

- 新增 `OrderFulfillmentAlert`，用于记录付款逾期、生产延迟、物流延迟、缺少物流单号、售后待处理、签收跟进和长期无跟进等异常。
- `FollowUpTask` 新增可选 `orderId`，履约跟进任务可以关联到具体订单。
- 新增履约 API：`GET /api/orders/fulfillment-board`、`GET /api/orders/:id/fulfillment`、`POST /api/orders/:id/recalculate-fulfillment-alerts`、`POST /api/orders/recalculate-fulfillment-alerts`。
- 新增异常处理 API：`PATCH /api/order-fulfillment-alerts/:id`。
- 新增手动创建履约跟进：`POST /api/orders/:id/create-fulfillment-follow-up`。
- 新增 AI 履约话术：`POST /api/ai/order-fulfillment-script`，只生成草稿。
- Web 后台新增 `Fulfillment` 入口，客户详情和订单详情可以查看履约异常并生成草稿。
- Chrome 侧边栏轻量支持查看当前客户订单履约异常和生成履约话术草稿。
- 不做真实物流查询、不自动发货、不自动确认收款、不自动修改订单状态、不自动创建任务、不自动发送 WhatsApp 消息。

详细说明见：[docs/v4-order-fulfillment-board.md](docs/v4-order-fulfillment-board.md)。

## V4-F 订单中心

V4-F 增加轻量订单中心，把客户、报价、样品单、定制需求、产品和跟进任务串联起来，形成手动维护的销售订单记录。

- 新增 `Order` 模型，支持普通订单、样品转大货、定制订单、复购订单和其他订单。
- 新增订单 API：`GET /api/orders`、`POST /api/orders`、`GET /api/orders/:id`、`PATCH /api/orders/:id`、`DELETE /api/orders/:id`。
- 支持 `POST /api/orders/from-quote/:quoteId`、`POST /api/orders/from-sample/:sampleOrderId`、`POST /api/orders/from-custom-request/:customRequestId`。
- 支持付款、生产、发货、售后状态手动更新，并返回风险提醒。
- 新增 AI 订单话术 API：`POST /api/ai/order-script`，只生成草稿。
- Web 后台新增 Orders / 订单中心入口，客户详情显示订单并支持报价、样品、定制转订单。
- Chrome 侧边栏轻量支持查看当前客户订单、手动创建订单和生成订单话术草稿。
- 不做在线支付、不查真实物流、不自动确认收款、不自动承诺发货、不自动发送 WhatsApp 消息。

详细说明见：[docs/v4-order-center.md](docs/v4-order-center.md)。

## V4-E 经营预测 / 复购提醒

V4-E 基于客户、产品、报价、跟进、样品单、定制需求和团队数据做轻量规则预测，帮助业务员发现复购机会、沉睡客户、高价值客户、流失风险和产品机会。它不是机器学习，也不是自动营销系统。

- 新增 `CustomerPrediction` 和 `ReorderReminder`，记录复购、沉睡、高价值、流失风险和产品机会相关提示。
- 新增预测 API：`GET /api/predictions/customers`、`POST /api/predictions/customers/recalculate`、`PATCH /api/predictions/customers/:id`、`GET /api/predictions/product-opportunities`。
- 新增复购提醒 API：`GET /api/reorder-reminders`、`POST /api/reorder-reminders`、`PATCH /api/reorder-reminders/:id`、`POST /api/reorder-reminders/:id/create-follow-up-task`。
- 新增 AI 复购话术 API：`POST /api/ai/reorder-script`，只生成草稿，不编造购买历史、价格、库存、优惠、交期或虚假紧迫感。
- Web 后台新增“经营预测 / 复购提醒”入口；客户详情、首页工作台和 Chrome 侧边栏轻量展示复购建议。
- 创建复购提醒、创建 `FollowUpTask`、忽略/转化预测都必须由用户手动点击，并写入审计日志。

详细说明见：[docs/v4-reorder-prediction.md](docs/v4-reorder-prediction.md)。

## V4-C AI 高级增强

V4-C 将 AI 从简单回复升级为销售辅助建议，但仍然只生成草稿和建议，不会自动发送 WhatsApp 消息。

- 新增 `AIActionSuggestionLog`，记录 AI 下一步建议、客户摘要、销售草稿、风险检查和跟进计划的输入摘要与输出结果。
- 新增 AI 高级 API：`POST /api/ai/next-action`、`POST /api/ai/customer-sales-summary`、`POST /api/ai/sales-script`、`POST /api/ai/risk-check`、`POST /api/ai/follow-up-plan`。
- 支持基于客户、产品、报价、跟进、知识库、素材、样品单和定制需求生成下一步行动建议。
- 风险检查会识别 `lowest price`、`always in stock`、`100% guaranteed delivery`、`today shipping` 等高风险表达，并返回安全改写建议。
- 跟进计划默认只生成计划；只有用户显式传入 `createTasks=true` 才创建 `FollowUpTask`。
- 所有 AI 输出都包含 `riskWarnings`，并提醒业务员确认价格、库存、交期、运费、付款、物流和售后信息。

详细说明见：[docs/v4-ai-advanced.md](docs/v4-ai-advanced.md)。

## V4-D 高级权限和审计增强

V4-D 在 V3 角色权限基础上补充统一权限矩阵、敏感操作二次确认、数据导出权限增强、审计日志增强和风险事件查询。

- 新增统一权限配置 `PERMISSION_KEYS` 和后端权限工具，覆盖组织、成员、客户、产品、素材、知识库、话术、销售流程、报表、导入导出、审计和 AI。
- 删除客户、产品、报价、样品单、定制需求、组织、成员移除/禁用、成员角色修改和敏感导出等高风险操作需要 `confirm=true`。
- 组织导出支持 `fieldsScope=normal|sensitive`：`owner` 可导出敏感字段，`manager` 默认只能导出普通字段，`sales/support` 不可创建组织级导出。
- `AuditLog` 增强 `metadata`、`ipAddress`、`userAgent`、`riskLevel`，审计 CSV 导出继续防 CSV 注入且不导出密钥。
- 新增 `GET /api/security/risk-events`，组织 `owner/manager` 可查看 high/medium 风险事件。
- Web 后台新增“权限矩阵”和“风险事件”入口；审计日志支持风险等级、实体 ID、关键词和时间筛选。
- Chrome 插件遇到 `403` 会提示权限不足，不会自动发送或模拟点击 WhatsApp 发送按钮。

详细说明见：[docs/v4-permissions-audit.md](docs/v4-permissions-audit.md)。

## V4-A 组织级数据导入导出

V4-A 在 V3 组织、角色、客户归属、公共资料、审计日志和主管看板基础上，新增组织级批量导入/导出任务。

- 新增 `ImportJob` 和 `ExportJob`，记录组织级导入/导出任务状态。
- 支持组织级数据类型：`customer`、`product`、`material`、`knowledge`、`script`。
- 新增组织级导入 API：`POST /api/import/:type?organizationId=xxx&dryRun=true|false`。
- 新增组织级导入状态 API：`GET /api/import/:id/status`。
- 新增组织级导出 API：`POST /api/export/:type?organizationId=xxx`。
- 新增组织级导出状态 API：`GET /api/export/:id/status`。
- `dryRun=true` 只校验 CSV 格式、枚举、日期、数字、组织成员和唯一性，不写入数据库。
- 正式导入会按组织防撞单逻辑处理重复客户，产品导入会创建个人产品并加入公共产品库，素材导入会创建个人素材并加入公共素材库。
- 组织知识和组织话术导入直接写入公共知识库 / 公共话术库。
- 所有组织级导入/导出任务都会写入 `AuditLog`。
- 权限规则：仅组织 `owner` / `manager` 可以创建导入/导出任务；`sales` / `support` 只读，跨组织访问拒绝。
- Web 后台 `导入/导出` 页面新增组织级导入/导出区域。

V4-A 仍然不接入 WhatsApp 官方 API，不自动发送 WhatsApp 消息，不自动群发，不模拟点击发送按钮；导入/导出不会处理真实密钥、`.env`、token、session、cookie、OpenAI Key 或服务器密码。详细说明见：[docs/v4-team-collaboration.md](docs/v4-team-collaboration.md)。

## V4-B 跨组织分析与报表

V4-B 在 V3-H 主管看板基础上新增独立报表 API 和 Web 报表分析入口，用于组织 owner / manager 查看团队 KPI、业务员进度、高意向客户和异步报表任务。

- 新增 `ReportJob`，记录报表生成任务、筛选条件、状态和结果。
- 新增报表 API：`GET /api/reports/team-summary`、`GET /api/reports/high-intent-customers`、`POST /api/reports/generate`、`GET /api/reports/:id/status`。
- 报表 KPI：今日新增客户、今日待跟进、逾期未跟进、高意向客户、已报价未跟进。
- 业务员统计：客户总数、已完成跟进数、报价数。
- 高意向客户列表支持按业务员、销售阶段和意向等级筛选，并隐藏联系方式。
- 支持 CSV 导出和 Excel-compatible 导出。
- 生成报表任务会写入 `AuditLog`。
- 权限规则：仅组织 `owner` / `manager` 可访问报表和生成任务；`sales` / `support` 返回 `403`。

V4-B 报表仅用于销售管理辅助，不代表客户一定成交；不会自动发送 WhatsApp 消息，不会自动群发，也不会模拟点击发送按钮。详细说明见：[docs/v4-team-collaboration.md](docs/v4-team-collaboration.md)。

## v0.4-v2-sales-enhancement

V2 成交增强版已经完成并进入全链路联调收尾。当前版本在 V1 销售闭环基础上新增：

- V2-A AI 公司知识库：公司介绍、产品卖点、物流、售后、报价规则、付款方式、禁用表达和 FAQ。
- V2-B 素材中心：用 URL 管理图片、视频、目录、尺码表、买家秀、工厂视频、物流/付款证明和证书素材。
- V2-C 客户意向评分：基于标签、阶段、报价、跟进、摘要、样品和定制信号做规则评分。
- V2-D 样品单管理：记录样品费、运费、付款状态、发货状态、签收反馈和样品跟进话术。
- V2-E 定制需求管理：记录 Logo、包装、颜色、尺寸、材质、OEM/ODM、文件 URL 和定制话术。
- V2-F 数据导入导出：支持客户、产品、知识库、素材、样品单、定制需求 CSV 导入、dryRun 预览、模板下载和 CSV 导出。

V2 仍然明确不做收费、定价、支付、套餐、团队/角色/部门权限、完整订单系统、财务利润、采购预测或老板驾驶舱。系统不接入 WhatsApp 官方 API，不自动发送 WhatsApp 消息，不自动群发，不模拟点击发送按钮。所有 AI 回复、产品介绍、素材说明、报价、跟进、样品和定制话术都只是草稿，必须由业务员手动确认后发送。

下一版本建议进入：`V3 团队协作版`，再评估团队共享、角色权限、协作知识库和更完整的数据运营能力。

## V3-A 组织与团队成员管理

V3-A 已开始建设团队协作底座，新增组织和成员管理，但不会改变现有 V1/V2 数据的个人隔离规则。

- 新增 `Organization` 和 `OrganizationMember` 数据模型。
- 组织支持多个成员，成员角色为 `owner`、`manager`、`sales`、`support`。
- 成员状态支持 `active`、`inactive`。
- 新增组织 API：`GET /api/organizations`、`GET /api/organizations/:id`、`POST /api/organizations`、`PATCH /api/organizations/:id`、`DELETE /api/organizations/:id`。
- 新增成员 API：`GET /api/organizations/:id/members`、`POST /api/organizations/:id/members`、`PATCH /api/organizations/:id/members/:memberId`、`DELETE /api/organizations/:id/members/:memberId`。
- Web 后台新增 `Organizations` 页面，可创建组织、查看组织、编辑组织名称、删除组织、搜索成员、添加成员、修改成员角色/状态、移除成员。
- 权限规则：只有 `owner` 可以编辑或删除组织；`owner` 和 `manager` 可以管理成员；V3-A 不支持新增 owner 或转移 owner；跨组织访问返回拒绝。
- 创建组织时当前用户自动成为 owner 成员；添加成员会校验 userId 存在。

V3-A 只做组织和成员底座，不做客户/产品/素材/知识库的组织共享数据，不做团队报表，不做部门权限，不做收费、支付或订单系统。客户、产品、报价、跟进、知识库、素材、样品单、定制需求、导入导出仍保持当前登录用户隔离。详细说明见：[docs/v3-team-collaboration.md](docs/v3-team-collaboration.md)。

## V3-B 角色权限管理

V3-B 在 V3-A 组织成员基础上新增角色定义和组织上下文权限校验。

- 新增 `Role` 数据模型，按组织保存 `owner`、`manager`、`sales`、`support` 的权限描述。
- 创建组织时会自动初始化四个默认角色说明。
- 新增角色 API：`GET /api/roles`、`GET /api/roles/:id`、`POST /api/roles`、`PATCH /api/roles/:id`、`DELETE /api/roles/:id`。
- Web 后台新增 `Roles` 页面，可按组织查看角色、搜索角色、编辑角色描述。
- 只有组织 `owner` 可以创建、更新、删除角色说明。
- 带组织上下文的产品、素材、知识库 API 请求会经过角色校验：`owner` / `manager` 可写，`sales` / `support` 只读；客户 API 在 V3-C 进入更细的归属、负责人和协作成员权限。
- 未带组织上下文的个人数据请求继续按当前登录用户隔离和授权，避免破坏现有 V1/V2 个人工作流。

V3-B 不新增 WhatsApp 自动发送、自动群发、模拟点击发送按钮、收费、支付、订单、财务或老板驾驶舱能力。详细说明见：[docs/v3-team-collaboration.md](docs/v3-team-collaboration.md)。

## V3-C 客户归属与客户分配

V3-C 新增组织上下文下的客户归属、负责人分配、协作成员和分配日志能力，同时保留个人账号客户隔离。

- `Customer` 新增 `email`、`organizationId`、`assignedTo`、`collaborators` 字段。
- 新增 `CustomerAssignmentLog`，记录客户从一个负责人转给另一个负责人的操作。
- 创建组织客户时自动绑定 `ownerId`、`organizationId`，默认负责人为当前用户，也可由 `owner` / `manager` 指定组织内成员。
- 新增客户分配 API：`POST /api/customers/:id/assign`。
- 组织上下文客户列表按角色返回可见客户：`owner` / `manager` 可看组织客户；`sales` / `support` 只能看自己创建、负责或协作的客户。
- 协作成员可以查看客户，但不能修改客户。
- 防撞单逻辑：创建客户和 CSV 导入客户时，会按手机号或邮箱检查当前个人/组织范围内重复客户。
- Web 后台客户页新增组织、负责人、协作成员、邮箱和分配按钮。
- 权限规则：组织 `owner` / `manager` 可查看、编辑和分配组织客户；`sales` 可编辑自己创建或负责的客户；`support` 和协作成员只读，不能修改客户。
- 分配客户会写入 `CustomerAssignmentLog`，用于客户详情中查看负责人转移历史。

V3-C 仍不做自动分配、不做抢单池、不做客户公海、不做复杂团队报表，也不会自动发送 WhatsApp 消息。详细说明见：[docs/v3-team-collaboration.md](docs/v3-team-collaboration.md)。

## V3-D 防撞单（重复客户检测）

V3-D 在 V3-C 客户归属基础上增强重复客户检测，减少同一组织内多个业务员重复建客。

- `Customer` 新增 `socialLinks`，可保存客户 Instagram、Facebook、TikTok、LinkedIn 等社媒链接。
- 新增 `CustomerDuplicateEventLog`，记录防撞命中、阻止或导入跳过事件。
- 新增 API：`POST /api/customers/check-duplicate`，用于前端保存前检查。
- 创建/编辑客户时检查同一组织或个人范围内的 `whatsappNumber`、`email`、`socialLinks` 是否重复。
- CSV 客户导入支持 dryRun 重复行提示；正式导入默认 `skipDuplicates=true` 跳过重复客户，`skipDuplicates=false` 时返回行级错误。
- Web 后台客户表单新增 `Social links`，保存前会提示重复客户、负责人和命中字段，并阻止重复提交。
- 跨组织允许出现相同手机号、邮箱或社媒链接；同组织重复会被阻止。

权限规则：`owner` / `manager` 可查看和处理组织重复提示；`sales` 可以创建和维护自己负责的客户但不能覆盖他人客户；`support` 只读，不可创建、导入或覆盖客户。V3-D 不做自动合并、不做客户公海、不做抢单池，也不会自动发送 WhatsApp 消息。详细说明见：[docs/v3-team-collaboration.md](docs/v3-team-collaboration.md)。

## V3-E 公共话术库 / 公共知识库

V3-E 在组织和角色权限基础上新增团队共享的组织知识库与组织话术库，让 AI 回复可以引用团队统一维护的公司政策、物流说明、付款规则、禁用表达和常用话术。

- 新增 `KnowledgeBaseOrg`：组织级共享知识，绑定 `organizationId` 和 `createdBy`。
- 新增 `ScriptOrg`：组织级公共话术，绑定 `organizationId` 和 `createdBy`。
- 新增轻量 `AuditLog`：记录组织知识/话术的创建、更新、删除操作。
- 新增 API：`/api/knowledge-base/org` 与 `/api/scripts/org`，支持列表、详情、创建、更新、删除、搜索、分类/语言筛选和启用/禁用。
- Web 后台新增导航入口：`Org knowledge` 和 `Org scripts`。
- 权限规则：`owner` / `manager` 可增删改；`sales` / `support` 只读；跨组织访问被拒绝。
- AI 回复支持 `organizationId`，检索顺序为产品相关个人知识、组织知识库、个人知识库、默认规则；返回的 `knowledgeUsed` 会标记 `[Org]` 来源。
- `enabled=false` 的组织知识不会被 AI 使用。

V3-E 不会自动发送 WhatsApp 消息，不会自动群发，也不会模拟点击发送按钮。组织知识和话术只作为 AI 草稿上下文，不能替代业务员确认价格、库存、交期、运费、付款和售后承诺。详细说明见：[docs/v3-team-collaboration.md](docs/v3-team-collaboration.md)。

## V3-F 公共产品库 / 公共素材库

V3-F 新增组织共享产品库和组织共享素材库，让团队可以复用经过 owner/manager 维护的产品与素材，业务员可只读使用。

- 新增 `OrganizationProduct`：把已有个人产品加入组织共享产品库。
- 新增 `OrganizationMaterial`：把已有个人素材加入组织共享素材库。
- 新增 API：`/api/products/org` 与 `/api/materials/org`，支持组织列表、详情、添加、更新、删除、搜索和筛选。
- Web 后台新增导航入口：`Org products` 和 `Org materials`。
- 权限规则：`owner` / `manager` 可添加、编辑、移除共享产品和素材；`sales` / `support` 只读。
- 报价助手支持传入 `organizationId` 后使用组织共享产品生成报价草稿。
- AI/素材/报价中的知识库引用仍然只生成草稿，不会自动发送 WhatsApp 消息。
- 共享产品/素材操作会写入 `AuditLog`。

V3-F 只做组织共享资源，不做库存系统、文件上传、采购预测、财务利润、订单系统、支付或 WhatsApp 自动化。详细说明见：[docs/v3-team-collaboration.md](docs/v3-team-collaboration.md)。

## V3-G 操作日志

V3-G 将前面 V3 的轻量审计记录升级为可查询的组织操作日志，用于团队内部追溯关键资料变更。

- `AuditLog` 新增 `userId`、`before`、`after` 字段，保留 `actorId` 兼容已有日志。
- 新增 API：`GET /api/audit-logs?organizationId=xxx` 和 `GET /api/audit-logs/:id`。
- 日志列表支持按 `entityType`、`userId`、`action`、时间范围过滤，支持分页。
- 日志支持 `format=csv` 导出，CSV 会做公式注入防护，并过滤 password、secret、token、cookie、api key 等敏感字段。
- Web 后台新增导航入口：`Audit logs`，可查看 before/after JSON。
- 权限规则：`owner` / `manager` 可查看组织日志；`sales` / `support` 只能查看自己操作产生的日志；跨组织访问被拒绝。
- 当前接入记录：组织客户、报价、共享产品、共享素材、组织知识库、组织话术库、跟进任务的 create/update/delete。

V3-G 只做审计查看，不允许修改或删除日志，不做自动发送 WhatsApp 消息、不做群发、不做支付、订单、财务或老板驾驶舱。详细说明见：[docs/v3-team-collaboration.md](docs/v3-team-collaboration.md)。

## V3-H 主管看板

V3-H 在组织权限基础上新增团队主管看板，帮助 `owner` / `manager` 查看组织范围内的销售进度和客户质量。

- 不新增数据库表，使用 `Customer`、`Quote`、`FollowUpTask`、`OrganizationMember` 和现有意向评分规则实时统计。
- 新增 API：`GET /api/dashboard/team-summary?organizationId=xxx`。
- `GET /api/dashboard/high-intent-customers?organizationId=xxx` 支持组织高意向客户列表。
- 团队总览 KPI：今日新增客户、今日待跟进、逾期未跟进、高意向客户、已报价未跟进客户。
- 业务员汇总：客户总数、已完成跟进数、报价数。
- Web 后台新增 `Team dashboard`，仅当前选中组织的 `owner` / `manager` 可见。
- 支持 CSV 导出团队看板数据，导出内容隐藏联系方式等敏感字段并做公式注入防护。

V3-H 不是老板驾驶舱，不做财务利润、采购预测、订单系统、收费或支付；只提供团队销售辅助统计。不会接入 WhatsApp 官方 API，不会自动发送 WhatsApp 消息，不会自动群发或模拟点击发送按钮。详细说明见：[docs/v3-team-collaboration.md](docs/v3-team-collaboration.md)。

## V2-F 数据导入导出

V2-F 新增 CSV 数据导入导出，支持业务员把历史表格迁移到系统中，也可以按当前账号导出数据做后续分析。

- 支持对象：客户、产品、知识库、素材、样品单、定制需求。
- 新增导出 API：`/api/export/customers`、`/api/export/products`、`/api/export/knowledge-base`、`/api/export/materials`、`/api/export/sample-orders`、`/api/export/custom-requests`。
- 新增模板 API：`/api/import/templates/:type`，模板只包含表头和示例数据，不包含真实用户数据。
- 新增导入 API：`/api/import/:type`，使用 `multipart/form-data` 上传 `.csv` 文件，支持 `dryRun=true` 预览校验。
- Web 后台新增导航入口：`Import / Export`，可选择数据类型、下载模板、上传 CSV、预览错误、确认导入和导出当前数据。
- 所有导入数据会自动绑定当前登录用户，CSV 中的 `ownerId`、`createdBy`、`organizationId`、密码、token、secret、API key、session、cookie 字段会被忽略。
- 导出只返回当前登录用户自己的数据，不导出密码、密钥、token、session、cookie 或 `.env` 内容。
- 数组字段使用 `|` 分隔；日期建议使用 ISO 字符串；导出 CSV 会对 `=`、`+`、`-`、`@` 开头的单元格做公式注入防护。
- V2-F 只支持 CSV，不支持 Excel，不做复杂字段映射器，也不改动 WhatsApp 插件侧边栏。

详细说明见：[docs/v2-import-export.md](docs/v2-import-export.md)。

## V2-E 定制需求管理

V2-E 新增定制需求管理，支持记录客户 Logo、包装、颜色、尺寸、材质、OEM/ODM 等需求，并生成定制确认、补充资料、MOQ、打样费、打样周期、大货周期和风险确认话术草稿。

- 新增 `CustomRequest` 数据模型，按当前登录用户 `ownerId` 隔离。
- 新增受保护 API：`/api/custom-requests`，覆盖创建、列表、详情、更新、删除、状态更新和定制话术生成。
- 创建定制需求时会校验 `customerId` 属于当前用户；传入 `productId` 时会校验产品属于当前用户。
- Web 后台新增导航入口：`定制需求 / Custom`。
- 客户详情右侧记录区展示该客户定制需求。
- Chrome Extension 侧边栏新增 `定制` 入口，可保存定制需求并生成话术草稿。
- 客户意向评分轻量联动定制需求：有定制需求、Logo/包装/OEM/ODM、较大数量、等待客户确认、样品确认会加分；取消会减分。
- 跟进提醒轻量联动：定制需求可创建客户确认提醒。

定制模块不做真实生产排期、不做订单系统、不做支付系统、不做文件上传，只保存文件 URL。定制话术不会自动发送 WhatsApp 消息，也不能替代业务员确认 MOQ、打样费、打样周期、大货周期、定制能力、客户文件可生产性和售后规则。详细说明见：[docs/v2-custom-request.md](docs/v2-custom-request.md)。

## V2-C 客户意向评分

V2-C 新增客户意向评分，按规则动态计算客户 `intentScore`、`intentLevel`、评分原因和推荐动作，帮助业务员优先跟进更可能成交的客户。

- 新增受保护 API：`GET /api/customers/:id/intent`、`POST /api/customers/:id/recalculate-intent`、`GET /api/dashboard/high-intent-customers`。
- 客户列表支持 `sort=intentScore` 和 `intentLevel=high|medium|low`。
- Web 后台客户列表显示意向分和等级，客户详情显示评分原因、推荐动作和重新计算按钮。
- 首页工作台新增高意向客户 Top 10。
- Chrome Extension 侧边栏客户信息区显示意向分、等级和推荐动作。
- V2-C 只做规则评分，不做机器学习，也不把评分固定写入数据库。

意向评分仅作销售辅助，不代表客户一定成交。系统不会因为评分高而自动发送 WhatsApp 消息；涉及价格、库存、交期、运费、付款仍需业务员确认。详细说明见：[docs/v2-customer-intent-score.md](docs/v2-customer-intent-score.md)。

## V2-B 素材中心

V2-B 新增素材中心，业务员可以用 URL 文本维护产品图片、视频、目录、尺码表、买家秀、工厂视频、物流截图、付款说明、证书等销售素材，并在 WhatsApp 侧边栏选择素材生成配套说明话术。

- Web 后台新增导航入口：`素材中心`。
- 新增受保护 API：`/api/materials`，所有数据按当前登录用户 `ownerId` 隔离。
- 支持素材类型、语言、关联产品、标签、关键词搜索和图片 URL 预览。
- 侧边栏新增 `发素材` 入口，可搜索素材、按类型/客户语言/已选产品筛选，并生成可复制或插入输入框的说明草稿。
- 素材说明会轻量引用 V2-A 知识库，例如产品卖点、物流政策、付款方式、公司介绍和 FAQ。
- V2-B 只支持 URL 管理，不做真实文件上传、对象存储或素材批量分发。

素材说明不会自动发送 WhatsApp 消息，也不能替代业务员确认价格、库存、交期、物流时效、付款账户、证书真实性和售后承诺。详细说明见：[docs/v2-material-center.md](docs/v2-material-center.md)。

## V2-A AI 公司知识库

V2 第一刀新增 AI 公司知识库，让业务员维护公司介绍、产品卖点、物流政策、售后政策、报价规则、付款方式、禁用表达和 FAQ。AI 回复、产品介绍和报价话术会优先检索当前登录用户启用的知识条目，把知识作为草稿上下文引用。

- Web 后台新增导航入口：`知识库`。
- 新增受保护 API：`/api/knowledge-base`，所有数据按当前登录用户 `ownerId` 隔离。
- `POST /api/ai/reply` 支持 `customerId`、`productId`、`useKnowledgeBase`，返回 `knowledgeUsed`。
- 产品介绍生成会参考 `product_selling_points` 类知识。
- 报价话术会参考 `quote_rules`、`payment_methods` 和物流类知识。
- `forbidden_expressions` 会作为风险规则，命中后只提醒业务员修改，不自动阻止或发送。

知识库不会自动发送 WhatsApp 消息，也不能替代业务员确认价格、库存、交期、运费、付款、售后承诺。详细说明见：[docs/v2-knowledge-base.md](docs/v2-knowledge-base.md)。

## v0.2-alpha 内测版

- 已加入基础 `User` 账号模型、密码哈希、HTTP-only 登录 cookie 和服务端会话表。
- Web 后台启动后会先检查 `/api/auth/me`，未登录时显示登录页。
- 客户、产品、报价、跟进、消息草稿模型已关联到用户；客户/产品/报价/跟进接口按当前用户隔离。
- E 线已补充跟进提醒 CRUD、报价后跟进入口、客户详情跟进记录和首页工作台。
- 已补充 V1 全链路自动化验收：登录、AI 回复、客户、产品、报价、报价记录、跟进、首页工作台、标记完成和跨用户隔离。
- 暂不做团队、角色、部门权限，只做个人账号隔离。
- 内测文档：
  - [内测使用指南](docs/beta-test-guide.md)
  - [内测任务清单](docs/beta-test-checklist.md)
  - [内测反馈表](docs/beta-feedback-form.md)

## v0.1-demo 已完成能力

- React + TypeScript + Vite Web 后台。
- Node.js + Express API 服务。
- PostgreSQL + Prisma 数据模型和开发迁移说明。
- Chrome Extension Manifest V3，匹配 `https://web.whatsapp.com/*`。
- WhatsApp Web 右侧固定侧边栏，支持复制粘贴降级模式。
- AI 多语言回复接口 `POST /api/ai/reply`。
- 10 个 V1 高频客户消息场景识别：`price`、`moq`、`shipping`、`discount`、`sample`、`lead_time`、`product_proof`、`follow_up`、`payment`、`order_status`。
- 客户消息中文翻译、意图、关注点、三种回复草稿。
- 客户管理：标签、销售阶段、备注、跟进时间。
- 产品资料库：产品维护、搜索、侧边栏选择、产品介绍生成。
- 报价助手：普通报价、阶梯报价、报价风险提醒、复制报价话术。
- 安全边界：不接入 WhatsApp 官方 API、不自动群发、不自动发送、不绕过风控、业务员手动确认发送。
- 自动化测试覆盖 API、AI 回复场景、安全边界、产品、客户、报价工具函数。

## v0.1-demo 验证状态

```bash
npm test -w @wa-ai/api
npm run test:ai
npm run typecheck
npm run build
```

当前状态：以上命令均已通过。

## v0.1-demo 已知问题

- 第二阶段已开始补充基础账号体系；当前只做个人账号隔离，暂不做团队权限和角色管理。
- PostgreSQL 需要本地自行初始化；无数据库时部分接口使用 demo fallback 数据。
- Chrome 插件需要手动加载 `apps/extension/dist`，未发布到 Chrome Web Store。
- AI 回复目前是规则识别和模板草稿，未接入真实大模型服务。
- 侧边栏仅生成草稿；产品介绍和报价可插入 WhatsApp 输入框，但不会自动发送，回复区插入按钮仍为预留。
- 客户资料会保存少量信息到 `chrome.storage.local`，第二阶段建议增加清除本地缓存入口。
- 当前目录不是 git 仓库，因此本地无法创建真实 `v0.1-demo` git tag。
- 客户详情 V1 使用工作台右侧详情面板，暂不做独立 URL 详情页。
- 客户标签 V1 使用固定默认标签，暂不做自定义标签管理。
- 跟进提醒 V1 只做任务提示和话术草稿，暂不做系统通知、日历同步、消息自动发送。
- 产品介绍 fallback 目前使用规则模板生成，V1 暂不强制接入真实 LLM，后续可升级为真实 AI 生成。
- 产品图片/视频目前使用 URL 文本维护，V1 暂不做文件上传，后续再做素材中心和文件存储。
- 产品库存字段尚未建模，V1 报价和产品介绍会持续提示业务员确认库存，不允许系统编造库存状态。
- 首页工作台目前展示基础列表，暂不做分页、批量操作、浏览器通知或日历同步。
- Chrome 插件真实环境依赖 Web 后台 cookie；如果跨域 cookie 被浏览器策略阻止，请按下方 Chrome 登录态验证步骤排查 `CHROME_EXTENSION_ORIGIN`、`COOKIE_SAME_SITE` 和 `COOKIE_SECURE`。
- V2-A 知识库检索采用轻量规则和排序，暂不做向量检索、知识分块、语义召回和团队共享知识库。
- 知识库内容由业务员维护，系统只做引用和风险提醒；若知识库缺失或冲突，仍要求业务员人工确认。
- V2-B 素材中心目前只支持 URL 文本维护，不做真实文件上传、对象存储、素材批量发送或素材权限共享。
- 素材 URL 的真实性、可访问性、版权和证书/付款/物流材料真实性仍需业务员人工确认。
- V2-C 意向评分目前只做规则评分，不做机器学习、预测模型、团队维度分析或老板驾驶舱。
- 意向评分不会自动触发跟进消息，高分客户仍需业务员人工判断和手动沟通。
- V2-D 样品单只做销售流程记录，不处理真实支付、退款、物流查询或完整订单履约。
- V2-E 定制需求只做需求记录、状态管理和话术草稿，不处理真实生产排期、设计稿审核、订单系统、支付或财务利润。
- V2-E 文件字段只保存 URL 文本，不做真实上传、对象存储或文件权限管理。
- V2-F 数据导入导出只支持 CSV，不支持 Excel、复杂字段映射、批量自动发送或跨用户数据迁移。
- CSV 导入依赖用户按模板填写字段；关联客户/产品时必须能匹配当前登录用户下的数据，否则该行会返回错误。
- CSV 导出已做公式注入防护，但外部表格软件仍可能有不同安全策略，导出的 CSV 不应直接作为自动执行脚本使用。

## 产品边界

- 不接入 WhatsApp 官方 API。
- 不自动群发消息。
- 不自动发送 WhatsApp 消息。
- 不自动加好友。
- 不自动拉群。
- 不模拟用户批量轰炸陌生号码。
- 不绕过 WhatsApp 风控。
- AI 只生成草稿，最终由业务员手动确认发送。
- 所有涉及价格、库存、交期、运费、付款、退款的信息必须提醒业务员确认。
- 不编造价格、库存、交期、运费、付款状态或物流状态。
- 所有用户数据必须按当前登录用户隔离。
- 信息不足时，AI 应该先询问客户，不得编造。
- 如果插件无法读取 WhatsApp 页面内容，用户可手动粘贴客户消息。

## 安全边界和降级模式

- 所有 AI 回复/报价/产品介绍区域展示提示：`AI 仅生成建议内容，请确认价格、库存、交期、付款、退款信息后再发送。`
- 插件会显示识别状态：`识别正常`、`识别异常，已切换复制粘贴模式`、`当前不是聊天窗口`、`WhatsApp 页面未打开`。
- 插件只提供复制和插入输入框能力，不自动点击 WhatsApp 发送按钮，不批量发送，不定时发送 WhatsApp 消息。
- 报价风险提醒覆盖：报价低于最低价、未填写运费、未确认库存、未确认交期、文案中出现 `attached` 但未选择附件。

## V1 功能范围

只做：

- WhatsApp Web 侧边栏
- Desktop 复制粘贴模式
- AI 回复
- 翻译
- 客户 CRM
- 产品资料库
- 素材中心
- 客户意向评分
- 报价助手
- 跟进提醒
- 首页工作台
- AI 公司知识库

暂不做：

- 自动群发
- 自动发送
- 自动加好友
- 自动拉群
- 绕过 WhatsApp 风控
- 团队/角色/部门权限
- 老板驾驶舱
- 复杂财务
- 采购预测
- 完整订单系统
- 私有化部署
- 开放 API

## 工程要求

- 前端使用 TypeScript。
- 代码保持模块化。
- AI prompt 单独封装，便于修改。
- 所有 API 要有基础错误处理。
- 所有表单要有基础校验。
- 关键功能要有测试。
- README 说明本地启动、Chrome 插件加载和数据库初始化。
- 每个功能必须有测试。
- 每个模块必须更新 README 或 Known Issues。
- 不允许范围蔓延。
- 每次任务完成必须输出修改文件、测试结果、已知问题。
- 如发现自动发送或群发逻辑，必须立即移除。

## UX 原则

- 高频动作尽量 1-2 次点击完成。
- 回复结果必须可编辑、可复制。
- 插件识别失败时必须能切换复制粘贴模式。
- 不要求用户先理解复杂 CRM 才能使用。

## 技术选型

- 前端：React + TypeScript + Vite。
- 后端：Node.js + Express，适合 MVP 快速迭代和独立 API 调试。
- 数据库：PostgreSQL + Prisma。
- 插件：Chrome Extension Manifest V3。
- Monorepo：npm workspaces。

## 项目结构

```text
.
├── apps
│   ├── api              # Express API 服务
│   ├── extension        # Chrome Extension MV3
│   └── web              # React + Vite Web 后台
├── packages
│   └── shared           # 共享类型和默认选项
├── prisma
│   └── schema.prisma    # PostgreSQL 数据模型
├── docs
│   ├── deploy-server.md
│   └── production-smoke-test.md
├── scripts              # 部署、备份、恢复、回滚脚本
├── Dockerfile
├── docker-compose.prod.yml
├── .env.example
├── .env.production.example
├── package.json
└── tsconfig.base.json
```

## 初始化数据库

完整本地数据库验收命令见：[docs/local-db-acceptance.md](docs/local-db-acceptance.md)。
Chrome Extension 登录态验收见：[docs/chrome-extension-auth-acceptance.md](docs/chrome-extension-auth-acceptance.md)。

1. 安装依赖：

```bash
npm install
```

2. 创建环境变量：

```bash
cp .env.example .env
```

3. 确认 `.env` 中的 `DATABASE_URL` 指向可用 PostgreSQL：

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/whatsapp_ai_sales_v1?schema=public"
```

4. 使用 Docker Compose 启动 PostgreSQL：

```bash
npm run db:up
```

5. 生成 Prisma Client：

```bash
npm run prisma:generate
```

6. 执行迁移：

```bash
npm run prisma:migrate -- --name init
```

7. 写入内测管理员账号：

`db:seed` 只读取环境变量，不提供默认密码，也不会在日志中打印密码。运行前请在 `.env` 或 shell 中设置：

```env
ADMIN_EMAIL="<admin-email>"
ADMIN_PASSWORD="<admin-password>"
```

```bash
npm run db:seed
```

也可以一条命令完成 Docker、Prisma Client、迁移和 seed；同样需要先设置 `ADMIN_EMAIL` 和 `ADMIN_PASSWORD`：

```bash
npm run db:init
```

如果你是在已有数据库上继续开发，按功能增量执行迁移：

```bash
npm run prisma:migrate -- --name add_customer_management
npm run prisma:migrate -- --name add_product_library
npm run prisma:migrate -- --name add_quote_assistant
```

8. 可选：打开 Prisma Studio 检查数据：

```bash
npm run prisma:studio
```

## 本地运行

```bash
npm run dev
```

- Web 后台：http://localhost:5173
- API：http://localhost:4000
- 健康检查：http://localhost:4000/api/health

V1 内测闭环建议按这个顺序验证：

1. 打开 Web 后台并登录 `<admin-email> / <admin-password>`。
2. 进入“客户”，创建或选择客户，设置标签、销售阶段、备注和下次跟进时间。
3. 进入“产品”，创建或选择产品，维护 MOQ、建议价、底价、交期、卖点和多语言介绍。
4. 进入“报价”，选择客户和产品，生成报价并保存到客户记录。
5. 回到客户详情右侧面板，确认报价记录可见。
6. 新增“报价后跟进”任务，选择明天、3 天后、下周或自定义时间。
7. 进入“首页 / 跟进”，确认今日待跟进、逾期未跟进、未来待跟进会实时更新。
8. 点击客户打开详情，查看推荐跟进话术，标记完成后首页待办消失。

V1 全链路自动化验收：

```bash
npm test -w @wa-ai/api -- v1-full-flow.test.ts
```

该测试覆盖：登录、`/api/auth/me`、AI 回复、客户保存和标签阶段、产品介绍、报价生成和保存、客户报价记录、跟进任务、首页今日/未来待办、标记完成、用户 B 无法访问用户 A 数据。

## Staging 生产部署

当前已补齐 Ubuntu 24.04 + Docker + Nginx 的 staging 部署配置：

- Docker API/Web 镜像：`Dockerfile`
- 生产 Compose：`docker-compose.prod.yml`
- 生产环境变量模板：`.env.production.example`
- 部署脚本：`scripts/deploy.sh`
- 数据库备份/恢复：`scripts/backup-db.sh`、`scripts/restore-db.sh`
- 回滚脚本：`scripts/rollback.sh`
- 服务器部署文档：[docs/deploy-server.md](docs/deploy-server.md)
- 生产 smoke test：[docs/production-smoke-test.md](docs/production-smoke-test.md)
- Chrome 插件生产构建：[docs/extension-production.md](docs/extension-production.md)

生产环境必须在服务器上创建 `.env.production`，不要提交真实密钥、数据库密码、Cookie 密钥或 OpenAI Key。

IP staging 构建 Chrome 插件：

```bash
VITE_API_BASE_URL=http://187.77.138.174 VITE_WEB_LOGIN_URL=http://187.77.138.174 npm run build -w @wa-ai/extension
```

正式 HTTPS 域名构建 Chrome 插件：

```bash
VITE_API_BASE_URL=https://api.yourdomain.com VITE_WEB_LOGIN_URL=https://app.yourdomain.com npm run build -w @wa-ai/extension
```

插件仍然只生成草稿、复制或插入输入框，不会自动点击 WhatsApp 发送按钮，不会自动群发。

## 核心 API

账号体系：

```text
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
```

`/api/customers`、`/api/products`、`/api/quotes`、`/api/follow-ups` 为受保护接口，需要登录 cookie。数据按当前登录用户 `ownerId` 隔离。

客户管理：

```text
GET    /api/customers?tag=高意向&stage=已报价&q=Mexico&sort=intentScore&intentLevel=high
GET    /api/customers/:id
GET    /api/customers/:id/intent
POST   /api/customers/:id/recalculate-intent
POST   /api/customers
PATCH  /api/customers/:id
DELETE /api/customers/:id
GET    /api/dashboard/high-intent-customers
```

## 客户 CRM 最小闭环

登录后的业务员可以在 Web 后台进入“客户”页面完成客户最小 CRM 闭环：

- 创建客户：填写客户名称、WhatsApp 号码、国家、语言、标签、销售阶段、意向产品、沟通摘要、备注和下次跟进时间。
- 查看客户：客户列表只展示当前登录用户自己的客户。
- 筛选客户：支持按标签、销售阶段和关键词筛选。
- 编辑客户：客户详情面板可更新标签、阶段、备注和跟进时间。
- 删除客户：只能删除当前登录用户自己的客户。
- WhatsApp 侧边栏：可保存或更新当前客户信息到后台，并同步标签、阶段、备注和下次跟进时间。

个人账号隔离规则：

- 创建客户时后端自动写入当前登录用户 `ownerId`。
- 列表查询固定按 `ownerId` 过滤。
- 详情、编辑、删除都校验 `ownerId`，跨用户 `customerId` 返回 `404 customer not found`。
- API 测试覆盖创建、列表、详情、更新、删除、跨用户访问拒绝和基础表单校验。

产品资料库：

```text
GET    /api/products?q=lamp&category=Home Office
GET    /api/products/:id
POST   /api/products
PATCH  /api/products/:id
DELETE /api/products/:id
POST   /api/products/:id/intro
```

素材中心：

```text
GET    /api/materials?type=image&language=en&productId=product_123&q=summer&tag=real
GET    /api/materials/:id
POST   /api/materials
PATCH  /api/materials/:id
DELETE /api/materials/:id
POST   /api/materials/:id/intro
```

## 产品资料库 + 侧边栏发产品

登录后的业务员可以在 Web 后台进入“产品”页面维护自己的产品资料：

- 创建/编辑产品：名称、SKU、类目、图片、视频、颜色、尺寸、材质、MOQ、建议价、底价、交期、卖点和多语言介绍。
- 搜索产品：支持按 `name`、`sku`、`category` 关键词搜索，也支持按类目筛选。
- 个人隔离：创建产品时后端自动写入当前登录用户 `ownerId`；列表、详情、编辑、删除和介绍生成都按当前用户过滤，跨用户 `productId` 返回 `404 product not found`。
- SKU 唯一性：同一个业务员下 `sku` 唯一，不同业务员之间 SKU 可重复。

WhatsApp 侧边栏“发产品”能力：

- 侧边栏启动后加载当前登录用户的产品。
- 可按产品名称、SKU、类目搜索产品。
- 选择产品后显示 MOQ、建议价、底价、交期和卖点摘要。
- 点击“发产品”生成产品介绍草稿。
- 如果维护了对应语言介绍：优先使用 `introEn` / `introEs` / `introPt` / `introAr`。
- 如果没有对应语言介绍：根据 `sellingPoints` 生成草稿，并提示业务员确认 MOQ、价格、库存和交期。
- 产品介绍可复制，也可插入 WhatsApp 输入框；最终发送动作仍由业务员手动确认。
- 插件不会自动发送 WhatsApp 消息，也不会点击发送按钮。

产品介绍安全边界：

- 不编造价格。
- 不编造库存。
- 不编造交期。
- 不承诺最低价。
- 如果缺少 MOQ、价格、交期，会显示风险提醒，要求业务员确认后再发送。

## 素材中心 + 侧边栏发素材

登录后的业务员可以在 Web 后台进入“素材中心”维护自己的销售素材：

- 创建/编辑素材：标题、类型、URL、描述、语言、关联产品和标签。
- 搜索素材：支持按 `title`、`description`、`tags` 关键词搜索，也支持按类型、语言和关联产品筛选。
- URL 预览：`image` 类型显示图片预览；视频、目录、证书等素材显示可点击链接。
- 个人隔离：创建素材时后端自动写入当前登录用户 `ownerId`；列表、详情、编辑、删除和说明生成都按当前用户过滤，跨用户 `materialId` 返回 `404 material not found`。
- 产品归属校验：如果素材关联 `productId`，后端会确认该产品属于当前登录用户。

WhatsApp 侧边栏“发素材”能力：

- 侧边栏启动后加载当前登录用户的素材。
- 可搜索素材，并按素材类型、客户语言和已选产品筛选。
- 选择素材后显示标题、URL、标签和说明话术。
- 点击“发素材”生成素材说明草稿，可复制或插入 WhatsApp 输入框。
- 插件不会自动发送 WhatsApp 消息，也不会点击发送按钮。

素材说明安全边界：

- 不编造价格。
- 不编造库存。
- 不编造交期。
- 不编造证书真实性。
- 不承诺 100% 到货。
- 不承诺所有订单免费退换。
- `payment_proof` 必须提醒确认收款账户、付款方式和手续费。
- `shipping_proof` 必须提醒确认物流方式、目的地和时效。
- `certificate` 必须提醒确认证书/资质真实性。

AI 多语言回复：

```text
POST   /api/ai/reply
```

报价助手：

```text
POST   /api/quotes/generate
POST   /api/quotes
GET    /api/quotes
GET    /api/quotes/customer/:customerId
GET    /api/quotes/:id
PATCH  /api/quotes/:id
DELETE /api/quotes/:id
```

跟进提醒：

```text
GET    /api/follow-ups/dashboard
GET    /api/follow-ups?customerId=&status=&scope=today|overdue|pending
POST   /api/follow-ups
GET    /api/follow-ups/:id
PATCH  /api/follow-ups/:id
POST   /api/follow-ups/:id/complete
POST   /api/follow-ups/:id/cancel
DELETE /api/follow-ups/:id
POST   /api/follow-ups/script
```

## 报价助手 V1

Quote 模型字段：

- `id`
- `customerId`
- `productId`
- `quantity`
- `unitPrice`
- `currency`
- `shippingCost`
- `moq`
- `leadTime`
- `includeShipping`
- `quoteText`
- `createdBy`
- `createdAt`

报价生成请求示例：

```json
{
  "customerId": "customer-id",
  "productId": "product-id",
  "quantity": 100,
  "unitPrice": 12.5,
  "currency": "USD",
  "shippingCost": 80,
  "moq": 50,
  "leadTime": "12-15 days after payment",
  "includeShipping": false,
  "targetLanguage": "Spanish",
  "tiers": [
    { "quantity": 50, "unitPrice": 13.2 },
    { "quantity": 100, "unitPrice": 12.5 },
    { "quantity": 300, "unitPrice": 11.8 }
  ]
}
```

返回内容包含 `quoteText`、`riskWarnings` 和 `followUpPrompt`。报价话术只作为 WhatsApp 草稿，不会自动发送。

风险提醒覆盖：

- 单价低于产品 `minPrice`：`当前报价低于最低价，请确认`。
- 未填写运费：`未填写运费，请确认客户国家、城市和物流方式`。
- 未填写交期：`未填写交期，请确认后再发送`。
- 产品库存字段尚未建模：`库存未建模，请业务员确认库存后再承诺`。
- 不允许系统编造库存、运费、交期、折扣或付款条件。
- 文案承诺现货但库存未知，或文案中出现 `attached` 但未选择附件。

个人账号隔离：
- 创建报价前，后端会校验 `customerId` 和 `productId` 都属于当前登录用户。
- 报价列表、详情、更新、删除均按当前登录用户 `ownerId` / `createdBy` 过滤。
- 跨用户访问 `quoteId`、`customerId`、`productId` 返回 `404`，不会泄露其他业务员数据。

页面入口：
- Web 后台左侧进入“报价”，选择客户和产品，填写数量、单价、币种、MOQ、运费、交期，可生成普通报价或阶梯报价。
- 保存报价后，会写入客户记录；客户工作台右侧详情面板会展示该客户的报价记录。
- WhatsApp 侧边栏选择产品后，可填写报价表单并点击“报价”生成话术，也可“保存报价到客户记录”。
- 报价文案支持复制和插入 WhatsApp 输入框，但最终发送仍由业务员手动确认，插件不会点击发送按钮。

## 跟进提醒 + 首页工作台

FollowUpTask 模型字段：

- `id`
- `customerId`
- `taskType`
- `remindAt`
- `recommendedScript`
- `status`
- `ownerId`
- `createdAt`
- `completedAt`

支持任务类型：`报价后跟进`、`催付款`、`样品反馈`、`老客户复购`、`售后跟进`、`普通提醒`。支持状态：`pending`、`completed`、`cancelled`。

Web 后台入口：

- 左侧“首页 / 跟进”进入工作台，展示今日待跟进、逾期未跟进、未来待跟进、已报价未跟进客户、高意向待跟进客户、最近新增客户。
- 客户详情右侧面板展示该客户跟进任务，可新增跟进、使用明天 / 3 天后 / 下周快捷时间、标记完成、查看历史跟进记录。
- 报价保存成功后，会预填“报价后跟进”任务，默认推荐 24 小时后跟进，话术围绕确认是否看过报价、是否需要保留库存、是否需要调整数量。

WhatsApp 侧边栏入口：

- 点击“设置跟进”会生成跟进话术草稿，并可选择任务类型和提醒时间。
- 支持明天、3 天后、下周、自定义时间。
- 保存前必须先保存当前客户，任务会绑定当前登录用户和客户。
- 跟进话术可复制或保存在任务里，但系统不会自动发送 WhatsApp 消息。

个人账号隔离：

- 创建跟进任务前，后端会校验 `customerId` 属于当前登录用户。
- 创建任务时自动写入当前用户 `ownerId`。
- 列表、详情、更新、完成、取消、删除均按 `ownerId` 过滤。
- 跨用户访问 `taskId` 或用其他用户 `customerId` 创建任务会返回 `404`。

推荐话术安全边界：

- 只生成草稿，不自动发送。
- 不编造价格、库存、交期、物流状态、折扣或付款条件。
- 涉及价格、库存、交期、运费、付款时，话术提醒业务员确认后再发送。

## V2-D 样品单管理

SampleOrder 模型字段：

- `id`
- `customerId`
- `productId`
- `sampleName`
- `sampleFee`
- `shippingCost`
- `currency`
- `paymentStatus`
- `shippingStatus`
- `trackingNumber`
- `feedbackStatus`
- `expectedShipDate`
- `expectedDeliveryDate`
- `notes`
- `ownerId`
- `createdAt`
- `updatedAt`

支持付款状态：`unpaid`、`paid`、`refunded`、`deducted`。支持发货状态：`pending`、`preparing`、`shipped`、`delivered`、`delayed`。支持反馈状态：`pending`、`satisfied`、`unsatisfied`、`converted_to_bulk`、`no_response`。

API：

- `GET /api/sample-orders`
- `POST /api/sample-orders`
- `GET /api/sample-orders/:id`
- `PATCH /api/sample-orders/:id`
- `DELETE /api/sample-orders/:id`
- `PATCH /api/sample-orders/:id/payment-status`
- `PATCH /api/sample-orders/:id/shipping-status`
- `PATCH /api/sample-orders/:id/feedback-status`
- `POST /api/sample-orders/:id/script`

Web 后台入口：

- 左侧“样品单”页面支持新增、编辑、删除、搜索样品名/客户名/物流单号，并按付款状态、发货状态、反馈状态筛选。
- 客户详情右侧面板展示该客户的样品单记录，可从客户详情快速新增样品单。
- 样品话术支持样品报价、付款提醒、发货通知、签收反馈跟进、转大货引导。

WhatsApp 侧边栏入口：

- 点击“样品”可创建当前客户的样品单，必须先保存客户。
- 可复用当前选择的产品，填写样品费、运费、币种、预计发货日、预计签收日、物流单号和备注。
- 可生成样品报价、付款提醒、发货通知、签收反馈跟进和转大货引导话术。
- 可复制或插入 WhatsApp 输入框，但不会自动发送 WhatsApp 消息。
- 可把样品签收反馈话术预填到“设置跟进”区域，再由业务员手动保存跟进提醒。

个人账号隔离：

- 创建样品单前会校验 `customerId` 属于当前登录用户。
- 如果传入 `productId`，后端会校验产品属于当前登录用户。
- 样品单创建时自动写入当前用户 `ownerId`。
- 列表、详情、更新、删除、状态更新和话术生成均按 `ownerId` 过滤。
- 跨用户访问 `sampleOrderId` 或使用其他用户的 `customerId` / `productId` 会返回 `404`。

样品单安全边界：

- 样品单只做销售流程记录，不做在线支付、不做真实物流查询、不做完整订单系统。
- 样品话术只生成草稿，不自动发送 WhatsApp 消息。
- 不编造样品费、运费、交期、付款方式、样品费抵扣规则或物流时效。
- 不承诺样品费一定可抵扣，不承诺一定今天发货，不承诺物流一定按时到达。
- 涉及付款时提醒业务员确认收款账户和付款方式；涉及发货时提醒业务员确认物流单号和物流时效。

## Chrome 插件加载方式

1. 构建插件：

```bash
npm run build -w @wa-ai/extension
```

IP staging 构建时指定生产 API / Web 地址：

```bash
VITE_API_BASE_URL=http://187.77.138.174 VITE_WEB_LOGIN_URL=http://187.77.138.174 npm run build -w @wa-ai/extension
```

正式 HTTPS 环境：

```bash
VITE_API_BASE_URL=https://api.yourdomain.com VITE_WEB_LOGIN_URL=https://app.yourdomain.com npm run build -w @wa-ai/extension
```

Manifest V3 已预留 `http://187.77.138.174/*`、`https://api.yourdomain.com/*`、`https://app.yourdomain.com/*` 和 `https://web.whatsapp.com/*` 的 host permissions。

2. 打开 Chrome：

```text
chrome://extensions
```

3. 开启 `Developer mode`。
4. 点击 `Load unpacked`。
5. 选择目录：

```text
E:\Codex\2026-05-18\0-v1-whatsapp-ai-v1-whatsapp\apps\extension\dist
```

6. 打开：

```text
https://web.whatsapp.com
```

## Chrome 插件登录态验证

真实 Chrome 环境建议按下面步骤验收：

1. 启动后端和 Web 后台：

```bash
npm run dev
```

2. 在 Web 后台登录：

```text
http://localhost:5173
```

3. 打开 Chrome 扩展页，加载插件目录：

```text
E:\Codex\2026-05-18\0-v1-whatsapp-ai-v1-whatsapp\apps\extension\dist
```

4. 打开 WhatsApp Web：

```text
https://web.whatsapp.com
```

5. 验收侧边栏状态：

- 已登录时：侧边栏顶部显示当前用户名称和邮箱。
- 未登录时：显示“请先登录 Web 后台”，并提供“打开 Web 后台登录”按钮。
- 插件请求 `/api/auth/me` 必须携带 `credentials: "include"`。
- 后端 CORS 必须允许 Web 前端 origin 和 Chrome extension origin。

排查方式：

- 如果侧边栏提示未登录，先确认 Web 后台同一个 Chrome Profile 已登录。
- 如果 Network 中 `/api/auth/me` 返回 `401`，检查 cookie 是否写入、是否被 SameSite/Secure 策略拦截。
- 开发环境若配置了 `CHROME_EXTENSION_ORIGIN=chrome-extension://...`，cookie 可能使用 `SameSite=None; Secure`；Chrome 可能要求 HTTPS 或显式放宽本地策略。仅本地调试时可设置 `COOKIE_SAME_SITE=Lax`、`COOKIE_SECURE=false` 后重启 API。
- 如果 CORS 报错，确认 `.env` 中 `WEB_ORIGIN=http://localhost:5173`，生产环境确认 `.env.production` 中 `CORS_ORIGINS` 包含 Web/API 域名，固定插件 ID 时设置 `CHROME_EXTENSION_ORIGIN=chrome-extension://你的插件ID`。

## 插件侧边栏功能

- 在 WhatsApp Web 右侧注入固定侧边栏。
- 当前为复制粘贴模式，不读取或自动发送 WhatsApp 消息。
- 可保存/更新客户信息到后台。
- 可选择产品并生成客户语言的产品介绍文案。
- 可输入数量、单价、币种、MOQ、运费、交期，生成普通报价或阶梯报价。
- 可设置跟进提醒，支持明天、3 天后、下周和自定义时间。
- 报价和产品介绍均可复制，也可插入 WhatsApp 输入框；最终发送动作仍由业务员手动确认。

## 本地测试

```bash
npm test -w @wa-ai/api
npm run test:ai
npm run typecheck
npm run build
npx prisma validate
```

AI 回复场景回归测试：

```bash
npm run test:ai
```

该命令覆盖 `POST /api/ai/reply` 的 10 个 V1 高频客户消息场景：`price`、`moq`、`shipping`、`discount`、`sample`、`lead_time`、`product_proof`、`follow_up`、`payment`、`order_status`。测试会验证返回结构、场景识别、风险提示和“仅生成草稿、不自动发送 WhatsApp 消息”的安全边界。

手动测试建议：

- 打开 Web 后台，进入“产品资料库”，创建一个带 `minPrice`、MOQ 和交期的产品。
- 进入“客户管理”，创建一个客户并设置语言。
- 进入“报价助手”，选择客户和产品，填写报价表单，生成并保存报价。
- 打开 `https://web.whatsapp.com`，在侧边栏选择产品，填写报价信息，点击“报价”生成 WhatsApp 话术。
- 在侧边栏或客户详情里设置跟进提醒，回到首页工作台确认待办展示，再标记完成。
- 复制报价文案，手动粘贴到 WhatsApp 输入框并人工发送。

安全边界回归扫描：

```bash
rg -n "\.click\(|dispatchEvent|KeyboardEvent|send button|compose-btn-send|bulk send|auto[- ]?send|automatic send|setInterval\(" apps\extension\src apps\api\src apps\web\src packages\shared\src
```

允许命中测试文件里的“不自动发送”断言；源代码中不应出现自动点击 WhatsApp 发送按钮、自动群发、批量发送或定时发送逻辑。

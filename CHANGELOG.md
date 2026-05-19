# Changelog

## v0.4-v2-sales-enhancement - 2026-05-20

V2 成交增强版收尾版本，覆盖 V2-A 到 V2-F 的完整能力，并完成全链路联调、账号隔离检查、安全边界检查、部署检查和文档收尾。

### Added

- V2-A AI 公司知识库：支持公司介绍、产品卖点、物流政策、售后政策、报价规则、付款方式、禁用表达和 FAQ，AI 回复返回 `knowledgeUsed`。
- V2-B 素材中心：支持图片、视频、目录、尺码表、买家秀、工厂视频、物流截图、付款说明、证书等 URL 素材管理和说明草稿生成。
- V2-C 客户意向评分：支持规则评分、意向等级、评分原因、推荐动作、客户列表排序和首页高意向客户区块。
- V2-D 样品单管理：支持样品单 CRUD、付款/发货/反馈状态更新、客户详情展示、侧边栏样品入口和样品话术草稿。
- V2-E 定制需求管理：支持定制需求 CRUD、状态更新、客户详情展示、侧边栏定制入口和定制话术草稿。
- V2-F 数据导入导出：支持客户、产品、知识库、素材、样品单、定制需求 CSV 模板、dryRun 导入、正式导入和 CSV 导出。
- 版本号统一更新到 `0.4.0`。

### Safety

- 全仓库继续保持：不接入 WhatsApp 官方 API、不自动发送 WhatsApp 消息、不自动群发、不模拟点击 WhatsApp 发送按钮。
- AI 回复、产品介绍、素材说明、报价、跟进、样品和定制话术均只生成草稿，业务员必须手动确认后发送。
- 价格、库存、交期、运费、付款、物流、证书真实性和售后承诺均保留业务员确认提醒。
- V2 不引入收费、定价、支付、套餐、团队/角色/部门权限、完整订单系统、财务利润、采购预测或老板驾驶舱。
- 导入导出按当前登录用户隔离，不导出密钥、token、session、cookie 或其他用户数据。

### Validation

- API 全量测试通过：23 个测试文件，125 个测试。
- 类型检查通过：shared、api、web、extension。
- 生产构建通过：shared、api、web、extension。
- 自动发送风险扫描未发现 WhatsApp 自动发送、自动群发、模拟点击发送按钮相关逻辑。
- 部署配置检查覆盖 Dockerfile、docker-compose.prod.yml、.env.example、运维脚本、部署文档、生产 smoke test 和 Chrome Extension 生产文档。

## Unreleased - V2-F 数据导入导出
### Added

- 新增 CSV 导出 API：`/api/export/customers`、`/api/export/products`、`/api/export/knowledge-base`、`/api/export/materials`、`/api/export/sample-orders`、`/api/export/custom-requests`。
- 新增 CSV 模板下载 API：`/api/import/templates/customers`、`/api/import/templates/products`、`/api/import/templates/knowledge-base`、`/api/import/templates/materials`、`/api/import/templates/sample-orders`、`/api/import/templates/custom-requests`。
- 新增 CSV 导入 API：`/api/import/customers`、`/api/import/products`、`/api/import/knowledge-base`、`/api/import/materials`、`/api/import/sample-orders`、`/api/import/custom-requests`。
- 导入支持 `multipart/form-data`、`.csv` 文件限制、5MB 文件大小限制、`dryRun=true` 预览校验和 `skipDuplicates=true` 重复跳过。
- Web 后台新增 `Import / Export` 页面，可下载模板、上传 CSV、预览错误、确认导入和导出当前用户数据。
- 客户导入支持重复 WhatsApp 号码跳过；产品导入支持重复 SKU 跳过；知识库、素材、样品单、定制需求导入支持当前用户下产品和客户关联校验。

### Safety

- 所有导入数据自动绑定当前登录用户，CSV 中的 `ownerId`、`createdBy`、`organizationId`、密码、token、secret、API key、session、cookie 等敏感字段会被忽略。
- 所有导出接口只导出当前登录用户自己的数据，不导出密码、密钥、token、session、cookie 或 `.env` 内容。
- CSV 导出对 `=`、`+`、`-`、`@` 开头的单元格做公式注入防护。
- V2-F 只做 CSV，不做 Excel、复杂字段映射器、收费、支付、团队权限、订单系统或 WhatsApp 自动发送。
- 继续禁止自动发送 WhatsApp 消息、自动群发、批量发送和模拟点击 WhatsApp 发送按钮。

### Tests

- 新增 `import-export-api.test.ts`，覆盖 6 类数据导出隔离、模板、CSV 注入转义、敏感字段排除、dryRun、实际导入、重复跳过、非法枚举/日期/数字、跨用户关联拒绝、非 CSV/恶意 MIME/超大文件拒绝。

## Unreleased - V2-E 定制需求管理

### Added

- 新增 `CustomRequest` 数据模型，记录客户 Logo、包装、颜色、尺寸、材质、OEM/ODM、数量、MOQ、打样费、打样周期、大货周期、文件 URL、状态和备注。
- 新增受保护定制需求 API：`/api/custom-requests`，覆盖创建、列表、详情、更新、删除、状态更新和定制话术生成。
- 定制需求按当前登录用户 `ownerId` 隔离，创建时校验 `customerId` 属于当前用户；传入 `productId` 时校验产品属于当前用户。
- Web 后台新增 `Custom` 页面，支持新增/编辑/删除、按类型/状态筛选、关键词搜索和生成定制话术草稿。
- 客户详情右侧记录区展示该客户定制需求。
- Chrome Extension 侧边栏新增 `定制` 入口，支持创建定制需求、填写 Logo/包装/颜色/尺寸/材质/数量/MOQ/打样费/周期/文件 URL，并生成定制话术草稿。
- 定制话术生成轻量引用知识库 `quote_rules`、`payment_methods`、`logistics`、`after_sales_policy` 和 `faq`。
- 客户意向评分轻量联动定制需求：有定制需求、Logo/包装/OEM/ODM、较大数量、等待客户确认、样品确认会加分；取消会减分。
- 定制需求可创建普通跟进提醒，用于客户确认、打样完成或大货确认。
- 新增 V2-E 文档：`docs/v2-custom-request.md`。

### Safety

- 定制需求只做销售需求记录和话术草稿，不做真实生产排期、订单系统、支付系统、财务利润或团队权限。
- 定制话术只生成草稿，不会自动发送 WhatsApp 消息。
- 继续禁止自动群发、批量发送、模拟点击 WhatsApp 发送按钮。
- 不编造 MOQ、打样费、打样周期、大货周期、付款方式、定制能力、客户文件可生产性或售后承诺。
- 缺少 Logo 文件、包装要求、MOQ、打样费或周期时，必须提醒业务员确认后再发送。

### Tests

- 新增定制需求工具函数测试，覆盖表单校验、话术生成、缺失资料风险提醒和无自动发送逻辑。
- 新增定制需求 API 测试，覆盖创建、列表隔离、筛选/搜索、详情/更新/删除跨用户拒绝、跨用户客户/产品创建拒绝、状态更新和话术风险提醒。
- 更新客户意向评分测试，覆盖定制需求加分/减分联动。

## Unreleased - V2-D 样品单管理

### Added

- 新增 `SampleOrder` 数据模型，记录客户样品单、样品费、运费、付款状态、发货状态、物流单号、反馈状态、预计发货/签收日期和备注。
- 新增受保护样品单 API：`/api/sample-orders`，覆盖创建、列表、详情、更新、删除、付款状态更新、发货状态更新、反馈状态更新和样品话术生成。
- 样品单按当前登录用户 `ownerId` 隔离，创建时校验 `customerId` 属于当前用户；传入 `productId` 时校验产品属于当前用户。
- Web 后台新增“样品单”页面，支持新增/编辑/删除、搜索客户名/样品名/物流单号，并按付款、发货、反馈状态筛选。
- 客户详情右侧面板新增样品单区块，可查看客户样品单并快速新增。
- Chrome Extension 侧边栏新增“样品”入口，可保存样品单、生成样品报价/付款提醒/发货通知/反馈跟进/转大货引导草稿、复制或插入输入框。
- 样品话术生成轻量引用知识库：报价规则、付款方式、物流政策、售后政策和 FAQ 可作为草稿上下文。
- 客户意向评分轻量联动样品单：有样品单、样品已付款、样品签收满意、样品转大货会加分；样品无反馈会轻微减分。
- 新增 V2-D 样品单文档：`docs/v2-sample-order.md`。

### Safety

- 样品单只做销售流程记录，不做在线支付、不做真实物流查询、不做完整订单系统。
- 样品话术只生成草稿，不会自动发送 WhatsApp 消息。
- 继续禁止自动群发、批量发送、模拟点击 WhatsApp 发送按钮。
- 不编造样品费、运费、交期、付款方式、样品费抵扣规则或物流时效。
- 涉及付款时提醒业务员确认收款账户和付款方式；涉及发货时提醒业务员确认物流单号、物流方式和时效。

### Tests

- 新增样品单工具函数测试，覆盖表单校验、样品报价话术、发货话术风险提醒和无自动发送逻辑。
- 新增样品单 API 测试，覆盖创建、列表隔离、筛选/搜索、跨用户访问拒绝、跨用户客户/产品创建拒绝、状态更新和样品话术安全提醒。
- 更新客户意向评分关联数据，支持样品单规则加减分。

## Unreleased - V2-C 客户意向评分

### Added

- 新增规则评分模块 `customer-intent-rules`，根据客户标签、销售阶段、报价记录、跟进任务、聊天摘要、备注和意向产品关键词动态计算意向分。
- 意向分范围为 `0-100`，意向等级为 `low`、`medium`、`high`。
- 新增客户意向 API：
  - `GET /api/customers/:id/intent`
  - `POST /api/customers/:id/recalculate-intent`
  - `GET /api/customers?sort=intentScore`
  - `GET /api/dashboard/high-intent-customers`
- 客户列表返回 `intentScore`、`intentLevel` 和 `recommendedAction`，支持按意向分排序和按意向等级筛选。
- Web 后台客户列表显示意向分和等级，客户详情显示评分原因、推荐动作和重新计算按钮。
- 首页工作台新增高意向客户 Top 10，显示意向分、推荐动作和打开客户入口。
- Chrome Extension 侧边栏客户信息区显示意向分、意向等级和推荐动作；未保存客户时提示先保存。
- 新增 V2-C 文档：`docs/v2-customer-intent-score.md`。

### Safety

- V2-C 只做规则评分，不做机器学习，不代表客户一定成交。
- 推荐动作只作为销售建议，不会自动发送 WhatsApp 消息。
- 继续禁止自动群发、批量发送、模拟点击 WhatsApp 发送按钮。
- 涉及价格、库存、交期、运费、付款仍需业务员确认。

### Tests

- 新增意向评分规则测试，覆盖标签、阶段、报价、最近报价、pending 跟进、逾期跟进、关键词、无效客户、上下限和等级映射。
- 新增意向评分 API 测试，覆盖 `/intent`、重新计算跨用户拒绝、客户列表按意向分排序、高意向 dashboard 当前用户隔离。
- 更新安全边界测试，确认插件侧边栏推荐动作不会自动发送消息。

## Unreleased - V2-B 素材中心

### Added

- 新增 `Material` 数据模型，支持素材标题、类型、URL、描述、语言、可选关联产品、标签和 `ownerId`。
- 新增受保护素材 API：`/api/materials`，覆盖创建、列表、详情、更新、删除、筛选、搜索和素材说明生成。
- 素材按当前登录用户 `ownerId` 隔离，跨用户查看、更新、删除和生成说明返回 `404`。
- 创建或更新素材时，如果传入 `productId`，会校验产品属于当前登录用户。
- Web 后台新增 `素材中心` 页面，支持新增/编辑/删除素材、搜索、按类型/语言/产品筛选、图片预览和链接打开。
- Chrome Extension 侧边栏新增 `发素材` 入口，可搜索、筛选、选择素材并生成配套说明话术。
- 素材说明生成支持 `image`、`video`、`catalog`、`size_chart`、`buyer_show`、`factory_video`、`shipping_proof`、`payment_proof`、`certificate`、`other`。
- 素材说明轻量引用知识库：产品卖点、物流政策、付款方式、公司介绍和 FAQ 可作为草稿上下文。
- 新增 V2-B 素材中心文档：`docs/v2-material-center.md`。

### Safety

- V2-B 只维护 URL 文本，不做真实文件上传或对象存储。
- 素材说明只生成草稿，不会自动发送 WhatsApp 消息。
- 继续禁止自动群发、批量发送、模拟点击 WhatsApp 发送按钮。
- `payment_proof` 会提醒业务员确认收款账户、付款方式和手续费。
- `shipping_proof` 会提醒业务员确认物流方式、目的地和时效。
- `certificate` 会提醒业务员确认证书/资质真实性，不编造认证范围或有效期。
- 不允许系统编造价格、库存、交期、证书真实性、物流时效、付款账户或售后承诺。

### Tests

- 新增素材工具函数测试，覆盖表单校验、URL 安全、图片素材说明、付款/物流/证书风险提醒和无自动发送逻辑。
- 新增素材 API 测试，覆盖创建、列表隔离、详情/更新/删除跨用户拒绝、产品归属校验、类型/语言/产品/关键词/标签筛选、素材说明生成、知识库引用和安全提醒。

## Unreleased - V2-A AI 公司知识库

### Added

- 新增 `KnowledgeBase` 数据模型，支持 `title`、`category`、`content`、`language`、可选 `productId`、`enabled`、`ownerId`。
- 新增知识库 CRUD API：`/api/knowledge-base`。
- 知识库按当前登录用户 `ownerId` 隔离，跨用户查看、更新、删除返回 `404`。
- 创建或更新知识库时，如果传入 `productId`，会校验产品属于当前登录用户。
- Web 后台新增 `知识库` 页面，支持新增、编辑、删除、启用/禁用、搜索、按分类筛选、按语言筛选、按产品筛选。
- `POST /api/ai/reply` 支持 `customerId`、`productId`、`useKnowledgeBase`，并返回 `knowledgeUsed`。
- AI 回复前会检索当前用户启用的知识库内容，最多引用 5 条，避免 prompt 过长。
- 产品介绍生成轻量集成 `product_selling_points` 知识。
- 报价话术生成轻量集成 `quote_rules` 和 `payment_methods` 知识。
- `forbidden_expressions` 作为风险规则，命中禁用表达时加入风险提醒。
- 新增 V2-A 知识库文档：`docs/v2-knowledge-base.md`。

### Safety

- 知识库只作为 AI 草稿上下文，不会自动发送 WhatsApp 消息。
- 继续禁止自动群发、批量发送、模拟点击 WhatsApp 发送按钮。
- 若未命中知识库，AI 回复会提醒业务员确认公司政策、价格、库存、交期和售后规则。
- 知识库不能让系统编造价格、库存、运费、交期、折扣、付款条件或物流状态。

### Tests

- 新增知识库 API 测试，覆盖创建、列表隔离、跨用户访问拒绝、产品归属校验、启用/禁用、筛选、搜索、AI 使用知识、未命中知识风险提醒、禁用表达风险提醒。
- 更新 AI 回复、产品介绍、报价测试，覆盖 `knowledgeUsed` 和安全边界。

## v0.2-alpha - 2026-05-19

V1 内测版，目标是支持 5-10 位真实跨境业务员进行本地试用。

### Added

- 基础账号体系：
  - `User` 模型、密码哈希、HTTP-only session cookie。
  - 登录、登出、当前用户接口 `/api/auth/me`。
  - Web 后台和 Chrome Extension 侧边栏均可识别登录态。
- 个人账号隔离：
  - Customer 按 `ownerId` 隔离。
  - Product 按 `ownerId` 隔离。
  - Quote 按 `ownerId` / `createdBy` 隔离。
  - FollowUpTask 按 `ownerId` 隔离。
  - 跨用户通过 ID 访问、修改、删除数据返回 `404`。
- 客户 CRM 最小闭环：
  - 登录后创建、查看、编辑、删除自己的客户。
  - 支持固定标签、销售阶段、备注、意向产品、下次跟进时间。
  - WhatsApp 侧边栏可保存/更新当前客户。
- 产品资料库 V1：
  - 产品 CRUD API 和 Web 后台产品页。
  - 支持按名称、SKU、类目搜索。
  - 侧边栏选择产品，生成客户语言的产品介绍草稿。
  - 优先使用已维护的 `introEn` / `introEs` / `introPt` / `introAr`，否则使用规则模板生成草稿。
- 报价助手 V1：
  - 普通报价和阶梯报价。
  - 报价可保存到客户记录。
  - 客户详情右侧面板可查看报价历史。
  - 侧边栏可生成报价草稿并保存报价。
  - 风险提醒覆盖低于最低价、未填写运费、未填写交期、库存未建模、不可编造库存/运费/交期/折扣/付款条件。
- 跟进提醒 + 首页工作台：
  - FollowUpTask CRUD API。
  - 支持任务类型：报价后跟进、催付款、样品反馈、老客户复购、售后跟进、普通提醒。
  - 支持状态：pending、completed、cancelled。
  - 侧边栏可设置明天、3 天后、下周、自定义时间的跟进提醒。
  - 报价保存后可预填报价后跟进任务。
  - 首页工作台展示今日待跟进、逾期未跟进、未来待跟进、已报价未跟进客户、高意向待跟进客户、最近新增客户。
  - 任务可标记完成，完成后不再显示在待办列表。
- V1 全链路自动化验收：
  - 登录、`/api/auth/me`、AI 回复、客户保存、产品介绍、报价保存、客户报价记录、跟进提醒、首页工作台、标记完成、跨用户隔离。
- 内测文档：
  - `docs/beta-test-guide.md`
  - `docs/beta-test-checklist.md`
  - `docs/beta-feedback-form.md`

### Changed

- README 更新为 v0.2-alpha 内测说明。
- README 增加真实 Chrome 插件登录态验证步骤和排查说明。
- README 增加 V1 全链路验收命令、安全扫描命令和 Known Issues。
- Chrome Extension API 请求统一携带 `credentials: "include"`。
- 后端 CORS 支持 Web 前端 origin 和 Chrome extension origin。

### Safety

- 继续明确产品边界：
  - 不接入 WhatsApp 官方 API。
  - 不自动群发。
  - 不自动发送 WhatsApp 消息。
  - 不模拟用户批量轰炸陌生号码。
  - 不绕过 WhatsApp 风控。
  - AI、产品介绍、报价、跟进话术只生成草稿，最终发送由业务员手动确认。
- 安全扫描未发现自动点击 WhatsApp 发送按钮、自动群发、批量发送或定时发送逻辑。

### Known Issues

- AI 回复、产品介绍和跟进话术仍为规则识别/模板草稿，未接入真实 LLM。
- Chrome 插件需要手动加载 `apps/extension/dist`，尚未发布到 Chrome Web Store。
- 插件真实登录态依赖浏览器 cookie 策略，跨站 cookie 在部分 Chrome 本地环境可能需要调整 `CHROME_EXTENSION_ORIGIN`、`SESSION_COOKIE_SAMESITE`、`SESSION_COOKIE_SECURE`。
- 产品图片/视频目前使用 URL 文本维护，暂不做文件上传。
- 产品库存字段尚未建模，报价和产品介绍中必须继续提醒业务员确认库存。
- 跟进提醒只做任务提示和话术草稿，暂不做浏览器通知、日历同步或 WhatsApp 自动提醒。
- 首页工作台是基础列表，暂不做分页、复杂筛选和批量操作。
- 当前目录不是 git 仓库，无法在本地创建真实 git tag。

## v0.1-demo - 2026-05-18

第一阶段可演示原型。

### Added

- Monorepo 基础结构：`apps/api`、`apps/web`、`apps/extension`、`packages/shared`。
- React + TypeScript + Vite Web 后台。
- Node.js + Express API 服务。
- PostgreSQL + Prisma schema。
- Chrome Extension Manifest V3。
- WhatsApp Web 右侧助手栏原型。
- 复制粘贴降级模式和插件识别状态：
  - 识别正常
  - 识别异常，已切换复制粘贴模式
  - 当前不是聊天窗口
  - WhatsApp 页面未打开
- AI 多语言回复接口 `POST /api/ai/reply`。
- 10 个 V1 高频 AI 场景识别：`price`、`moq`、`shipping`、`discount`、`sample`、`lead_time`、`product_proof`、`follow_up`、`payment`、`order_status`。
- 客户管理、产品资料库、报价助手的第一版原型。
- 安全边界：不接入 WhatsApp 官方 API、不自动群发、不自动发送、不绕过风控、AI 只生成草稿。
- 自动化测试覆盖 AI 回复接口、10 个高频场景、安全边界和基础工具函数。

### Known Issues

- 尚未完成账号隔离和数据库持久化闭环。
- Chrome 插件需手动加载构建产物。
- AI 回复为规则识别和模板草稿，未接入真实大模型服务。
- 当前目录不是 git 仓库，无法创建真实 git tag。

# WhatsApp AI 销售助手 V1

当前内测版本：`v0.2-alpha`

面向中国跨境电商业务员和外贸销售人员的 WhatsApp Web 销售辅助原型。V1 采用 Web 后台 + Chrome Extension 侧边栏 + Desktop 复制粘贴工作流，帮助业务员更快翻译客户消息、生成专业回复、管理客户标签、发送产品介绍、生成报价并设置跟进提醒。

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
- 报价助手
- 跟进提醒
- 首页工作台

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
GET    /api/customers?tag=高意向&stage=已报价&q=Mexico
GET    /api/customers/:id
POST   /api/customers
PATCH  /api/customers/:id
DELETE /api/customers/:id
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




# Changelog

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

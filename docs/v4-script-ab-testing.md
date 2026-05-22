# V4-K A/B 话术测试，轻量版

Current V4 release target: `v0.6-v4-growth-ops`. All AI outputs remain draft-only; no automatic WhatsApp sending, bulk sending, simulated send-button clicking, real payment, real logistics, full ERP, full finance system, automatic customer/supplier contact, store API sync, or WhatsApp account switching is introduced.

## 目标

V4-K 用于比较不同销售场景下的话术草稿表现。系统记�?A/B/C 话术版本、业务员手动复制或插入草稿的使用记录、人工标记的客户结果，并给出轻量统计�?
该模块不做复杂实验平台、不做自动营销、不自动发�?WhatsApp 消息、不自动群发、不模拟点击发送按钮�?
## 支持场景

- `first_reply`
- `price_reply`
- `too_expensive`
- `quote_follow_up`
- `payment_reminder`
- `sample_feedback_follow_up`
- `custom_confirm`
- `shipping_delay_explain`
- `after_sales_soothing`
- `reorder_follow_up`
- `dormant_reactivation`
- `new_product_recommendation`

## 数据模型

### ScriptExperiment

记录实验本身：组织、名称、场景、描述、状态、目标语言、客户阶段和创建人�?
状态：

- `draft`
- `active`
- `paused`
- `completed`
- `archived`

只有 `active` 实验会被 Chrome 插件主动展示�?
### ScriptVariant

记录 A/B/C 话术版本：标题、版本标签、内容、语言、语气和启用状态�?
同一个实验内 `versionLabel` 必须唯一。已有使用记录的版本删除时优先禁用，保留历史统计�?
### ScriptUsage

记录话术使用和结果：实验、版本、客户、业务员、场景、渠道、使用文本、结果、关联报�?订单/跟进任务和时间�?
系统只保存实际使用的话术草稿，不保存客户敏感消息�?
## Outcome 定义

- `used_draft`：业务员复制或插入过草稿�?- `customer_replied`：客户有回复，V4-K 先由业务员手动标记�?- `quote_created`：后续创建报价，可手动标记�?- `order_created`：后续创建订单，可手动标记�?- `payment_received`：后续订单付款状态为 paid / deposit_paid，可手动标记�?- `reorder_created`：后续产生复购订单或复购机会转化，可手动标记�?- `no_response`：业务员手动标记无回复�?- `manually_marked`：其他人工标记�?
## 统计指标

- 总使用次数；
- 各版本使用次数；
- 回复率；
- 报价转化率；
- 订单转化率；
- 付款转化率；
- 复购转化率；
- 无回复率�?- 最佳版本建议�?
`used_draft` �?0 时转化率返回空值。每个版本样本量不足 10 时，最佳版本只作为方向参考或不推荐�?
## AI 生成 A/B/C 版本

`POST /api/ai/script-experiments/generate-variants` 会生成：

- A：简短直接版�?- B：专业解释版�?- C：促单引导版�?
AI 只生成草稿，不会创建实验，除非后续由业务员手动保存。生成结果不能编造价格、库存、交期、运费、优惠或虚假紧迫感�?
## 页面入口

Web 后台入口：`A/B scripts`

功能�?
- 查询实验�?- 新建/编辑/归档实验�?- 新建/禁用话术版本�?- AI 生成 A/B/C 草稿�?- 复制并记录使用；
- 手动标记结果�?- 查看统计和样本量提醒�?
## Chrome 插件使用方式

1. 登录 Web 后台�?2. 打开 `https://web.whatsapp.com`�?3. 在侧边栏找到 `A/B Script Test`�?4. 刷新 active 实验�?5. 选择实验和版本�?6. 点击 `Copy + record` �?`Insert + record`�?7. 业务员人工确认后手动发�?WhatsApp 消息�?8. 后续手动标记客户是否回复、是否报价、是否下单或无回复�?
插件不会自动发�?WhatsApp 消息，不会自动群发，也不会点击发送按钮�?
## 权限与隔�?
- `owner/manager` 可管理组织实验和查看团队统计�?- `sales` 可使�?active 组织实验、记录自己客户的使用、标记自己可访问客户的结果�?- `support` 可使用授权场景下�?active 实验和标记自己处理的结果�?- 跨组�?experimentId、variantId、usageId 会被拒绝�?- customerId 必须属于当前用户可访问范围�?
## 审计

以下操作写入 AuditLog 或业务使用记录：

- 创建/更新/归档实验�?- 创建/更新/禁用版本�?- 记录使用�?- 标记结果�?- AI 生成 A/B/C 版本�?
## 安全边界

- 不接�?WhatsApp 官方 API�?- 不自动发�?WhatsApp 消息�?- 不自动群发；
- 不模拟点击发送按钮；
- 不自动轰炸客户；
- 不自动判定客户结果；
- 所有话术都是草稿；
- 业务员必须手动确认后发送；
- 不导出密钥、token、session、cookie �?`.env` 内容�?
## 已知限制

- 暂不做统计显著性检验�?- 自动归因下游报价/订单/付款/复购转化暂不覆盖人工标记�?- 导入导出实验和话术版本是后续 V4-A 扩展项�?- 插件只展�?active 实验，不提供完整实验编辑能力�?## V4-M Brand / Store Link

A/B script variant generation accepts an optional `brandId`. When supplied, brand rules are added to the generation context and the response returns `brandUsed`, `brandRulesUsed`, `knowledgeUsed` and `riskWarnings`. This helps teams create variants that fit a specific brand/store without mixing policies across brands.

Brand context does not create experiments automatically unless the user explicitly saves the generated drafts. It does not send messages, bulk-send, auto-mark outcomes, switch WhatsApp accounts, or call store APIs.



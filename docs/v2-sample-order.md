# V2-D 样品单管理

## 用途

样品单用于记录客户从询问样品、样品报价、付款、发货、签收反馈到转大货跟进的销售流程。它是销售辅助记录和话术草稿工具，不是支付系统、物流系统或完整订单系统。

## 状态说明

付款状态：

- `unpaid`：未付款
- `paid`：已付款
- `refunded`：已退款
- `deducted`：样品费已抵扣

发货状态：

- `pending`：待处理
- `preparing`：备货中
- `shipped`：已发货
- `delivered`：已签收
- `delayed`：延迟

反馈状态：

- `pending`：待反馈
- `satisfied`：满意
- `unsatisfied`：不满意
- `converted_to_bulk`：已转大货
- `no_response`：未回复

## 后台使用

1. 登录 Web 后台。
2. 进入左侧“样品单”。
3. 选择客户，可选关联产品。
4. 填写样品名称、样品费、运费、币种、付款状态、发货状态、物流单号、反馈状态、预计发货日、预计签收日和备注。
5. 点击保存。
6. 在客户详情右侧面板中可以看到该客户的样品单记录，也可以快速新增样品单。

样品单列表支持搜索客户名、样品名、物流单号，并按付款状态、发货状态和反馈状态筛选。

## 侧边栏使用

1. 打开 WhatsApp Web，确认侧边栏已经识别 Web 后台登录态。
2. 先保存当前客户。
3. 可选择当前产品。
4. 在“样品单”区填写样品信息。
5. 点击“保存样品单”。
6. 选择样品话术场景：
   - `sample_quote`：样品报价
   - `sample_payment_reminder`：付款提醒
   - `sample_shipped`：发货通知
   - `sample_feedback_follow_up`：签收反馈跟进
   - `sample_to_bulk_order`：转大货引导
7. 点击“生成样品话术”。
8. 复制或插入 WhatsApp 输入框后，由业务员人工确认并手动发送。

## 话术安全边界

- 样品话术只生成草稿，不自动发送 WhatsApp 消息。
- 不编造样品费、运费、交期、付款方式、样品费抵扣规则或物流时效。
- 不承诺样品费一定可抵扣。
- 不承诺一定今天发货。
- 不承诺物流一定按时到达。
- 涉及付款时必须提醒业务员确认收款账户、付款方式和手续费。
- 涉及发货时必须提醒业务员确认物流单号、物流方式和物流时效。

## 联动

- 跟进提醒：侧边栏可将样品反馈话术预填到“设置跟进”区域，默认使用预计签收日或 7 天后，仍需业务员手动保存提醒。
- 意向评分：有样品单、样品已付款、样品签收满意、样品转大货会提高客户意向分；样品无反馈会轻微减分。
- 知识库：样品报价可参考报价规则，付款提醒可参考付款方式，发货通知可参考物流政策，反馈跟进可参考售后政策，但知识库不能让系统编造费用、交期、付款账户或物流时效。

## 已知限制

- V2-D 不做真实文件上传、在线支付、退款、物流 API 查询、订单履约和财务利润。
- 样品费抵扣规则暂未结构化建模，需要业务员在话术发送前人工确认。
- 产品详情页尚未独立建设，关联产品下的样品单列表暂不单独展示。

## v0.4-v2-sales-enhancement Release Note

This module is included in `v0.4-v2-sales-enhancement`. V2 keeps the same safety boundary: no WhatsApp official API, no automatic WhatsApp sending, no bulk sending, no simulated send-button clicks, and all AI/template output is draft-only. Salespeople must manually confirm price, inventory, lead time, shipping, payment, logistics, certificate, after-sales, and policy details before sending. V2 does not add pricing, payment, team/role/department permissions, finance, purchasing prediction, boss dashboard, or a full order system. The next recommended direction is V3 team collaboration.

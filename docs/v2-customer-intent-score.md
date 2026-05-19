# V2-C 客户意向评分

客户意向评分用于把客户标签、销售阶段、报价记录、跟进任务、聊天摘要、备注和意向产品中的信号转成一个可解释的销售优先级。它帮助业务员判断谁应该优先跟进，但不代表客户一定成交。

V2-C 只做规则评分，不做机器学习、成交概率预测、收费、支付、团队权限、老板驾驶舱、财务利润或复杂订单系统。

## 输出字段

```json
{
  "customerId": "customer_123",
  "intentScore": 85,
  "intentLevel": "high",
  "intentReasons": ["+30 标签为高意向", "+25 销售阶段为已报价"],
  "recommendedAction": "客户意向较高，建议优先跟进，确认价格、运费、交期或付款方式，推动客户下单。",
  "riskWarnings": [
    "意向评分仅作辅助，不代表客户一定成交。",
    "不要因评分高而自动发送消息，所有跟进都必须由业务员手动确认。",
    "涉及价格、库存、交期、运费、付款仍需业务员确认。"
  ]
}
```

## 分数等级

- `low`：0 - 39
- `medium`：40 - 69
- `high`：70 - 100

分数最低为 0，最高为 100。

## 评分规则

标签：

- `高意向`：+30
- `已报价`：+15
- `待付款`：+35
- `老客户`：+10
- `需要跟进`：+10
- `无效客户`：-60

销售阶段：

- `已沟通需求`：+10
- `已推荐产品`：+15
- `已报价`：+25
- `待付款`：+40
- `已成交`：+20
- `待复购`：+20
- `无效客户`：-60

报价记录：

- 有报价记录：+15
- 最近 3 天内有报价记录：+20
- 报价数量不少于 2 条：+10

跟进任务：

- 有 pending 跟进任务：+10
- 今日待跟进：+15
- 逾期未跟进 1-3 天：-10
- 逾期未跟进超过 3 天：-20
- 已完成跟进任务不少于 2 条：+10

关键词：

- `price` / `价格` / `cuánto` / `precio`：+10
- `MOQ` / `起订量`：+10
- `shipping` / `freight` / `运费` / `envío`：+15
- `delivery` / `lead time` / `交期` / `entrega`：+15
- `payment` / `PayPal` / `bank transfer` / `付款`：+25
- `address` / `地址` / `city` / `ciudad`：+25
- `sample` / `样品` / `muestra`：+15
- `logo` / `packaging` / `OEM` / `ODM` / `定制`：+15
- `order` / `PI` / `invoice`：+25

减分关键词：

- `no need` / `不需要` / `not interested`：-30
- `too expensive` 且没有后续报价动作：-15
- `later` / `think about it` / `考虑一下`：-10
- `nextFollowUpAt` 逾期超过 7 天：-20

## 推荐动作

- `high`：客户意向较高，建议优先跟进，确认价格、运费、交期或付款方式，推动客户下单。
- `medium`：客户有一定兴趣，建议补充产品资料、确认数量和收货城市，再进行报价。
- `low`：客户意向较低，建议先了解需求，不要投入过多人工时间。
- 无效客户：该客户可能无效，建议减少跟进或标记为无效客户。

## API

```text
GET  /api/customers/:id/intent
POST /api/customers/:id/recalculate-intent
GET  /api/customers?sort=intentScore
GET  /api/customers?intentLevel=high
GET  /api/dashboard/high-intent-customers
```

所有接口都要求登录，并按当前用户隔离。不能通过 `customerId` 计算或查看其他用户的客户意向。

## Web 后台

- 客户列表显示意向分和 `low / medium / high` 等级。
- 客户列表支持按意向分排序，也支持筛选 high/medium/low。
- 客户详情显示评分原因、推荐动作和“重新计算”按钮。
- 首页工作台展示高意向客户 Top 10。

## Chrome 插件侧边栏

侧边栏客户信息区显示：

- 意向分；
- 意向等级；
- 推荐动作。

如果客户尚未保存，侧边栏提示“保存客户后可计算意向分”。推荐动作只作为销售建议，不会自动发送 WhatsApp 消息。

## 安全边界

- 不接入 WhatsApp 官方 API。
- 不自动发送 WhatsApp 消息。
- 不自动群发。
- 不模拟点击 WhatsApp 发送按钮。
- 意向评分仅作辅助，不代表客户一定成交。
- 不要因评分高而自动发送消息。
- 涉及价格、库存、交期、运费、付款仍需业务员确认。

## 后续可升级

- 产品介绍/素材发送使用日志。
- 更细的报价转化规则。
- 更复杂的时间衰减。
- 可解释的多维度评分面板。
- 但 V2-C 保持规则评分，不引入机器学习或老板驾驶舱。

## v0.4-v2-sales-enhancement Release Note

This module is included in `v0.4-v2-sales-enhancement`. V2 keeps the same safety boundary: no WhatsApp official API, no automatic WhatsApp sending, no bulk sending, no simulated send-button clicks, and all AI/template output is draft-only. Salespeople must manually confirm price, inventory, lead time, shipping, payment, logistics, certificate, after-sales, and policy details before sending. V2 does not add pricing, payment, team/role/department permissions, finance, purchasing prediction, boss dashboard, or a full order system. The next recommended direction is V3 team collaboration.

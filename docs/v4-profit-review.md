# V4-H 利润与成本复盘，轻量�?

Current V4 release target: `v0.6-v4-growth-ops`. All AI outputs remain draft-only; no automatic WhatsApp sending, bulk sending, simulated send-button clicking, real payment, real logistics, full ERP, full finance system, automatic customer/supplier contact, store API sync, or WhatsApp account switching is introduced.
V4-H 在订单中心基础上增加轻量成本记录和预计毛利复盘，帮助业务员、主管和 owner 判断订单是否低毛利、亏损或成本未确认�?
## 目标

- 为订单记录基础成本�?- 计算预计总成本、毛利和毛利率�?- 展示订单、产品、客户、业务员维度的轻量利润参考�?- 对低毛利、亏损、成本未确认、币种不一致给出风险提醒�?- 生成 AI 利润复盘建议，但不做财务、会计或税务结论�?
## 成本字段

`OrderCost` 支持以下字段�?
- `productCost`：商品成本；
- `packagingCost`：包装成本；
- `domesticShipping`：国内运费；
- `internationalShipping`：国际运费；
- `paymentFee`：支付手续费�?- `platformFee`：平台费用；
- `refundAmount`：退款金额，V4-H 暂计入成本；
- `reshipCost`：补发成本；
- `otherCost`：其他成本；
- `costConfirmed`：成本是否已由人工确认�?
V4-H 只保�?URL 和结构化业务数据，不处理真实支付、银行流水、税务或会计凭证�?
## 计算公式

收入�?
```text
revenue = Order.amount
```

总成本：

```text
totalCost =
productCost
+ packagingCost
+ domesticShipping
+ internationalShipping
+ paymentFee
+ platformFee
+ refundAmount
+ reshipCost
+ otherCost
```

毛利�?
```text
grossProfit = revenue - totalCost
```

毛利率：

```text
grossMargin = grossProfit / revenue * 100
```

空成本按 0 参与计算，但系统会提示“成本未填写，利润可能虚高”。如果订单金额为空或小于等于 0，则不计算毛利和毛利率�?
## 低毛�?/ 亏损规则

- `grossMargin < 0`：亏损订单，`riskLevel=high`�?- `grossMargin < 10`：低毛利订单，`riskLevel=medium`�?- 成本字段全部为空：提示成本未填写�?- 订单币种和成本币种不一致：不做汇率换算，提示人工换算�?
## API

- `GET /api/orders/:id/cost`
- `PUT /api/orders/:id/cost`
- `PATCH /api/orders/:id/cost/confirm`
- `DELETE /api/orders/:id/cost`
- `GET /api/profit/orders`
- `GET /api/profit/summary`
- `GET /api/profit/by-product`
- `GET /api/profit/by-customer`
- `GET /api/profit/by-salesperson`
- `POST /api/ai/profit-review`

## 权限规则

- `owner`：全部利润权限�?- `manager`：可查看团队利润、编辑成本、确认成本、导出普通利润数据、生�?AI 复盘；默认不能删除成本�?- `sales`：默认只能查看自己负责或可访问订单的利润摘要，不能编�?确认成本�?- `support`：默认不能查看利润和成本�?
新增权限 key�?
- `profit.viewOwn`
- `profit.viewTeam`
- `profit.editCost`
- `profit.confirmCost`
- `profit.deleteCost`
- `profit.export`
- `profit.aiReview`

## Web 页面

后台新增 `Profit review`�?
- 利润总览�?- 订单利润列表�?- 订单成本编辑�?- 成本确认�?- 产品利润分析�?- 客户利润分析�?- 业务员利润分析；
- AI 利润复盘�?
## AI 利润复盘

`POST /api/ai/profit-review` 返回�?
- `reviewSummary`
- `findings`
- `riskWarnings`
- `recommendedActions`
- `missingInfo`
- `createdLogId`

AI 复盘只做经营建议，不编造成本、不编造利润、不做税务建议、不做会计结论。成本未确认、币种不一致或数据不足时必须提示风险�?
## 审计

以下操作写入审计�?
- 创建成本�?- 修改成本�?- 确认成本�?- 删除成本�?- 修改退款金额；
- 修改补发成本�?- 生成 AI 利润复盘�?
删除成本必须�?`confirm=true`，并记录 high risk 审计日志�?
## 安全边界

- 不接�?WhatsApp 官方 API�?- 不自动发�?WhatsApp 消息�?- 不自动群发；
- 不模拟点击发送按钮；
- 不做完整财务系统�?- 不做会计报表�?- 不做税务申报�?- 不做自动对账�?- 不做真实支付�?- 不自动确认真实成本；
- 不自动确认收款；
- 利润数据仅作为销售经营参考�?
## 已知限制

- 不做汇率换算�?- 不做利润 CSV 导入导出完整闭环，本项记录在 Known Issues�?- 不对接支付、银行、物流或会计系统�?- Chrome 侧边栏不展示完整成本明细，敏感利润操作请�?Web 后台完成�?## V4-I Reorder Operations Linkage

V4-I can use confirmed healthy gross margin as a lightweight positive signal for high-value reorder opportunities. Low-margin or unresolved after-sales orders should not trigger discount-heavy reorder scripts. Profit data remains an operational reference only and must not be treated as accounting, tax, or payment proof.

## V4-J After-sales Cost Link

After-sales final solutions may optionally sync refund, reship, or compensation amounts into OrderCost after explicit confirmation. This is an operational estimate only and does not execute refunds, reshipments, accounting, tax, or payment reconciliation.

## V4-L Supplier Cost Reference Link

Supplier quotes can be used as product-cost references for an order. Applying a supplier quote to `OrderCost` requires `confirm=true`, writes audit logs, and clears cost confirmation because supplier quotes are references only. The system does not confirm the true cost, create purchase orders, contact suppliers, or make supplier payments.




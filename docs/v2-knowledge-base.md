# V2-A AI 公司知识库

AI 公司知识库用于把公司介绍、产品卖点、物流政策、售后政策、报价规则、付款方式、禁用表达和 FAQ 维护成结构化内容。AI 回复、产品介绍和报价话术会把命中的知识作为草稿上下文引用，但不会自动发送 WhatsApp 消息。

## 分类说明

- `company_intro`：公司介绍、主营品类、服务优势。
- `product_selling_points`：产品卖点，可选择关联具体产品。
- `logistics`：可发国家、常用物流、时效说明和需要确认的信息。
- `after_sales_policy`：售后规则、质检、退换货边界。
- `quote_rules`：报价有效期、MOQ、阶梯报价规则、折扣边界。
- `payment_methods`：支持的付款方式和收款确认规则。
- `forbidden_expressions`：禁用表达，例如 `lowest price`、`100% guaranteed delivery`、`always in stock`。
- `faq`：其他高频问答。

## 语言

支持 `zh`、`en`、`es`、`pt`、`ar`、`fr`、`ru`、`other`。AI 检索时优先匹配目标语言，同时会回退到 `zh` 和 `other`。

## 如何添加

1. 登录 Web 后台。
2. 打开左侧导航 `知识库`。
3. 点击新建，填写标题、分类、语言和内容。
4. 如果是某个产品专属卖点，可选择关联产品。
5. 勾选 `启用并允许 AI 引用` 后保存。

## 示例数据

公司介绍：

```text
title: Company intro
category: company_intro
language: en
content: We are a cross-border ecommerce supplier. Please confirm model, quantity, destination city, and delivery requirement before final quotation.
```

物流政策：

```text
title: Mexico shipping policy
category: logistics
language: en
content: We can ship to Mexico, but freight and delivery time must be confirmed by destination city, quantity, and shipping method.
```

售后政策：

```text
title: After-sales rule
category: after_sales_policy
language: en
content: For wholesale orders, after-sales handling depends on product inspection result, photos or videos, and order record. Do not promise free return for all orders.
```

报价规则：

```text
title: Quote validity
category: quote_rules
language: en
content: Quotation should include quantity, currency, MOQ, shipping inclusion, lead time, and validity period. Price must be confirmed by salesperson before sending.
```

付款方式：

```text
title: Payment confirmation
category: payment_methods
language: en
content: PayPal or bank transfer may be available, but account details and fees must be confirmed by salesperson before sending.
```

禁用表达：

```text
title: Forbidden sales promises
category: forbidden_expressions
language: en
content:
lowest price
100% guaranteed delivery
free return for all wholesale orders
always in stock
```

## AI 回复如何引用

`POST /api/ai/reply` 支持：

```json
{
  "customerMessage": "Can you ship to Mexico?",
  "targetLanguage": "English",
  "scenario": "shipping",
  "productId": "optional-product-id",
  "useKnowledgeBase": true
}
```

返回会包含：

```json
{
  "knowledgeUsed": ["Mexico shipping policy"],
  "riskWarnings": [
    "AI 仅生成建议内容，请确认价格、库存、交期、付款、退款信息后再发送。",
    "涉及运费/物流，但物流信息不足，请业务员确认国家、城市、运输方式、运费或物流单号，不得编造物流状态。"
  ]
}
```

如果没有命中知识库，`riskWarnings` 会提醒：

```text
未找到相关知识库内容，请业务员确认公司政策、价格、库存、交期和售后规则。
```

## 产品介绍和报价

- 产品介绍会参考 `product_selling_points`、`company_intro` 和 `faq`。
- 报价话术会参考 `quote_rules`、`payment_methods`、`logistics` 和 `faq`。
- 如果知识库和产品字段冲突，系统不会自动下结论，只会提示业务员确认。

## 安全边界

- 知识库只增强草稿，不自动发送 WhatsApp 消息。
- 不接入 WhatsApp 官方 API。
- 不自动群发、不批量发送、不模拟点击发送按钮。
- 不编造价格、库存、交期、运费、付款状态、物流状态或售后承诺。
- 涉及价格、库存、交期、运费、付款、售后时，业务员必须人工确认后再发送。


## v0.4-v2-sales-enhancement Release Note

This module is included in `v0.4-v2-sales-enhancement`. V2 keeps the same safety boundary: no WhatsApp official API, no automatic WhatsApp sending, no bulk sending, no simulated send-button clicks, and all AI/template output is draft-only. Salespeople must manually confirm price, inventory, lead time, shipping, payment, logistics, certificate, after-sales, and policy details before sending. V2 does not add pricing, payment, team/role/department permissions, finance, purchasing prediction, boss dashboard, or a full order system. The next recommended direction is V3 team collaboration.

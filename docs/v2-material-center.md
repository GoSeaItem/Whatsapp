# V2-B 素材中心

素材中心用于维护销售过程中常用的产品图片、视频、目录、尺码表、买家秀、工厂视频、物流截图、付款说明、证书和其他销售素材。V2-B 只保存 URL 文本，不做真实文件上传、对象存储或素材批量发送。

所有素材说明只生成草稿，业务员必须人工确认后复制或插入 WhatsApp 输入框并手动发送。系统不会接入 WhatsApp 官方 API，不会自动发送 WhatsApp 消息，不会自动群发，也不会模拟点击发送按钮。

## 数据模型

`Material` 字段：

- `id`
- `title`
- `type`
- `url`
- `description`
- `language`
- `productId`，可选
- `tags`
- `ownerId`
- `createdAt`
- `updatedAt`

所有素材按当前登录用户 `ownerId` 隔离。创建素材时后端自动写入 `ownerId`；列表、详情、更新、删除和生成素材说明时都会按 `ownerId` 过滤。传入 `productId` 时，后端会校验该产品属于当前登录用户。

## 素材类型

- `image`：产品图、实拍图。
- `video`：产品展示视频。
- `catalog`：产品目录、款式册。
- `size_chart`：尺码表。
- `buyer_show`：买家秀、真实效果参考。
- `factory_video`：工厂视频、生产参考。
- `shipping_proof`：发货截图、物流参考。
- `payment_proof`：付款说明、收款账户参考。
- `certificate`：证书、资质材料。
- `other`：其他素材。

## 语言

支持 `zh`、`en`、`es`、`pt`、`ar`、`fr`、`ru`、`other`。侧边栏会尝试按当前客户语言筛选素材；没有匹配时业务员仍可搜索和手动选择。

## 如何维护素材

1. 登录 Web 后台。
2. 进入导航栏 `素材中心`。
3. 点击新建或选择已有素材。
4. 填写标题、类型、URL、描述、语言和标签。
5. 如素材只适用于某个产品，可选择关联产品。
6. 保存后，该素材只对当前登录账号可见。

`image` 类型会在后台显示图片预览。其他类型显示链接，业务员可点击新窗口打开。

## 如何在侧边栏发素材

1. 先在 Web 后台登录。
2. 打开 `https://web.whatsapp.com/`。
3. 确认侧边栏显示当前登录用户。
4. 在侧边栏的素材区域搜索素材，或按类型筛选。
5. 如已选择产品，侧边栏会优先按该产品筛选素材。
6. 选择素材后点击 `发素材`。
7. 系统生成素材说明草稿，业务员可复制或插入输入框。
8. 最终发送动作由业务员人工确认。

## 素材说明生成规则

- `image` / `buyer_show`：说明这是实拍图、买家秀或真实效果参考。
- `video` / `factory_video`：说明这是产品展示视频、工厂视频或生产参考。
- `catalog`：说明这是产品目录，可查看更多款式。
- `size_chart`：说明这是尺码表，请客户确认尺码。
- `certificate`：说明这是证书或资质材料，并提醒确认证书真实性。
- `shipping_proof`：说明这是发货/物流参考，不承诺具体时效。
- `payment_proof`：说明这是付款/收款参考，必须确认收款账户。
- `other`：生成通用素材说明。

## 知识库联动

如果 V2-A 知识库中存在启用的相关内容，素材说明会轻量引用：

- 产品图、买家秀、目录、尺码表：参考 `product_selling_points`、`company_intro`、`faq`。
- 证书：参考 `company_intro`、`faq`。
- 物流截图：参考 `logistics`、`faq`。
- 付款说明：参考 `payment_methods`、`quote_rules`、`faq`。

知识库只作为草稿上下文，不能让系统编造素材不存在的信息。如果知识库缺失，系统会提醒业务员确认公司政策、价格、库存、交期和售后规则。

## 安全边界

- 不编造价格。
- 不编造库存。
- 不编造交期。
- 不编造证书真实性。
- 不承诺 100% 到货。
- 不承诺所有订单免费退换。
- 不自动发送 WhatsApp 消息。
- 不自动群发。
- 不模拟点击 WhatsApp 发送按钮。
- `payment_proof` 必须提醒业务员确认收款账户、付款方式和手续费。
- `shipping_proof` 必须提醒业务员确认物流方式、目的地和时效。

## API

```text
GET    /api/materials?type=image&language=en&productId=product_123&q=summer&tag=real
GET    /api/materials/:id
POST   /api/materials
PATCH  /api/materials/:id
DELETE /api/materials/:id
POST   /api/materials/:id/intro
```

请求示例：

```json
{
  "title": "Blue Dress real picture",
  "type": "image",
  "url": "https://example.com/blue-dress.jpg",
  "description": "Real product picture for wholesale customers",
  "language": "en",
  "productId": "product_123",
  "tags": ["real", "summer", "wholesale"]
}
```

素材说明响应示例：

```json
{
  "materialId": "material_123",
  "introText": "Here are real product pictures for Blue Dress real picture. You can check it here: https://example.com/blue-dress.jpg. This is only a draft; I will verify the material and key details before sending.",
  "knowledgeUsed": ["Blue Dress selling points"],
  "riskWarnings": [
    "AI 仅生成建议内容，请确认价格、库存、交期、付款信息后再发送。",
    "素材说明仅作为草稿，不会自动发送 WhatsApp 消息。",
    "不允许系统编造价格、库存、交期、证书真实性、物流时效、付款账户或售后承诺。"
  ]
}
```

## 后续升级

- 文件上传和对象存储。
- 素材中心批量导入。
- 图片/视频真实内容审核。
- 素材分组、收藏和常用排序。
- 团队素材库和审批流程。

## v0.4-v2-sales-enhancement Release Note

This module is included in `v0.4-v2-sales-enhancement`. V2 keeps the same safety boundary: no WhatsApp official API, no automatic WhatsApp sending, no bulk sending, no simulated send-button clicks, and all AI/template output is draft-only. Salespeople must manually confirm price, inventory, lead time, shipping, payment, logistics, certificate, after-sales, and policy details before sending. V2 does not add pricing, payment, team/role/department permissions, finance, purchasing prediction, boss dashboard, or a full order system. The next recommended direction is V3 team collaboration.

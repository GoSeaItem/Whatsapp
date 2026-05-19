# V2-E 定制需求管理

V2-E 用于记录客户 Logo、包装、颜色、尺寸、材质、OEM/ODM 等定制需求，并生成可复制或插入 WhatsApp 输入框的话术草稿。该模块只做销售辅助记录，不做真实生产系统、订单系统或支付系统。

## 数据模型

`CustomRequest` 字段：

- `customerId`：必填，创建时必须属于当前登录用户。
- `productId`：可选，传入时必须属于当前登录用户。
- `requestType`：`logo`、`packaging`、`color`、`size`、`material`、`oem`、`odm`、`mixed`、`other`。
- `logoRequired` / `packagingRequired`：是否需要 Logo 或包装定制。
- `colorRequirement` / `sizeRequirement` / `materialRequirement`：颜色、尺寸、材质要求。
- `quantity` / `moq` / `sampleFee` / `sampleLeadTime` / `bulkLeadTime`：数量、MOQ、打样费、打样周期和大货周期。
- `files`：文件 URL 数组，例如 Logo、包装图、设计稿链接。V2-E 不做真实文件上传。
- `status`：`draft`、`waiting_customer_confirm`、`sample_making`、`sample_confirmed`、`bulk_production`、`closed`、`cancelled`。
- `ownerId`：当前登录用户，用于个人账号隔离。

## API

所有 API 都需要登录 cookie，并按当前用户隔离：

```text
GET    /api/custom-requests
POST   /api/custom-requests
GET    /api/custom-requests/:id
PATCH  /api/custom-requests/:id
DELETE /api/custom-requests/:id
PATCH  /api/custom-requests/:id/status
POST   /api/custom-requests/:id/script
```

列表支持：

- `customerId`
- `productId`
- `requestType`
- `status`
- `q`：搜索客户名、产品名、备注或完整文件 URL。

## Web 后台

导航入口：`Custom / 定制需求`。

支持能力：

- 新增、编辑、删除定制需求。
- 按定制类型和状态筛选。
- 搜索客户、产品、备注和文件 URL。
- 在客户详情右侧记录区查看该客户定制需求。
- 生成定制确认、补充文件、MOQ、打样费、打样周期、大货周期和风险确认话术。

## Chrome Extension 侧边栏

侧边栏入口：`定制`。

当前客户已保存时，可以：

- 创建定制需求。
- 选择产品。
- 填写 Logo、包装、颜色、尺寸、材质、数量、MOQ、打样费、周期、文件 URL 和备注。
- 生成定制话术草稿。
- 复制或插入 WhatsApp 输入框。

当前客户未保存时，应先保存客户后再创建定制需求。插件不会自动发送 WhatsApp 消息。

## 定制话术

支持场景：

- `custom_confirm`：确认定制需求。
- `custom_request_files`：提醒客户补充 Logo、包装图或设计稿。
- `custom_moq_explain`：解释定制 MOQ。
- `custom_sample_fee`：解释打样费。
- `custom_sample_lead_time`：说明打样周期。
- `custom_bulk_lead_time`：说明大货周期。
- `custom_risk_confirm`：提醒定制确认后的修改和售后边界。

话术会尽量结构化列出定制类型、产品、Logo/包装要求、颜色/尺寸/材质、数量、MOQ、打样费、周期和需要客户补充的信息。

## 安全边界

- 不接入 WhatsApp 官方 API。
- 不自动发送 WhatsApp 消息。
- 不自动群发。
- 不模拟点击 WhatsApp 发送按钮。
- 不做真实生产排期。
- 不做订单系统。
- 不做支付系统。
- 不编造 MOQ、打样费、打样周期、大货周期、付款方式或定制能力。
- 不承诺客户文件一定可以直接生产。
- 不承诺定制产品可无条件退换。
- 缺少 Logo 文件、包装图、MOQ、打样费或周期时，必须提醒业务员确认。

## 联动

跟进提醒：

- 定制需求创建后可创建客户确认提醒。
- `waiting_customer_confirm` 可用于提醒客户补充确认。
- `sample_making` 可用于打样完成提醒。
- `sample_confirmed` 可用于大货报价或生产确认提醒。

客户意向评分：

- 有定制需求会加分。
- Logo、包装、OEM、ODM、mixed 定制会加分。
- 较大数量会加分。
- `waiting_customer_confirm` 和 `sample_confirmed` 会加分。
- `cancelled` 会减分。

这些联动只做销售建议，不会自动发送消息，也不代表客户一定成交。

## 后续可升级

- 文件上传和对象存储。
- 设计稿确认流程。
- 定制样品进度节点。
- 更细的定制 MOQ / 打样费规则。
- 与真实订单系统或生产系统的人工审核集成。

## v0.4-v2-sales-enhancement Release Note

This module is included in `v0.4-v2-sales-enhancement`. V2 keeps the same safety boundary: no WhatsApp official API, no automatic WhatsApp sending, no bulk sending, no simulated send-button clicks, and all AI/template output is draft-only. Salespeople must manually confirm price, inventory, lead time, shipping, payment, logistics, certificate, after-sales, and policy details before sending. V2 does not add pricing, payment, team/role/department permissions, finance, purchasing prediction, boss dashboard, or a full order system. The next recommended direction is V3 team collaboration.

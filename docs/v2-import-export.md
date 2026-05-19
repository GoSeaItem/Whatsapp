# V2-F 数据导入导出

V2-F 用于把历史 CSV 表格导入当前账号，也可以把当前账号的数据导出为 CSV 做分析。该模块只做数据迁移和数据备份辅助，不接入 WhatsApp 官方 API，不自动发送 WhatsApp 消息，不自动群发，不模拟点击发送按钮。

## 支持的数据类型

- Customers：客户
- Products：产品
- KnowledgeBase：AI 公司知识库
- Materials：素材中心
- SampleOrders：样品单
- CustomRequests：定制需求

V2-F 只支持 CSV，不支持 Excel、复杂字段映射器或跨系统同步。

## API

导出：

- `GET /api/export/customers`
- `GET /api/export/products`
- `GET /api/export/knowledge-base`
- `GET /api/export/materials`
- `GET /api/export/sample-orders`
- `GET /api/export/custom-requests`

模板：

- `GET /api/import/templates/customers`
- `GET /api/import/templates/products`
- `GET /api/import/templates/knowledge-base`
- `GET /api/import/templates/materials`
- `GET /api/import/templates/sample-orders`
- `GET /api/import/templates/custom-requests`

导入：

- `POST /api/import/customers`
- `POST /api/import/products`
- `POST /api/import/knowledge-base`
- `POST /api/import/materials`
- `POST /api/import/sample-orders`
- `POST /api/import/custom-requests`

导入使用 `multipart/form-data` 上传 `.csv` 文件，可加查询参数：

- `dryRun=true`：只校验，不写入数据库。
- `dryRun=false`：校验通过后写入数据库。
- `skipDuplicates=true`：客户按 `whatsappNumber` 跳过重复，产品按 `sku` 跳过重复。

## Web 后台入口

Web 后台导航新增 `Import / Export`。

页面支持：

- 选择数据类型；
- 下载 CSV 模板；
- 上传 CSV 文件；
- dryRun 预览；
- 查看总行数、可导入行数、跳过行数、失败行数和每行错误；
- 确认导入；
- 按数据类型导出当前账号数据。

## CSV 字段

### Customers

必填：`name`

可选：`whatsappNumber`、`country`、`language`、`tags`、`stage`、`interestedProduct`、`latestSummary`、`nextFollowUpAt`、`notes`

规则：

- `tags` 使用 `|` 分隔。
- `nextFollowUpAt` 必须是可解析日期，建议 ISO 字符串。
- 同一用户下 `whatsappNumber` 重复时默认跳过。

### Products

必填：`name`

可选：`sku`、`category`、`images`、`videos`、`colors`、`sizes`、`material`、`moq`、`suggestedPrice`、`minPrice`、`leadTime`、`sellingPoints`、`introEn`、`introEs`、`introPt`、`introAr`

规则：

- `images`、`videos`、`colors`、`sizes`、`sellingPoints` 使用 `|` 分隔。
- `moq` 必须是整数。
- `suggestedPrice`、`minPrice` 必须是数字。
- 同一用户下 `sku` 重复时默认跳过。

### KnowledgeBase

必填：`title`、`category`、`content`

可选：`language`、`productSku`、`enabled`

规则：

- `category` 必须是支持的知识库分类。
- `language` 必须是支持语言，空值默认 `other`。
- `enabled` 支持 `true/false`。
- `productSku` 必须匹配当前登录用户自己的产品，否则该行报错。

### Materials

必填：`title`、`type`、`url`

可选：`description`、`language`、`productSku`、`tags`

规则：

- `type` 必须是支持的素材类型。
- `url` 必须以 `http://` 或 `https://` 开头。
- `tags` 使用 `|` 分隔。
- `productSku` 必须匹配当前登录用户自己的产品，否则该行报错。

### SampleOrders

必填：`customerName` 或 `customerWhatsappNumber`，以及 `sampleName`

可选：`productSku`、`sampleFee`、`shippingCost`、`currency`、`paymentStatus`、`shippingStatus`、`trackingNumber`、`feedbackStatus`、`expectedShipDate`、`expectedDeliveryDate`、`notes`

规则：

- 客户必须匹配当前登录用户自己的客户，否则该行报错。
- `productSku` 必须匹配当前登录用户自己的产品，否则该行报错。
- `sampleFee`、`shippingCost` 必须是数字。
- 状态字段必须是支持枚举。
- 日期字段必须可解析。

### CustomRequests

必填：`customerName` 或 `customerWhatsappNumber`，以及 `requestType`

可选：`productSku`、`logoRequired`、`packagingRequired`、`colorRequirement`、`sizeRequirement`、`materialRequirement`、`quantity`、`moq`、`sampleFee`、`sampleLeadTime`、`bulkLeadTime`、`files`、`status`、`notes`

规则：

- 客户必须匹配当前登录用户自己的客户，否则该行报错。
- `productSku` 必须匹配当前登录用户自己的产品，否则该行报错。
- `requestType`、`status` 必须是支持枚举。
- `files` 使用 `|` 分隔。
- `quantity`、`moq` 必须是整数；`sampleFee` 必须是数字。
- `logoRequired`、`packagingRequired` 支持 `true/false`。

## 安全边界

- 导入文件必须是 `.csv`。
- 文件大小限制为 5MB。
- 导入接口只接受 CSV 相关 MIME。
- `dryRun=true` 时不会写入数据库。
- 每条导入数据自动绑定当前登录用户。
- CSV 中的 `ownerId`、`createdBy`、`organizationId` 会被忽略。
- CSV 中的密码、token、secret、API key、session、cookie 等敏感字段会被忽略。
- 导出只包含当前登录用户自己的数据。
- 导出不包含密码、密钥、token、session、cookie、`.env` 或 OpenAI API Key。
- CSV 导出时，如果单元格以 `=`、`+`、`-`、`@` 开头，会在前面加 `'`，降低公式注入风险。

## 常见错误

- `customer not found for current user`：样品单或定制需求中的客户没有匹配到当前账号下的客户。
- `productSku not found for current user`：CSV 中的 `productSku` 不是当前账号下的产品。
- `field is required`：缺少必填字段。
- `must be a number`：数字字段填写了非数字。
- `must be a valid date`：日期字段无法解析。
- `is invalid`：枚举字段不在允许范围内。

## 不做内容

- 不支持 Excel。
- 不做复杂字段映射器。
- 不导出其他用户数据。
- 不导出密钥或环境变量。
- 不做收费、支付、团队/角色/部门权限、订单系统、财务利润或老板驾驶舱。
- 不自动发送 WhatsApp 消息，不自动群发，不模拟点击 WhatsApp 发送按钮。

## v0.4-v2-sales-enhancement Release Note

This module is included in `v0.4-v2-sales-enhancement`. V2 keeps the same safety boundary: no WhatsApp official API, no automatic WhatsApp sending, no bulk sending, no simulated send-button clicks, and all AI/template output is draft-only. Salespeople must manually confirm price, inventory, lead time, shipping, payment, logistics, certificate, after-sales, and policy details before sending. V2 does not add pricing, payment, team/role/department permissions, finance, purchasing prediction, boss dashboard, or a full order system. The next recommended direction is V3 team collaboration.

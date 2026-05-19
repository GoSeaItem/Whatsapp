import type { CustomerSummary, FollowUpSummary, ProductSummary } from "@wa-ai/shared";

export const demoCustomers: CustomerSummary[] = [
  {
    id: "demo-customer-1",
    name: "Amina Trading",
    whatsappNumber: "+971 50 000 0001",
    country: "UAE",
    language: "English",
    tags: ["高意向", "需要跟进"],
    stage: "已沟通需求",
    interestedProduct: "Bluetooth Speaker",
    latestSummary: "关注 500 件报价、MOQ 和交期。",
    nextFollowUpAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ownerId: "demo-owner",
    notes: "希望确认 500 件价格、交期和是否支持样品。",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "demo-customer-2",
    name: "Carlos Retail",
    whatsappNumber: "+52 55 0000 0002",
    country: "Mexico",
    language: "Spanish",
    tags: ["已报价", "待付款"],
    stage: "已报价",
    interestedProduct: "LED Desk Lamp",
    latestSummary: "已发送样品报价，等待确认付款方式。",
    nextFollowUpAt: null,
    ownerId: "demo-owner",
    notes: "价格敏感，关注样品费和运费。",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const demoProducts: ProductSummary[] = [
  {
    id: "demo-product-1",
    name: "Bluetooth Speaker",
    sku: "BT-100",
    category: "Audio",
    images: ["https://example.com/bt-100-front.jpg"],
    videos: [],
    colors: ["Black", "Blue"],
    sizes: ["Portable"],
    material: "ABS waterproof shell",
    moq: 100,
    suggestedPrice: "12.50",
    minPrice: "10.80",
    leadTime: "7-10 days",
    sellingPoints: ["Waterproof shell", "Portable design", "Long battery life"],
    introEn:
      "Hi, this is our BT-100 Bluetooth Speaker. It has a waterproof shell, portable design, and long battery life. MOQ is 100 pcs and lead time is usually 7-10 days.",
    introEs:
      "Hola, este es nuestro altavoz Bluetooth BT-100. Tiene carcasa impermeable, diseño portátil y batería de larga duración. El MOQ es de 100 piezas y el plazo suele ser de 7 a 10 días.",
    introPt: null,
    introAr: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "demo-product-2",
    name: "LED Desk Lamp",
    sku: "LED-220",
    category: "Home Office",
    images: ["https://example.com/led-220.jpg"],
    videos: [],
    colors: ["White", "Black"],
    sizes: ["Standard"],
    material: "Aluminum and ABS",
    moq: 200,
    suggestedPrice: "8.90",
    minPrice: "7.60",
    leadTime: "10-15 days",
    sellingPoints: ["Rechargeable", "Three light modes", "Compact packaging"],
    introEn:
      "Hi, this is our LED-220 rechargeable desk lamp. It supports three light modes and compact packaging, suitable for home office and gift channels.",
    introEs: null,
    introPt: null,
    introAr: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const demoFollowUps: FollowUpSummary[] = [
  {
    id: "demo-follow-up-1",
    customerId: "demo-customer-1",
    customerName: "Amina Trading",
    whatsappNumber: "+971 50 000 0001",
    tags: ["高意向", "需要跟进"],
    stage: "已沟通需求",
    taskType: "报价后跟进",
    remindAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    recommendedScript:
      "Hi, just checking if you had a chance to review the quotation. This is only a draft; please confirm price, stock, lead time, and shipping before sending.",
    status: "pending",
    ownerId: "demo-owner",
    createdAt: new Date().toISOString(),
    completedAt: null
  }
];

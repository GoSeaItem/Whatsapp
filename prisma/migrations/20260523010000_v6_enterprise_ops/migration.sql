CREATE TABLE "MultiChannelCustomer" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "customerId" TEXT,
  "primaryName" TEXT NOT NULL,
  "primaryChannel" TEXT NOT NULL DEFAULT 'whatsapp',
  "whatsappNumber" TEXT,
  "telegramHandle" TEXT,
  "wechatId" TEXT,
  "email" TEXT,
  "phoneCountry" TEXT,
  "phoneCountryCode" TEXT,
  "preferredLanguage" TEXT,
  "preferredCurrency" TEXT,
  "brandId" TEXT,
  "ownerId" TEXT,
  "assignedTo" TEXT,
  "tags" TEXT[],
  "metadata" JSONB,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MultiChannelCustomer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Department" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "parentId" TEXT,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Team" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "departmentId" TEXT,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "managerId" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Permission" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "scope" TEXT NOT NULL DEFAULT 'organization',
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConversationHistory" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "multiChannelCustomerId" TEXT,
  "customerId" TEXT,
  "channel" TEXT NOT NULL,
  "externalConversationId" TEXT,
  "direction" TEXT NOT NULL,
  "senderRole" TEXT NOT NULL,
  "messageText" TEXT,
  "language" TEXT,
  "translatedText" TEXT,
  "messageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConversationHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InteractionLog" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "multiChannelCustomerId" TEXT,
  "customerId" TEXT,
  "channel" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "summary" TEXT,
  "metadata" JSONB,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InteractionLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AIKeyUsageLog" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "aiProviderKeyId" TEXT,
  "provider" TEXT,
  "mode" TEXT,
  "model" TEXT,
  "requestSource" TEXT,
  "promptTokens" INTEGER NOT NULL DEFAULT 0,
  "completionTokens" INTEGER NOT NULL DEFAULT 0,
  "totalTokens" INTEGER NOT NULL DEFAULT 0,
  "success" BOOLEAN NOT NULL DEFAULT true,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AIKeyUsageLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MultiChannelCustomer_organizationId_idx" ON "MultiChannelCustomer"("organizationId");
CREATE INDEX "MultiChannelCustomer_customerId_idx" ON "MultiChannelCustomer"("customerId");
CREATE INDEX "MultiChannelCustomer_primaryChannel_idx" ON "MultiChannelCustomer"("primaryChannel");
CREATE INDEX "MultiChannelCustomer_whatsappNumber_idx" ON "MultiChannelCustomer"("whatsappNumber");
CREATE INDEX "MultiChannelCustomer_email_idx" ON "MultiChannelCustomer"("email");
CREATE INDEX "MultiChannelCustomer_brandId_idx" ON "MultiChannelCustomer"("brandId");
CREATE INDEX "MultiChannelCustomer_ownerId_idx" ON "MultiChannelCustomer"("ownerId");
CREATE INDEX "MultiChannelCustomer_assignedTo_idx" ON "MultiChannelCustomer"("assignedTo");
CREATE INDEX "MultiChannelCustomer_createdBy_idx" ON "MultiChannelCustomer"("createdBy");

CREATE UNIQUE INDEX "Department_organizationId_name_key" ON "Department"("organizationId", "name");
CREATE INDEX "Department_organizationId_idx" ON "Department"("organizationId");
CREATE INDEX "Department_parentId_idx" ON "Department"("parentId");
CREATE INDEX "Department_status_idx" ON "Department"("status");
CREATE INDEX "Department_createdBy_idx" ON "Department"("createdBy");

CREATE UNIQUE INDEX "Team_organizationId_name_key" ON "Team"("organizationId", "name");
CREATE INDEX "Team_organizationId_idx" ON "Team"("organizationId");
CREATE INDEX "Team_departmentId_idx" ON "Team"("departmentId");
CREATE INDEX "Team_status_idx" ON "Team"("status");
CREATE INDEX "Team_managerId_idx" ON "Team"("managerId");
CREATE INDEX "Team_createdBy_idx" ON "Team"("createdBy");

CREATE UNIQUE INDEX "Permission_organizationId_key_key" ON "Permission"("organizationId", "key");
CREATE INDEX "Permission_organizationId_idx" ON "Permission"("organizationId");
CREATE INDEX "Permission_key_idx" ON "Permission"("key");
CREATE INDEX "Permission_scope_idx" ON "Permission"("scope");
CREATE INDEX "Permission_createdBy_idx" ON "Permission"("createdBy");

CREATE INDEX "ConversationHistory_organizationId_idx" ON "ConversationHistory"("organizationId");
CREATE INDEX "ConversationHistory_multiChannelCustomerId_idx" ON "ConversationHistory"("multiChannelCustomerId");
CREATE INDEX "ConversationHistory_customerId_idx" ON "ConversationHistory"("customerId");
CREATE INDEX "ConversationHistory_channel_idx" ON "ConversationHistory"("channel");
CREATE INDEX "ConversationHistory_direction_idx" ON "ConversationHistory"("direction");
CREATE INDEX "ConversationHistory_senderRole_idx" ON "ConversationHistory"("senderRole");
CREATE INDEX "ConversationHistory_messageAt_idx" ON "ConversationHistory"("messageAt");

CREATE INDEX "InteractionLog_organizationId_idx" ON "InteractionLog"("organizationId");
CREATE INDEX "InteractionLog_multiChannelCustomerId_idx" ON "InteractionLog"("multiChannelCustomerId");
CREATE INDEX "InteractionLog_customerId_idx" ON "InteractionLog"("customerId");
CREATE INDEX "InteractionLog_channel_idx" ON "InteractionLog"("channel");
CREATE INDEX "InteractionLog_action_idx" ON "InteractionLog"("action");
CREATE INDEX "InteractionLog_entityType_idx" ON "InteractionLog"("entityType");
CREATE INDEX "InteractionLog_createdBy_idx" ON "InteractionLog"("createdBy");
CREATE INDEX "InteractionLog_createdAt_idx" ON "InteractionLog"("createdAt");

CREATE INDEX "AIKeyUsageLog_organizationId_idx" ON "AIKeyUsageLog"("organizationId");
CREATE INDEX "AIKeyUsageLog_aiProviderKeyId_idx" ON "AIKeyUsageLog"("aiProviderKeyId");
CREATE INDEX "AIKeyUsageLog_provider_idx" ON "AIKeyUsageLog"("provider");
CREATE INDEX "AIKeyUsageLog_mode_idx" ON "AIKeyUsageLog"("mode");
CREATE INDEX "AIKeyUsageLog_model_idx" ON "AIKeyUsageLog"("model");
CREATE INDEX "AIKeyUsageLog_success_idx" ON "AIKeyUsageLog"("success");
CREATE INDEX "AIKeyUsageLog_createdAt_idx" ON "AIKeyUsageLog"("createdAt");

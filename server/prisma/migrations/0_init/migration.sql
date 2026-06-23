-- Enable required extensions before using vector columns or trigram operators
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'STAFF', 'AUDITOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'ASSIGNED', 'FOLLOWING', 'CONVERTED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "KnowledgeStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "IndexJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "ChatMessageStatus" AS ENUM ('STREAMING', 'COMPLETED', 'INTERRUPTED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "privacyVersion" TEXT NOT NULL,
    "privacyAcceptedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "series" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'DRAFT',
    "params" JSONB NOT NULL,
    "advantages" TEXT[],
    "datasheetMaterialId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Solution" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Solution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSolution" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "solutionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductSolution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "solutionId" TEXT,
    "productId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "originalStorageKey" TEXT NOT NULL,
    "previewStorageKey" TEXT,
    "mimeType" TEXT NOT NULL,
    "pageCount" INTEGER,
    "previewPages" INTEGER NOT NULL DEFAULT 3,
    "status" "RecordStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeDoc" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "status" "KnowledgeStatus" NOT NULL DEFAULT 'UPLOADED',
    "indexVersion" TEXT,
    "indexedAt" TIMESTAMP(3),
    "errorMessage" TEXT,

    CONSTRAINT "KnowledgeDoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeIndexJob" (
    "id" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "indexVersion" TEXT NOT NULL,
    "status" "IndexJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeIndexJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeChunk" (
    "id" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "indexVersion" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "page" INTEGER,
    "contentHash" TEXT NOT NULL,
    "embedding" vector(1536),

    CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeEvent" (
    "id" TEXT NOT NULL,
    "chunkId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeEntity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeEventEntity" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "KnowledgeEventEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchTrace" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "query" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "steps" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchTrace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "anonymousId" TEXT,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "assignedTo" TEXT,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadEvent" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" "ChatMessageStatus" NOT NULL,
    "content" TEXT NOT NULL,
    "sources" JSONB,
    "feedback" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_tokenHash_idx" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_tokenHash_idx" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Product_model_key" ON "Product"("model");

-- CreateIndex
CREATE INDEX "Product_model_idx" ON "Product"("model");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSolution_productId_solutionId_key" ON "ProductSolution"("productId", "solutionId");

-- CreateIndex
CREATE INDEX "Material_solutionId_idx" ON "Material"("solutionId");

-- CreateIndex
CREATE INDEX "Material_productId_idx" ON "Material"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeDoc_materialId_key" ON "KnowledgeDoc"("materialId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeIndexJob_docId_indexVersion_key" ON "KnowledgeIndexJob"("docId", "indexVersion");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeChunk_docId_indexVersion_contentHash_key" ON "KnowledgeChunk"("docId", "indexVersion", "contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeEvent_chunkId_key" ON "KnowledgeEvent"("chunkId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeEntity_normalizedName_key" ON "KnowledgeEntity"("normalizedName");

-- CreateIndex
CREATE INDEX "KnowledgeEntity_normalizedName_idx" ON "KnowledgeEntity"("normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeEventEntity_eventId_entityId_role_key" ON "KnowledgeEventEntity"("eventId", "entityId", "role");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSolution" ADD CONSTRAINT "ProductSolution_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSolution" ADD CONSTRAINT "ProductSolution_solutionId_fkey" FOREIGN KEY ("solutionId") REFERENCES "Solution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_solutionId_fkey" FOREIGN KEY ("solutionId") REFERENCES "Solution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeDoc" ADD CONSTRAINT "KnowledgeDoc_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeIndexJob" ADD CONSTRAINT "KnowledgeIndexJob_docId_fkey" FOREIGN KEY ("docId") REFERENCES "KnowledgeDoc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_docId_fkey" FOREIGN KEY ("docId") REFERENCES "KnowledgeDoc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeEvent" ADD CONSTRAINT "KnowledgeEvent_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "KnowledgeChunk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeEventEntity" ADD CONSTRAINT "KnowledgeEventEntity_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "KnowledgeEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeEventEntity" ADD CONSTRAINT "KnowledgeEventEntity_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "KnowledgeEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchTrace" ADD CONSTRAINT "SearchTrace_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadEvent" ADD CONSTRAINT "LeadEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Index 1: Product.model unique (already in Prisma schema as @unique, but ensure)
-- Already created by Prisma migration above

-- Index 2: Product.params GIN index for JSONB queries
CREATE INDEX "Product_params_gin" ON "Product" USING GIN ("params");

-- Index 3: Lead.userId + status + lastActiveAt composite
CREATE INDEX "Lead_userId_status_lastActiveAt_idx" ON "Lead" ("userId", "status", "lastActiveAt");

-- Index 4: LeadEvent.leadId + createdAt composite
CREATE INDEX "LeadEvent_leadId_createdAt_idx" ON "LeadEvent" ("leadId", "createdAt");

-- Index 5a: AuditLog.actorId + createdAt
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog" ("actorId", "createdAt");

-- Index 5b: AuditLog.targetType + targetId
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog" ("targetType", "targetId");

-- Index 6: KnowledgeChunk.content tsvector GIN index (using ts_rank_cd, NOT BM25)
CREATE INDEX "KnowledgeChunk_content_tsvector_idx" ON "KnowledgeChunk" USING GIN (to_tsvector('simple', "content"));

-- Index 7a: KnowledgeEntity.normalizedName B-tree unique (already in Prisma as @unique)
-- Already created by Prisma migration above

-- Index 7b: KnowledgeEntity.normalizedName pg_trgm GIN index
CREATE INDEX "KnowledgeEntity_normalizedName_trgm_idx" ON "KnowledgeEntity" USING GIN ("normalizedName" gin_trgm_ops);

-- Index 8a: KnowledgeChunk.embedding HNSW index
CREATE INDEX "KnowledgeChunk_embedding_hnsw_idx" ON "KnowledgeChunk" USING hnsw ("embedding" vector_cosine_ops);

-- Index 8b: KnowledgeEvent.embedding HNSW index
CREATE INDEX "KnowledgeEvent_embedding_hnsw_idx" ON "KnowledgeEvent" USING hnsw ("embedding" vector_cosine_ops);

-- Index 8c: KnowledgeEntity.embedding HNSW index
CREATE INDEX "KnowledgeEntity_embedding_hnsw_idx" ON "KnowledgeEntity" USING hnsw ("embedding" vector_cosine_ops);

-- Index 9: KnowledgeEventEntity.eventId + entityId + role unique (already in Prisma as @@unique)
-- Already created by Prisma migration above

-- Index 10: KnowledgeChunk.docId + indexVersion + contentHash unique (already in Prisma as @@unique)
-- Already created by Prisma migration above

-- Index 11: RefreshToken.tokenHash unique (already in Prisma as @unique)
-- PasswordResetToken.tokenHash unique (already in Prisma as @unique)
-- Already created by Prisma migration above

-- Index 12: KnowledgeIndexJob.docId + indexVersion unique (already in Prisma as @@unique)
-- Already created by Prisma migration above

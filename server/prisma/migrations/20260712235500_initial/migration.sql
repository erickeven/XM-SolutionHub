-- CreateTable
CREATE TABLE `Subject` (
    `id` CHAR(36) NOT NULL,
    `type` ENUM('CUSTOMER', 'INTERNAL', 'SYSTEM_ADMIN') NOT NULL,
    `email` VARCHAR(320) NOT NULL,
    `displayName` VARCHAR(120) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Subject_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerProfile` (
    `subjectId` CHAR(36) NOT NULL,
    `level` ENUM('L1_REGISTERED', 'L2_ORGANIZATION', 'L3_PROJECT') NOT NULL DEFAULT 'L1_REGISTERED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`subjectId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PasswordCredential` (
    `subjectId` CHAR(36) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `changedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`subjectId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RefreshSession` (
    `id` CHAR(36) NOT NULL,
    `subjectId` CHAR(36) NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `rotatedAt` DATETIME(3) NULL,
    `revokedAt` DATETIME(3) NULL,
    `userAgent` VARCHAR(512) NULL,
    `sourceIp` VARCHAR(64) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RefreshSession_tokenHash_key`(`tokenHash`),
    INDEX `RefreshSession_subjectId_expiresAt_revokedAt_idx`(`subjectId`, `expiresAt`, `revokedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Role` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(80) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `system` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Role_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Permission` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(120) NOT NULL,
    `resource` VARCHAR(80) NOT NULL,
    `action` VARCHAR(40) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Permission_code_key`(`code`),
    UNIQUE INDEX `Permission_resource_action_key`(`resource`, `action`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SubjectRole` (
    `subjectId` CHAR(36) NOT NULL,
    `roleId` CHAR(36) NOT NULL,
    `grantedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`subjectId`, `roleId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RolePermission` (
    `roleId` CHAR(36) NOT NULL,
    `permissionId` CHAR(36) NOT NULL,

    PRIMARY KEY (`roleId`, `permissionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FieldDefinition` (
    `id` CHAR(36) NOT NULL,
    `entityType` VARCHAR(60) NOT NULL,
    `code` VARCHAR(80) NOT NULL,
    `label` VARCHAR(120) NOT NULL,
    `type` ENUM('TEXT', 'NUMBER', 'BOOLEAN', 'ENUM', 'DATE', 'FILE') NOT NULL,
    `unit` VARCHAR(40) NULL,
    `enumOptions` JSON NULL,
    `validation` JSON NULL,
    `visibility` JSON NOT NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `required` BOOLEAN NOT NULL DEFAULT false,
    `configurationVersionId` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FieldDefinition_entityType_displayOrder_idx`(`entityType`, `displayOrder`),
    UNIQUE INDEX `FieldDefinition_configurationVersionId_entityType_code_key`(`configurationVersionId`, `entityType`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `id` CHAR(36) NOT NULL,
    `productCode` VARCHAR(80) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `summary` TEXT NOT NULL,
    `status` ENUM('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `publishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `familyId` CHAR(36) NULL,

    UNIQUE INDEX `Product_productCode_key`(`productCode`),
    INDEX `Product_status_publishedAt_idx`(`status`, `publishedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductFieldValue` (
    `id` CHAR(36) NOT NULL,
    `productId` CHAR(36) NOT NULL,
    `fieldDefinitionId` CHAR(36) NOT NULL,
    `textValue` TEXT NULL,
    `numberValue` DECIMAL(30, 10) NULL,
    `booleanValue` BOOLEAN NULL,
    `dateValue` DATETIME(3) NULL,
    `fileVersionId` CHAR(36) NULL,
    `source` VARCHAR(255) NOT NULL,
    `reviewedById` CHAR(36) NULL,
    `reviewedAt` DATETIME(3) NULL,

    UNIQUE INDEX `ProductFieldValue_productId_fieldDefinitionId_key`(`productId`, `fieldDefinitionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderableSku` (
    `id` CHAR(36) NOT NULL,
    `productId` CHAR(36) NOT NULL,
    `orderCode` VARCHAR(100) NOT NULL,
    `packageCode` VARCHAR(80) NOT NULL,
    `status` ENUM('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `OrderableSku_orderCode_key`(`orderCode`),
    INDEX `OrderableSku_productId_status_idx`(`productId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Solution` (
    `id` CHAR(36) NOT NULL,
    `solutionCode` VARCHAR(80) NOT NULL,
    `name` VARCHAR(180) NOT NULL,
    `summary` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Solution_solutionCode_key`(`solutionCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SolutionVersion` (
    `id` CHAR(36) NOT NULL,
    `solutionId` CHAR(36) NOT NULL,
    `version` INTEGER NOT NULL,
    `status` ENUM('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `conditions` JSON NOT NULL,
    `evidence` JSON NOT NULL,
    `resourceLevel` ENUM('PUBLIC', 'REGISTERED', 'ORG', 'PROJECT', 'NDA') NOT NULL,
    `effectiveAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SolutionVersion_status_effectiveAt_expiresAt_idx`(`status`, `effectiveAt`, `expiresAt`),
    UNIQUE INDEX `SolutionVersion_solutionId_version_key`(`solutionId`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SolutionProductFit` (
    `solutionVersionId` CHAR(36) NOT NULL,
    `productId` CHAR(36) NOT NULL,
    `fitRules` JSON NOT NULL,
    `evidenceSource` VARCHAR(255) NOT NULL,

    PRIMARY KEY (`solutionVersionId`, `productId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Document` (
    `id` CHAR(36) NOT NULL,
    `documentCode` VARCHAR(100) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Document_documentCode_key`(`documentCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentVersion` (
    `id` CHAR(36) NOT NULL,
    `documentId` CHAR(36) NOT NULL,
    `version` INTEGER NOT NULL,
    `status` ENUM('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `resourceLevel` ENUM('PUBLIC', 'REGISTERED', 'ORG', 'PROJECT', 'NDA') NOT NULL,
    `language` VARCHAR(20) NOT NULL,
    `mimeType` VARCHAR(120) NOT NULL,
    `originalObjectKey` VARCHAR(512) NOT NULL,
    `sha256` CHAR(64) NOT NULL,
    `pageCount` INTEGER NULL,
    `effectiveAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `DocumentVersion_originalObjectKey_key`(`originalObjectKey`),
    INDEX `DocumentVersion_status_resourceLevel_effectiveAt_expiresAt_idx`(`status`, `resourceLevel`, `effectiveAt`, `expiresAt`),
    UNIQUE INDEX `DocumentVersion_documentId_version_key`(`documentId`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentLink` (
    `id` CHAR(36) NOT NULL,
    `documentId` CHAR(36) NOT NULL,
    `productId` CHAR(36) NULL,
    `solutionVersionId` CHAR(36) NULL,
    `relationType` VARCHAR(40) NOT NULL,

    INDEX `DocumentLink_productId_relationType_idx`(`productId`, `relationType`),
    INDEX `DocumentLink_solutionVersionId_relationType_idx`(`solutionVersionId`, `relationType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FileDerivative` (
    `id` CHAR(36) NOT NULL,
    `documentVersionId` CHAR(36) NOT NULL,
    `type` ENUM('PREVIEW_PDF', 'ANONYMOUS_PREVIEW_PDF', 'PAGE_IMAGE', 'EXTRACTED_TEXT', 'ARCHIVE') NOT NULL,
    `inputSha256` CHAR(64) NOT NULL,
    `objectKey` VARCHAR(512) NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `failureReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `FileDerivative_objectKey_key`(`objectKey`),
    UNIQUE INDEX `FileDerivative_documentVersionId_type_inputSha256_key`(`documentVersionId`, `type`, `inputSha256`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FileAccessToken` (
    `id` CHAR(36) NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `documentVersionId` CHAR(36) NOT NULL,
    `subjectId` CHAR(36) NULL,
    `action` VARCHAR(20) NOT NULL,
    `maxPreviewPages` INTEGER NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `consumedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `FileAccessToken_tokenHash_key`(`tokenHash`),
    INDEX `FileAccessToken_documentVersionId_expiresAt_idx`(`documentVersionId`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ConfigurationVersion` (
    `id` CHAR(36) NOT NULL,
    `version` INTEGER NOT NULL,
    `status` ENUM('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `payload` JSON NOT NULL,
    `changeSummary` TEXT NOT NULL,
    `publishedAt` DATETIME(3) NULL,
    `rolledBackFromId` CHAR(36) NULL,
    `createdById` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ConfigurationVersion_version_key`(`version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditEvent` (
    `id` CHAR(36) NOT NULL,
    `actorId` CHAR(36) NULL,
    `action` VARCHAR(80) NOT NULL,
    `targetType` VARCHAR(80) NOT NULL,
    `targetId` VARCHAR(80) NOT NULL,
    `beforeValue` JSON NULL,
    `afterValue` JSON NULL,
    `sourceIp` VARCHAR(64) NOT NULL,
    `traceId` VARCHAR(64) NOT NULL,
    `authorizationResult` VARCHAR(40) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditEvent_targetType_targetId_createdAt_idx`(`targetType`, `targetId`, `createdAt`),
    INDEX `AuditEvent_actorId_createdAt_idx`(`actorId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BreakGlassUse` (
    `id` CHAR(36) NOT NULL,
    `actorId` CHAR(36) NOT NULL,
    `reason` TEXT NOT NULL,
    `targetType` VARCHAR(80) NOT NULL,
    `targetId` VARCHAR(80) NOT NULL,
    `beforeValue` JSON NULL,
    `afterValue` JSON NULL,
    `sourceIp` VARCHAR(64) NOT NULL,
    `notificationTargets` JSON NOT NULL,
    `recoveryPoint` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BreakGlassUse_actorId_createdAt_idx`(`actorId`, `createdAt`),
    INDEX `BreakGlassUse_targetType_targetId_createdAt_idx`(`targetType`, `targetId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OutboxEvent` (
    `id` CHAR(36) NOT NULL,
    `aggregateType` VARCHAR(80) NOT NULL,
    `aggregateId` CHAR(36) NOT NULL,
    `eventType` VARCHAR(120) NOT NULL,
    `payload` JSON NOT NULL,
    `idempotencyKey` VARCHAR(160) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `availableAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processedAt` DATETIME(3) NULL,
    `lastError` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `OutboxEvent_idempotencyKey_key`(`idempotencyKey`),
    INDEX `OutboxEvent_processedAt_availableAt_idx`(`processedAt`, `availableAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductFamily` (
    `id` CHAR(36) NOT NULL,
    `familyCode` VARCHAR(80) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `description` TEXT NOT NULL,
    `status` ENUM('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ProductFamily_familyCode_key`(`familyCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentFieldValue` (
    `id` CHAR(36) NOT NULL,
    `documentId` CHAR(36) NOT NULL,
    `fieldDefinitionId` CHAR(36) NOT NULL,
    `textValue` TEXT NULL,
    `numberValue` DECIMAL(30, 10) NULL,
    `booleanValue` BOOLEAN NULL,
    `dateValue` DATETIME(3) NULL,
    `fileVersionId` CHAR(36) NULL,
    `source` VARCHAR(255) NOT NULL,
    `reviewedById` CHAR(36) NULL,
    `reviewedAt` DATETIME(3) NULL,

    UNIQUE INDEX `DocumentFieldValue_documentId_fieldDefinitionId_key`(`documentId`, `fieldDefinitionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BomLine` (
    `id` CHAR(36) NOT NULL,
    `solutionVersionId` CHAR(36) NOT NULL,
    `lineNumber` INTEGER NOT NULL,
    `partNumber` VARCHAR(120) NOT NULL,
    `manufacturer` VARCHAR(160) NULL,
    `quantity` DECIMAL(18, 6) NOT NULL,
    `unit` VARCHAR(30) NOT NULL,
    `source` VARCHAR(255) NOT NULL,

    UNIQUE INDEX `BomLine_solutionVersionId_lineNumber_key`(`solutionVersionId`, `lineNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TestEvidence` (
    `id` CHAR(36) NOT NULL,
    `solutionVersionId` CHAR(36) NOT NULL,
    `testCode` VARCHAR(100) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `environment` JSON NOT NULL,
    `resultSummary` JSON NOT NULL,
    `source` VARCHAR(255) NOT NULL,
    `reviewedById` CHAR(36) NULL,
    `reviewedAt` DATETIME(3) NULL,

    UNIQUE INDEX `TestEvidence_solutionVersionId_testCode_key`(`solutionVersionId`, `testCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerOrganization` (
    `id` CHAR(36) NOT NULL,
    `orgCode` VARCHAR(80) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `status` ENUM('INVITED', 'ACTIVE', 'SUSPENDED', 'LEFT') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CustomerOrganization_orgCode_key`(`orgCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerOrganizationMember` (
    `organizationId` CHAR(36) NOT NULL,
    `subjectId` CHAR(36) NOT NULL,
    `customerRole` VARCHAR(60) NOT NULL,
    `status` ENUM('INVITED', 'ACTIVE', 'SUSPENDED', 'LEFT') NOT NULL DEFAULT 'INVITED',
    `joinedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CustomerOrganizationMember_subjectId_status_idx`(`subjectId`, `status`),
    PRIMARY KEY (`organizationId`, `subjectId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InternalDepartment` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(80) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `InternalDepartment_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmployeeDepartment` (
    `departmentId` CHAR(36) NOT NULL,
    `subjectId` CHAR(36) NOT NULL,
    `title` VARCHAR(100) NOT NULL,
    `manager` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`departmentId`, `subjectId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NdaAgreement` (
    `id` CHAR(36) NOT NULL,
    `organizationId` CHAR(36) NOT NULL,
    `agreementCode` VARCHAR(100) NOT NULL,
    `effectiveAt` DATETIME(3) NOT NULL,
    `expiresAt` DATETIME(3) NULL,
    `status` ENUM('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'PUBLISHED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `NdaAgreement_agreementCode_key`(`agreementCode`),
    INDEX `NdaAgreement_organizationId_status_expiresAt_idx`(`organizationId`, `status`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ResourceGrant` (
    `id` CHAR(36) NOT NULL,
    `subjectId` CHAR(36) NULL,
    `organizationId` CHAR(36) NULL,
    `projectId` CHAR(36) NULL,
    `ndaAgreementId` CHAR(36) NULL,
    `resourceType` VARCHAR(80) NOT NULL,
    `resourceId` VARCHAR(80) NOT NULL,
    `resourceLevel` ENUM('PUBLIC', 'REGISTERED', 'ORG', 'PROJECT', 'NDA') NOT NULL,
    `action` VARCHAR(40) NOT NULL,
    `expiresAt` DATETIME(3) NULL,
    `grantedById` CHAR(36) NOT NULL,
    `reason` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ResourceGrant_resourceType_resourceId_action_expiresAt_idx`(`resourceType`, `resourceId`, `action`, `expiresAt`),
    INDEX `ResourceGrant_subjectId_organizationId_projectId_idx`(`subjectId`, `organizationId`, `projectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Project` (
    `id` CHAR(36) NOT NULL,
    `organizationId` CHAR(36) NOT NULL,
    `projectCode` VARCHAR(100) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `stage` ENUM('DISCOVERY', 'EVALUATION', 'VALIDATION', 'DESIGN_IN', 'MASS_PRODUCTION', 'CLOSED') NOT NULL DEFAULT 'DISCOVERY',
    `customerConfirmedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Project_projectCode_key`(`projectCode`),
    INDEX `Project_organizationId_stage_idx`(`organizationId`, `stage`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProjectMember` (
    `projectId` CHAR(36) NOT NULL,
    `subjectId` CHAR(36) NOT NULL,
    `projectRole` VARCHAR(60) NOT NULL,
    `status` ENUM('INVITED', 'ACTIVE', 'SUSPENDED', 'LEFT') NOT NULL DEFAULT 'INVITED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`projectId`, `subjectId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProjectRequirementVersion` (
    `id` CHAR(36) NOT NULL,
    `projectId` CHAR(36) NOT NULL,
    `version` INTEGER NOT NULL,
    `requirements` JSON NOT NULL,
    `source` VARCHAR(255) NOT NULL,
    `confirmedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ProjectRequirementVersion_projectId_version_key`(`projectId`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProjectCandidate` (
    `id` CHAR(36) NOT NULL,
    `projectId` CHAR(36) NOT NULL,
    `requirementVersionId` CHAR(36) NOT NULL,
    `productId` CHAR(36) NOT NULL,
    `solutionVersionId` CHAR(36) NULL,
    `decision` VARCHAR(40) NOT NULL,
    `explanation` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ProjectCandidate_projectId_requirementVersionId_productId_key`(`projectId`, `requirementVersionId`, `productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SupportTicket` (
    `id` CHAR(36) NOT NULL,
    `ticketCode` VARCHAR(100) NOT NULL,
    `projectId` CHAR(36) NULL,
    `createdById` CHAR(36) NOT NULL,
    `assignedToId` CHAR(36) NULL,
    `title` VARCHAR(220) NOT NULL,
    `description` TEXT NOT NULL,
    `status` ENUM('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `slaDueAt` DATETIME(3) NULL,
    `conclusion` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SupportTicket_ticketCode_key`(`ticketCode`),
    INDEX `SupportTicket_assignedToId_status_slaDueAt_idx`(`assignedToId`, `status`, `slaDueAt`),
    INDEX `SupportTicket_projectId_status_idx`(`projectId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SampleRequest` (
    `id` CHAR(36) NOT NULL,
    `projectId` CHAR(36) NOT NULL,
    `orderableSkuId` CHAR(36) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `status` ENUM('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `source` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SampleRequest_projectId_status_idx`(`projectId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RfqRequest` (
    `id` CHAR(36) NOT NULL,
    `projectId` CHAR(36) NOT NULL,
    `orderableSkuId` CHAR(36) NOT NULL,
    `quantity` DECIMAL(18, 3) NOT NULL,
    `targetDate` DATE NULL,
    `status` ENUM('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RfqRequest_projectId_status_idx`(`projectId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LifecycleRecord` (
    `id` CHAR(36) NOT NULL,
    `productId` CHAR(36) NOT NULL,
    `lifecycle` VARCHAR(40) NOT NULL,
    `source` VARCHAR(255) NOT NULL,
    `effectiveAt` DATETIME(3) NOT NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LifecycleRecord_productId_effectiveAt_expiresAt_idx`(`productId`, `effectiveAt`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PcnNotice` (
    `id` CHAR(36) NOT NULL,
    `pcnCode` VARCHAR(100) NOT NULL,
    `title` VARCHAR(220) NOT NULL,
    `status` ENUM('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `effectiveAt` DATETIME(3) NULL,
    `source` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PcnNotice_pcnCode_key`(`pcnCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PcnProductImpact` (
    `pcnNoticeId` CHAR(36) NOT NULL,
    `productId` CHAR(36) NOT NULL,
    `impact` JSON NOT NULL,

    PRIMARY KEY (`pcnNoticeId`, `productId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QualityEvent` (
    `id` CHAR(36) NOT NULL,
    `eventCode` VARCHAR(100) NOT NULL,
    `projectId` CHAR(36) NULL,
    `severity` VARCHAR(20) NOT NULL,
    `status` ENUM('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `description` TEXT NOT NULL,
    `source` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `QualityEvent_eventCode_key`(`eventCode`),
    INDEX `QualityEvent_projectId_status_severity_idx`(`projectId`, `status`, `severity`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VerificationTask` (
    `id` CHAR(36) NOT NULL,
    `projectId` CHAR(36) NULL,
    `solutionVersionId` CHAR(36) NULL,
    `taskCode` VARCHAR(100) NOT NULL,
    `status` ENUM('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `plan` JSON NOT NULL,
    `result` JSON NULL,
    `source` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VerificationTask_taskCode_key`(`taskCode`),
    INDEX `VerificationTask_projectId_status_idx`(`projectId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KnowledgeEvidence` (
    `id` CHAR(36) NOT NULL,
    `documentVersionId` CHAR(36) NOT NULL,
    `chunkIndex` INTEGER NOT NULL,
    `content` LONGTEXT NOT NULL,
    `resourceLevel` ENUM('PUBLIC', 'REGISTERED', 'ORG', 'PROJECT', 'NDA') NOT NULL,
    `effectiveAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `KnowledgeEvidence_resourceLevel_effectiveAt_expiresAt_idx`(`resourceLevel`, `effectiveAt`, `expiresAt`),
    UNIQUE INDEX `KnowledgeEvidence_documentVersionId_chunkIndex_key`(`documentVersionId`, `chunkIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnalyticsEvent` (
    `id` CHAR(36) NOT NULL,
    `subjectId` CHAR(36) NULL,
    `eventType` VARCHAR(100) NOT NULL,
    `objectType` VARCHAR(80) NULL,
    `objectId` VARCHAR(80) NULL,
    `properties` JSON NOT NULL,
    `traceId` VARCHAR(64) NOT NULL,
    `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AnalyticsEvent_eventType_occurredAt_idx`(`eventType`, `occurredAt`),
    INDEX `AnalyticsEvent_objectType_objectId_occurredAt_idx`(`objectType`, `objectId`, `occurredAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CustomerProfile` ADD CONSTRAINT `CustomerProfile_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PasswordCredential` ADD CONSTRAINT `PasswordCredential_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RefreshSession` ADD CONSTRAINT `RefreshSession_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubjectRole` ADD CONSTRAINT `SubjectRole_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubjectRole` ADD CONSTRAINT `SubjectRole_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `Permission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FieldDefinition` ADD CONSTRAINT `FieldDefinition_configurationVersionId_fkey` FOREIGN KEY (`configurationVersionId`) REFERENCES `ConfigurationVersion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_familyId_fkey` FOREIGN KEY (`familyId`) REFERENCES `ProductFamily`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductFieldValue` ADD CONSTRAINT `ProductFieldValue_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductFieldValue` ADD CONSTRAINT `ProductFieldValue_fieldDefinitionId_fkey` FOREIGN KEY (`fieldDefinitionId`) REFERENCES `FieldDefinition`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderableSku` ADD CONSTRAINT `OrderableSku_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SolutionVersion` ADD CONSTRAINT `SolutionVersion_solutionId_fkey` FOREIGN KEY (`solutionId`) REFERENCES `Solution`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SolutionProductFit` ADD CONSTRAINT `SolutionProductFit_solutionVersionId_fkey` FOREIGN KEY (`solutionVersionId`) REFERENCES `SolutionVersion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SolutionProductFit` ADD CONSTRAINT `SolutionProductFit_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentVersion` ADD CONSTRAINT `DocumentVersion_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `Document`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentLink` ADD CONSTRAINT `DocumentLink_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `Document`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentLink` ADD CONSTRAINT `DocumentLink_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentLink` ADD CONSTRAINT `DocumentLink_solutionVersionId_fkey` FOREIGN KEY (`solutionVersionId`) REFERENCES `SolutionVersion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FileDerivative` ADD CONSTRAINT `FileDerivative_documentVersionId_fkey` FOREIGN KEY (`documentVersionId`) REFERENCES `DocumentVersion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FileAccessToken` ADD CONSTRAINT `FileAccessToken_documentVersionId_fkey` FOREIGN KEY (`documentVersionId`) REFERENCES `DocumentVersion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FileAccessToken` ADD CONSTRAINT `FileAccessToken_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConfigurationVersion` ADD CONSTRAINT `ConfigurationVersion_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `Subject`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditEvent` ADD CONSTRAINT `AuditEvent_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `Subject`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BreakGlassUse` ADD CONSTRAINT `BreakGlassUse_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `Subject`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentFieldValue` ADD CONSTRAINT `DocumentFieldValue_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `Document`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentFieldValue` ADD CONSTRAINT `DocumentFieldValue_fieldDefinitionId_fkey` FOREIGN KEY (`fieldDefinitionId`) REFERENCES `FieldDefinition`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BomLine` ADD CONSTRAINT `BomLine_solutionVersionId_fkey` FOREIGN KEY (`solutionVersionId`) REFERENCES `SolutionVersion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TestEvidence` ADD CONSTRAINT `TestEvidence_solutionVersionId_fkey` FOREIGN KEY (`solutionVersionId`) REFERENCES `SolutionVersion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerOrganizationMember` ADD CONSTRAINT `CustomerOrganizationMember_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `CustomerOrganization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerOrganizationMember` ADD CONSTRAINT `CustomerOrganizationMember_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmployeeDepartment` ADD CONSTRAINT `EmployeeDepartment_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `InternalDepartment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmployeeDepartment` ADD CONSTRAINT `EmployeeDepartment_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NdaAgreement` ADD CONSTRAINT `NdaAgreement_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `CustomerOrganization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ResourceGrant` ADD CONSTRAINT `ResourceGrant_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `CustomerOrganization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ResourceGrant` ADD CONSTRAINT `ResourceGrant_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ResourceGrant` ADD CONSTRAINT `ResourceGrant_ndaAgreementId_fkey` FOREIGN KEY (`ndaAgreementId`) REFERENCES `NdaAgreement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ResourceGrant` ADD CONSTRAINT `ResourceGrant_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ResourceGrant` ADD CONSTRAINT `ResourceGrant_grantedById_fkey` FOREIGN KEY (`grantedById`) REFERENCES `Subject`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `CustomerOrganization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectMember` ADD CONSTRAINT `ProjectMember_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectMember` ADD CONSTRAINT `ProjectMember_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectRequirementVersion` ADD CONSTRAINT `ProjectRequirementVersion_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectCandidate` ADD CONSTRAINT `ProjectCandidate_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectCandidate` ADD CONSTRAINT `ProjectCandidate_requirementVersionId_fkey` FOREIGN KEY (`requirementVersionId`) REFERENCES `ProjectRequirementVersion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectCandidate` ADD CONSTRAINT `ProjectCandidate_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectCandidate` ADD CONSTRAINT `ProjectCandidate_solutionVersionId_fkey` FOREIGN KEY (`solutionVersionId`) REFERENCES `SolutionVersion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupportTicket` ADD CONSTRAINT `SupportTicket_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupportTicket` ADD CONSTRAINT `SupportTicket_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `Subject`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupportTicket` ADD CONSTRAINT `SupportTicket_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `Subject`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SampleRequest` ADD CONSTRAINT `SampleRequest_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SampleRequest` ADD CONSTRAINT `SampleRequest_orderableSkuId_fkey` FOREIGN KEY (`orderableSkuId`) REFERENCES `OrderableSku`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RfqRequest` ADD CONSTRAINT `RfqRequest_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RfqRequest` ADD CONSTRAINT `RfqRequest_orderableSkuId_fkey` FOREIGN KEY (`orderableSkuId`) REFERENCES `OrderableSku`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LifecycleRecord` ADD CONSTRAINT `LifecycleRecord_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PcnProductImpact` ADD CONSTRAINT `PcnProductImpact_pcnNoticeId_fkey` FOREIGN KEY (`pcnNoticeId`) REFERENCES `PcnNotice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PcnProductImpact` ADD CONSTRAINT `PcnProductImpact_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QualityEvent` ADD CONSTRAINT `QualityEvent_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VerificationTask` ADD CONSTRAINT `VerificationTask_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VerificationTask` ADD CONSTRAINT `VerificationTask_solutionVersionId_fkey` FOREIGN KEY (`solutionVersionId`) REFERENCES `SolutionVersion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KnowledgeEvidence` ADD CONSTRAINT `KnowledgeEvidence_documentVersionId_fkey` FOREIGN KEY (`documentVersionId`) REFERENCES `DocumentVersion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnalyticsEvent` ADD CONSTRAINT `AnalyticsEvent_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- MySQL CJK full-text indexes are intentionally maintained as reviewed raw SQL.
ALTER TABLE `Product` ADD FULLTEXT INDEX `Product_search_ngram` (`productCode`, `name`, `summary`) WITH PARSER ngram;
ALTER TABLE `Solution` ADD FULLTEXT INDEX `Solution_search_ngram` (`solutionCode`, `name`, `summary`) WITH PARSER ngram;
ALTER TABLE `Document` ADD FULLTEXT INDEX `Document_search_ngram` (`documentCode`, `title`) WITH PARSER ngram;
ALTER TABLE `KnowledgeEvidence` ADD FULLTEXT INDEX `KnowledgeEvidence_content_ngram` (`content`) WITH PARSER ngram;

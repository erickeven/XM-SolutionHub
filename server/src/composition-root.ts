import { PimController } from "./modules/pim/pim.controller.js";
import { PimService } from "./modules/pim/pim.service.js";
import { PrismaPimRepository } from "./modules/pim/prisma-pim.repository.js";
import { PrismaSolutionAssetsRepository } from "./modules/solution-assets/prisma-solution-assets.repository.js";
import { SolutionAssetsController } from "./modules/solution-assets/solution-assets.controller.js";
import { SolutionAssetsService } from "./modules/solution-assets/solution-assets.service.js";
import { DocumentsController } from "./modules/solution-assets/documents.controller.js";
import { DocumentsService } from "./modules/solution-assets/documents.service.js";
import { PrismaDocumentsRepository } from "./modules/solution-assets/prisma-documents.repository.js";
import { PrismaSelectionRepository } from "./modules/selection/prisma-selection.repository.js";
import { SelectionController } from "./modules/selection/selection.controller.js";
import { SelectionService } from "./modules/selection/selection.service.js";
import { IamController } from "./modules/iam/iam.controller.js";
import { PrismaIamRepository } from "./modules/iam/prisma-iam.repository.js";
import { IamService } from "./modules/iam/iam.service.js";
import { createOptionalAuthenticationMiddleware } from "./modules/iam/authentication.middleware.js";
import { createPrismaClient } from "./shared/database/prisma.js";
import type { PrismaClient } from "./generated/prisma/client.js";
import type { AppDependencies } from "./app.js";
import type { AppEnvironment } from "./shared/config/env.js";
import { S3ObjectStorageAdapter } from "./adapters/s3-object-storage.adapter.js";
import { FileAccessController } from "./modules/solution-assets/file-access.controller.js";
import { FileAccessService } from "./modules/solution-assets/file-access.service.js";
import { PrismaFileAccessRepository } from "./modules/solution-assets/prisma-file-access.repository.js";
import { ContentConfigController } from "./modules/content-config/content-config.controller.js";
import { ContentConfigService } from "./modules/content-config/content-config.service.js";
import { PrismaContentConfigRepository } from "./modules/content-config/prisma-content-config.repository.js";
import { FieldDefinitionsService } from "./modules/content-config/field-definitions.service.js";
import { PrismaFieldDefinitionsRepository } from "./modules/content-config/prisma-field-definitions.repository.js";
import { PrismaProjectSupportRepository } from "./modules/project-support/prisma-project-support.repository.js";
import { ProjectSupportController } from "./modules/project-support/project-support.controller.js";
import { ProjectSupportService } from "./modules/project-support/project-support.service.js";
import { PrismaSupplyQualityRepository } from "./modules/supply-quality/prisma-supply-quality.repository.js";
import { SupplyQualityController } from "./modules/supply-quality/supply-quality.controller.js";
import { SupplyQualityService } from "./modules/supply-quality/supply-quality.service.js";
import { AdminCatalogController } from "./modules/pim/admin-catalog.controller.js";
import { AdminCatalogService } from "./modules/pim/admin-catalog.service.js";
import { PrismaAdminCatalogRepository } from "./modules/pim/prisma-admin-catalog.repository.js";

export interface ProductionDependencies {
  readonly prisma: PrismaClient;
  readonly appDependencies: AppDependencies;
}

export function createProductionDependencies(
  environment: AppEnvironment
): ProductionDependencies {
  const prisma = createPrismaClient(environment.DATABASE_URL);
  const pimController = new PimController(new PimService(new PrismaPimRepository(prisma)));
  const solutionAssetsController = new SolutionAssetsController(
    new SolutionAssetsService(new PrismaSolutionAssetsRepository(prisma))
  );
  const documentsController = new DocumentsController(new DocumentsService(new PrismaDocumentsRepository(prisma)));
  const selectionController = new SelectionController(new SelectionService(new PrismaSelectionRepository(prisma)));
  const iamController = new IamController(
    new IamService(new PrismaIamRepository(prisma), environment.ACCESS_TOKEN_SECRET)
  );
  const authenticationMiddleware = createOptionalAuthenticationMiddleware(prisma, environment.ACCESS_TOKEN_SECRET);
  const objectStorage = new S3ObjectStorageAdapter({
    endPoint: environment.S3_ENDPOINT,
    port: environment.S3_PORT,
    useSSL: environment.S3_USE_SSL,
    accessKey: environment.S3_ACCESS_KEY,
    secretKey: environment.S3_SECRET_KEY,
    bucket: environment.S3_BUCKET
  });
  const fileAccessController = new FileAccessController(
    new FileAccessService(new PrismaFileAccessRepository(prisma), objectStorage),
    environment.ACCESS_TOKEN_SECRET
  );
  const contentConfigController = new ContentConfigController(
    new ContentConfigService(new PrismaContentConfigRepository(prisma)),
    new FieldDefinitionsService(new PrismaFieldDefinitionsRepository(prisma))
  );
  const projectSupportController = new ProjectSupportController(
    new ProjectSupportService(new PrismaProjectSupportRepository(prisma))
  );
  const supplyQualityController = new SupplyQualityController(
    new SupplyQualityService(new PrismaSupplyQualityRepository(prisma))
  );
  const adminCatalogController = new AdminCatalogController(
    new AdminCatalogService(new PrismaAdminCatalogRepository(prisma), objectStorage)
  );
  return {
    prisma,
    appDependencies: {
      pimController,
      solutionAssetsController,
      documentsController,
      selectionController,
      iamController,
      authenticationMiddleware,
      fileAccessController,
      contentConfigController,
      projectSupportController,
      supplyQualityController,
      adminCatalogController
    }
  };
}

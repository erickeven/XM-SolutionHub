import express, { type Express } from "express";
import type { PimController } from "./modules/pim/pim.controller.js";
import { createPimRouter } from "./modules/pim/pim.routes.js";
import type { SolutionAssetsController } from "./modules/solution-assets/solution-assets.controller.js";
import { createSolutionAssetsRouter } from "./modules/solution-assets/solution-assets.routes.js";
import type { DocumentsController } from "./modules/solution-assets/documents.controller.js";
import { createDocumentsRouter } from "./modules/solution-assets/documents.routes.js";
import type { SelectionController } from "./modules/selection/selection.controller.js";
import { createSelectionRouter } from "./modules/selection/selection.routes.js";
import type { IamController } from "./modules/iam/iam.controller.js";
import { createIamRouter } from "./modules/iam/iam.routes.js";
import type { RequestHandler } from "express";
import type { FileAccessController } from "./modules/solution-assets/file-access.controller.js";
import { createDocumentAccessRouter, createFileAccessRouter } from "./modules/solution-assets/file-access.routes.js";
import type { ContentConfigController } from "./modules/content-config/content-config.controller.js";
import { createContentConfigRouter } from "./modules/content-config/content-config.routes.js";
import type { ProjectSupportController } from "./modules/project-support/project-support.controller.js";
import { createProjectSupportRouter } from "./modules/project-support/project-support.routes.js";
import type { SupplyQualityController } from "./modules/supply-quality/supply-quality.controller.js";
import { createSupplyQualityRouter } from "./modules/supply-quality/supply-quality.routes.js";
import type { AdminCatalogController } from "./modules/pim/admin-catalog.controller.js";
import { createAdminCatalogRouter } from "./modules/pim/admin-catalog.routes.js";
import { sendSuccess } from "./shared/http/api-response.js";
import { errorMiddleware, notFoundMiddleware, traceMiddleware } from "./shared/http/middleware.js";

export interface AppDependencies {
  readonly pimController: PimController;
  readonly solutionAssetsController: SolutionAssetsController;
  readonly documentsController: DocumentsController;
  readonly selectionController: SelectionController;
  readonly iamController: IamController;
  readonly authenticationMiddleware: RequestHandler;
  readonly fileAccessController: FileAccessController;
  readonly contentConfigController: ContentConfigController;
  readonly projectSupportController: ProjectSupportController;
  readonly supplyQualityController: SupplyQualityController;
  readonly adminCatalogController: AdminCatalogController;
}

export function createApp(dependencies: AppDependencies): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));
  app.use(traceMiddleware);
  app.use(dependencies.authenticationMiddleware);

  app.get("/api/v1/health", (_request, response) => {
    sendSuccess(response, { service: "api", status: "ok" });
  });
  app.use("/api/v1/products", createPimRouter(dependencies.pimController));
  app.use("/api/v1/solutions", createSolutionAssetsRouter(dependencies.solutionAssetsController));
  app.use("/api/v1/documents", createDocumentsRouter(dependencies.documentsController));
  app.use("/api/v1/documents", createDocumentAccessRouter(dependencies.fileAccessController));
  app.use("/api/v1/files", createFileAccessRouter(dependencies.fileAccessController));
  app.use("/api/v1/selection", createSelectionRouter(dependencies.selectionController));
  app.use("/api/v1/iam", createIamRouter(dependencies.iamController));
  app.use("/api/v1/admin/configuration", createContentConfigRouter(dependencies.contentConfigController));
  app.use("/api/v1/customer", createProjectSupportRouter(dependencies.projectSupportController));
  app.use("/api/v1/internal", createSupplyQualityRouter(dependencies.supplyQualityController));
  app.use("/api/v1/admin/catalog", createAdminCatalogRouter(dependencies.adminCatalogController));

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
  return app;
}

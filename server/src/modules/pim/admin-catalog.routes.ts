import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import type { AdminCatalogController } from "./admin-catalog.controller.js";

export function createAdminCatalogRouter(controller: AdminCatalogController): Router {
  const router = Router();
  router.post("/products", asyncHandler(controller.createProduct));
  router.post("/products/:productCode/publish", asyncHandler(controller.publishProduct));
  router.post("/products/:productCode/documents", asyncHandler(controller.linkProductDocument));
  router.post("/solutions", asyncHandler(controller.createSolution));
  router.post("/solutions/:solutionCode/versions/:version/publish", asyncHandler(controller.publishSolution));
  router.post("/solutions/:solutionCode/versions/:version/documents", asyncHandler(controller.linkSolutionDocument));
  router.put(
    "/documents/:documentCode/versions/:version/original",
    controller.rawPdf,
    asyncHandler(controller.uploadDocument)
  );
  router.post("/documents/:documentCode/versions/:version/publish", asyncHandler(controller.publishDocument));
  return router;
}

import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import type { DocumentsController } from "./documents.controller.js";

export function createDocumentsRouter(controller: DocumentsController): Router {
  const router = Router();
  router.get("/", asyncHandler(controller.search));
  router.get("/:documentCode/preview-policy", asyncHandler(controller.previewPolicy));
  return router;
}

import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import type { FileAccessController } from "./file-access.controller.js";

export function createFileAccessRouter(controller: FileAccessController): Router {
  const router = Router();
  router.get("/:token", asyncHandler(controller.stream));
  return router;
}

export function createDocumentAccessRouter(controller: FileAccessController): Router {
  const router = Router();
  router.post("/:documentCode/access", asyncHandler(controller.issue));
  return router;
}

import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import type { PimController } from "./pim.controller.js";

export function createPimRouter(controller: PimController): Router {
  const router = Router();
  router.get("/", asyncHandler(controller.search));
  router.get("/:productCode", asyncHandler(controller.detail));
  return router;
}

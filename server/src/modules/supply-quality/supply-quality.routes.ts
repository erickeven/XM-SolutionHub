import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import type { SupplyQualityController } from "./supply-quality.controller.js";

export function createSupplyQualityRouter(controller: SupplyQualityController): Router {
  const router = Router();
  router.get("/workbench", asyncHandler(controller.workbench));
  router.post("/support/:ticketCode/assign", asyncHandler(controller.assign));
  router.post("/support/:ticketCode/resolve", asyncHandler(controller.resolve));
  return router;
}

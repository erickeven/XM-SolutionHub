import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import type { SolutionAssetsController } from "./solution-assets.controller.js";

export function createSolutionAssetsRouter(controller: SolutionAssetsController): Router {
  const router = Router();
  router.get("/", asyncHandler(controller.search));
  router.get("/:solutionCode", asyncHandler(controller.detail));
  return router;
}

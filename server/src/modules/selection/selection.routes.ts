import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import type { SelectionController } from "./selection.controller.js";

export function createSelectionRouter(controller: SelectionController): Router {
  const router = Router();
  router.post("/match", asyncHandler(controller.match));
  return router;
}

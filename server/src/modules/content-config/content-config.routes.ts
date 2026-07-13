import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import type { ContentConfigController } from "./content-config.controller.js";

export function createContentConfigRouter(controller: ContentConfigController): Router {
  const router = Router();
  router.get("/versions", asyncHandler(controller.list));
  router.post("/versions", asyncHandler(controller.createDraft));
  router.post("/versions/:version/publish", asyncHandler(controller.publish));
  router.post("/versions/:version/rollback", asyncHandler(controller.rollback));
  router.get("/versions/:version/fields", asyncHandler(controller.listFields));
  router.put("/versions/:version/fields", asyncHandler(controller.upsertField));
  return router;
}

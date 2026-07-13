import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import type { ProjectSupportController } from "./project-support.controller.js";

export function createProjectSupportRouter(controller: ProjectSupportController): Router {
  const router = Router();
  router.get("/workspace", asyncHandler(controller.workspace));
  router.post("/organizations", asyncHandler(controller.createOrganization));
  router.post("/projects", asyncHandler(controller.createProject));
  router.post("/tickets", asyncHandler(controller.createTicket));
  router.post("/sample-requests", asyncHandler(controller.createSampleRequest));
  router.post("/rfq-requests", asyncHandler(controller.createRfqRequest));
  return router;
}

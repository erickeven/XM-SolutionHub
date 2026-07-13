import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import type { IamController } from "./iam.controller.js";

export function createIamRouter(controller: IamController): Router {
  const router = Router();
  router.post("/register", asyncHandler(controller.register));
  router.post("/login", asyncHandler(controller.login));
  router.post("/refresh", asyncHandler(controller.refresh));
  return router;
}

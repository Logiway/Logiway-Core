import { Router } from "express";
import { validateSmartRouteRequest } from "../middleware/validateSmartRouteRequest.js";

export function createSmartRouteRouter(controller) {
  const router = Router();
  router.post(
    "/calculate-smart-route",
    validateSmartRouteRequest,
    controller.calculate,
  );
  return router;
}

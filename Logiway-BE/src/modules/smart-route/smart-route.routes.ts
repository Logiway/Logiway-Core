import { Router, type Router as ExpressRouter } from "express";
import type { SmartRouteController } from "../../types/api.js";
import { validateSmartRouteRequest } from "./smart-route.schema.js";

export function createSmartRouteRouter(controller: SmartRouteController): ExpressRouter {
  const router = Router();
  router.post("/calculate-smart-route", validateSmartRouteRequest, controller.calculate);
  return router;
}

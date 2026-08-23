import { Router, type Router as ExpressRouter } from "express";
import type { LocationController } from "../../types/api.js";
import { validateLocationSearchRequest } from "./location.schema.js";

export function createLocationRouter(controller: LocationController): ExpressRouter {
  const router = Router();
  router.get("/locations", validateLocationSearchRequest, controller.search);
  return router;
}

import { Router } from "express";
import { validateLocationSearchRequest } from "../middleware/validateLocationSearchRequest.js";

export function createLocationRouter(controller) {
  const router = Router();
  router.get("/locations", validateLocationSearchRequest, controller.search);
  return router;
}

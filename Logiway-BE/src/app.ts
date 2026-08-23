import express, { type Express } from "express";
import { createCorsMiddleware } from "./config/cors.js";
import { createErrorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFoundHandler.js";
import { requestId } from "./middleware/requestId.js";
import { createRequestLogger } from "./middleware/requestLogger.js";
import { createLocationController } from "./modules/location/location.controller.js";
import { createLocationRouter } from "./modules/location/location.routes.js";
import { createSmartRouteController } from "./modules/smart-route/smart-route.controller.js";
import { createSmartRouteRouter } from "./modules/smart-route/smart-route.routes.js";
import type { AppContainer } from "./types/config.js";

export function createApp({ config, logger, locationService, smartRouteService }: AppContainer): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(requestId);
  app.use(createRequestLogger(logger));
  app.use(createCorsMiddleware(config.corsOrigin));
  app.use(express.json({ limit: "16kb" }));
  app.get("/health", (request, response) => response.json({ status: "ok" }));
  app.use("/api", createLocationRouter(createLocationController(locationService)));
  app.use("/api", createSmartRouteRouter(createSmartRouteController(smartRouteService)));
  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));
  return app;
}

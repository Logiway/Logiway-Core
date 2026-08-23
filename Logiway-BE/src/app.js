import express from "express";
import cors from "cors";
import { createLocationController } from "./controllers/locationController.js";
import { createSmartRouteController } from "./controllers/smartRouteController.js";
import { createErrorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFoundHandler.js";
import { createLocationRouter } from "./routes/locationRoutes.js";
import { createSmartRouteRouter } from "./routes/smartRouteRoutes.js";

function createCorsOptions(corsOrigin) {
  if (!corsOrigin) return {};
  const allowedOrigins = new Set(
    corsOrigin.split(",").map((origin) => origin.trim()).filter(Boolean),
  );

  return {
    origin(origin, callback) {
      callback(null, !origin || allowedOrigins.has(origin));
    },
  };
}

export function createApp({ calculateSmartRoute, searchLocations, corsOrigin, logger }) {
  const app = express();
  const locationController = createLocationController(searchLocations);
  const smartRouteController = createSmartRouteController(calculateSmartRoute);

  app.disable("x-powered-by");
  app.use(cors(createCorsOptions(corsOrigin)));
  app.use(express.json({ limit: "16kb" }));
  app.get("/health", (request, response) => response.json({ status: "ok" }));
  app.use("/api", createLocationRouter(locationController));
  app.use("/api", createSmartRouteRouter(smartRouteController));
  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));

  return app;
}

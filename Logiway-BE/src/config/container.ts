import { LocationService } from "../modules/location/location.service.js";
import { NominatimRepository } from "../modules/location/location.repository.js";
import { SmartRouteService } from "../modules/smart-route/smart-route.service.js";
import { FallbackRouteGeocodingRepository } from "../modules/smart-route/repositories/fallback-route-geocoding.repository.js";
import { IndoBertRiskRepository } from "../modules/smart-route/repositories/indobert-risk.repository.js";
import { GraphHopperRepository } from "../modules/smart-route/repositories/graph-hopper.repository.js";
import { OverpassRouteFacilityRepository } from "../modules/smart-route/repositories/overpass-route-facility.repository.js";
import type { AppContainer, CreateContainerOptions } from "../types/config.js";
import { loadConfig } from "./environment.js";
import { logger as defaultLogger } from "./logger.js";

export function createContainer({
  environment = process.env,
  fetchImplementation = fetch,
  logger = defaultLogger,
}: CreateContainerOptions = {}): AppContainer {
  const config = loadConfig(environment);

  const placeGeocodingRepository = new NominatimRepository({
    baseUrl: config.nominatimUrl,
    fetchImplementation,
    timeoutMs: config.requestTimeoutMs,
  });

  const geocodingRepository = new FallbackRouteGeocodingRepository({
    primaryRepository: {
      geocodeRoute: () => Promise.reject(new Error("Primary geocoding skipped")),
    },
    fallbackPlaceRepository: placeGeocodingRepository,
    logger,
  });

  // Risk Assessment menggunakan IndoBERT lokal via Python
  const riskRepository = new IndoBertRiskRepository({
    pythonExec: config.pythonExec || (process.platform === "win32" ? "py" : "python3"),
    ...(config.modelPath ? { modelPath: config.modelPath } : {}),
    logger,
  });

  const routingRepository = new GraphHopperRepository({
    url: config.graphHopperUrl,
    fetchImplementation,
    timeoutMs: config.graphHopperTimeoutMs,
  });

  const routeFacilityRepository = new OverpassRouteFacilityRepository({
    urls: config.overpassUrls,
    fetchImplementation,
    timeoutMs: config.overpassTimeoutMs,
  });

  const smartRouteService = new SmartRouteService({
    geocodingRepository,
    riskRepository,
    placeGeocodingRepository,
    routingRepository,
    routeFacilityRepository,
    logger,
  });

  const locationService = new LocationService({ placeGeocodingRepository });

  return { config, logger, locationService, smartRouteService };
}


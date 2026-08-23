import { loadConfig } from "./config/environment.js";
import { logger as defaultLogger } from "./config/logger.js";
import { FallbackRouteGeocodingRepository } from "./infrastructure/repositories/FallbackRouteGeocodingRepository.js";
import { GraphHopperRepository } from "./infrastructure/repositories/GraphHopperRepository.js";
import { IndoBertRiskRepository } from "./infrastructure/repositories/indoBertRiskRepository.js";
import { NominatimRepository } from "./infrastructure/repositories/NominatimRepository.js";
import { NoOpRouteFacilityRepository } from "./infrastructure/repositories/NoOpRouteFacilityRepository.js";
import { CalculateSmartRoute } from "./services/CalculateSmartRoute.js";
import { SearchLocations } from "./services/SearchLocations.js";

export function createContainer({
  environment = process.env,
  fetchImplementation = fetch,
  logger = defaultLogger,
} = {}) {
  const config = loadConfig(environment);

  const placeGeocodingRepository = new NominatimRepository({
    baseUrl: config.nominatimUrl,
    fetchImplementation,
    timeoutMs: config.requestTimeoutMs,
  });

  const geocodingRepository = new FallbackRouteGeocodingRepository({
    primaryRepository: {
      geocodeRoute: () => {
        throw new Error("Primary geocoding skipped");
      },
    },
    fallbackPlaceRepository: placeGeocodingRepository,
    logger,
  });

  // Risk Assessment menggunakan IndoBERT lokal via Python
  const riskRepository = new IndoBertRiskRepository({
    pythonExec: config.pythonExec || (process.platform === "win32" ? "py" : "python3"),
    modelPath: config.modelPath,
    logger,
  });

  const routingRepository = new GraphHopperRepository({
    url: config.graphHopperUrl,
    fetchImplementation,
    timeoutMs: config.graphHopperTimeoutMs,
  });

  const routeFacilityRepository = new NoOpRouteFacilityRepository();

  const calculateSmartRoute = new CalculateSmartRoute({
    geocodingRepository,
    riskRepository,
    placeGeocodingRepository,
    routingRepository,
    routeFacilityRepository,
    logger,
  });

  const searchLocations = new SearchLocations({ placeGeocodingRepository });

  return { config, logger, calculateSmartRoute, searchLocations };
}
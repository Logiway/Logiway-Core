import { GoogleGenAI } from "@google/genai";
import { loadConfig } from "./config/environment.js";
import { logger as defaultLogger } from "./config/logger.js";
import { FallbackRouteGeocodingRepository } from "./infrastructure/repositories/FallbackRouteGeocodingRepository.js";
import { GraphHopperRepository } from "./infrastructure/repositories/GraphHopperRepository.js";
import {
  GeminiRouteGeocodingRepository,
  GeminiRiskRepository,
} from "./infrastructure/repositories/GeminiRepositories.js";
import { NominatimRepository } from "./infrastructure/repositories/NominatimRepository.js";
import { OverpassRouteFacilityRepository } from "./infrastructure/repositories/OverpassRouteFacilityRepository.js";
import { CalculateSmartRoute } from "./services/CalculateSmartRoute.js";
import { SearchLocations } from "./services/SearchLocations.js";

export function createContainer({
  environment = process.env,
  fetchImplementation = fetch,
  logger = defaultLogger,
} = {}) {
  const config = loadConfig(environment);
  if (!config.geminiApiKey) throw new Error("GEMINI_API_KEY is required");

  const geminiClient = new GoogleGenAI({ apiKey: config.geminiApiKey });
  const placeGeocodingRepository = new NominatimRepository({
    baseUrl: config.nominatimUrl,
    fetchImplementation,
    timeoutMs: config.requestTimeoutMs,
  });
  const primaryGeocodingRepository = new GeminiRouteGeocodingRepository({
    client: geminiClient,
    timeoutMs: config.geminiTimeoutMs,
  });
  const geocodingRepository = new FallbackRouteGeocodingRepository({
    primaryRepository: primaryGeocodingRepository,
    fallbackPlaceRepository: placeGeocodingRepository,
    logger,
  });
  const riskRepository = new GeminiRiskRepository({
    client: geminiClient,
    timeoutMs: config.geminiTimeoutMs,
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

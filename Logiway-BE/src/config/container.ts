import { GoogleGenAI } from "@google/genai";
import { LocationService } from "../modules/location/location.service.js";
import { NominatimRepository } from "../modules/location/location.repository.js";
import { SmartRouteService } from "../modules/smart-route/smart-route.service.js";
import { FallbackRouteGeocodingRepository } from "../modules/smart-route/repositories/fallback-route-geocoding.repository.js";
import { GeminiRouteGeocodingRepository } from "../modules/smart-route/repositories/gemini-route-geocoding.repository.js";
import { GeminiRiskRepository } from "../modules/smart-route/repositories/gemini-risk.repository.js";
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
  if (!config.geminiApiKey) throw new Error("GEMINI_API_KEY is required");

  const geminiClient = new GoogleGenAI({ apiKey: config.geminiApiKey });
  const placeGeocodingRepository = new NominatimRepository({
    baseUrl: config.nominatimUrl,
    fetchImplementation,
    timeoutMs: config.requestTimeoutMs,
  });
  const primaryRepository = new GeminiRouteGeocodingRepository({
    client: geminiClient,
    timeoutMs: config.geminiTimeoutMs,
  });
  const geocodingRepository = new FallbackRouteGeocodingRepository({
    primaryRepository,
    fallbackPlaceRepository: placeGeocodingRepository,
    logger,
  });
  const riskRepository = new GeminiRiskRepository({ client: geminiClient, timeoutMs: config.geminiTimeoutMs });
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

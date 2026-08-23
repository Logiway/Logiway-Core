import type { LocationService } from "../modules/location/location.service.js";
import type { SmartRouteService } from "../modules/smart-route/smart-route.service.js";
import type { Logger } from "./logger.js";

export interface AppConfig {
  port: number;
  corsOrigin?: string;
  graphHopperUrl: string;
  graphHopperTimeoutMs: number;
  nominatimUrl: string;
  overpassUrls: string[];
  overpassTimeoutMs: number;
  requestTimeoutMs: number;
  pythonExec?: string;
  modelPath?: string;
}

export interface AppContainer {
  config: AppConfig;
  logger: Logger;
  locationService: LocationService;
  smartRouteService: SmartRouteService;
}

export interface CreateContainerOptions {
  environment?: NodeJS.ProcessEnv;
  fetchImplementation?: typeof fetch;
  logger?: Logger;
}

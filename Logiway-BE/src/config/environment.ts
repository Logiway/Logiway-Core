import type { AppConfig } from "../types/config.js";

const DEFAULT_PORT = 6767;
const DEFAULT_GRAPHHOPPER_URL = "http://graphhopper:8989/route";
const DEFAULT_NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const DEFAULT_OVERPASS_URLS: string[] = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_GRAPHHOPPER_TIMEOUT_MS = 120000;
const DEFAULT_OVERPASS_TIMEOUT_MS = 12000;

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseOverpassUrls(environment: Record<string, string | undefined>): string[] {
  const configured = environment.OVERPASS_URLS?.trim() || environment.OVERPASS_URL?.trim();
  if (!configured) return DEFAULT_OVERPASS_URLS;

  const urls = configured
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 3);
    
  if (urls.length === 0) throw new Error("OVERPASS_URLS must not be empty");
  
  for (const value of urls) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new Error("OVERPASS_URLS must contain valid HTTPS URLs");
    }
    if (url.protocol !== "https:") {
      throw new Error("OVERPASS_URLS must contain valid HTTPS URLs");
    }
  }
  return urls;
}

export function loadConfig(
  environment: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
): AppConfig {
  const corsOrigin = environment.CORS_ORIGIN?.trim();
  const pythonExec = environment.PYTHON_EXEC?.trim();
  const modelPath = environment.MODEL_PATH?.trim();

  return {
    port: parsePositiveInteger(environment.PORT, DEFAULT_PORT),
    ...(corsOrigin ? { corsOrigin } : {}),
    graphHopperUrl: environment.GRAPHHOPPER_URL?.trim() || DEFAULT_GRAPHHOPPER_URL,
    graphHopperTimeoutMs: parsePositiveInteger(
      environment.GRAPHHOPPER_TIMEOUT_MS,
      DEFAULT_GRAPHHOPPER_TIMEOUT_MS,
    ),
    nominatimUrl: environment.NOMINATIM_URL?.trim() || DEFAULT_NOMINATIM_URL,
    overpassUrls: parseOverpassUrls(environment),
    overpassTimeoutMs: parsePositiveInteger(
      environment.OVERPASS_TIMEOUT_MS,
      DEFAULT_OVERPASS_TIMEOUT_MS,
    ),
    requestTimeoutMs: parsePositiveInteger(
      environment.REQUEST_TIMEOUT_MS,
      DEFAULT_TIMEOUT_MS,
    ),
    ...(pythonExec ? { pythonExec } : {}),
    ...(modelPath ? { modelPath } : {}),
  };
}
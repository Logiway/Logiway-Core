import { GoogleGenAI } from "@google/genai";
import type { RouteGeocodingInput, RouteLocations } from "../../../types/location.js";
import type { GeminiClient, GeminiRepositoryOptions } from "../../../types/providers.js";
import type { RouteGeocodingRepository } from "../../../types/routing.js";
import { isCoordinate, requireCoordinate } from "../../../utils/coordinates.js";

const MODEL = "gemini-3.6-flash";
const DEFAULT_TIMEOUT_MS = 30000;
const GEOCODING_SCHEMA: unknown = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["geocoding"],
  properties: {
    geocoding: {
      type: "object",
      additionalProperties: false,
      required: ["origin", "destination"],
      properties: {
        origin: { $ref: "#/$defs/location" },
        destination: { $ref: "#/$defs/location" },
      },
    },
  },
  $defs: {
    location: {
      type: "object",
      additionalProperties: false,
      required: ["name", "coordinates"],
      properties: {
        name: { type: "string" },
        coordinates: { type: "array", minItems: 2, maxItems: 2, items: { type: "number" } },
      },
    },
  },
});

const GEOCODING_INSTRUCTION = `
Kamu adalah Logistics Geocoding Agent untuk Indonesia.
TUGAS: Dapatkan koordinat longitude dan latitude yang sangat akurat di Indonesia untuk asal dan tujuan.

FORMAT OUTPUT JSON MURNI:
{
  "geocoding": {
    "origin": { "name": "Nama Asal", "coordinates": [longitude, latitude] },
    "destination": { "name": "Nama Tujuan", "coordinates": [longitude, latitude] }
  }
}
`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function createClient(apiKey: string | undefined, client: GeminiClient | undefined): GeminiClient {
  if (client) return client;
  if (!apiKey) throw new Error("GEMINI_API_KEY is required");
  return new GoogleGenAI({ apiKey });
}

function parseRouteLocations(text: string | undefined): RouteLocations {
  if (typeof text !== "string") throw new Error("Gemini returned an empty response");
  const value: unknown = JSON.parse(text);
  if (!isRecord(value) || !isRecord(value.geocoding)) throw new Error("Gemini returned invalid geocoding data");
  const { origin, destination } = value.geocoding;
  if (
    !isRecord(origin) ||
    typeof origin.name !== "string" ||
    !isCoordinate(origin.coordinates) ||
    !isRecord(destination) ||
    typeof destination.name !== "string" ||
    !isCoordinate(destination.coordinates)
  ) throw new Error("Gemini returned invalid geocoding data");
  requireCoordinate(origin.coordinates, "origin");
  requireCoordinate(destination.coordinates, "destination");
  return {
    origin: { name: origin.name, coordinates: origin.coordinates },
    destination: { name: destination.name, coordinates: destination.coordinates },
  };
}

export class GeminiRouteGeocodingRepository implements RouteGeocodingRepository {
  readonly #client: GeminiClient;
  readonly #timeoutMs: number;

  constructor({ apiKey, client, timeoutMs = DEFAULT_TIMEOUT_MS }: GeminiRepositoryOptions) {
    this.#client = createClient(apiKey, client);
    this.#timeoutMs = timeoutMs;
  }

  async geocodeRoute({ origin, dest }: RouteGeocodingInput): Promise<RouteLocations> {
    const response = await this.#client.models.generateContent({
      model: MODEL,
      contents: `Origin: ${origin}, Destination: ${dest}`,
      config: {
        systemInstruction: GEOCODING_INSTRUCTION,
        responseMimeType: "application/json",
        responseJsonSchema: GEOCODING_SCHEMA,
        temperature: 0.1,
        httpOptions: { timeout: this.#timeoutMs },
      },
    });
    return parseRouteLocations(response.text);
  }
}

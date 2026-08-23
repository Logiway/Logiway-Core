import { GoogleGenAI } from "@google/genai";
import { requireCoordinate } from "../../domain/entities/coordinate.js";
import { normalizeRiskPoints } from "../../domain/services/routingRisk.js";
import { RouteGeocodingRepository } from "../../repositories/RouteGeocodingRepository.js";
import { RiskRepository } from "../../repositories/RiskRepository.js";

const MODEL = "gemini-3.6-flash";
const DEFAULT_TIMEOUT_MS = 30000;
const GEOCODING_SCHEMA = Object.freeze({
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
        coordinates: {
          type: "array",
          minItems: 2,
          maxItems: 2,
          items: { type: "number" },
        },
      },
    },
  },
});
const RISK_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["pungli_points"],
  properties: {
    pungli_points: {
      type: "array",
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["location_name", "severity", "note"],
        properties: {
          location_name: { type: "string" },
          severity: { type: "integer", minimum: 1, maximum: 10 },
          note: { type: "string" },
        },
      },
    },
  },
});

function responseConfig(timeoutMs, responseJsonSchema) {
  return {
    responseMimeType: "application/json",
    responseJsonSchema,
    temperature: 0.1,
    httpOptions: { timeout: timeoutMs },
  };
}

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

const RISK_INSTRUCTION = `
Kamu adalah agent riset yang mencari LAPORAN titik pungutan liar (pungli)
di jalur logistik/truk Indonesia. HANYA laporkan titik yang punya sumber
dari hasil pencarian (berita, laporan resmi, forum sopir truk). JANGAN
mengarang lokasi. Kalau tidak ada data, kembalikan array kosong.

Untuk tiap titik sertakan:
- location_name: nama jalan/pos/jembatan timbang/pasar spesifik (bukan koordinat)
- severity: skor 1-10 (10 = paling parah/sering/nominal besar)
- note: ringkasan singkat kenapa dianggap titik pungli

FORMAT OUTPUT JSON MURNI:
{ "pungli_points": [ { "location_name": "...", "severity": 0, "note": "..." } ] }
`;

function parseJsonResponse(response) {
  if (typeof response.text !== "string") {
    throw new Error("Gemini returned an empty response");
  }

  return JSON.parse(response.text);
}

export class GeminiRouteGeocodingRepository extends RouteGeocodingRepository {
  constructor({ apiKey, client, timeoutMs = DEFAULT_TIMEOUT_MS }) {
    super();
    if (!apiKey && !client) throw new Error("GEMINI_API_KEY is required");
    this.client = client ?? new GoogleGenAI({ apiKey });
    this.timeoutMs = timeoutMs;
  }

  async geocodeRoute({ origin, dest }) {
    const response = await this.client.models.generateContent({
      model: MODEL,
      contents: `Origin: ${origin}, Destination: ${dest}`,
      config: {
        systemInstruction: GEOCODING_INSTRUCTION,
        ...responseConfig(this.timeoutMs, GEOCODING_SCHEMA),
      },
    });
    const data = parseJsonResponse(response);
    const geocoding = data.geocoding;

    if (!geocoding?.origin || !geocoding?.destination) {
      throw new Error("Gemini returned invalid geocoding data");
    }

    requireCoordinate(geocoding.origin.coordinates, "origin");
    requireCoordinate(geocoding.destination.coordinates, "destination");
    return geocoding;
  }
}

export class GeminiRiskRepository extends RiskRepository {
  constructor({ apiKey, client, timeoutMs = DEFAULT_TIMEOUT_MS }) {
    super();
    if (!apiKey && !client) throw new Error("GEMINI_API_KEY is required");
    this.client = client ?? new GoogleGenAI({ apiKey });
    this.timeoutMs = timeoutMs;
  }

  async findRouteRisks({ origin, dest }) {
    const response = await this.client.models.generateContent({
      model: MODEL,
      contents: `Cari titik pungli untuk rute truk dari ${origin} menuju ${dest} di Indonesia.`,
      config: {
        systemInstruction: RISK_INSTRUCTION,
        tools: [{ googleSearch: {} }],
        ...responseConfig(this.timeoutMs, RISK_SCHEMA),
      },
    });
    const data = parseJsonResponse(response);
    return normalizeRiskPoints(data.pungli_points);
  }
}

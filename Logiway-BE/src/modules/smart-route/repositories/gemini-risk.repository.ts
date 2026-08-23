import { GoogleGenAI } from "@google/genai";
import type { RouteGeocodingInput } from "../../../types/location.js";
import type { GeminiClient, GeminiRepositoryOptions } from "../../../types/providers.js";
import type { RiskPoint, RiskRepository } from "../../../types/routing.js";
import { normalizeRiskPoints } from "../smart-route-risk.js";

const MODEL = "gemini-3.6-flash";
const DEFAULT_TIMEOUT_MS = 30000;
const RISK_SCHEMA: unknown = Object.freeze({
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function createClient(apiKey: string | undefined, client: GeminiClient | undefined): GeminiClient {
  if (client) return client;
  if (!apiKey) throw new Error("GEMINI_API_KEY is required");
  return new GoogleGenAI({ apiKey });
}

export class GeminiRiskRepository implements RiskRepository {
  readonly #client: GeminiClient;
  readonly #timeoutMs: number;

  constructor({ apiKey, client, timeoutMs = DEFAULT_TIMEOUT_MS }: GeminiRepositoryOptions) {
    this.#client = createClient(apiKey, client);
    this.#timeoutMs = timeoutMs;
  }

  async findRouteRisks({ origin, dest }: RouteGeocodingInput): Promise<RiskPoint[]> {
    const response = await this.#client.models.generateContent({
      model: MODEL,
      contents: `Cari titik pungli untuk rute truk dari ${origin} menuju ${dest} di Indonesia.`,
      config: {
        systemInstruction: RISK_INSTRUCTION,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseJsonSchema: RISK_SCHEMA,
        temperature: 0.1,
        httpOptions: { timeout: this.#timeoutMs },
      },
    });
    if (typeof response.text !== "string") throw new Error("Gemini returned an empty response");
    const data: unknown = JSON.parse(response.text);
    return normalizeRiskPoints(isRecord(data) ? data.pungli_points : undefined);
  }
}

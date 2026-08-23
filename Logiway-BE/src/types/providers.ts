import type { GenerateContentParameters, GenerateContentResponse } from "@google/genai";

export interface GeminiClient {
  models: {
    generateContent(params: GenerateContentParameters): Promise<GenerateContentResponse>;
  };
}

export interface GeminiRepositoryOptions {
  apiKey?: string;
  client?: GeminiClient;
  timeoutMs?: number;
}

export interface GraphHopperRepositoryOptions {
  url: string;
  fetchImplementation?: typeof fetch;
  timeoutMs?: number;
}

export interface OverpassRouteFacilityRepositoryOptions {
  urls: string[];
  fetchImplementation?: typeof fetch;
  timeoutMs?: number;
}

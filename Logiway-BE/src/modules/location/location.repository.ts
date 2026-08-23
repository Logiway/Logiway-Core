import { isCoordinate } from "../../utils/coordinates.js";
import type {
  Coordinate,
  LocationSearchResult,
  NominatimRepositoryOptions,
  PlaceGeocodingRepository,
} from "../../types/location.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export class NominatimRepository implements PlaceGeocodingRepository {
  readonly #baseUrl: string;
  readonly #fetch: typeof fetch;
  readonly #timeoutMs: number;

  constructor({ baseUrl, fetchImplementation = fetch, timeoutMs = 15000 }: NominatimRepositoryOptions) {
    this.#baseUrl = baseUrl;
    this.#fetch = fetchImplementation;
    this.#timeoutMs = timeoutMs;
  }

  async search(query: string, limit = 5): Promise<LocationSearchResult[]> {
    const normalizedLimit = Math.min(Math.max(Number.parseInt(String(limit), 10) || 1, 1), 5);
    const url = new URL(this.#baseUrl);
    url.search = new URLSearchParams({
      q: query,
      format: "json",
      countrycodes: "id",
      limit: String(normalizedLimit),
    }).toString();

    const response = await this.#fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Logiway-Core/1.0 location-search",
      },
      signal: AbortSignal.timeout(this.#timeoutMs),
    });
    if (!response.ok) throw new Error("Nominatim request failed");
    const data: unknown = await response.json();
    if (!Array.isArray(data)) throw new Error("Nominatim response invalid");

    return data.slice(0, normalizedLimit).flatMap((place): LocationSearchResult[] => {
      if (!isRecord(place)) return [];
      const displayName = typeof place.display_name === "string" ? place.display_name.trim() : "";
      if (
        !displayName ||
        displayName.length > 500 ||
        typeof place.lon !== "string" ||
        typeof place.lat !== "string" ||
        !place.lon.trim() ||
        !place.lat.trim()
      ) return [];

      const coordinates: unknown = [Number(place.lon), Number(place.lat)];
      return isCoordinate(coordinates) ? [{ displayName, coordinates }] : [];
    });
  }

  async geocode(placeName: string): Promise<Coordinate | null> {
    const places = await this.search(`${placeName}, Indonesia`, 1);
    return places[0]?.coordinates ?? null;
  }
}

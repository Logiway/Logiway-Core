import { isCoordinate } from "../../domain/entities/coordinate.js";
import { PlaceGeocodingRepository } from "../../repositories/PlaceGeocodingRepository.js";

export class NominatimRepository extends PlaceGeocodingRepository {
  constructor({ baseUrl, fetchImplementation = fetch, timeoutMs = 15000 }) {
    super();
    this.baseUrl = baseUrl;
    this.fetch = fetchImplementation;
    this.timeoutMs = timeoutMs;
  }

  async search(query, limit = 5) {
    const normalizedLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 1, 1), 5);
    const url = new URL(this.baseUrl);
    url.search = new URLSearchParams({
      q: query,
      format: "json",
      countrycodes: "id",
      limit: String(normalizedLimit),
    }).toString();

    const response = await this.fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Logiway-Core/1.0 location-search",
      },
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) throw new Error("Nominatim request failed");
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Nominatim response invalid");

    return data.slice(0, normalizedLimit).flatMap((place) => {
      const displayName = typeof place?.display_name === "string"
        ? place.display_name.trim()
        : "";
      if (
        !displayName ||
        displayName.length > 500 ||
        typeof place?.lon !== "string" ||
        typeof place?.lat !== "string" ||
        !place.lon.trim() ||
        !place.lat.trim()
      ) {
        return [];
      }

      const coordinates = [Number(place.lon), Number(place.lat)];
      return isCoordinate(coordinates) ? [{ displayName, coordinates }] : [];
    });
  }

  async geocode(placeName) {
    const [place] = await this.search(`${placeName}, Indonesia`, 1);
    return place?.coordinates ?? null;
  }
}

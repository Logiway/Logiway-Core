import { ProviderError } from "../../../errors/providerError.js";
import type { Logger } from "../../../types/logger.js";
import type { PlaceGeocodingRepository, RouteGeocodingInput, RouteLocations } from "../../../types/location.js";
import type { RouteGeocodingRepository } from "../../../types/routing.js";
import { isCoordinate } from "../../../utils/coordinates.js";
import { errorMessage } from "../../../utils/errorMessage.js";

const PUBLIC_ERROR_MESSAGE = "Lokasi rute tidak dapat ditemukan.";

interface FallbackRouteGeocodingOptions {
  primaryRepository: RouteGeocodingRepository;
  fallbackPlaceRepository: PlaceGeocodingRepository;
  logger: Logger;
}

function normalizeLocation(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length >= 2 && normalized.length <= 200 ? normalized : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isValidName(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const normalized = value.trim();
  return normalized.length >= 1 && normalized.length <= 500;
}

function isValidGeocoding(value: unknown): value is RouteLocations {
  if (!isRecord(value) || !isRecord(value.origin) || !isRecord(value.destination)) return false;
  return (
    isValidName(value.origin.name) &&
    isCoordinate(value.origin.coordinates) &&
    isValidName(value.destination.name) &&
    isCoordinate(value.destination.coordinates)
  );
}

export class FallbackRouteGeocodingRepository implements RouteGeocodingRepository {
  readonly #primaryRepository: RouteGeocodingRepository;
  readonly #fallbackPlaceRepository: PlaceGeocodingRepository;
  readonly #logger: Logger;

  constructor({ primaryRepository, fallbackPlaceRepository, logger }: FallbackRouteGeocodingOptions) {
    this.#primaryRepository = primaryRepository;
    this.#fallbackPlaceRepository = fallbackPlaceRepository;
    this.#logger = logger;
  }

  async geocodeRoute({ origin, dest }: RouteGeocodingInput): Promise<RouteLocations> {
    const normalizedOrigin = normalizeLocation(origin);
    const normalizedDestination = normalizeLocation(dest);
    if (!normalizedOrigin || !normalizedDestination) throw new ProviderError(PUBLIC_ERROR_MESSAGE);

    try {
      const geocoding = await this.#primaryRepository.geocodeRoute({ origin, dest });
      if (!isValidGeocoding(geocoding)) throw new Error("Gemini returned invalid geocoding data");
      return geocoding;
    } catch (error: unknown) {
      this.#logger.warn("Route geocoding fallback activated", { provider: "gemini", error: errorMessage(error) });
    }

    let coordinates;
    try {
      coordinates = await Promise.all([
        this.#fallbackPlaceRepository.geocode(normalizedOrigin),
        this.#fallbackPlaceRepository.geocode(normalizedDestination),
      ]);
    } catch (error: unknown) {
      throw new ProviderError(PUBLIC_ERROR_MESSAGE, { cause: error });
    }

    const [originCoordinates, destinationCoordinates] = coordinates;
    if (!isCoordinate(originCoordinates) || !isCoordinate(destinationCoordinates)) {
      throw new ProviderError(PUBLIC_ERROR_MESSAGE);
    }
    return {
      origin: { name: normalizedOrigin, coordinates: originCoordinates },
      destination: { name: normalizedDestination, coordinates: destinationCoordinates },
    };
  }
}

import { isCoordinate } from "../../domain/entities/coordinate.js";
import { ProviderError } from "../../errors/ProviderError.js";
import { RouteGeocodingRepository } from "../../repositories/RouteGeocodingRepository.js";

const PUBLIC_ERROR_MESSAGE = "Lokasi rute tidak dapat ditemukan.";
const MAX_ERROR_MESSAGE_LENGTH = 200;

function normalizeLocation(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length >= 2 && normalized.length <= 200 ? normalized : null;
}

function isValidName(value) {
  if (typeof value !== "string") return false;
  const normalized = value.trim();
  return normalized.length >= 1 && normalized.length <= 500;
}

function isValidGeocoding(geocoding) {
  return (
    isValidName(geocoding?.origin?.name) &&
    isCoordinate(geocoding.origin.coordinates) &&
    isValidName(geocoding?.destination?.name) &&
    isCoordinate(geocoding.destination.coordinates)
  );
}

function sanitizeErrorMessage(error) {
  const message = typeof error?.message === "string" ? error.message : "Unknown error";
  return (
    message
      .replace(/((?:[?&]|\b)(?:key|api_key|token)=)[^&\s]+/gi, "$1[redacted]")
      .replace(/\b(Bearer|Basic)\s+\S+/gi, "$1 [redacted]")
      .replace(
        /("(?:apiKey|api_key|key|token|authorization)"\s*:\s*")[^"]*"/gi,
        "$1[redacted]\"",
      )
      .replace(/[\u0000-\u001f\u007f]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_ERROR_MESSAGE_LENGTH) || "Unknown error"
  );
}

export class FallbackRouteGeocodingRepository extends RouteGeocodingRepository {
  constructor({ primaryRepository, fallbackPlaceRepository, logger }) {
    super();
    this.primaryRepository = primaryRepository;
    this.fallbackPlaceRepository = fallbackPlaceRepository;
    this.logger = logger;
  }

  async geocodeRoute({ origin, dest }) {
    const normalizedOrigin = normalizeLocation(origin);
    const normalizedDestination = normalizeLocation(dest);
    if (!normalizedOrigin || !normalizedDestination) {
      throw new ProviderError(PUBLIC_ERROR_MESSAGE);
    }

    try {
      const geocoding = await this.primaryRepository.geocodeRoute({ origin, dest });
      if (!isValidGeocoding(geocoding)) {
        throw new Error("Gemini returned invalid geocoding data");
      }
      return geocoding;
    } catch (error) {
      this.logger.warn("Route geocoding fallback activated", {
        provider: "gemini",
        error: sanitizeErrorMessage(error),
      });
    }

    let coordinates;
    try {
      coordinates = await Promise.all([
        this.fallbackPlaceRepository.geocode(normalizedOrigin),
        this.fallbackPlaceRepository.geocode(normalizedDestination),
      ]);
    } catch (error) {
      throw new ProviderError(PUBLIC_ERROR_MESSAGE, { cause: error });
    }

    const [originCoordinates, destinationCoordinates] = coordinates;
    if (!isCoordinate(originCoordinates) || !isCoordinate(destinationCoordinates)) {
      throw new ProviderError(PUBLIC_ERROR_MESSAGE);
    }

    return {
      origin: { name: normalizedOrigin, coordinates: originCoordinates },
      destination: {
        name: normalizedDestination,
        coordinates: destinationCoordinates,
      },
    };
  }
}

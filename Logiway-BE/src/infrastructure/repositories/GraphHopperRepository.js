import { isCoordinate } from "../../domain/entities/coordinate.js";
import { RoutingRepository } from "../../repositories/RoutingRepository.js";

const MAX_DETAIL_SEGMENTS = 500;

export class GraphHopperRepository extends RoutingRepository {
  constructor({ url, fetchImplementation = fetch, timeoutMs = 15000 }) {
    super();
    this.url = url;
    this.fetch = fetchImplementation;
    this.timeoutMs = timeoutMs;
  }

  async calculate({ points, profile, customModel, disableCh = false }) {
    const body = {
      points,
      profile,
      details: ["road_environment", "road_class", "toll"],
      elevation: false,
      instructions: false,
      locale: "id",
      points_encoded: false,
    };

    if (customModel) body.custom_model = customModel;
    if (disableCh) body["ch.disable"] = true;

    const response = await this.fetch(this.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    const data = await response.json();
    const path = data.paths?.[0];

    if (
      !response.ok ||
      !Array.isArray(path?.points?.coordinates) ||
      path.points.coordinates.length < 2 ||
      !path.points.coordinates.every(isCoordinate) ||
      !Number.isFinite(path.distance) ||
      path.distance < 0 ||
      !Number.isFinite(path.time) ||
      path.time < 0
    ) {
      throw new Error("GraphHopper route unavailable");
    }

    return {
      coordinates: path.points.coordinates,
      distanceMeters: path.distance,
      timeMilliseconds: path.time,
      details: {
        roadEnvironment: this.#normalizeDetails(
          path.details?.road_environment,
          path.points.coordinates.length,
        ),
        roadClass: this.#normalizeDetails(
          path.details?.road_class,
          path.points.coordinates.length,
        ),
        toll: this.#normalizeDetails(
          path.details?.toll,
          path.points.coordinates.length,
        ),
      },
    };
  }

  #normalizeDetails(details, coordinateCount) {
    if (!Array.isArray(details)) return [];

    return details.slice(0, MAX_DETAIL_SEGMENTS).flatMap((detail) => {
      if (!Array.isArray(detail) || detail.length !== 3) return [];

      const [fromIndex, toIndex, value] = detail;
      if (
        !Number.isInteger(fromIndex) ||
        !Number.isInteger(toIndex) ||
        fromIndex < 0 ||
        fromIndex >= toIndex ||
        toIndex >= coordinateCount ||
        (value !== null && typeof value !== "string")
      ) {
        return [];
      }

      return [{ fromIndex, toIndex, value }];
    });
  }
}

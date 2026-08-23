import type { Coordinate } from "../../../types/location.js";
import type { GraphHopperRepositoryOptions } from "../../../types/providers.js";
import type {
  CalculatedRoute,
  GraphHopperCustomModel,
  RouteCalculationInput,
  RouteDetailSegment,
  RoutingRepository,
} from "../../../types/routing.js";
import { isCoordinate } from "../../../utils/coordinates.js";

const MAX_DETAIL_SEGMENTS = 500;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

interface GraphHopperRequestBody {
  points: Coordinate[];
  profile: string;
  details: string[];
  elevation: boolean;
  instructions: boolean;
  locale: string;
  points_encoded: boolean;
  custom_model?: GraphHopperCustomModel;
  "ch.disable"?: boolean;
}

export class GraphHopperRepository implements RoutingRepository {
  readonly #url: string;
  readonly #fetch: typeof fetch;
  readonly #timeoutMs: number;

  constructor({ url, fetchImplementation = fetch, timeoutMs = 15000 }: GraphHopperRepositoryOptions) {
    this.#url = url;
    this.#fetch = fetchImplementation;
    this.#timeoutMs = timeoutMs;
  }

  async calculate({ points, profile, customModel, disableCh = false }: RouteCalculationInput): Promise<CalculatedRoute> {
    const body: GraphHopperRequestBody = {
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

    const response = await this.#fetch(this.#url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.#timeoutMs),
    });
    const data: unknown = await response.json();
    const path = this.#firstPath(data);
    if (!response.ok || !path) throw new Error("GraphHopper route unavailable");

    const coordinates = isRecord(path.points) ? path.points.coordinates : undefined;
    const distance = path.distance;
    const time = path.time;
    if (
      !Array.isArray(coordinates) ||
      coordinates.length < 2 ||
      !coordinates.every(isCoordinate) ||
      typeof distance !== "number" ||
      !Number.isFinite(distance) ||
      distance < 0 ||
      typeof time !== "number" ||
      !Number.isFinite(time) ||
      time < 0
    ) throw new Error("GraphHopper route unavailable");

    const details = isRecord(path.details) ? path.details : {};
    return {
      coordinates,
      distanceMeters: distance,
      timeMilliseconds: time,
      details: {
        roadEnvironment: this.#normalizeDetails(details.road_environment, coordinates.length),
        roadClass: this.#normalizeDetails(details.road_class, coordinates.length),
        toll: this.#normalizeDetails(details.toll, coordinates.length),
      },
    };
  }

  #firstPath(data: unknown): Record<string, unknown> | null {
    if (!isRecord(data) || !isUnknownArray(data.paths)) return null;
    const first = data.paths[0];
    return isRecord(first) ? first : null;
  }

  #normalizeDetails(details: unknown, coordinateCount: number): RouteDetailSegment[] {
    if (!isUnknownArray(details)) return [];
    return details.slice(0, MAX_DETAIL_SEGMENTS).flatMap((detail): RouteDetailSegment[] => {
      if (!isUnknownArray(detail) || detail.length !== 3) return [];
      const [fromIndex, toIndex, value] = detail;
      if (
        typeof fromIndex !== "number" ||
        !Number.isInteger(fromIndex) ||
        typeof toIndex !== "number" ||
        !Number.isInteger(toIndex) ||
        fromIndex < 0 ||
        fromIndex >= toIndex ||
        toIndex >= coordinateCount ||
        (value !== null && typeof value !== "string")
      ) return [];
      return [{ fromIndex, toIndex, value }];
    });
  }
}

import { isCoordinates } from "../../types/index.ts";
import type {
  Coordinates,
  RouteDetailSegment,
  RouteDetails,
  RouteFacility,
  RouteFacilityHgvAccess,
  RouteFacilityStatus,
  RouteFacilityType,
  RouteMode,
  RouteRiskPoint,
  SmartRoute,
  SmartRouteRequest,
} from "../../types/index.ts";

interface RouteApiResponse {
  success?: unknown;
  error?: unknown;
  distance_km?: unknown;
  duration_minutes?: unknown;
  coordinates?: unknown;
  route_color?: unknown;
  route_mode?: unknown;
  is_navigable?: unknown;
  warning?: unknown;
  route_details?: unknown;
  route_facilities_status?: unknown;
  route_facilities?: unknown;
  pungli_points?: unknown;
  geocoding?: {
    origin?: { coordinates?: unknown };
    destination?: { coordinates?: unknown };
  };
}

const DEFAULT_API_BASE_URL = "/api";
const DEFAULT_ROUTE_COLOR = "#2563eb";
const ROUTE_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const ROUTE_MODES: RouteMode[] = [
  "risk_aware",
  "standard",
  "straight_line_fallback",
];
const ROUTE_FACILITY_STATUSES: RouteFacilityStatus[] = [
  "available",
  "unavailable",
  "not_applicable",
];
const ROUTE_FACILITY_TYPES: RouteFacilityType[] = [
  "fuel",
  "rest_area",
  "service_area",
];
const ROUTE_FACILITY_HGV_ACCESS: RouteFacilityHgvAccess[] = [
  "yes",
  "no",
  "designated",
  "unknown",
];
const MAX_TRUCK_DIMENSION_M = 12.6;
const MAX_FACILITIES = 60;
const MAX_RISK_POINTS = 10;
const MAX_ROUTE_DETAIL_SEGMENTS = 500;
const MAX_SEGMENT_VALUE_LENGTH = 500;
const MAX_FACILITY_ID_LENGTH = 100;
const MAX_FACILITY_NAME_LENGTH = 160;
const MAX_FACILITY_OPENING_HOURS_LENGTH = 160;
const MAX_RISK_LOCATION_LENGTH = 160;
const MAX_RISK_NOTE_LENGTH = 500;

function errorMessage(payload: RouteApiResponse, fallback: string): string {
  return typeof payload.error === "string" && payload.error.trim()
    ? payload.error
    : fallback;
}

function parseDistance(value: unknown): number | null | undefined {
  if (value === null) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : undefined;
  }

  if (typeof value === "string" && value.trim()) {
    const distance = Number(value);
    return Number.isFinite(distance) && distance >= 0 ? distance : undefined;
  }

  return undefined;
}

function parseDuration(value: unknown): number | null | undefined {
  if (value === null) {
    return null;
  }

  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : undefined;
}

function parseRouteMode(value: unknown): RouteMode | undefined {
  return ROUTE_MODES.find((mode) => mode === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseBoundedString(
  value: unknown,
  maximumLength: number,
  minimumLength = 1,
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return value.length <= maximumLength && normalized.length >= minimumLength
    ? normalized
    : undefined;
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  const valueKeys = Object.keys(value);
  return valueKeys.length === keys.length && keys.every((key) => key in value);
}

function parseNullableBoundedString(
  value: unknown,
  maximumLength: number,
): string | null | undefined {
  if (value === null) {
    return null;
  }
  return typeof value === "string" && value.length <= maximumLength
    ? value
    : undefined;
}

function parseDetailSegment(
  value: unknown,
  coordinateCount: number,
): RouteDetailSegment | undefined {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["from_index", "to_index", "value"])
  ) {
    return undefined;
  }
  const fromIndex = value.from_index;
  const toIndex = value.to_index;
  const segmentValue = parseNullableBoundedString(
    value.value,
    MAX_SEGMENT_VALUE_LENGTH,
  );
  if (
    typeof fromIndex !== "number" ||
    !Number.isInteger(fromIndex) ||
    fromIndex < 0 ||
    typeof toIndex !== "number" ||
    !Number.isInteger(toIndex) ||
    fromIndex >= toIndex ||
    toIndex >= coordinateCount ||
    segmentValue === undefined
  ) {
    return undefined;
  }
  return { fromIndex, toIndex, value: segmentValue };
}

function parseDetailSegments(
  value: unknown,
  coordinateCount: number,
): RouteDetailSegment[] | undefined {
  if (!Array.isArray(value) || value.length > MAX_ROUTE_DETAIL_SEGMENTS) {
    return undefined;
  }
  const segments = value.map((segment) =>
    parseDetailSegment(segment, coordinateCount),
  );
  return segments.every((segment) => segment !== undefined)
    ? segments
    : undefined;
}

function parseRouteDetails(
  value: unknown,
  coordinateCount: number,
): RouteDetails | null | undefined {
  if (value === undefined || value === null) {
    return value === undefined ? null : value;
  }
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "road_environment",
      "road_class",
      "toll",
      "uses_ferry",
      "uses_toll",
    ])
  ) {
    return undefined;
  }
  const roadEnvironment = parseDetailSegments(
    value.road_environment,
    coordinateCount,
  );
  const roadClass = parseDetailSegments(value.road_class, coordinateCount);
  const toll = parseDetailSegments(value.toll, coordinateCount);
  if (
    roadEnvironment === undefined ||
    roadClass === undefined ||
    toll === undefined ||
    typeof value.uses_ferry !== "boolean" ||
    typeof value.uses_toll !== "boolean"
  ) {
    return undefined;
  }
  return {
    roadEnvironment,
    roadClass,
    toll,
    usesFerry: value.uses_ferry,
    usesToll: value.uses_toll,
  };
}

function parseFacilityStatus(value: unknown): RouteFacilityStatus | undefined {
  return value === undefined
    ? "not_applicable"
    : ROUTE_FACILITY_STATUSES.find((status) => status === value);
}

function parseFacility(value: unknown): RouteFacility | undefined {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "id",
      "facility_type",
      "name",
      "coordinates",
      "opening_hours",
      "hgv_access",
      "source",
    ]) ||
    !isCoordinates(value.coordinates)
  ) {
    return undefined;
  }
  const id = parseBoundedString(value.id, MAX_FACILITY_ID_LENGTH);
  const type = ROUTE_FACILITY_TYPES.find(
    (facilityType) => facilityType === value.facility_type,
  );
  const name = parseNullableBoundedString(value.name, MAX_FACILITY_NAME_LENGTH);
  const openingHours = parseNullableBoundedString(
    value.opening_hours,
    MAX_FACILITY_OPENING_HOURS_LENGTH,
  );
  const hgvAccess = ROUTE_FACILITY_HGV_ACCESS.find(
    (access) => access === value.hgv_access,
  );
  if (
    id === undefined ||
    type === undefined ||
    name === undefined ||
    openingHours === undefined ||
    hgvAccess === undefined ||
    value.source !== "openstreetmap"
  ) {
    return undefined;
  }
  return {
    id,
    type,
    name,
    coordinates: value.coordinates,
    openingHours,
    hgvAccess,
    source: value.source,
  };
}

function parseFacilities(value: unknown): RouteFacility[] | undefined {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value) || value.length > MAX_FACILITIES) {
    return undefined;
  }
  const facilities = value.map(parseFacility);
  return facilities.every((facility) => facility !== undefined)
    ? facilities
    : undefined;
}

function parseRiskPoint(value: unknown): RouteRiskPoint | undefined {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["location_name", "severity", "note", "coordinates"]) ||
    !isCoordinates(value.coordinates)
  ) {
    return undefined;
  }
  const locationName = parseBoundedString(
    value.location_name,
    MAX_RISK_LOCATION_LENGTH,
    2,
  );
  const note = parseBoundedString(value.note, MAX_RISK_NOTE_LENGTH, 0);
  const severity = value.severity;
  if (
    locationName === undefined ||
    note === undefined ||
    typeof severity !== "number" ||
    !Number.isInteger(severity) ||
    severity < 1 ||
    severity > 10
  ) {
    return undefined;
  }
  return { locationName, severity, note, coordinates: value.coordinates };
}

function parseRiskPoints(value: unknown): RouteRiskPoint[] | undefined {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value) || value.length > MAX_RISK_POINTS) {
    return undefined;
  }
  const riskPoints = value.map(parseRiskPoint);
  return riskPoints.every((riskPoint) => riskPoint !== undefined)
    ? riskPoints
    : undefined;
}

function parseRoute(payload: RouteApiResponse): SmartRoute {
  const origin = payload.geocoding?.origin?.coordinates;
  const destination = payload.geocoding?.destination?.coordinates;
  const coordinates = payload.coordinates;
  const distanceKm = parseDistance(payload.distance_km);
  const durationMinutes = parseDuration(payload.duration_minutes);
  const routeMode =
    payload.route_mode === undefined ? "standard" : parseRouteMode(payload.route_mode);
  const isNavigable =
    payload.is_navigable === undefined ? true : payload.is_navigable;
  const warning = payload.warning === undefined ? null : payload.warning;
  const coordinateCount = Array.isArray(coordinates) ? coordinates.length : 0;
  const routeDetails = parseRouteDetails(payload.route_details, coordinateCount);
  const facilities = parseFacilities(payload.route_facilities);
  const facilitiesStatus = parseFacilityStatus(payload.route_facilities_status);
  const riskPoints = parseRiskPoints(payload.pungli_points);
  const permitsNullMetrics =
    routeMode === "straight_line_fallback" && isNavigable === false;

  if (
    payload.success !== true ||
    !isCoordinates(origin) ||
    !isCoordinates(destination) ||
    !Array.isArray(coordinates) ||
    coordinates.length < 2 ||
    !coordinates.every(isCoordinates) ||
    distanceKm === undefined ||
    durationMinutes === undefined ||
    ((distanceKm === null || durationMinutes === null) && !permitsNullMetrics) ||
    routeMode === undefined ||
    typeof isNavigable !== "boolean" ||
    (warning !== null && typeof warning !== "string") ||
    routeDetails === undefined ||
    facilities === undefined ||
    facilitiesStatus === undefined ||
    riskPoints === undefined
  ) {
    throw new Error("Respons rute tidak valid");
  }

  return {
    coordinates: coordinates as Coordinates[],
    destination,
    distanceKm,
    durationMinutes,
    facilities,
    facilitiesStatus,
    isNavigable,
    origin,
    riskPoints,
    routeColor:
      typeof payload.route_color === "string" &&
      ROUTE_COLOR_PATTERN.test(payload.route_color)
        ? payload.route_color
        : DEFAULT_ROUTE_COLOR,
    routeDetails,
    routeMode,
    warning,
  };
}

export async function calculateSmartRoute(
  request: SmartRouteRequest,
  baseUrl = import.meta.env.VITE_API_BASE_URL,
): Promise<SmartRoute> {
  const origin = request.origin.trim();
  const destination = request.destination.trim();
  if (
    origin.length < 2 ||
    origin.length > 200 ||
    destination.length < 2 ||
    destination.length > 200
  ) {
    throw new Error("Lokasi harus terdiri dari 2 sampai 200 karakter");
  }

  const hasOriginCoordinates = request.originCoordinates !== undefined;
  const hasDestinationCoordinates = request.destinationCoordinates !== undefined;
  if (hasOriginCoordinates !== hasDestinationCoordinates) {
    throw new Error("Pasangan koordinat lokasi tidak lengkap");
  }
  if (
    hasOriginCoordinates &&
    (!isCoordinates(request.originCoordinates) ||
      !isCoordinates(request.destinationCoordinates))
  ) {
    throw new Error("Koordinat lokasi tidak valid");
  }

  const dimensions = [
    request.truckSpecifications.maxHeightM,
    request.truckSpecifications.maxWidthM,
    request.truckSpecifications.maxLengthM,
  ];
  if (
    dimensions.some(
      (dimension) =>
        !Number.isFinite(dimension) ||
        dimension <= 0 ||
        dimension > MAX_TRUCK_DIMENSION_M,
    )
  ) {
    throw new Error("Dimensi truk harus lebih dari 0 dan maksimal 12,6 meter");
  }

  const normalizedBaseUrl = (baseUrl?.trim() || DEFAULT_API_BASE_URL).replace(
    /\/$/,
    "",
  );
  const response = await fetch(`${normalizedBaseUrl}/calculate-smart-route`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      origin,
      dest: destination,
      ...(hasOriginCoordinates && hasDestinationCoordinates
        ? {
            originCoordinates: request.originCoordinates,
            destinationCoordinates: request.destinationCoordinates,
          }
        : {}),
      truckProfile: request.truckProfile,
      truckSpecifications: request.truckSpecifications,
    }),
  });

  let payload: RouteApiResponse;
  try {
    payload = (await response.json()) as RouteApiResponse;
  } catch {
    throw new Error("Respons backend tidak dapat dibaca");
  }

  if (!response.ok || payload.success !== true) {
    throw new Error(errorMessage(payload, "Gagal memproses rute"));
  }

  return parseRoute(payload);
}

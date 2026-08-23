import type { Coordinates } from "./coordinates.ts";
import type {
  TruckProfile,
  TruckRoutingSpecifications,
} from "./truck.ts";

export interface SmartRouteRequest {
  origin: string;
  destination: string;
  originCoordinates?: Coordinates;
  destinationCoordinates?: Coordinates;
  truckProfile: TruckProfile;
  truckSpecifications: TruckRoutingSpecifications;
}

export type RouteMode =
  | "risk_aware"
  | "standard"
  | "straight_line_fallback";

export interface RouteDetailSegment {
  fromIndex: number;
  toIndex: number;
  value: string | null;
}

export interface RouteDetails {
  roadEnvironment: RouteDetailSegment[];
  roadClass: RouteDetailSegment[];
  toll: RouteDetailSegment[];
  usesFerry: boolean;
  usesToll: boolean;
}

export type RouteFacilityStatus =
  | "available"
  | "unavailable"
  | "not_applicable";

export type RouteFacilityType = "fuel" | "rest_area" | "service_area";
export type RouteFacilityHgvAccess = "yes" | "no" | "designated" | "unknown";

export interface RouteFacility {
  id: string;
  type: RouteFacilityType;
  name: string | null;
  coordinates: Coordinates;
  openingHours: string | null;
  hgvAccess: RouteFacilityHgvAccess;
  source: "openstreetmap";
}

export interface RouteRiskPoint {
  locationName: string;
  severity: number;
  note: string;
  coordinates: Coordinates;
}

export interface SmartRoute {
  coordinates: Coordinates[];
  destination: Coordinates;
  distanceKm: number | null;
  durationMinutes: number | null;
  facilities: RouteFacility[];
  facilitiesStatus: RouteFacilityStatus;
  isNavigable: boolean;
  origin: Coordinates;
  riskPoints: RouteRiskPoint[];
  routeColor: string;
  routeDetails: RouteDetails | null;
  routeMode: RouteMode;
  warning: string | null;
}

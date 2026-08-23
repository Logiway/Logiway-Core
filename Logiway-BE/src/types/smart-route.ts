import type { Logger } from "./logger.js";
import type { Coordinate, PlaceGeocodingRepository, RouteLocations } from "./location.js";
import type {
  CalculatedRoute,
  GeocodedRiskPoint,
  GraphHopperCustomModel,
  PublicRouteFacility,
  RiskRepository,
  RouteFacilityRepository,
  RouteFacilitiesStatus,
  RouteGeocodingRepository,
  RoutingRepository,
} from "./routing.js";
import type { NormalizedTruckSpecifications, TruckProfile } from "./trucks.js";

interface SmartRouteInputBase {
  origin: string;
  dest: string;
  truckProfile: TruckProfile;
  truckSpecifications: NormalizedTruckSpecifications;
}

export type SmartRouteInput = SmartRouteInputBase & (
  | {
      originCoordinates: Coordinate;
      destinationCoordinates: Coordinate;
    }
  | {
      originCoordinates?: never;
      destinationCoordinates?: never;
    }
);

export interface PublicRouteDetailSegment {
  from_index: number;
  to_index: number;
  value: string | null;
}

export interface PublicRouteDetails {
  road_environment: PublicRouteDetailSegment[];
  road_class: PublicRouteDetailSegment[];
  toll: PublicRouteDetailSegment[];
  uses_ferry: boolean;
  uses_toll: boolean;
}

export type NavigableRouteMode = "risk_aware" | "standard";

export interface NavigableFormattedRoute {
  coordinates: Coordinate[];
  distanceKm: number;
  durationMinutes: number;
  usedRiskAvoidance: boolean;
  routeMode: NavigableRouteMode;
  isNavigable: true;
  warning: null;
  details: PublicRouteDetails;
}

export interface StraightLineFormattedRoute {
  coordinates: Coordinate[];
  distanceKm: null;
  durationMinutes: null;
  usedRiskAvoidance: false;
  routeMode: "straight_line_fallback";
  isNavigable: false;
  warning: string;
  details: null;
}

export type FormattedRoute = NavigableFormattedRoute | StraightLineFormattedRoute;

export interface RouteFacilitiesResult {
  status: RouteFacilitiesStatus;
  facilities: PublicRouteFacility[];
}

export interface SmartRouteResponse {
  success: true;
  distance_km: number | null;
  duration_minutes: number | null;
  route_mode: "risk_aware" | "standard" | "straight_line_fallback";
  is_navigable: boolean;
  warning: string | null;
  coordinates: Coordinate[];
  geocoding: RouteLocations;
  pungli_points: GeocodedRiskPoint[];
  used_pungli_avoidance: boolean;
  route_color: "#dc2626" | "#2563eb";
  route_details: PublicRouteDetails | null;
  route_facilities_status: RouteFacilitiesStatus;
  route_facilities: PublicRouteFacility[];
}

export interface SmartRouteServiceDependencies {
  geocodingRepository: RouteGeocodingRepository;
  riskRepository: RiskRepository;
  placeGeocodingRepository: PlaceGeocodingRepository;
  routingRepository: RoutingRepository;
  routeFacilityRepository: RouteFacilityRepository;
  logger: Logger;
}

export interface SmartRouteServiceContract {
  calculate(input: SmartRouteInput): Promise<SmartRouteResponse>;
}

export interface RouteCalculationContext {
  points: Coordinate[];
  profile: TruckProfile;
  vehicleModel: GraphHopperCustomModel;
  riskModel: GraphHopperCustomModel | null;
}

export type { CalculatedRoute };

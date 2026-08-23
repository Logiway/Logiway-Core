import type { Coordinate, RouteGeocodingInput, RouteLocations } from "./location.js";
import type { TruckProfile } from "./trucks.js";

export interface CustomModelPriorityRule {
  if: string;
  multiply_by: number | string;
}

export interface CustomModelAreaFeature {
  type: "Feature";
  id: string;
  properties: Record<string, never>;
  geometry: {
    type: "Polygon";
    coordinates: Coordinate[][];
  };
}

export interface GraphHopperCustomModel {
  priority: CustomModelPriorityRule[];
  areas?: {
    type: "FeatureCollection";
    features: CustomModelAreaFeature[];
  };
}

export interface RouteDetailSegment {
  fromIndex: number;
  toIndex: number;
  value: string | null;
}

export interface RouteDetails {
  roadEnvironment?: RouteDetailSegment[];
  roadClass?: RouteDetailSegment[];
  toll?: RouteDetailSegment[];
}

export interface RouteCalculationInput {
  points: Coordinate[];
  profile: TruckProfile;
  customModel?: GraphHopperCustomModel;
  disableCh?: boolean;
}

export interface CalculatedRoute {
  coordinates: Coordinate[];
  distanceMeters: number;
  timeMilliseconds: number;
  details?: RouteDetails;
}

export type FacilityType = "fuel" | "rest_area" | "service_area";
export type HgvAccess = "yes" | "no" | "designated" | "unknown";
export type RouteFacilitiesStatus = "available" | "unavailable" | "not_applicable";

export interface RouteFacility {
  id: string;
  facilityType: FacilityType;
  name: string | null;
  coordinates: Coordinate;
  openingHours: string | null;
  hgvAccess: HgvAccess;
  source: "openstreetmap";
}

export interface PublicRouteFacility {
  id: string;
  facility_type: FacilityType;
  name: string | null;
  coordinates: Coordinate;
  opening_hours: string | null;
  hgv_access: HgvAccess;
  source: "openstreetmap";
}

export interface RiskPoint {
  location_name: string;
  severity: number;
  note: string;
}

export interface GeocodedRiskPoint extends RiskPoint {
  coordinates: Coordinate;
}

export interface RouteGeocodingRepository {
  geocodeRoute(input: RouteGeocodingInput): Promise<RouteLocations>;
}

export interface RiskRepository {
  findRouteRisks(input: RouteGeocodingInput): Promise<RiskPoint[]>;
}

export interface RoutingRepository {
  calculate(input: RouteCalculationInput): Promise<CalculatedRoute>;
}

export interface RouteFacilityRepository {
  findAlongRoute(coordinates: Coordinate[]): Promise<RouteFacility[]>;
}

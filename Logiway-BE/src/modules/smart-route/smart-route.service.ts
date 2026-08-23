import type { RouteGeocodingInput } from "../../types/location.js";
import type { GeocodedRiskPoint, RouteDetailSegment } from "../../types/routing.js";
import type {
  FormattedRoute,
  NavigableRouteMode,
  RouteCalculationContext,
  RouteFacilitiesResult,
  SmartRouteInput,
  SmartRouteResponse,
  SmartRouteServiceDependencies,
} from "../../types/smart-route.js";
import { isCoordinate } from "../../utils/coordinates.js";
import { errorMessage } from "../../utils/errorMessage.js";
import { buildRiskCustomModel, normalizeRiskPoints } from "./smart-route-risk.js";
import { buildTruckCustomModel, mergeTruckAndRiskCustomModels, resolveTruckSpecifications } from "./smart-route-model.js";

export class SmartRouteService {
  readonly #dependencies: SmartRouteServiceDependencies;

  constructor(dependencies: SmartRouteServiceDependencies) {
    this.#dependencies = dependencies;
  }

  async calculate(input: SmartRouteInput): Promise<SmartRouteResponse> {
    const { origin, dest, originCoordinates, destinationCoordinates, truckProfile, truckSpecifications } = input;
    const normalizedOrigin = origin.trim();
    const normalizedDestination = dest.trim();
    const normalizedTruckSpecifications = resolveTruckSpecifications(truckSpecifications, truckProfile);
    const geocoding = originCoordinates !== undefined
      ? {
          origin: { name: normalizedOrigin, coordinates: originCoordinates },
          destination: { name: normalizedDestination, coordinates: destinationCoordinates },
        }
      : await this.#dependencies.geocodingRepository.geocodeRoute({ origin: normalizedOrigin, dest: normalizedDestination });
    const riskPoints = await this.#findRiskPoints({ origin: normalizedOrigin, dest: normalizedDestination });
    const vehicleModel = buildTruckCustomModel(normalizedTruckSpecifications);
    const route = await this.#calculateRoute({
      points: [geocoding.origin.coordinates, geocoding.destination.coordinates],
      profile: truckProfile,
      vehicleModel,
      riskModel: buildRiskCustomModel(riskPoints),
    });
    const routeFacilities = await this.#findRouteFacilities(route);

    return {
      success: true,
      distance_km: route.distanceKm,
      duration_minutes: route.durationMinutes,
      route_mode: route.routeMode,
      is_navigable: route.isNavigable,
      warning: route.warning,
      coordinates: route.coordinates,
      geocoding,
      pungli_points: riskPoints,
      used_pungli_avoidance: route.usedRiskAvoidance,
      route_color: route.usedRiskAvoidance ? "#dc2626" : "#2563eb",
      route_details: route.details,
      route_facilities_status: routeFacilities.status,
      route_facilities: routeFacilities.facilities,
    };
  }

  async #findRiskPoints({ origin, dest }: RouteGeocodingInput): Promise<GeocodedRiskPoint[]> {
    try {
      const rawRiskPoints = await this.#dependencies.riskRepository.findRouteRisks({ origin, dest });
      const riskPoints: GeocodedRiskPoint[] = [];
      for (const riskPoint of normalizeRiskPoints(rawRiskPoints)) {
        try {
          const coordinates = await this.#dependencies.placeGeocodingRepository.geocode(riskPoint.location_name);
          if (coordinates) riskPoints.push({ ...riskPoint, coordinates });
        } catch (error: unknown) {
          this.#dependencies.logger.warn("Risk location geocoding failed", {
            error: errorMessage(error),
          });
        }
      }
      return riskPoints.filter((riskPoint) => isCoordinate(riskPoint.coordinates));
    } catch (error: unknown) {
      this.#dependencies.logger.warn("Risk discovery failed", { error: errorMessage(error) });
      return [];
    }
  }

  async #findRouteFacilities(route: FormattedRoute): Promise<RouteFacilitiesResult> {
    if (!route.isNavigable) return { status: "not_applicable", facilities: [] };
    try {
      const facilities = await this.#dependencies.routeFacilityRepository.findAlongRoute(route.coordinates);
      return {
        status: "available",
        facilities: facilities.map((facility) => ({
          id: facility.id,
          facility_type: facility.facilityType,
          name: facility.name,
          coordinates: facility.coordinates,
          opening_hours: facility.openingHours,
          hgv_access: facility.hgvAccess,
          source: facility.source,
        })),
      };
    } catch (error: unknown) {
      this.#dependencies.logger.warn("Route facilities unavailable", {
        provider: "overpass",
        error: errorMessage(error),
      });
      return { status: "unavailable", facilities: [] };
    }
  }

  async #calculateRoute({ points, profile, vehicleModel, riskModel }: RouteCalculationContext): Promise<FormattedRoute> {
    if (riskModel) {
      try {
        const route = await this.#dependencies.routingRepository.calculate({
          points,
          profile,
          customModel: mergeTruckAndRiskCustomModels(vehicleModel, riskModel),
          disableCh: true,
        });
        return this.#formatRoute(route, "risk_aware");
      } catch (error: unknown) {
        this.#dependencies.logger.warn("Risk-aware route failed", { error: errorMessage(error) });
      }
    }

    try {
      const route = await this.#dependencies.routingRepository.calculate({
        points,
        profile,
        customModel: vehicleModel,
        disableCh: true,
      });
      return this.#formatRoute(route, "standard");
    } catch (error: unknown) {
      this.#dependencies.logger.error("GraphHopper route failed", { error: errorMessage(error) });
      return {
        coordinates: points,
        distanceKm: null,
        durationMinutes: null,
        usedRiskAvoidance: false,
        routeMode: "straight_line_fallback",
        isNavigable: false,
        warning: "Rute jalan tidak tersedia; garis lurus ditampilkan.",
        details: null,
      };
    }
  }

  #formatRoute(route: Awaited<ReturnType<SmartRouteServiceDependencies["routingRepository"]["calculate"]>>, routeMode: NavigableRouteMode): FormattedRoute {
    const details = route.details ?? { roadEnvironment: [], roadClass: [], toll: [] };
    const roadEnvironment = details.roadEnvironment ?? [];
    const toll = details.toll ?? [];
    return {
      coordinates: route.coordinates,
      distanceKm: Math.max(0, Number((route.distanceMeters / 1000).toFixed(1))),
      durationMinutes: Math.max(0, Math.round(route.timeMilliseconds / 60000)),
      usedRiskAvoidance: routeMode === "risk_aware",
      routeMode,
      isNavigable: true,
      warning: null,
      details: {
        road_environment: this.#serializeDetailSegments(roadEnvironment),
        road_class: this.#serializeDetailSegments(details.roadClass ?? []),
        toll: this.#serializeDetailSegments(toll),
        uses_ferry: roadEnvironment.some(({ value }) => value?.toLowerCase() === "ferry"),
        uses_toll: toll.some(({ value }) => {
          const normalized = value?.toLowerCase();
          return normalized === "hgv" || normalized === "all";
        }),
      },
    };
  }

  #serializeDetailSegments(segments: RouteDetailSegment[]) {
    return segments.map(({ fromIndex, toIndex, value }) => ({ from_index: fromIndex, to_index: toIndex, value }));
  }
}

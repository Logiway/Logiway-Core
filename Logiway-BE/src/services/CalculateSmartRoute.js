import { isCoordinate } from "../domain/entities/coordinate.js";
import { isTruckProfile } from "../domain/entities/truckProfile.js";
import { resolveTruckSpecifications } from "../domain/entities/truckSpecifications.js";
import {
  buildCustomModel as buildRiskCustomModel,
  normalizeRiskPoints,
} from "../domain/services/routingRisk.js";
import {
  buildTruckCustomModel,
  mergeTruckAndRiskCustomModels,
} from "../domain/services/truckRouting.js";
import { ValidationError } from "../errors/ValidationError.js";

export class CalculateSmartRoute {
  constructor({
    geocodingRepository,
    riskRepository,
    placeGeocodingRepository,
    routingRepository,
    routeFacilityRepository,
    logger,
  }) {
    this.geocodingRepository = geocodingRepository;
    this.riskRepository = riskRepository;
    this.placeGeocodingRepository = placeGeocodingRepository;
    this.routingRepository = routingRepository;
    this.routeFacilityRepository = routeFacilityRepository;
    this.logger = logger;
  }

  async execute({
    origin,
    dest,
    originCoordinates,
    destinationCoordinates,
    truckProfile,
    truckSpecifications,
  }) {
    const normalizedOrigin = typeof origin === "string" ? origin.trim() : origin;
    const normalizedDestination = typeof dest === "string" ? dest.trim() : dest;
    this.#validateInput({
      origin: normalizedOrigin,
      dest: normalizedDestination,
      originCoordinates,
      destinationCoordinates,
      truckProfile,
    });
    const normalizedTruckSpecifications = resolveTruckSpecifications(
      truckSpecifications,
      truckProfile,
    );
    const geocoding = originCoordinates
      ? {
          origin: { name: normalizedOrigin, coordinates: originCoordinates },
          destination: {
            name: normalizedDestination,
            coordinates: destinationCoordinates,
          },
        }
      : await this.geocodingRepository.geocodeRoute({
          origin: normalizedOrigin,
          dest: normalizedDestination,
        });
    const routeOriginCoordinates = geocoding.origin.coordinates;
    const routeDestinationCoordinates = geocoding.destination.coordinates;
    const riskPoints = (
      await this.#findRiskPoints({
        origin: normalizedOrigin,
        dest: normalizedDestination,
      })
    ).filter((riskPoint) => isCoordinate(riskPoint.coordinates));
    const vehicleModel = buildTruckCustomModel(normalizedTruckSpecifications);
    const riskModel = buildRiskCustomModel(riskPoints);
    const route = await this.#calculateRoute({
      points: [routeOriginCoordinates, routeDestinationCoordinates],
      profile: truckProfile,
      vehicleModel,
      riskModel,
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

  #validateInput({
    origin,
    dest,
    originCoordinates,
    destinationCoordinates,
    truckProfile,
  }) {
    if (typeof origin !== "string" || typeof dest !== "string") {
      throw new ValidationError("Origin dan Destination wajib diisi!");
    }

    if (
      origin.length < 2 ||
      origin.length > 200 ||
      dest.length < 2 ||
      dest.length > 200
    ) {
      throw new ValidationError(
        "Origin dan Destination harus berisi 2-200 karakter.",
      );
    }

    const hasOriginCoordinates = originCoordinates !== undefined;
    const hasDestinationCoordinates = destinationCoordinates !== undefined;
    if (hasOriginCoordinates !== hasDestinationCoordinates) {
      throw new ValidationError("Koordinat origin dan destination wajib berpasangan.");
    }
    if (
      hasOriginCoordinates &&
      (!isCoordinate(originCoordinates) || !isCoordinate(destinationCoordinates))
    ) {
      throw new ValidationError("Koordinat origin atau destination tidak valid.");
    }

    if (!isTruckProfile(truckProfile)) {
      throw new ValidationError("Truck profile tidak valid.");
    }
  }

  async #findRiskPoints({ origin, dest }) {
    try {
      const rawRiskPoints = await this.riskRepository.findRouteRisks({ origin, dest });
      const validatedRiskPoints = normalizeRiskPoints(rawRiskPoints);
      const riskPoints = [];

      for (const riskPoint of validatedRiskPoints) {
        try {
          const coordinates = await this.placeGeocodingRepository.geocode(
            riskPoint.location_name,
          );
          if (coordinates) riskPoints.push({ ...riskPoint, coordinates });
        } catch (error) {
          this.logger.warn("Risk location geocoding failed", {
            location: riskPoint.location_name,
            error: error.message,
          });
        }
      }

      return riskPoints;
    } catch (error) {
      this.logger.warn("Risk discovery failed", { error: error.message });
      return [];
    }
  }

  async #findRouteFacilities(route) {
    if (!route.isNavigable) {
      return { status: "not_applicable", facilities: [] };
    }
    return { status: "disabled", facilities: [] };
  }

  async #calculateRoute({ points, profile, vehicleModel, riskModel }) {
    if (riskModel) {
      try {
        const route = await this.routingRepository.calculate({
          points,
          profile,
          customModel: mergeTruckAndRiskCustomModels(vehicleModel, riskModel),
          disableCh: true,
        });
        return this.#formatRoute(route, "risk_aware");
      } catch (error) {
        this.logger.warn("Risk-aware route failed", { error: error.message });
      }
    }

    try {
      const route = await this.routingRepository.calculate({
        points,
        profile,
        customModel: vehicleModel,
        disableCh: true,
      });
      return this.#formatRoute(route, "standard");
    } catch (error) {
      this.logger.error("GraphHopper route failed", { error: error.message });
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

  #formatRoute(route, routeMode) {
    const details = route.details ?? {
      roadEnvironment: [],
      roadClass: [],
      toll: [],
    };
    const roadEnvironment = details.roadEnvironment ?? [];
    const toll = details.toll ?? [];

    return {
      coordinates: route.coordinates,
      distanceKm: Math.max(0, Number((route.distanceMeters / 1000).toFixed(1))),
      durationMinutes: Math.max(
        0,
        Math.round(route.timeMilliseconds / 60000),
      ),
      usedRiskAvoidance: routeMode === "risk_aware",
      routeMode,
      isNavigable: true,
      warning: null,
      details: {
        road_environment: this.#serializeDetailSegments(roadEnvironment),
        road_class: this.#serializeDetailSegments(details.roadClass ?? []),
        toll: this.#serializeDetailSegments(toll),
        uses_ferry: roadEnvironment.some(
          ({ value }) => value?.toLowerCase() === "ferry",
        ),
        uses_toll: toll.some(({ value }) => {
          const normalizedValue = value?.toLowerCase();
          return normalizedValue === "hgv" || normalizedValue === "all";
        }),
      },
    };
  }

  #serializeDetailSegments(segments) {
    return segments.map(({ fromIndex, toIndex, value }) => ({
      from_index: fromIndex,
      to_index: toIndex,
      value,
    }));
  }
}

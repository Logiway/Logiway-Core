import { useEffect, useMemo } from "react";
import {
  BedDouble,
  Fuel,
  MapPin,
  ShieldAlert,
  Ship,
  Store,
  Truck,
} from "lucide-react";
import { LngLatBounds } from "maplibre-gl";
import type { StyleSpecification } from "maplibre-gl";
import { useAnimatedRoute } from "../../hooks/index.ts";
import type { RouteStatus } from "../../hooks/index.ts";
import type {
  Coordinates,
  RouteFacility,
  RouteFacilityType,
  SmartRoute,
} from "../../types/index.ts";
import {
  Map,
  MapControls,
  MapMarker,
  MapRoute,
  MarkerContent,
  useMap,
} from "../ui/index.ts";
import { RouteFeatureMarker } from "./route-feature-marker.tsx";
import { RouteInformation } from "./route-information.tsx";

const osmStyle: StyleSpecification = {
  version: 8,
  sources: {
    "osm-tiles": {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm-layer", type: "raster", source: "osm-tiles" }],
};

const fallbackDashArray: [number, number] = [1.5, 1.25];
const fallbackRouteColor = "#2563eb";
const emptyRouteCoordinates: Coordinates[] = [];
const endpointMarkerOffset: [number, number] = [0, -7];
const maximumDisplayedFacilities = 40;
const maximumFerryMarkers = 20;

const facilityLabels: Record<RouteFacilityType, string> = {
  fuel: "SPBU",
  rest_area: "Tempat istirahat",
  service_area: "Area layanan",
};

function getDisplayRouteColor(color: string) {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(color.trim());
  if (!match) {
    return color;
  }
  const channels = match.slice(1).map((channel) => Number.parseInt(channel, 16));
  return channels.every((channel) => channel >= 240)
    ? fallbackRouteColor
    : color;
}

function distanceMeters(first: Coordinates, second: Coordinates) {
  const toRadians = Math.PI / 180;
  const latitudeDelta = (second[1] - first[1]) * toRadians;
  const longitudeDelta = (second[0] - first[0]) * toRadians;
  const firstLatitude = first[1] * toRadians;
  const secondLatitude = second[1] * toRadians;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return (
    6_371_000 *
    2 *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

function getSegmentMidpoint(
  coordinates: Coordinates[],
  fromIndex: number,
  toIndex: number,
): Coordinates {
  let totalDistance = 0;
  for (let index = fromIndex; index < toIndex; index += 1) {
    totalDistance += distanceMeters(coordinates[index]!, coordinates[index + 1]!);
  }

  const midpointDistance = totalDistance / 2;
  let traversedDistance = 0;
  for (let index = fromIndex; index < toIndex; index += 1) {
    const start = coordinates[index]!;
    const end = coordinates[index + 1]!;
    const edgeDistance = distanceMeters(start, end);
    if (traversedDistance + edgeDistance >= midpointDistance) {
      const progress =
        edgeDistance === 0
          ? 0
          : (midpointDistance - traversedDistance) / edgeDistance;
      return [
        start[0] + (end[0] - start[0]) * progress,
        start[1] + (end[1] - start[1]) * progress,
      ];
    }
    traversedDistance += edgeDistance;
  }
  return coordinates[toIndex]!;
}

function getFerryMarkers(route: SmartRoute): Coordinates[] {
  const markers: Coordinates[] = [];
  for (const segment of route.routeDetails?.roadEnvironment ?? []) {
    if (segment.value !== "ferry") {
      continue;
    }
    const coordinate = getSegmentMidpoint(
      route.coordinates,
      segment.fromIndex,
      segment.toIndex,
    );
    if (!markers.some((current) => distanceMeters(current, coordinate) < 250)) {
      markers.push(coordinate);
      if (markers.length === maximumFerryMarkers) {
        break;
      }
    }
  }
  return markers;
}

function getFacilityIcon(type: RouteFacilityType) {
  if (type === "fuel") {
    return Fuel;
  }
  return type === "rest_area" ? BedDouble : Store;
}

function getFacilityColor(type: RouteFacilityType) {
  if (type === "fuel") {
    return "amber" as const;
  }
  return type === "rest_area" ? ("emerald" as const) : ("violet" as const);
}

function RouteBounds({ coordinates }: { coordinates: Coordinates[] }) {
  const { map, isLoaded, isStyleLoaded } = useMap();

  useEffect(() => {
    const firstCoordinate = coordinates[0];
    if (!map || !isLoaded || !isStyleLoaded || !firstCoordinate) {
      return;
    }

    const bounds = coordinates.reduce(
      (currentBounds, coordinate) => currentBounds.extend(coordinate),
      new LngLatBounds(firstCoordinate, firstCoordinate),
    );
    let frame: number | null = null;
    const fitRoute = () => {
      const container = map.getContainer();
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width <= 0 || height <= 0) {
        return;
      }
      const mobile = width < 640;
      const horizontal = Math.min(
        mobile ? 32 : 72,
        Math.max(16, (width - 120) / 2),
      );
      const top = Math.min(mobile ? 40 : 72, Math.max(16, height * 0.15));
      const desiredBottom = mobile ? 180 : 220;
      const bottom = Math.min(
        desiredBottom,
        Math.max(40, height - top - 120),
      );
      map.resize();
      map.fitBounds(bounds, {
        padding: { top, right: horizontal, bottom, left: horizontal },
        maxZoom: 15,
        duration: 0,
      });
    };
    const scheduleFit = () => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
      frame = requestAnimationFrame(() => {
        frame = null;
        fitRoute();
      });
    };
    const resizeObserver = new ResizeObserver(scheduleFit);
    resizeObserver.observe(map.getContainer());
    scheduleFit();

    return () => {
      resizeObserver.disconnect();
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
    };
  }, [coordinates, isLoaded, isStyleLoaded, map]);

  return null;
}

function FacilityMarker({ facility }: { facility: RouteFacility }) {
  const label = `${facilityLabels[facility.type]}: ${facility.name ?? "Nama tidak tersedia"}`;
  return (
    <RouteFeatureMarker
      coordinates={facility.coordinates}
      icon={getFacilityIcon(facility.type)}
      color={getFacilityColor(facility.type)}
      label={label}
    />
  );
}

interface RouteMapProps {
  status: RouteStatus;
}

export function RouteMap({ status }: RouteMapProps) {
  const route = status.type === "success" ? status.route : null;
  const animatedCoordinates = useAnimatedRoute(
    route?.coordinates ?? emptyRouteCoordinates,
  );
  const ferryMarkers = useMemo(
    () => (route ? getFerryMarkers(route) : []),
    [route],
  );
  const facilities = useMemo(
    () => route?.facilities.slice(0, maximumDisplayedFacilities) ?? [],
    [route],
  );
  const displayRouteColor = route
    ? getDisplayRouteColor(route.routeColor)
    : fallbackRouteColor;
  const dashArray =
    route?.routeMode === "straight_line_fallback"
      ? fallbackDashArray
      : undefined;
  const routeOrigin = route?.coordinates[0];
  const routeDestination = route?.coordinates.at(-1);
  const boundsCoordinates = useMemo(
    () =>
      route
        ? [
            ...route.coordinates,
            ...ferryMarkers,
            ...facilities.map((facility) => facility.coordinates),
            ...route.riskPoints.map((riskPoint) => riskPoint.coordinates),
          ]
        : [],
    [facilities, ferryMarkers, route],
  );
  const hasFuel = facilities.some((facility) => facility.type === "fuel");
  const hasRestArea = facilities.some(
    (facility) => facility.type === "rest_area",
  );
  const hasServiceArea = facilities.some(
    (facility) => facility.type === "service_area",
  );
  const hasLegend =
    ferryMarkers.length > 0 ||
    hasFuel ||
    hasRestArea ||
    hasServiceArea ||
    (route?.riskPoints.length ?? 0) > 0;
  const hasHighRisk =
    route?.riskPoints.some((riskPoint) => riskPoint.severity >= 7) ?? false;

  return (
    <section
      className="relative flex min-h-[44dvh] min-w-0 flex-1 flex-col overflow-hidden bg-slate-100 lg:h-dvh lg:min-h-0"
      role="region"
      aria-label="Peta rute logistik"
    >
      <Map
        className="min-h-0 flex-1"
        theme="light"
        styles={{ light: osmStyle }}
        center={[106.8272, -6.1754]}
        zoom={11}
        renderWorldCopies={false}
      >
        {route && routeOrigin && routeDestination && (
          <>
            <MapRoute
              id="logiway-route-glow"
              coordinates={animatedCoordinates}
              color={displayRouteColor}
              width={15}
              opacity={0.16}
              dashArray={dashArray}
              interactive={false}
            />
            <MapRoute
              id="logiway-route-casing"
              coordinates={animatedCoordinates}
              color="#0f172a"
              width={11}
              opacity={0.72}
              dashArray={dashArray}
              interactive={false}
            />
            <MapRoute
              id="logiway-route-main"
              coordinates={animatedCoordinates}
              color={displayRouteColor}
              width={7}
              opacity={1}
              dashArray={dashArray}
              interactive={false}
            />
            <MapMarker
              longitude={routeOrigin[0]}
              latitude={routeOrigin[1]}
              anchor="bottom"
              offset={endpointMarkerOffset}
              className="relative z-20"
            >
              <MarkerContent
                className="logiway-map-marker logiway-truck-marker relative z-10"
                role="img"
                aria-label="Lokasi awal truk"
                title="Lokasi awal truk"
              >
                <Truck aria-hidden="true" size={24} strokeWidth={2.25} />
              </MarkerContent>
            </MapMarker>
            <MapMarker
              longitude={routeDestination[0]}
              latitude={routeDestination[1]}
              anchor="bottom"
              offset={endpointMarkerOffset}
              className="relative z-20"
            >
              <MarkerContent
                className="logiway-map-marker logiway-destination-marker relative z-10"
                role="img"
                aria-label="Lokasi tujuan"
                title="Lokasi tujuan"
              >
                <MapPin aria-hidden="true" size={24} strokeWidth={2.25} />
              </MarkerContent>
            </MapMarker>
            {ferryMarkers.map((coordinates) => (
              <RouteFeatureMarker
                key={`ferry-${coordinates[0]}-${coordinates[1]}`}
                coordinates={coordinates}
                icon={Ship}
                color="navy"
                label="Segmen kapal feri"
              />
            ))}
            {facilities.map((facility, index) => (
              <FacilityMarker
                key={`${facility.id}-${index}`}
                facility={facility}
              />
            ))}
            {route.riskPoints.map((riskPoint, index) => {
              const label = `${riskPoint.locationName}, tingkat risiko ${riskPoint.severity}`;
              return (
                <RouteFeatureMarker
                  key={`risk-${riskPoint.coordinates[0]}-${riskPoint.coordinates[1]}-${index}`}
                  coordinates={riskPoint.coordinates}
                  icon={ShieldAlert}
                  color={riskPoint.severity >= 7 ? "red" : "orange"}
                  label={label}
                />
              );
            })}
            <RouteBounds coordinates={boundsCoordinates} />
          </>
        )}
        <MapControls position="top-right" showZoom showCompass />
      </Map>

      {route && hasLegend && (
        <div
          className="pointer-events-none absolute top-3 left-3 z-30 flex max-w-[calc(100%-5.5rem)] flex-wrap gap-x-3 gap-y-2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg shadow-slate-900/10 backdrop-blur-sm"
          role="group"
          aria-label="Legenda fitur rute"
        >
          {ferryMarkers.length > 0 && (
            <span className="flex items-center gap-1.5">
              <Ship aria-hidden="true" className="size-4 text-blue-900" />
              Kapal feri
            </span>
          )}
          {hasFuel && (
            <span className="flex items-center gap-1.5">
              <Fuel aria-hidden="true" className="size-4 text-amber-500" />
              SPBU
            </span>
          )}
          {(hasRestArea || hasServiceArea) && (
            <span className="flex items-center gap-1.5">
              {hasRestArea && (
                <BedDouble
                  aria-hidden="true"
                  className="size-4 text-emerald-600"
                />
              )}
              {hasServiceArea && (
                <Store aria-hidden="true" className="size-4 text-violet-600" />
              )}
              Tempat istirahat/area layanan
            </span>
          )}
          {route.riskPoints.length > 0 && (
            <span className="flex items-center gap-1.5">
              <ShieldAlert
                aria-hidden="true"
                className={`size-4 ${hasHighRisk ? "text-red-600" : "text-orange-500"}`}
              />
              Risiko pungli
            </span>
          )}
        </div>
      )}

      {status.type === "success" && (
                 <div className="pointer-events-none absolute bottom-10 left-1/2 z-30 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 sm:bottom-12">
          <RouteInformation status={status} />
        </div>
      )}
    </section>
  );
}

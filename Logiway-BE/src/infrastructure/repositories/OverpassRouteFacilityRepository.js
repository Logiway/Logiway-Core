import { isCoordinate } from "../../domain/entities/coordinate.js";
import { RouteFacilityRepository } from "../../repositories/RouteFacilityRepository.js";

const EARTH_RADIUS_METERS = 6371008.8;
const MAX_ROUTE_SAMPLES = 16;
const MAX_PROVIDER_CANDIDATES = 120;
const MAX_FACILITIES = 60;
const MAX_FACILITY_DISTANCE_METERS = 1200;
const MAX_PROVIDERS = 2;
const MAX_TEXT_LENGTH = 160;

function radians(degrees) {
  return (degrees * Math.PI) / 180;
}

function approximateDistanceMeters([fromLon, fromLat], [toLon, toLat]) {
  const latitudeDelta = radians(toLat - fromLat);
  const longitudeDelta = radians(toLon - fromLon);
  const fromLatitude = radians(fromLat);
  const toLatitude = radians(toLat);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(haversine));
}

function interpolateCoordinate([fromLon, fromLat], [toLon, toLat], ratio) {
  let longitudeDelta = toLon - fromLon;
  if (longitudeDelta > 180) longitudeDelta -= 360;
  if (longitudeDelta < -180) longitudeDelta += 360;

  const longitude = ((fromLon + longitudeDelta * ratio + 540) % 360) - 180;
  return [longitude, fromLat + (toLat - fromLat) * ratio];
}

function sampleCoordinates(coordinates) {
  if (coordinates.length <= MAX_ROUTE_SAMPLES) return coordinates;

  const segmentLengths = [];
  let totalDistance = 0;
  for (let index = 1; index < coordinates.length; index += 1) {
    const segmentLength = approximateDistanceMeters(
      coordinates[index - 1],
      coordinates[index],
    );
    segmentLengths.push(segmentLength);
    totalDistance += segmentLength;
  }

  if (totalDistance === 0) {
    return [coordinates[0], coordinates[coordinates.length - 1]];
  }

  const sampled = [coordinates[0]];
  let segmentIndex = 0;
  let distanceBeforeSegment = 0;
  for (let index = 1; index < MAX_ROUTE_SAMPLES - 1; index += 1) {
    const targetDistance = (index * totalDistance) / (MAX_ROUTE_SAMPLES - 1);
    while (
      segmentIndex < segmentLengths.length - 1 &&
      distanceBeforeSegment + segmentLengths[segmentIndex] < targetDistance
    ) {
      distanceBeforeSegment += segmentLengths[segmentIndex];
      segmentIndex += 1;
    }

    const segmentLength = segmentLengths[segmentIndex];
    const ratio = segmentLength === 0
      ? 0
      : (targetDistance - distanceBeforeSegment) / segmentLength;
    sampled.push(
      interpolateCoordinate(
        coordinates[segmentIndex],
        coordinates[segmentIndex + 1],
        ratio,
      ),
    );
  }
  sampled.push(coordinates[coordinates.length - 1]);
  return sampled;
}

function buildQuery(coordinates, timeoutMs) {
  const timeoutSeconds = Math.max(1, Math.ceil(timeoutMs / 1000));
  const routePoints = coordinates.map(([lon, lat]) => `${lat},${lon}`).join(",");
  return `[out:json][timeout:${timeoutSeconds}];(nwr(around:1200,${routePoints})["amenity"="fuel"];nwr(around:1200,${routePoints})["highway"="rest_area"];nwr(around:1200,${routePoints})["highway"="services"];);out tags center ${MAX_PROVIDER_CANDIDATES};`;
}

function normalizeText(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().slice(0, MAX_TEXT_LENGTH);
  return normalized || null;
}

function facilityType(tags) {
  if (tags?.amenity === "fuel") return "fuel";
  if (tags?.highway === "rest_area") return "rest_area";
  if (tags?.highway === "services") return "service_area";
  return null;
}

function hgvAccess(value) {
  return value === "yes" || value === "no" || value === "designated"
    ? value
    : "unknown";
}

function normalizeFacility(element) {
  if (!element || typeof element !== "object") return null;
  if (
    !Number.isInteger(element.id) ||
    !["node", "way", "relation"].includes(element.type)
  ) {
    return null;
  }

  const type = facilityType(element.tags);
  if (!type) return null;

  const coordinates = element.type === "node"
    ? [element.lon, element.lat]
    : [element.center?.lon, element.center?.lat];
  if (!isCoordinate(coordinates)) return null;

  const tags = element.tags ?? {};
  return {
    id: `${element.type}/${element.id}`,
    facilityType: type,
    name:
      normalizeText(tags.name) ??
      normalizeText(tags.brand) ??
      normalizeText(tags.operator),
    coordinates,
    openingHours: normalizeText(tags.opening_hours),
    hgvAccess: hgvAccess(tags.hgv),
    source: "openstreetmap",
  };
}

function approximateSegmentDistanceMeters(point, from, to) {
  const [pointLon, pointLat] = point;
  const project = ([lon, lat]) => {
    let longitudeDelta = lon - pointLon;
    if (longitudeDelta > 180) longitudeDelta -= 360;
    if (longitudeDelta < -180) longitudeDelta += 360;
    return [
      EARTH_RADIUS_METERS *
        radians(longitudeDelta) *
        Math.cos(radians((lat + pointLat) / 2)),
      EARTH_RADIUS_METERS * radians(lat - pointLat),
    ];
  };
  const [fromX, fromY] = project(from);
  const [toX, toY] = project(to);
  const segmentX = toX - fromX;
  const segmentY = toY - fromY;
  const segmentLengthSquared = segmentX ** 2 + segmentY ** 2;
  if (segmentLengthSquared === 0) return Math.hypot(fromX, fromY);

  const ratio = Math.max(
    0,
    Math.min(1, -(fromX * segmentX + fromY * segmentY) / segmentLengthSquared),
  );
  return Math.hypot(fromX + ratio * segmentX, fromY + ratio * segmentY);
}

function nearestRouteDistance(facility, routeCoordinates) {
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (let index = 1; index < routeCoordinates.length; index += 1) {
    nearestDistance = Math.min(
      nearestDistance,
      approximateSegmentDistanceMeters(
        facility.coordinates,
        routeCoordinates[index - 1],
        routeCoordinates[index],
      ),
    );
  }
  return nearestDistance;
}

export class OverpassRouteFacilityRepository extends RouteFacilityRepository {
  constructor({ urls, fetchImplementation = fetch, timeoutMs = 12000 }) {
    super();
    this.urls = urls.slice(0, MAX_PROVIDERS);
    this.fetch = fetchImplementation;
    this.timeoutMs = timeoutMs;
  }

  async findAlongRoute(coordinates) {
    if (
      !Array.isArray(coordinates) ||
      coordinates.length < 2 ||
      !coordinates.every(isCoordinate)
    ) {
      throw new Error("Invalid route coordinates");
    }

    const sampledCoordinates = sampleCoordinates(coordinates);
    const query = buildQuery(sampledCoordinates, this.timeoutMs);
    const failures = [];
    let data;

    for (const url of this.urls) {
      try {
        const response = await this.fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
            "User-Agent": "Logiway/1.0 (route facilities)",
          },
          body: new URLSearchParams({ data: query }),
          signal: AbortSignal.timeout(this.timeoutMs),
        });
        if (!response.ok) throw new Error();

        const candidate = await response.json();
        if (
          !candidate ||
          typeof candidate !== "object" ||
          !Array.isArray(candidate.elements) ||
          candidate.remark !== undefined
        ) {
          throw new Error();
        }
        data = candidate;
        break;
      } catch {
        failures.push(new Error("Overpass provider unavailable"));
      }
    }

    if (!data) {
      throw new AggregateError(failures, "Overpass providers unavailable");
    }

    const seen = new Set();
    const facilities = [];
    for (const element of data.elements.slice(0, MAX_PROVIDER_CANDIDATES)) {
      const facility = normalizeFacility(element);
      if (!facility || seen.has(facility.id)) continue;

      seen.add(facility.id);
      const routeDistance = nearestRouteDistance(facility, sampledCoordinates);
      if (routeDistance <= MAX_FACILITY_DISTANCE_METERS) {
        facilities.push({ facility, routeDistance });
      }
    }

    return facilities
      .sort((left, right) => left.routeDistance - right.routeDistance)
      .slice(0, MAX_FACILITIES)
      .map(({ facility }) => facility);
  }
}

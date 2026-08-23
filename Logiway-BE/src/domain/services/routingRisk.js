const MAX_RISK_POINTS = 10;
const MAX_LOCATION_LENGTH = 160;
const MAX_NOTE_LENGTH = 500;

export function normalizeRiskPoints(value) {
  if (!Array.isArray(value)) return [];

  const seenNames = new Set();
  const normalized = [];

  for (const riskPoint of value) {
    if (!riskPoint || typeof riskPoint !== "object") continue;

    const locationName = typeof riskPoint.location_name === "string"
      ? riskPoint.location_name.trim()
      : "";
    const note = typeof riskPoint.note === "string" ? riskPoint.note.trim() : "";
    const severity = riskPoint.severity;
    const deduplicationKey = locationName.toLocaleLowerCase("id-ID");

    if (
      locationName.length < 2 ||
      locationName.length > MAX_LOCATION_LENGTH ||
      note.length < 1 ||
      note.length > MAX_NOTE_LENGTH ||
      !Number.isInteger(severity) ||
      severity < 1 ||
      severity > 10 ||
      seenNames.has(deduplicationKey)
    ) {
      continue;
    }

    seenNames.add(deduplicationKey);
    normalized.push({ location_name: locationName, severity, note });
    if (normalized.length === MAX_RISK_POINTS) break;
  }

  return normalized;
}

export function pointToCirclePolygon([lon, lat], radiusMeters = 400, steps = 16) {
  const coordinates = [];
  const earthRadius = 6371000;

  for (let index = 0; index <= steps; index += 1) {
    const angle = (index / steps) * 2 * Math.PI;
    const deltaX = (radiusMeters * Math.cos(angle)) / earthRadius;
    const deltaY = (radiusMeters * Math.sin(angle)) / earthRadius;
    const deltaLon =
      (deltaX / Math.cos((lat * Math.PI) / 180)) * (180 / Math.PI);
    const deltaLat = deltaY * (180 / Math.PI);
    coordinates.push([lon + deltaLon, lat + deltaLat]);
  }

  return coordinates;
}

export function severityToMultiplier(severity) {
  const numericSeverity = Number.isFinite(Number(severity)) ? Number(severity) : 1;
  const clampedSeverity = Math.min(10, Math.max(1, numericSeverity));
  return Math.max(0.05, Number((1 - clampedSeverity / 10).toFixed(2)));
}

export function buildCustomModel(riskPoints) {
  const features = [];
  const priority = [];

  riskPoints.forEach((riskPoint, index) => {
    if (!riskPoint.coordinates) return;

    const areaId = `pungli_area_${index}`;
    features.push({
      type: "Feature",
      id: areaId,
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [pointToCirclePolygon(riskPoint.coordinates)],
      },
    });
    priority.push({
      if: `in_${areaId}`,
      multiply_by: severityToMultiplier(riskPoint.severity).toString(),
    });
  });

  if (priority.length === 0) return null;

  return {
    priority,
    areas: {
      type: "FeatureCollection",
      features,
    },
  };
}

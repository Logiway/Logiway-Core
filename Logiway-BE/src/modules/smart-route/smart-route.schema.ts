import type { RequestHandler } from "express";
import { ValidationError } from "../../errors/validationError.js";
import { isCoordinate } from "../../utils/coordinates.js";
import { isTruckProfile, resolveTruckSpecifications } from "./smart-route-model.js";

const ALLOWED_ROOT_PROPERTIES = new Set([
  "origin",
  "dest",
  "originCoordinates",
  "destinationCoordinates",
  "truckProfile",
  "truckSpecifications",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeLocation(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export const validateSmartRouteRequest: RequestHandler = (request, response, next) => {
  const body: Record<string, unknown> = isRecord(request.body) ? request.body : {};
  if (Object.keys(body).some((property) => !ALLOWED_ROOT_PROPERTIES.has(property))) {
    next(new ValidationError("Properti request tidak valid."));
    return;
  }

  const origin = normalizeLocation(body.origin);
  const dest = normalizeLocation(body.dest);
  const truckProfile = body.truckProfile;
  if (!origin || !dest) {
    next(new ValidationError("Origin dan Destination wajib diisi!"));
    return;
  }
  if (origin.length < 2 || origin.length > 200 || dest.length < 2 || dest.length > 200) {
    next(new ValidationError("Origin dan Destination harus berisi 2-200 karakter."));
    return;
  }

  const hasOriginCoordinates = Object.hasOwn(body, "originCoordinates");
  const hasDestinationCoordinates = Object.hasOwn(body, "destinationCoordinates");
  if (hasOriginCoordinates !== hasDestinationCoordinates) {
    next(new ValidationError("Koordinat origin dan destination wajib berpasangan."));
    return;
  }
  if (hasOriginCoordinates && (!isCoordinate(body.originCoordinates) || !isCoordinate(body.destinationCoordinates))) {
    next(new ValidationError("Koordinat origin atau destination tidak valid."));
    return;
  }
  if (!isTruckProfile(truckProfile)) {
    next(new ValidationError("Truck profile tidak valid."));
    return;
  }

  try {
    const truckSpecifications = resolveTruckSpecifications(body.truckSpecifications, truckProfile);
    request.smartRouteInput = hasOriginCoordinates && isCoordinate(body.originCoordinates) && isCoordinate(body.destinationCoordinates)
      ? { origin, dest, originCoordinates: body.originCoordinates, destinationCoordinates: body.destinationCoordinates, truckProfile, truckSpecifications }
      : { origin, dest, truckProfile, truckSpecifications };
    next();
  } catch (error: unknown) {
    next(error);
  }
};

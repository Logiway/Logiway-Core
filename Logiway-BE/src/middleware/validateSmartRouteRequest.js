import { isCoordinate } from "../domain/entities/coordinate.js";
import { isTruckProfile } from "../domain/entities/truckProfile.js";
import { ValidationError } from "../errors/ValidationError.js";
import { resolveTruckSpecifications } from "../domain/entities/truckSpecifications.js";

const ALLOWED_ROOT_PROPERTIES = new Set([
  "origin",
  "dest",
  "originCoordinates",
  "destinationCoordinates",
  "truckProfile",
  "truckSpecifications",
]);

function normalizeLocation(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function validateSmartRouteRequest(request, response, next) {
  const requestProperties = Object.keys(request.body ?? {});
  if (requestProperties.some((property) => !ALLOWED_ROOT_PROPERTIES.has(property))) {
    return next(new ValidationError("Properti request tidak valid."));
  }

  const origin = normalizeLocation(request.body?.origin);
  const dest = normalizeLocation(request.body?.dest);
  const truckProfile = request.body?.truckProfile;

  if (!origin || !dest) {
    return next(
      new ValidationError("Origin dan Destination wajib diisi!"),
    );
  }

  if (origin.length < 2 || origin.length > 200 || dest.length < 2 || dest.length > 200) {
    return next(
      new ValidationError(
        "Origin dan Destination harus berisi 2-200 karakter.",
      ),
    );
  }

  const hasOriginCoordinates = Object.hasOwn(
    request.body ?? {},
    "originCoordinates",
  );
  const hasDestinationCoordinates = Object.hasOwn(
    request.body ?? {},
    "destinationCoordinates",
  );
  if (hasOriginCoordinates !== hasDestinationCoordinates) {
    return next(new ValidationError("Koordinat origin dan destination wajib berpasangan."));
  }
  if (
    hasOriginCoordinates &&
    (!isCoordinate(request.body.originCoordinates) ||
      !isCoordinate(request.body.destinationCoordinates))
  ) {
    return next(new ValidationError("Koordinat origin atau destination tidak valid."));
  }

  if (!isTruckProfile(truckProfile)) {
    return next(new ValidationError("Truck profile tidak valid."));
  }

  try {
    const truckSpecifications = resolveTruckSpecifications(
      request.body?.truckSpecifications,
      truckProfile,
    );
    request.smartRouteInput = {
      origin,
      dest,
      ...(hasOriginCoordinates
        ? {
            originCoordinates: request.body.originCoordinates,
            destinationCoordinates: request.body.destinationCoordinates,
          }
        : {}),
      truckProfile,
      truckSpecifications,
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

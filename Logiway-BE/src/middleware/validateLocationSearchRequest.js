import { ValidationError } from "../errors/ValidationError.js";

export function validateLocationSearchRequest(request, response, next) {
  const query = typeof request.query.q === "string" ? request.query.q.trim() : "";
  if (query.length < 3 || query.length > 200) {
    return next(new ValidationError("Query lokasi harus berisi 3-200 karakter."));
  }

  request.locationQuery = query;
  return next();
}

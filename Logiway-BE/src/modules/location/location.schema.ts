import type { RequestHandler } from "express";
import { ValidationError } from "../../errors/validationError.js";

export const validateLocationSearchRequest: RequestHandler = (request, response, next) => {
  const query = typeof request.query.q === "string" ? request.query.q.trim() : "";
  if (query.length < 3 || query.length > 200) {
    next(new ValidationError("Query lokasi harus berisi 3-200 karakter."));
    return;
  }
  request.locationQuery = query;
  next();
};

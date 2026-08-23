import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{1,128}$/;

export const requestId: RequestHandler = (request, response, next) => {
  const provided = request.get("x-request-id");
  request.requestId = provided && SAFE_REQUEST_ID.test(provided) ? provided : randomUUID();
  response.setHeader("X-Request-ID", request.requestId);
  next();
};

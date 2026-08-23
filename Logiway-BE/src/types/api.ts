import type { RequestHandler } from "express";

export interface HealthResponse {
  status: "ok";
}

export interface ErrorResponse {
  success: false;
  error: string;
  requestId: string;
}

export interface LocationController {
  search: RequestHandler;
}

export interface SmartRouteController {
  calculate: RequestHandler;
}

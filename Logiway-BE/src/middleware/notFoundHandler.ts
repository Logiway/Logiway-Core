import type { RequestHandler } from "express";

export const notFoundHandler: RequestHandler = (request, response) => {
  response.status(404).json({
    success: false,
    error: "Endpoint tidak ditemukan.",
    requestId: request.requestId,
  });
};

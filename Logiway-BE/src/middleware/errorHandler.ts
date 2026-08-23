import type { ErrorRequestHandler } from "express";
import { AppError } from "../errors/appError.js";
import type { Logger } from "../types/logger.js";
import { errorMessage } from "../utils/errorMessage.js";

function isBodySyntaxError(error: unknown): error is SyntaxError & { status: number; body: unknown } {
  return error instanceof SyntaxError && "status" in error && error.status === 400 && "body" in error;
}

export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (error: unknown, request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }

    if (error instanceof AppError) {
      if (error.statusCode >= 500) {
        logger.error("Request failed", {
          requestId: request.requestId,
          method: request.method,
          path: request.path,
          statusCode: error.statusCode,
          code: error.code,
          error: errorMessage(error.cause ?? error),
        });
      }
      response.status(error.statusCode).json({
        success: false,
        error: error.expose ? error.message : "Gagal memproses permintaan.",
        requestId: request.requestId,
      });
      return;
    }

    if (isBodySyntaxError(error)) {
      response.status(400).json({
        success: false,
        error: "Request body tidak valid.",
        requestId: request.requestId,
      });
      return;
    }

    logger.error("Unhandled request error", {
      requestId: request.requestId,
      method: request.method,
      path: request.path,
      error: errorMessage(error),
    });
    response.status(500).json({
      success: false,
      error: "Gagal memproses permintaan.",
      requestId: request.requestId,
    });
  };
}

import { ProviderError } from "../errors/ProviderError.js";
import { ValidationError } from "../errors/ValidationError.js";

export function createErrorHandler(logger) {
  return (error, request, response, next) => {
    if (response.headersSent) return next(error);

    if (error instanceof ValidationError || error instanceof ProviderError) {
      return response.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
      return response.status(400).json({
        success: false,
        error: "Request body tidak valid.",
      });
    }

    logger.error("Unhandled request error", {
      method: request.method,
      path: request.originalUrl,
      error: error.message,
    });
    return response.status(500).json({
      success: false,
      error: "Gagal memproses rute.",
    });
  };
}

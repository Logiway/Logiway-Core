import cors, { type CorsOptions, type CorsRequest } from "cors";

function createCorsOptions(corsOrigin: string | undefined): CorsOptions {
  if (!corsOrigin) return {};
  const allowedOrigins = new Set(
    corsOrigin.split(",").map((origin) => origin.trim()).filter(Boolean),
  );

  return {
    origin(origin: string | undefined, callback: (error: Error | null, origin?: boolean) => void): void {
      callback(null, !origin || allowedOrigins.has(origin));
    },
  };
}

export function createCorsMiddleware(corsOrigin: string | undefined): (request: CorsRequest, response: { statusCode?: number; setHeader(key: string, value: string): unknown; end(): unknown }, next: (error?: unknown) => void) => void {
  return cors(createCorsOptions(corsOrigin));
}

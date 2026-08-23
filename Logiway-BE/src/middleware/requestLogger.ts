import type { RequestHandler } from "express";
import type { Logger, LoggerLevel } from "../types/logger.js";

function contentLength(value: string | undefined): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function levelFor(statusCode: number, aborted: boolean): LoggerLevel {
  if (aborted || (statusCode >= 400 && statusCode < 500)) return "warn";
  if (statusCode >= 500) return "error";
  return "info";
}

export function createRequestLogger(logger: Logger): RequestHandler {
  return (request, response, next) => {
    const startedAt = process.hrtime.bigint();
    const queryIndex = request.originalUrl.indexOf("?");
    const path = queryIndex === -1 ? request.originalUrl : request.originalUrl.slice(0, queryIndex);
    let logged = false;

    const complete = (aborted: boolean): void => {
      if (logged) return;
      logged = true;
      const duration = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const statusCode = aborted ? 499 : response.statusCode;
      const context = {
        requestId: request.requestId,
        method: request.method,
        path,
        statusCode,
        durationMs: Number(duration.toFixed(2)),
        ip: request.ip,
        userAgent: request.get("user-agent"),
        ...(contentLength(response.getHeader("content-length")?.toString()) === undefined
          ? {}
          : { contentLength: contentLength(response.getHeader("content-length")?.toString()) }),
        ...(aborted ? { aborted: true } : {}),
      };
      logger[levelFor(statusCode, aborted)]("Request completed", context);
    };

    response.once("finish", () => {
      complete(false);
    });
    response.once("close", () => {
      if (!response.writableFinished) complete(true);
    });
    next();
  };
}

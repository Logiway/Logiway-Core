import type { LogContext, Logger, LoggerLevel } from "../types/logger.js";
import { redact } from "../utils/redaction.js";

const SERVICE = "logiway-backend";
const ENVIRONMENT = process.env.NODE_ENV?.trim() || "development";

function serialize(level: LoggerLevel, message: string, context: LogContext): string {
  try {
    const sanitized = redact(context);
    const safeContext = sanitized !== null && typeof sanitized === "object" && !Array.isArray(sanitized)
      ? sanitized
      : { context: sanitized };
    return JSON.stringify({
      ...safeContext,
      timestamp: new Date().toISOString(),
      level,
      service: SERVICE,
      environment: ENVIRONMENT,
      message,
    });
  } catch {
    return `{"timestamp":"${new Date().toISOString()}","level":"error","service":"${SERVICE}","environment":"${ENVIRONMENT}","message":"Logger serialization failed"}`;
  }
}

function write(level: LoggerLevel, message: string, context: LogContext = {}): void {
  const entry = serialize(level, message, context);
  if (level === "error") {
    console.error(entry);
    return;
  }
  if (level === "warn") {
    console.warn(entry);
    return;
  }
  console.info(entry);
}

export const logger: Logger = {
  info(message, context) {
    write("info", message, context);
  },
  warn(message, context) {
    write("warn", message, context);
  },
  error(message, context) {
    write("error", message, context);
  },
};

const REDACTED = "[redacted]";
const MAX_DEPTH = 8;
const MAX_ENTRIES = 100;

const SENSITIVE_KEYS = new Set([
  "authorization",
  "proxyauthorization",
  "cookie",
  "setcookie",
  "password",
  "passwd",
  "token",
  "accesstoken",
  "refreshtoken",
  "idtoken",
  "apikey",
  "key",
  "secret",
  "clientsecret",
  "credential",
  "credentials",
]);

function normalizedKey(key: string): string {
  return key.toLowerCase().replace(/[-_]/g, "");
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(normalizedKey(key));
}

export function redactString(value: string): string {
  return value
    .replace(/\b(Bearer|Basic)\s+[^\s,;]+/gi, "$1 [redacted]")
    .replace(/((?:[?&]|\b)(?:access[_-]?token|refresh[_-]?token|id[_-]?token|api[_-]?key|token|key|secret|client[_-]?secret|credential(?:s)?)=)[^&#\s]*/gi, "$1[redacted]")
    .replace(/("(?:authorization|proxy-authorization|cookie|set-cookie|password|passwd|token|accessToken|refreshToken|idToken|apiKey|api_key|key|secret|clientSecret|client_secret|credential|credentials)"\s*:\s*")[^"]*(")/gi, "$1[redacted]$2");
}

function sanitize(value: unknown, seen: WeakSet<object>, depth: number): unknown {
  if (typeof value === "string") return redactString(value);
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number" || typeof value === "boolean" || value === null) return value;
  if (value === undefined) return "[undefined]";
  if (typeof value === "symbol") return value.description ? `[symbol:${value.description}]` : "[symbol]";
  if (typeof value === "function") return `[function:${value.name || "anonymous"}]`;
  if (depth >= MAX_DEPTH) return "[max-depth]";

  try {
    if (value instanceof Error) {
      if (seen.has(value)) return "[circular]";
      seen.add(value);
      const sanitizedError: Record<string, unknown> = {
        name: redactString(value.name),
        message: redactString(value.message),
      };
      if (value.stack) sanitizedError.stack = redactString(value.stack);
      if (value.cause !== undefined) sanitizedError.cause = sanitize(value.cause, seen, depth + 1);
      return sanitizedError;
    }

    if (value instanceof Date) return Number.isNaN(value.getTime()) ? "Invalid Date" : value.toISOString();
    if (typeof value !== "object") return "[unsupported]";
    if (seen.has(value)) return "[circular]";
    seen.add(value);

    if (Array.isArray(value)) {
      return value.slice(0, MAX_ENTRIES).map((item) => sanitize(item, seen, depth + 1));
    }

    const result: Record<string, unknown> = {};
    const entries = Object.entries(value).slice(0, MAX_ENTRIES);
    for (const [key, entryValue] of entries) {
      result[key] = isSensitiveKey(key) ? REDACTED : sanitize(entryValue, seen, depth + 1);
    }
    return result;
  } catch {
    return "[unserializable]";
  }
}

export function redact(value: unknown): unknown {
  try {
    return sanitize(value, new WeakSet<object>(), 0);
  } catch {
    return "[unserializable]";
  }
}

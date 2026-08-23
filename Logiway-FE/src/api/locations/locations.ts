import { isCoordinates } from "../../types/index.ts";
import type { LocationSuggestion } from "../../types/index.ts";

const DEFAULT_API_BASE_URL = "/api";

interface LocationSearchResponse {
  success?: unknown;
  locations?: unknown;
}

export async function searchLocations(
  query: string,
  signal?: AbortSignal,
): Promise<LocationSuggestion[]> {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 3 || normalizedQuery.length > 200) {
    return [];
  }

  const baseUrl = (import.meta.env.VITE_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL)
    .replace(/\/$/, "");
  const search = new URLSearchParams({ q: normalizedQuery });
  const response = await fetch(`${baseUrl}/locations?${search}`, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    throw new Error("Gagal mencari lokasi");
  }

  const payload = await response.json() as LocationSearchResponse;
  if (payload.success !== true || !Array.isArray(payload.locations)) {
    throw new Error("Respons pencarian lokasi tidak valid");
  }

  return payload.locations.slice(0, 5).flatMap((location) => {
    if (typeof location !== "object" || location === null) return [];
    const { displayName, coordinates } = location as Record<string, unknown>;
    if (
      typeof displayName !== "string" ||
      !displayName.trim() ||
      displayName.trim().length > 500 ||
      !isCoordinates(coordinates)
    ) {
      return [];
    }

    return [{ displayName: displayName.trim(), coordinates }];
  });
}

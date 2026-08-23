import type { Coordinates } from "./coordinates.ts";

export interface LocationSuggestion {
  displayName: string;
  coordinates: Coordinates;
}

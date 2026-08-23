import type { Coordinate } from "../types/location.js";

export function isCoordinate(value: unknown): value is Coordinate {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    Number.isFinite(value[0]) &&
    typeof value[1] === "number" &&
    Number.isFinite(value[1]) &&
    value[0] >= -180 &&
    value[0] <= 180 &&
    value[1] >= -90 &&
    value[1] <= 90
  );
}

export function requireCoordinate(value: unknown, name: string): Coordinate {
  if (!isCoordinate(value)) throw new Error(`Invalid ${name} coordinates`);
  return value;
}

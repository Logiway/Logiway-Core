import { ValidationError } from "../../errors/ValidationError.js";
import {
  isTruckProfile,
  TRUCK_PROFILE_ROUTING_DEFAULTS,
} from "./truckProfile.js";

const REQUIRED_DIMENSIONS = Object.freeze([
  "maxHeightM",
  "maxWidthM",
  "maxLengthM",
]);
const OPTIONAL_LIMITS = Object.freeze(["grossWeightTon", "maxAxleLoadTon"]);
const ALLOWED_PROPERTIES = new Set([...REQUIRED_DIMENSIONS, ...OPTIONAL_LIMITS]);

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return Object.getPrototypeOf(value) === Object.prototype;
}

function isJsonNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function assertValidNumber(value, property, minimum, maximum, inclusiveMinimum) {
  const meetsMinimum = inclusiveMinimum ? value >= minimum : value > minimum;

  if (!isJsonNumber(value) || !meetsMinimum || value > maximum) {
    throw new ValidationError(`Nilai ${property} tidak valid.`);
  }
}

export function resolveTruckSpecifications(value, truckProfile) {
  if (!isTruckProfile(truckProfile)) {
    throw new ValidationError("Truck profile tidak valid.");
  }

  const defaults = TRUCK_PROFILE_ROUTING_DEFAULTS[truckProfile];
  if (value === undefined) return { ...defaults };

  if (!isPlainObject(value)) {
    throw new ValidationError("Spesifikasi truk harus berupa objek.");
  }

  const properties = Object.keys(value);
  if (properties.some((property) => !ALLOWED_PROPERTIES.has(property))) {
    throw new ValidationError("Properti spesifikasi truk tidak valid.");
  }

  for (const property of REQUIRED_DIMENSIONS) {
    if (!Object.hasOwn(value, property)) {
      throw new ValidationError(`Nilai ${property} wajib diisi.`);
    }
    assertValidNumber(value[property], property, 0, 12.6, false);
  }

  const grossWeightTon = Object.hasOwn(value, "grossWeightTon")
    ? value.grossWeightTon
    : defaults.grossWeightTon;
  const maxAxleLoadTon = Object.hasOwn(value, "maxAxleLoadTon")
    ? value.maxAxleLoadTon
    : defaults.maxAxleLoadTon;

  assertValidNumber(grossWeightTon, "grossWeightTon", 0, 51, false);
  assertValidNumber(maxAxleLoadTon, "maxAxleLoadTon", 0.5, 63, true);

  return {
    maxHeightM: value.maxHeightM,
    maxWidthM: value.maxWidthM,
    maxLengthM: value.maxLengthM,
    grossWeightTon,
    maxAxleLoadTon,
  };
}

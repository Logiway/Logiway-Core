import { ValidationError } from "../../errors/validationError.js";
import type { GraphHopperCustomModel } from "../../types/routing.js";
import type { NormalizedTruckSpecifications, TruckProfile } from "../../types/trucks.js";

export const TRUCK_PROFILES = Object.freeze(["truck_small", "truck_medium", "truck_large"] as const);

export const TRUCK_PROFILE_ROUTING_DEFAULTS: Readonly<Record<TruckProfile, Readonly<NormalizedTruckSpecifications>>> = Object.freeze({
  truck_small: Object.freeze({ maxHeightM: 2.2, maxWidthM: 1.8, maxLengthM: 3.1, grossWeightTon: 2.5, maxAxleLoadTon: 2 }),
  truck_medium: Object.freeze({ maxHeightM: 3, maxWidthM: 2.1, maxLengthM: 6, grossWeightTon: 8, maxAxleLoadTon: 4 }),
  truck_large: Object.freeze({ maxHeightM: 4.2, maxWidthM: 2.5, maxLengthM: 12, grossWeightTon: 25, maxAxleLoadTon: 8 }),
});

const REQUIRED_DIMENSIONS = Object.freeze(["maxHeightM", "maxWidthM", "maxLengthM"] as const);
const OPTIONAL_LIMITS = Object.freeze(["grossWeightTon", "maxAxleLoadTon"] as const);
const ALLOWED_PROPERTIES = new Set<string>([...REQUIRED_DIMENSIONS, ...OPTIONAL_LIMITS]);

interface SpecificationRule {
  property: keyof NormalizedTruckSpecifications;
  encodedValue: string;
  minimum: number;
  maximum: number;
}

const SPECIFICATION_RULES: readonly SpecificationRule[] = Object.freeze([
  Object.freeze({ property: "maxHeightM", encodedValue: "max_height", minimum: 0, maximum: 12.6 }),
  Object.freeze({ property: "maxWidthM", encodedValue: "max_width", minimum: 0, maximum: 12.6 }),
  Object.freeze({ property: "maxLengthM", encodedValue: "max_length", minimum: 0, maximum: 12.6 }),
  Object.freeze({ property: "grossWeightTon", encodedValue: "max_weight", minimum: 0, maximum: 51 }),
  Object.freeze({ property: "maxAxleLoadTon", encodedValue: "max_axle_load", minimum: 0.5, maximum: 63 }),
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function assertValidNumber(value: unknown, property: string, minimum: number, maximum: number, inclusiveMinimum: boolean): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new ValidationError(`Nilai ${property} tidak valid.`);
  const meetsMinimum = inclusiveMinimum ? value >= minimum : value > minimum;
  if (!meetsMinimum || value > maximum) throw new ValidationError(`Nilai ${property} tidak valid.`);
}

export function isTruckProfile(value: unknown): value is TruckProfile {
  return typeof value === "string" && TRUCK_PROFILES.some((profile) => profile === value);
}

export function resolveTruckSpecifications(value: unknown, truckProfile: unknown): NormalizedTruckSpecifications {
  if (!isTruckProfile(truckProfile)) throw new ValidationError("Truck profile tidak valid.");
  const defaults = TRUCK_PROFILE_ROUTING_DEFAULTS[truckProfile];
  if (value === undefined) return { ...defaults };
  if (!isPlainObject(value)) throw new ValidationError("Spesifikasi truk harus berupa objek.");
  if (Object.keys(value).some((property) => !ALLOWED_PROPERTIES.has(property))) {
    throw new ValidationError("Properti spesifikasi truk tidak valid.");
  }

  for (const property of REQUIRED_DIMENSIONS) {
    if (!Object.hasOwn(value, property)) throw new ValidationError(`Nilai ${property} wajib diisi.`);
    assertValidNumber(value[property], property, 0, 12.6, false);
  }

  const grossWeightTon = Object.hasOwn(value, "grossWeightTon") ? value.grossWeightTon : defaults.grossWeightTon;
  const maxAxleLoadTon = Object.hasOwn(value, "maxAxleLoadTon") ? value.maxAxleLoadTon : defaults.maxAxleLoadTon;
  assertValidNumber(grossWeightTon, "grossWeightTon", 0, 51, false);
  assertValidNumber(maxAxleLoadTon, "maxAxleLoadTon", 0.5, 63, true);
  const maxHeightM = value.maxHeightM;
  const maxWidthM = value.maxWidthM;
  const maxLengthM = value.maxLengthM;
  assertValidNumber(maxHeightM, "maxHeightM", 0, 12.6, false);
  assertValidNumber(maxWidthM, "maxWidthM", 0, 12.6, false);
  assertValidNumber(maxLengthM, "maxLengthM", 0, 12.6, false);
  return { maxHeightM, maxWidthM, maxLengthM, grossWeightTon, maxAxleLoadTon };
}

function assertNormalizedSpecifications(value: unknown): asserts value is NormalizedTruckSpecifications {
  if (!isPlainObject(value)) throw new ValidationError("Spesifikasi truk tidak valid.");
  for (const rule of SPECIFICATION_RULES) {
    const specification = value[rule.property];
    if (
      typeof specification !== "number" ||
      !Number.isFinite(specification) ||
      specification < rule.minimum ||
      specification === 0 ||
      specification > rule.maximum
    ) throw new ValidationError("Spesifikasi truk tidak valid.");
  }
}

export function buildTruckCustomModel(specifications: unknown): GraphHopperCustomModel {
  assertNormalizedSpecifications(specifications);
  return {
    priority: SPECIFICATION_RULES.map((rule) => ({
      if: `${rule.encodedValue} < ${String(specifications[rule.property])}`,
      multiply_by: 0,
    })),
  };
}

export function mergeTruckAndRiskCustomModels(vehicleModel: GraphHopperCustomModel, riskModel: GraphHopperCustomModel): GraphHopperCustomModel {
  const features = [vehicleModel, riskModel].flatMap((model) => model.areas?.features ?? []);
  const model: GraphHopperCustomModel = { priority: [...vehicleModel.priority, ...riskModel.priority] };
  if (features.length > 0) model.areas = { type: "FeatureCollection", features };
  return model;
}

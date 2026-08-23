import { ValidationError } from "../../errors/ValidationError.js";

const SPECIFICATION_RULES = Object.freeze([
  Object.freeze({
    property: "maxHeightM",
    encodedValue: "max_height",
    minimum: 0,
    maximum: 12.6,
  }),
  Object.freeze({
    property: "maxWidthM",
    encodedValue: "max_width",
    minimum: 0,
    maximum: 12.6,
  }),
  Object.freeze({
    property: "maxLengthM",
    encodedValue: "max_length",
    minimum: 0,
    maximum: 12.6,
  }),
  Object.freeze({
    property: "grossWeightTon",
    encodedValue: "max_weight",
    minimum: 0,
    maximum: 51,
  }),
  Object.freeze({
    property: "maxAxleLoadTon",
    encodedValue: "max_axle_load",
    minimum: 0.5,
    maximum: 63,
  }),
]);

function assertNormalizedSpecifications(specifications) {
  if (
    specifications === null ||
    typeof specifications !== "object" ||
    Array.isArray(specifications)
  ) {
    throw new ValidationError("Spesifikasi truk tidak valid.");
  }

  for (const rule of SPECIFICATION_RULES) {
    const value = specifications[rule.property];
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < rule.minimum ||
      value === 0 ||
      value > rule.maximum
    ) {
      throw new ValidationError("Spesifikasi truk tidak valid.");
    }
  }
}

export function buildTruckCustomModel(normalizedSpecifications) {
  assertNormalizedSpecifications(normalizedSpecifications);

  return {
    priority: SPECIFICATION_RULES.map((rule) => ({
      if: `${rule.encodedValue} < ${normalizedSpecifications[rule.property]}`,
      multiply_by: 0,
    })),
  };
}

export function mergeTruckAndRiskCustomModels(vehicleModel, riskModel) {
  const vehiclePriority = Array.isArray(vehicleModel?.priority)
    ? vehicleModel.priority
    : [];
  const riskPriority = Array.isArray(riskModel?.priority) ? riskModel.priority : [];
  const customModel = {
    priority: [...vehiclePriority, ...riskPriority],
  };
  const areaFeatures = [vehicleModel, riskModel].flatMap((model) =>
    model?.areas?.type === "FeatureCollection" &&
    Array.isArray(model.areas.features)
      ? model.areas.features
      : [],
  );

  if (areaFeatures.length > 0) {
    customModel.areas = {
      type: "FeatureCollection",
      features: [...areaFeatures],
    };
  }

  return customModel;
}

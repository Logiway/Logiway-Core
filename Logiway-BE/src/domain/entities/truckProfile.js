export const TRUCK_PROFILES = Object.freeze([
  "truck_small",
  "truck_medium",
  "truck_large",
]);

export const TRUCK_PROFILE_ROUTING_DEFAULTS = Object.freeze({
  truck_small: Object.freeze({
    maxHeightM: 2.2,
    maxWidthM: 1.8,
    maxLengthM: 3.1,
    grossWeightTon: 2.5,
    maxAxleLoadTon: 2,
  }),
  truck_medium: Object.freeze({
    maxHeightM: 3,
    maxWidthM: 2.1,
    maxLengthM: 6,
    grossWeightTon: 8,
    maxAxleLoadTon: 4,
  }),
  truck_large: Object.freeze({
    maxHeightM: 4.2,
    maxWidthM: 2.5,
    maxLengthM: 12,
    grossWeightTon: 25,
    maxAxleLoadTon: 8,
  }),
});

export function isTruckProfile(value) {
  return TRUCK_PROFILES.includes(value);
}

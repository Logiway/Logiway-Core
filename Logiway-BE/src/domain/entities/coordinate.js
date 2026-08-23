export function isCoordinate(value) {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1]) &&
    value[0] >= -180 &&
    value[0] <= 180 &&
    value[1] >= -90 &&
    value[1] <= 90
  );
}

export function requireCoordinate(value, name) {
  if (!isCoordinate(value)) {
    throw new Error(`Invalid ${name} coordinates`);
  }

  return value;
}

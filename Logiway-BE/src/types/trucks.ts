export type TruckProfile = "truck_small" | "truck_medium" | "truck_large";

export interface TruckSpecificationsInput {
  maxHeightM: number;
  maxWidthM: number;
  maxLengthM: number;
  grossWeightTon?: number;
  maxAxleLoadTon?: number;
}

export interface NormalizedTruckSpecifications {
  maxHeightM: number;
  maxWidthM: number;
  maxLengthM: number;
  grossWeightTon: number;
  maxAxleLoadTon: number;
}

export type TruckProfile = "truck_small" | "truck_medium" | "truck_large";

export interface TruckSpecifications {
  maxCapacityTon: number;
  maxHeightM: number;
  maxWidthM: number;
  maxLengthM: number;
  cbmVolume: number;
}

export type TruckSpecificationField = keyof TruckSpecifications;
export type TruckSpecificationDrafts = Record<TruckSpecificationField, string>;
export type TruckSpecificationErrors = Partial<
  Record<TruckSpecificationField, string>
>;
export type TruckRoutingSpecifications = Pick<
  TruckSpecifications,
  "maxHeightM" | "maxWidthM" | "maxLengthM"
>;

export interface Truck {
  id: TruckProfile;
  name: string;
  profile: TruckProfile;
  specifications: TruckSpecifications;
}

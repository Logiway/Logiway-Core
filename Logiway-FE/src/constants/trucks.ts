import type { Truck } from "../types/index.ts";

export const TRUCKS: readonly Truck[] = [
  {
    id: "truck_small",
    name: "Truk Kecil (Engkel / Pick-up)",
    profile: "truck_small",
    specifications: {
      maxCapacityTon: 2.5,
      maxHeightM: 2.2,
      maxWidthM: 1.8,
      maxLengthM: 3.1,
      cbmVolume: 9,
    },
  },
  {
    id: "truck_medium",
    name: "Truk Sedang (CDD / Fuso)",
    profile: "truck_medium",
    specifications: {
      maxCapacityTon: 8,
      maxHeightM: 3,
      maxWidthM: 2.1,
      maxLengthM: 6,
      cbmVolume: 25,
    },
  },
  {
    id: "truck_large",
    name: "Truk Besar (Tronton / Trailer)",
    profile: "truck_large",
    specifications: {
      maxCapacityTon: 25,
      maxHeightM: 4.2,
      maxWidthM: 2.5,
      maxLengthM: 12,
      cbmVolume: 45,
    },
  },
];

export const DEFAULT_TRUCK = TRUCKS[1]!;

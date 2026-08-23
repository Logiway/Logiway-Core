import { useRef, useState } from "react";
import type {
  Coordinates,
  SmartRoute,
  SmartRouteRequest,
  TruckProfile,
  TruckSpecifications,
} from "../../types/index.ts";

type CalculateSmartRoute = (request: SmartRouteRequest) => Promise<SmartRoute>;

export type RouteStatus =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; route: SmartRoute }
  | { type: "error"; message: string };

export function useSmartRoute(calculateSmartRoute: CalculateSmartRoute) {
  const [status, setStatus] = useState<RouteStatus>({ type: "idle" });
  const revisionRef = useRef(0);

  function reset() {
    revisionRef.current += 1;
    setStatus({ type: "idle" });
  }

  function dismissError() {
    setStatus((current) => {
      if (current.type !== "error") {
        return current;
      }
      revisionRef.current += 1;
      return { type: "idle" };
    });
  }

  async function calculate(
    origin: string,
    destination: string,
    originCoordinates: Coordinates | null,
    destinationCoordinates: Coordinates | null,
    truckProfile: TruckProfile,
    specifications: TruckSpecifications,
  ) {
    const revision = ++revisionRef.current;
    setStatus({ type: "loading" });

    try {
      const route = await calculateSmartRoute({
        origin,
        destination,
        ...(originCoordinates && destinationCoordinates
          ? { originCoordinates, destinationCoordinates }
          : {}),
        truckProfile,
        truckSpecifications: {
          maxHeightM: specifications.maxHeightM,
          maxWidthM: specifications.maxWidthM,
          maxLengthM: specifications.maxLengthM,
        },
      });
      if (revisionRef.current === revision) {
        setStatus({ type: "success", route });
      }
    } catch (error) {
      if (revisionRef.current !== revision) {
        return;
      }
      const message =
        error instanceof TypeError
          ? "Gagal terhubung ke server backend!"
          : error instanceof Error
            ? error.message
            : "Gagal memproses rute";
      setStatus({ type: "error", message });
    }
  }

  return {
    calculate,
    dismissError,
    isLoading: status.type === "loading",
    reset,
    route: status.type === "success" ? status.route : null,
    status,
  };
}

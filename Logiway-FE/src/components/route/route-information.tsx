import {
  AlertTriangle,
  BadgeDollarSign,
  BedDouble,
  Clock3,
  Fuel,
  Route,
  ShieldAlert,
  Ship,
} from "lucide-react";
import type { RouteStatus } from "../../hooks/index.ts";

interface RouteInformationProps {
  status: RouteStatus;
}

export function RouteInformation({ status }: RouteInformationProps) {
  if (status.type === "idle" || status.type === "loading") {
    return null;
  }

  const isFallback =
    status.type === "success" &&
    status.route.routeMode === "straight_line_fallback";
  const routeModeLabel =
    status.type === "success"
      ? status.route.routeMode === "risk_aware"
        ? "Rute sadar risiko"
        : status.route.routeMode === "standard"
          ? "Rute standar"
          : "Garis lurus sementara"
      : null;
  const fuelCount =
    status.type === "success"
      ? status.route.facilities.filter((facility) => facility.type === "fuel").length
      : 0;
  const restCount =
    status.type === "success"
      ? status.route.facilities.filter((facility) => facility.type !== "fuel").length
      : 0;

  return (
    <section
      className={`rounded-2xl border p-4 shadow-lg backdrop-blur-sm ${
        status.type === "error"
          ? "border-red-200 bg-red-50/95"
          : isFallback
            ? "border-amber-300 bg-amber-50/95"
            : "border-slate-200 bg-white/95"
      }`}
      aria-labelledby="route-information-title"
    >
      <div className="flex items-center gap-2.5">
        {isFallback || status.type === "error" ? (
          <AlertTriangle
            aria-hidden="true"
            className={`size-5 ${isFallback ? "text-amber-600" : "text-red-600"}`}
          />
        ) : (
          <Route aria-hidden="true" className="size-5 text-blue-600" />
        )}
        <h2
          id="route-information-title"
          className="text-sm font-bold text-slate-900"
        >
          Informasi Rute
        </h2>
        {routeModeLabel && (
          <span
            className={`ml-auto rounded-full px-2.5 py-1 text-xs font-semibold ${
              isFallback
                ? "bg-amber-100 text-amber-800"
                : "bg-blue-50 text-blue-700"
            }`}
          >
            {routeModeLabel}
          </span>
        )}
      </div>
      <div
        className={`mt-3 text-sm leading-6 ${
          status.type === "error"
            ? "text-red-700"
            : isFallback
              ? "text-amber-900"
              : "text-slate-600"
        }`}
        role={status.type === "error" ? "alert" : "status"}
        aria-atomic="true"
      >
        {status.type === "error" && <p>{status.message}</p>}
        {status.type === "success" && (
          <div className="grid gap-3">
            {status.route.facilitiesStatus === "unavailable" && (
              <p className="text-xs text-slate-500">
                Data SPBU dan tempat istirahat belum tersedia.
              </p>
            )}
            {isFallback && (
              <div className="grid gap-1">
                <p>
                  Garis lurus ini hanya menunjukkan arah dan tidak dapat digunakan
                  untuk navigasi.
                </p>
                {status.route.warning && <p>{status.route.warning}</p>}
              </div>
            )}
            {!isFallback &&
              status.route.isNavigable &&
              status.route.distanceKm !== null &&
              status.route.durationMinutes !== null && (
                <dl className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <dt className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                      <Route aria-hidden="true" className="size-4 text-blue-600" />
                      Jarak
                    </dt>
                    <dd className="mt-1 font-bold text-slate-900">
                      {status.route.distanceKm} km
                    </dd>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <dt className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                      <Clock3 aria-hidden="true" className="size-4 text-blue-600" />
                      Durasi
                    </dt>
                    <dd className="mt-1 font-bold text-slate-900">
                      ~{status.route.durationMinutes} menit
                    </dd>
                  </div>
                </dl>
              )}
            {(status.route.routeDetails?.usesFerry ||
              status.route.routeDetails?.usesToll ||
              fuelCount > 0 ||
              restCount > 0 ||
              status.route.riskPoints.length > 0) && (
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                {status.route.routeDetails?.usesFerry && (
                  <span className="flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-blue-900">
                    <Ship aria-hidden="true" className="size-3.5" />
                    Kapal feri
                  </span>
                )}
                {status.route.routeDetails?.usesToll && (
                  <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                    <BadgeDollarSign aria-hidden="true" className="size-3.5" />
                    Jalan tol
                  </span>
                )}
                {fuelCount > 0 && (
                  <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">
                    <Fuel aria-hidden="true" className="size-3.5" />
                    {fuelCount} SPBU
                  </span>
                )}
                {restCount > 0 && (
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800">
                    <BedDouble aria-hidden="true" className="size-3.5" />
                    {restCount} tempat istirahat/area layanan
                  </span>
                )}
                {status.route.riskPoints.length > 0 && (
                  <span className="flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-orange-800">
                    <ShieldAlert aria-hidden="true" className="size-3.5" />
                    {status.route.riskPoints.length} risiko pungli
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

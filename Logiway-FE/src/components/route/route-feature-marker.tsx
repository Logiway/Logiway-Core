import type { LucideIcon } from "lucide-react";
import type { Coordinates } from "../../types/index.ts";
import { MapMarker, MarkerContent } from "../ui/index.ts";

const featureMarkerOffset: [number, number] = [0, 0];

const markerColors = {
  amber: "border-amber-100 bg-amber-500 text-white shadow-amber-950/25",
  emerald: "border-emerald-100 bg-emerald-600 text-white shadow-emerald-950/25",
  navy: "border-blue-100 bg-blue-900 text-white shadow-blue-950/25",
  orange: "border-orange-100 bg-orange-500 text-white shadow-orange-950/25",
  red: "border-red-100 bg-red-600 text-white shadow-red-950/25",
  violet: "border-violet-100 bg-violet-600 text-white shadow-violet-950/25",
} as const;

interface RouteFeatureMarkerProps {
  coordinates: Coordinates;
  icon: LucideIcon;
  label: string;
  color: keyof typeof markerColors;
}

export function RouteFeatureMarker({
  coordinates,
  icon: Icon,
  label,
  color,
}: RouteFeatureMarkerProps) {
  return (
    <MapMarker
      longitude={coordinates[0]}
      latitude={coordinates[1]}
      anchor="center"
      offset={featureMarkerOffset}
      className="relative z-10"
    >
      <MarkerContent
        className={`relative z-0 grid size-8 place-items-center rounded-full border-2 shadow-lg ${markerColors[color]}`}
        role="img"
        aria-label={label}
        title={label}
      >
        <Icon aria-hidden="true" className="size-4" strokeWidth={2.25} />
      </MarkerContent>
    </MapMarker>
  );
}

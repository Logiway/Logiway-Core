import * as MapLibreGL from "maplibre-gl";
import type { MarkerOptions } from "maplibre-gl";
import type { Feature, LineString } from "geojson";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import { Compass, Minus, Plus } from "lucide-react";
import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/utils.ts";

MapLibreGL.setWorkerUrl(workerUrl);

const emptyStyle: MapLibreGL.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#f1f5f9" },
    },
  ],
};

type MapContextValue = {
  map: MapLibreGL.Map | null;
  isLoaded: boolean;
  isStyleLoaded: boolean;
};

const MapContext = createContext<MapContextValue | null>(null);

export function useMap() {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error("useMap harus digunakan di dalam Map");
  }
  return context;
}

export type MapStyleOption = string | MapLibreGL.StyleSpecification;
export type MapRef = MapLibreGL.Map;

export type MapProps = {
  children?: ReactNode;
  className?: string;
  theme?: "light";
  styles?: {
    light?: MapStyleOption;
  };
} & Omit<MapLibreGL.MapOptions, "container" | "style">;

export const Map = forwardRef<MapRef, MapProps>(function Map(
  { children, className, theme = "light", styles, ...mapOptions },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialOptionsRef = useRef(mapOptions);
  const initialStyle = styles?.light ?? emptyStyle;
  const initialStyleRef = useRef(initialStyle);
  const styleKey = useMemo(() => JSON.stringify(initialStyle), [initialStyle]);
  const currentStyleKeyRef = useRef(styleKey);
  const [map, setMap] = useState<MapLibreGL.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isStyleLoaded, setIsStyleLoaded] = useState(false);

  useImperativeHandle(ref, () => map as MapLibreGL.Map, [map]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const instance = new MapLibreGL.Map({
      ...initialOptionsRef.current,
      container,
      style: initialStyleRef.current,
      trackResize: true,
    });

    const handleLoad = () => setIsLoaded(true);
    const handleStyleLoad = () => setIsStyleLoaded(true);

    instance.on("load", handleLoad);
    instance.on("style.load", handleStyleLoad);
    setMap(instance);

    return () => {
      instance.off("load", handleLoad);
      instance.off("style.load", handleStyleLoad);
      instance.remove();
      setMap(null);
      setIsLoaded(false);
      setIsStyleLoaded(false);
    };
  }, []);

  useEffect(() => {
    if (!map || currentStyleKeyRef.current === styleKey) {
      return;
    }
    currentStyleKeyRef.current = styleKey;
    setIsStyleLoaded(false);
    map.setStyle(initialStyle, { diff: false });
  }, [initialStyle, map, styleKey]);

  const context = useMemo(
    () => ({ map, isLoaded, isStyleLoaded }),
    [map, isLoaded, isStyleLoaded],
  );

  return (
    <MapContext.Provider value={context}>
      <div
        ref={containerRef}
        className={cn("relative h-full w-full", className)}
        data-theme={theme}
      >
        {map && children}
      </div>
    </MapContext.Provider>
  );
});

type MarkerContextValue = {
  marker: MapLibreGL.Marker;
};

const MarkerContext = createContext<MarkerContextValue | null>(null);

function useMarker() {
  const context = useContext(MarkerContext);
  if (!context) {
    throw new Error("MarkerContent harus digunakan di dalam MapMarker");
  }
  return context;
}

export type MapMarkerProps = {
  longitude: number;
  latitude: number;
  children: ReactNode;
  onClick?: (event: MouseEvent) => void;
  onMouseEnter?: (event: MouseEvent) => void;
  onMouseLeave?: (event: MouseEvent) => void;
  onDragStart?: (position: { lng: number; lat: number }) => void;
  onDrag?: (position: { lng: number; lat: number }) => void;
  onDragEnd?: (position: { lng: number; lat: number }) => void;
} & Omit<MarkerOptions, "element">;

export function MapMarker({
  longitude,
  latitude,
  children,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onDragStart,
  onDrag,
  onDragEnd,
  anchor,
  className,
  clickTolerance,
  color,
  draggable,
  offset,
  opacity,
  opacityWhenCovered,
  pitchAlignment,
  rotation,
  rotationAlignment,
  scale,
  subpixelPositioning,
}: MapMarkerProps) {
  const { map } = useMap();
  const callbacksRef = useRef({
    onClick,
    onMouseEnter,
    onMouseLeave,
    onDragStart,
    onDrag,
    onDragEnd,
  });
  useEffect(() => {
    callbacksRef.current = {
      onClick,
      onMouseEnter,
      onMouseLeave,
      onDragStart,
      onDrag,
      onDragEnd,
    };
  }, [onClick, onDrag, onDragEnd, onDragStart, onMouseEnter, onMouseLeave]);

  const marker = useMemo(() => {
    const element = document.createElement("div");
    return new MapLibreGL.Marker({
      anchor,
      className,
      clickTolerance,
      color,
      draggable,
      element,
      offset,
      opacity,
      opacityWhenCovered,
      pitchAlignment,
      rotation,
      rotationAlignment,
      scale,
      subpixelPositioning,
    });
  }, [
    anchor,
    className,
    clickTolerance,
    color,
    draggable,
    offset,
    opacity,
    opacityWhenCovered,
    pitchAlignment,
    rotation,
    rotationAlignment,
    scale,
    subpixelPositioning,
  ]);

  useEffect(() => {
    if (!map) {
      return;
    }

    const element = marker.getElement();
    const handleClick = (event: MouseEvent) =>
      callbacksRef.current.onClick?.(event);
    const handleMouseEnter = (event: MouseEvent) =>
      callbacksRef.current.onMouseEnter?.(event);
    const handleMouseLeave = (event: MouseEvent) =>
      callbacksRef.current.onMouseLeave?.(event);
    const handleDragStart = () =>
      callbacksRef.current.onDragStart?.(marker.getLngLat());
    const handleDrag = () => callbacksRef.current.onDrag?.(marker.getLngLat());
    const handleDragEnd = () =>
      callbacksRef.current.onDragEnd?.(marker.getLngLat());

    element.addEventListener("click", handleClick);
    element.addEventListener("mouseenter", handleMouseEnter);
    element.addEventListener("mouseleave", handleMouseLeave);
    marker.on("dragstart", handleDragStart);
    marker.on("drag", handleDrag);
    marker.on("dragend", handleDragEnd);
    marker.setLngLat([longitude, latitude]).addTo(map);

    return () => {
      element.removeEventListener("click", handleClick);
      element.removeEventListener("mouseenter", handleMouseEnter);
      element.removeEventListener("mouseleave", handleMouseLeave);
      marker.off("dragstart", handleDragStart);
      marker.off("drag", handleDrag);
      marker.off("dragend", handleDragEnd);
      marker.remove();
    };
  }, [latitude, longitude, map, marker]);

  useEffect(() => {
    marker.setLngLat([longitude, latitude]);
  }, [latitude, longitude, marker]);

  return (
    <MarkerContext.Provider value={{ marker }}>
      {children}
    </MarkerContext.Provider>
  );
}

export type MarkerContentProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
};

export function MarkerContent({
  children,
  className,
  ...props
}: MarkerContentProps) {
  const { marker } = useMarker();
  return createPortal(
    <div className={cn("relative", className)} {...props}>
      {children}
    </div>,
    marker.getElement(),
  );
}

export type MapControlsProps = {
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  showZoom?: boolean;
  showCompass?: boolean;
  className?: string;
};

const controlPositions: Record<
  NonNullable<MapControlsProps["position"]>,
  string
> = {
  "top-left": "top-3 left-3",
  "top-right": "top-3 right-3",
  "bottom-left": "bottom-3 left-3",
  "bottom-right": "right-3 bottom-10",
};

function getControlDuration() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 300;
}

function ControlButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="grid size-10 place-items-center bg-white text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700 focus-visible:z-10 focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-blue-600 motion-reduce:transition-none"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function MapControls({
  position = "bottom-right",
  showZoom = true,
  showCompass = false,
  className,
}: MapControlsProps) {
  const { map } = useMap();
  const [bearing, setBearing] = useState(0);

  useEffect(() => {
    if (!map) {
      return;
    }
    const updateBearing = () => setBearing(map.getBearing());
    map.on("rotate", updateBearing);
    updateBearing();
    return () => {
      map.off("rotate", updateBearing);
    };
  }, [map]);

  return (
    <div
      className={cn(
        "absolute z-30 flex flex-col gap-2",
        controlPositions[position],
        className,
      )}
    >
      {showZoom && (
        <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-900/15 [&>button+button]:border-t [&>button+button]:border-slate-200">
          <ControlButton
            label="Perbesar peta"
            onClick={() =>
              map?.zoomTo(map.getZoom() + 1, { duration: getControlDuration() })
            }
          >
            <Plus aria-hidden="true" className="size-5" />
          </ControlButton>
          <ControlButton
            label="Perkecil peta"
            onClick={() =>
              map?.zoomTo(map.getZoom() - 1, { duration: getControlDuration() })
            }
          >
            <Minus aria-hidden="true" className="size-5" />
          </ControlButton>
        </div>
      )}
      {showCompass && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-900/15">
          <ControlButton
            label="Atur ulang arah utara"
            onClick={() =>
              map?.resetNorthPitch({ duration: getControlDuration() })
            }
          >
            <Compass
              aria-hidden="true"
              className="size-5 text-blue-700"
              style={{ transform: `rotate(${-bearing}deg)` }}
            />
          </ControlButton>
        </div>
      )}
    </div>
  );
}

export type MapRouteProps = {
  id?: string;
  coordinates: [number, number][];
  color?: string;
  width?: number;
  opacity?: number;
  dashArray?: [number, number];
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  interactive?: boolean;
};

export function MapRoute({
  id: providedId,
  coordinates,
  color = "#4285f4",
  width = 3,
  opacity = 0.8,
  dashArray,
  onClick,
  onMouseEnter,
  onMouseLeave,
  interactive = true,
}: MapRouteProps) {
  const { map, isStyleLoaded } = useMap();
  const generatedId = useId().replaceAll(":", "");
  const id = providedId ?? generatedId;
  const sourceId = `map-route-source-${id}`;
  const layerId = `map-route-layer-${id}`;
  const validDashArray =
    dashArray && dashArray[0] > 0 && dashArray[1] > 0
      ? dashArray
      : undefined;
  const coordinatesRef = useRef(coordinates);
  const paintRef = useRef({ color, opacity, width, validDashArray });
  const callbacksRef = useRef({ onClick, onMouseEnter, onMouseLeave });

  useEffect(() => {
    coordinatesRef.current = coordinates;
  }, [coordinates]);

  useEffect(() => {
    paintRef.current = { color, opacity, width, validDashArray };
  }, [color, opacity, validDashArray, width]);

  useEffect(() => {
    callbacksRef.current = { onClick, onMouseEnter, onMouseLeave };
  }, [onClick, onMouseEnter, onMouseLeave]);

  useEffect(() => {
    if (!map || !isStyleLoaded) {
      return;
    }

    const feature: Feature<LineString> = {
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: coordinatesRef.current },
    };
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, { type: "geojson", data: feature });
    }
    if (!map.getLayer(layerId)) {
      const paint = paintRef.current;
      map.addLayer({
        id: layerId,
        type: "line",
        source: sourceId,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": paint.color,
          "line-opacity": paint.opacity,
          "line-width": paint.width,
          ...(paint.validDashArray
            ? { "line-dasharray": paint.validDashArray }
            : {}),
        },
      });
    }
    return () => {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    };
  }, [isStyleLoaded, layerId, map, sourceId]);

  useEffect(() => {
    if (!map) {
      return;
    }
    const source = map.getSource(sourceId);
    if (source?.type !== "geojson") {
      return;
    }
    const feature: Feature<LineString> = {
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates },
    };
    void (source as MapLibreGL.GeoJSONSource).setData(feature);
  }, [coordinates, map, sourceId]);

  useEffect(() => {
    if (!map?.getLayer(layerId)) {
      return;
    }
    map.setPaintProperty(layerId, "line-color", color);
    map.setPaintProperty(layerId, "line-opacity", opacity);
    map.setPaintProperty(layerId, "line-width", width);
    map.setPaintProperty(
      layerId,
      "line-dasharray",
      validDashArray,
    );
  }, [color, layerId, map, opacity, validDashArray, width]);

  useEffect(() => {
    if (!map || !interactive) {
      return;
    }
    const handleClick = () => callbacksRef.current.onClick?.();
    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = "pointer";
      callbacksRef.current.onMouseEnter?.();
    };
    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = "";
      callbacksRef.current.onMouseLeave?.();
    };

    map.on("click", layerId, handleClick);
    map.on("mouseenter", layerId, handleMouseEnter);
    map.on("mouseleave", layerId, handleMouseLeave);

    return () => {
      map.off("click", layerId, handleClick);
      map.off("mouseenter", layerId, handleMouseEnter);
      map.off("mouseleave", layerId, handleMouseLeave);
      map.getCanvas().style.cursor = "";
    };
  }, [interactive, layerId, map]);

  return null;
}

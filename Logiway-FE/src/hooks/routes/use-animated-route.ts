import { useEffect, useState } from "react";

const animationDuration = 1500;
const maximumUpdates = 55;

type Coordinate = [number, number];

function getInitialCoordinates(coordinates: Coordinate[]) {
  const origin = coordinates[0];
  return coordinates.length >= 2 && origin ? [origin, origin] : [];
}

function getReducedMotionPreference() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function interpolateCoordinate(
  origin: Coordinate,
  destination: Coordinate,
  progress: number,
): Coordinate {
  return [
    origin[0] + (destination[0] - origin[0]) * progress,
    origin[1] + (destination[1] - origin[1]) * progress,
  ];
}

export function useAnimatedRoute(coordinates: Coordinate[]) {
  const [reducedMotion, setReducedMotion] = useState(
    getReducedMotionPreference,
  );
  const [animation, setAnimation] = useState(() => ({
    route: coordinates,
    reducedMotion,
    coordinates: reducedMotion ? coordinates : getInitialCoordinates(coordinates),
  }));

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (coordinates.length < 2 || reducedMotion) {
      const frame = requestAnimationFrame(() => {
        setAnimation({
          route: coordinates,
          reducedMotion,
          coordinates: reducedMotion ? coordinates : [],
        });
      });
      return () => cancelAnimationFrame(frame);
    }
    const origin = coordinates[0];
    const destination = coordinates[1];
    if (!origin || !destination) {
      return;
    }

    let frame = 0;
    let cancelled = false;
    let updateIndex = 0;

    frame = requestAnimationFrame((startedAt) => {
      const reveal = (now: number) => {
        if (cancelled) {
          return;
        }
        const progress = Math.min((now - startedAt) / animationDuration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        const nextUpdateIndex = Math.min(
          maximumUpdates - 1,
          Math.floor(progress * maximumUpdates),
        );

        if (nextUpdateIndex > updateIndex || progress === 1) {
          updateIndex = nextUpdateIndex;
          let visibleCoordinates: Coordinate[];
          if (progress === 1) {
            visibleCoordinates = coordinates;
          } else if (coordinates.length === 2) {
            visibleCoordinates = [
              origin,
              interpolateCoordinate(origin, destination, easedProgress),
            ];
          } else {
            const visibleCount = Math.max(
              2,
              Math.min(
                coordinates.length - 1,
                1 + Math.floor(easedProgress * (coordinates.length - 1)),
              ),
            );
            visibleCoordinates = coordinates.slice(0, visibleCount);
          }
          setAnimation({
            route: coordinates,
            reducedMotion,
            coordinates: visibleCoordinates,
          });
        }

        if (progress < 1) {
          frame = requestAnimationFrame(reveal);
        }
      };

      reveal(startedAt);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [coordinates, reducedMotion]);

  if (
    animation.route !== coordinates ||
    animation.reducedMotion !== reducedMotion
  ) {
    return reducedMotion ? coordinates : getInitialCoordinates(coordinates);
  }
  return animation.coordinates;
}

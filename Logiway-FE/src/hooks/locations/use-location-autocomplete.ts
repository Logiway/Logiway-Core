import { useEffect, useRef, useState } from "react";
import type { LocationSuggestion } from "../../types/index.ts";

type SearchLocations = (
  query: string,
  signal?: AbortSignal,
) => Promise<LocationSuggestion[]>;

export function useLocationAutocomplete(
  query: string,
  searchLocations: SearchLocations,
) {
  const normalizedQuery = query.trim();
  const currentQueryRef = useRef(normalizedQuery);
  const activeRequestRef = useRef<AbortController | null>(null);
  const skippedQueryRef = useRef<string | null>(null);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  function reset(nextQuery: string, skipSearch = false) {
    const nextNormalizedQuery = nextQuery.trim();
    activeRequestRef.current?.abort();
    activeRequestRef.current = null;
    currentQueryRef.current = nextNormalizedQuery;
    skippedQueryRef.current = skipSearch ? nextNormalizedQuery : null;
    setSuggestions([]);
    setIsOpen(false);
    setError(null);
    setHasSearched(false);
    setIsSearching(nextNormalizedQuery.length >= 3 && !skipSearch);
  }

  useEffect(() => {
    currentQueryRef.current = normalizedQuery;
    activeRequestRef.current?.abort();
    activeRequestRef.current = null;

    if (
      normalizedQuery.length < 3 ||
      skippedQueryRef.current === normalizedQuery
    ) {
      setIsSearching(false);
      return;
    }

    skippedQueryRef.current = null;
    const controller = new AbortController();
    activeRequestRef.current = controller;
    setSuggestions([]);
    setIsOpen(false);
    setError(null);
    setHasSearched(false);
    setIsSearching(true);

    const timer = window.setTimeout(() => {
      void searchLocations(normalizedQuery, controller.signal)
        .then((results) => {
          if (
            controller.signal.aborted ||
            currentQueryRef.current !== normalizedQuery
          ) {
            return;
          }

          setSuggestions(results);
          setIsOpen(results.length > 0);
          setHasSearched(true);
          setIsSearching(false);
        })
        .catch((requestError: unknown) => {
          if (
            (requestError instanceof DOMException &&
              requestError.name === "AbortError") ||
            controller.signal.aborted ||
            currentQueryRef.current !== normalizedQuery
          ) {
            return;
          }

          setSuggestions([]);
          setIsOpen(false);
          setError("Gagal mencari lokasi. Coba lagi.");
          setHasSearched(true);
          setIsSearching(false);
        })
        .finally(() => {
          if (activeRequestRef.current === controller) {
            activeRequestRef.current = null;
          }
        });
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
      if (activeRequestRef.current === controller) {
        activeRequestRef.current = null;
      }
    };
  }, [normalizedQuery, searchLocations]);

  return {
    error,
    hasSearched,
    isOpen,
    isSearching,
    reset,
    setIsOpen,
    suggestions,
  };
}

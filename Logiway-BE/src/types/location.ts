export type Coordinate = [number, number];

export interface RouteLocation {
  name: string;
  coordinates: Coordinate;
}

export interface RouteLocations {
  origin: RouteLocation;
  destination: RouteLocation;
}

export interface RouteGeocodingInput {
  origin: string;
  dest: string;
}

export interface LocationSearchResult {
  displayName: string;
  coordinates: Coordinate;
}

export interface LocationSearchResponse {
  success: true;
  locations: LocationSearchResult[];
}

export interface PlaceGeocodingRepository {
  search(query: string, limit?: number): Promise<LocationSearchResult[]>;
  geocode(placeName: string): Promise<Coordinate | null>;
}

export interface LocationServiceDependencies {
  placeGeocodingRepository: PlaceGeocodingRepository;
}

export interface LocationServiceContract {
  search(query: string): Promise<LocationSearchResult[]>;
}

export interface NominatimRepositoryOptions {
  baseUrl: string;
  fetchImplementation?: typeof fetch;
  timeoutMs?: number;
}

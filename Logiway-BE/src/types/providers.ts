export interface GraphHopperRepositoryOptions {
  url: string;
  fetchImplementation?: typeof fetch;
  timeoutMs?: number;
}

export interface OverpassRouteFacilityRepositoryOptions {
  urls: string[];
  fetchImplementation?: typeof fetch;
  timeoutMs?: number;
}

import { ProviderError } from "../../errors/providerError.js";
import type {
  LocationSearchResult,
  LocationServiceDependencies,
  PlaceGeocodingRepository,
} from "../../types/location.js";

export class LocationService {
  readonly #placeGeocodingRepository: PlaceGeocodingRepository;

  constructor({ placeGeocodingRepository }: LocationServiceDependencies) {
    this.#placeGeocodingRepository = placeGeocodingRepository;
  }

  async search(query: string): Promise<LocationSearchResult[]> {
    try {
      return await this.#placeGeocodingRepository.search(query, 5);
    } catch {
      throw new ProviderError("Layanan pencarian lokasi tidak tersedia.");
    }
  }
}

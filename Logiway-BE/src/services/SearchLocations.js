import { ProviderError } from "../errors/ProviderError.js";

export class SearchLocations {
  constructor({ placeGeocodingRepository }) {
    this.placeGeocodingRepository = placeGeocodingRepository;
  }

  async execute(query) {
    try {
      return await this.placeGeocodingRepository.search(query, 5);
    } catch {
      throw new ProviderError("Layanan pencarian lokasi tidak tersedia.");
    }
  }
}

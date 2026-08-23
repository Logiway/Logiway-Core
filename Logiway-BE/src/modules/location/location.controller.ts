import type { RequestHandler } from "express";
import type { LocationController } from "../../types/api.js";
import type { LocationServiceContract } from "../../types/location.js";

export function createLocationController(locationService: LocationServiceContract): LocationController {
  const search: RequestHandler = async (request, response) => {
    if (!request.locationQuery) throw new Error("Location query was not validated");
    const locations = await locationService.search(request.locationQuery);
    response.json({ success: true, locations });
  };
  return { search };
}

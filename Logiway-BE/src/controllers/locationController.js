export function createLocationController(searchLocations) {
  return {
    async search(request, response) {
      const locations = await searchLocations.execute(request.locationQuery);
      return response.json({ success: true, locations });
    },
  };
}

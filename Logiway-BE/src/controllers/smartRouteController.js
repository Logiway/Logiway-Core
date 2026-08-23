export function createSmartRouteController(calculateSmartRoute) {
  return {
    async calculate(request, response) {
      const result = await calculateSmartRoute.execute(request.smartRouteInput);
      return response.json(result);
    },
  };
}

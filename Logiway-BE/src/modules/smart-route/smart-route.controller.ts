import type { RequestHandler } from "express";
import type { SmartRouteController } from "../../types/api.js";
import type { SmartRouteServiceContract } from "../../types/smart-route.js";

export function createSmartRouteController(smartRouteService: SmartRouteServiceContract): SmartRouteController {
  const calculate: RequestHandler = async (request, response) => {
    if (!request.smartRouteInput) throw new Error("Smart route input was not validated");
    response.json(await smartRouteService.calculate(request.smartRouteInput));
  };
  return { calculate };
}

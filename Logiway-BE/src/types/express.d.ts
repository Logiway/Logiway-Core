import type { SmartRouteInput } from "./smart-route.js";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      locationQuery?: string;
      smartRouteInput?: SmartRouteInput;
    }
  }
}

export {};

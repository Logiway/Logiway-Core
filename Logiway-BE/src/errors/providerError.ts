import { AppError } from "./appError.js";

export class ProviderError extends AppError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, {
      statusCode: 502,
      code: "PROVIDER_ERROR",
      expose: true,
      ...(options && "cause" in options ? { cause: options.cause } : {}),
    });
    this.name = "ProviderError";
  }
}

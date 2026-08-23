import { AppError } from "./appError.js";

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, { statusCode: 400, code: "VALIDATION_ERROR", expose: true });
    this.name = "ValidationError";
  }
}

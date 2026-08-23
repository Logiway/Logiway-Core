export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly expose: boolean;

  constructor(
    message: string,
    { statusCode = 500, code = "INTERNAL_ERROR", expose = false, cause }: {
      statusCode?: number;
      code?: string;
      expose?: boolean;
      cause?: unknown;
    } = {},
  ) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.expose = expose;
  }
}

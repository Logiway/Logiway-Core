export class ProviderError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "ProviderError";
    this.statusCode = 502;
  }
}

export class ReplayError extends Error {
  constructor(
    message: string,
    public status: 400 | 401 | 403 | 404 | 409 | 413 | 429 | 503 | 504 = 400,
  ) {
    super(message);
  }
}

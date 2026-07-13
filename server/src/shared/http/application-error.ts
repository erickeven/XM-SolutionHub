export class ApplicationError extends Error {
  public constructor(
    public readonly status: number,
    public readonly code: number,
    message: string,
    public readonly details?: Readonly<Record<string, unknown>>
  ) {
    super(message);
    this.name = "ApplicationError";
  }
}

export class AppError extends Error {
  constructor(
    public code: number,
    message: string,
    public statusCode: number = 400,
    public headers?: Record<string, string>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
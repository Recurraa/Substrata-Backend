export class AppError extends Error {
  constructor(
    message: string,
    public statusCode = 400,
    public code = "APP_ERROR"
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

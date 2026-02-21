import type { ErrorRequestHandler } from "express";
import { AppError } from "../utils/errors";

export function errorHandler(): ErrorRequestHandler {
  return (err, _req, res, _next) => {
    const appError = err instanceof AppError ? err : new AppError("Internal Server Error", 500);

    if (appError.statusCode >= 500) {
      // eslint-disable-next-line no-console
      console.error(err);
    }

    return res.status(appError.statusCode).json({
      error: appError.message,
    });
  };
}

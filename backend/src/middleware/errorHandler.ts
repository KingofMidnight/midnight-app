import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export interface AppError extends Error {
  statusCode?: number;
  details?: unknown;
}

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof ZodError) {
    err = createError(err.issues[0]?.message ?? "Invalid request.", 400, err.flatten());
  }

  const statusCode = err.statusCode ?? 500;
  const isDev = process.env.NODE_ENV === "development";
  // Don't leak database / internal error text to clients outside development
  const message = statusCode >= 500 && !isDev ? "Internal server error." : err.message || "Internal Server Error";

  console.error(`[ERROR] ${statusCode} — ${err.message}`, err.details ?? "");

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(isDev && {
      stack: err.stack,
      details: err.details,
    }),
  });
};

export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

export const createError = (message: string, statusCode = 500, details?: unknown): AppError => {
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  err.details = details;
  return err;
};

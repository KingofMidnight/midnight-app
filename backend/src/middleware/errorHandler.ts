import { Request, Response, NextFunction } from "express";

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
  const statusCode = err.statusCode ?? 500;
  const message = err.message ?? "Internal Server Error";

  console.error(`[ERROR] ${statusCode} â€” ${message}`, err.details ?? "");

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === "development" && {
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


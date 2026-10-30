import { Request, Response, NextFunction, RequestHandler } from "express";
import { z, ZodTypeAny } from "zod";
import { createError } from "../middleware/errorHandler";

// Forwards rejected promises to the Express error handler (Express 4 doesn't).
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export const parse = <S extends ZodTypeAny>(schema: S, input: unknown): z.output<S> => {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw createError(result.error.issues[0]?.message ?? "Invalid request.", 400, result.error.flatten());
  }
  return result.data;
};

export const uuidParam = (req: Request, name: string): string =>
  parse(z.string().uuid({ message: `Invalid ${name}.` }), req.params[name]);

export const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const sendData = (res: Response, data: unknown, status = 200): void => {
  res.status(status).json({ success: true, data });
};

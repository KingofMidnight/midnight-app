import rateLimit from "express-rate-limit";
import { Request } from "express";

// Sign-up / sign-in / password reset are handled by Supabase Auth (with its own
// rate limits and captcha), so only the API's own endpoints are limited here.

// General limiter for authenticated account actions (sessions, creator role).
// Keyed on IP only: a client-supplied value in the key would let callers bypass it.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many authentication attempts, try again later." },
  skip: (req) => req.method !== "POST",
  keyGenerator: (req: Request) => `auth:${req.ip || req.socket.remoteAddress || "unknown"}`,
});

// Reports per account (falls back to IP); must run after requireAuth
export const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many reports, please try again later." },
  keyGenerator: (req: Request) => `report:${req.user?.id ?? req.ip ?? "unknown"}`,
});

export const commentLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many comments, please wait before posting again." },
  keyGenerator: (req: Request) => `comment:${req.user?.id ?? "anonymous"}:${req.ip || req.socket.remoteAddress || "unknown"}`,
  skip: (req) => !req.user,
});

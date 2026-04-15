import rateLimit from "express-rate-limit";
import { Request } from "express";

const authAttempts = new Map<string, { count: number; resetTime: number }>();

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many authentication attempts, try again later." },
  skip: (req) => req.method !== "POST",
  keyGenerator: (req: Request) => {
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    const email = req.body?.email || "no-email";
    return `auth:${ip}:${email}`;
  },
});

export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many password reset attempts, try again later." },
  keyGenerator: (req: Request) => {
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    const email = req.body?.email || "no-email";
    return `reset:${ip}:${email}`;
  },
});

export const emailResendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many email resend attempts, try again later." },
  keyGenerator: (req: Request) => {
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    const email = req.body?.email || "no-email";
    return `resend:${ip}:${email}`;
  },
});

export const signUpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many account creation attempts, try again later." },
  keyGenerator: (req: Request) => {
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    return `signup:${ip}`;
  },
});

export const commentLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many comments, please wait before posting again." },
  keyGenerator: (req: Request) => {
    const userId = req.user?.id || "anonymous";
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    return `comment:${userId}:${ip}`;
  },
  skip: (req) => !req.user,
});

export const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many file uploads, please wait before uploading again." },
  keyGenerator: (req: Request) => {
    const userId = req.user?.id || "anonymous";
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    return `upload:${userId}:${ip}`;
  },
  skip: (req) => !req.user,
});

export const createRateLimiter = (windowMs: number, max: number, message: string) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: message },
  });

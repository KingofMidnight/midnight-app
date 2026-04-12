import { Request, Response, NextFunction } from "express";

export const securityHeaders = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader("Content-Security-Policy", [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.hcaptcha.com https://*.hcaptcha.com",
    "style-src 'self' 'unsafe-inline' https://cdn.hcaptcha.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https:",
    "connect-src 'self' https: wss: blob:",
    "frame-src 'self' https://cdn.hcaptcha.com https://*.hcaptcha.com",
    "media-src 'self' blob: https:",
    "worker-src 'self' blob:"
  ].join("; "));

  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

  next();
};

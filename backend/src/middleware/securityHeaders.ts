import { Request, Response, NextFunction } from "express";

export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  
  res.locals.cspNonce = nonce;
  
  res.setHeader("Content-Security-Policy", [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://cdn.hcaptcha.com https://*.hcaptcha.com`,
    `style-src 'self' 'nonce-${nonce}' https://cdn.hcaptcha.com`,
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https:",
    "connect-src 'self' https: wss: blob:",
    "frame-src 'self' https://cdn.hcaptcha.com https://*.hcaptcha.com",
    "media-src 'self' blob: https:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join("; "));

  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

  next();
};

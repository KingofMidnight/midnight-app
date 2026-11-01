import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
dotenv.config();
import exportRouter from "./routes/export.js";
import adminRouter from "./routes/admin.js";
import viewsRouter from "./routes/views.js";
import authRouter from "./routes/auth.js";
import sessionSecurityRouter from "./routes/session-security.js";
import blocksRouter from "./routes/blocks.js";
import reviewsRouter from "./routes/reviews.js";
import storiesRouter from "./routes/stories.js";
import commentsRouter from "./routes/comments.js";
import filesRouter from "./routes/files.js";
import reportsRouter from "./routes/reports.js";
import moderationRouter from "./routes/moderation.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { securityHeaders } from "./middleware/securityHeaders.js";

// The Express app, without listening — imported by index.ts and by the tests.
const app = express();

// How many reverse proxies (Cloudflare, nginx, Render, …) sit in front of the API.
// Express then derives req.ip from X-Forwarded-For only for those trusted hops, so
// rate limits and view de-duplication see the real visitor IP and clients can't
// spoof it. Leave unset (0) when the API is reached directly, e.g. in local dev.
const trustProxy = process.env.TRUST_PROXY ?? "0";
app.set("trust proxy", /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy);

app.use(helmet());
app.use(securityHeaders);

export const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "http://localhost:8080,https://yourdomain.com")
  .split(",")
  .map((s) => s.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' not allowed.`));
    },
    credentials: true,
  })
);

if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
}
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? "900000"),
  max: parseInt(process.env.RATE_LIMIT_MAX ?? "100"),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests, please try again later." },
});

app.use(globalLimiter);

app.get("/api/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok", uptime: process.uptime() } });
});

app.use("/api/auth", authRouter);
app.use("/api/session-security", sessionSecurityRouter);
app.use("/api/blocks", blocksRouter);
app.use("/api/reviews", reviewsRouter);
app.use("/api/stories", storiesRouter);
app.use("/api/comments", commentsRouter);
app.use("/api/export", exportRouter);
app.use("/api/admin", adminRouter);
app.use("/api/views", viewsRouter);
app.use("/api/files", filesRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/moderation", moderationRouter);

app.use(notFound);
app.use(errorHandler);

export default app;

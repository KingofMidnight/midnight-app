import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
dotenv.config();
import exportRouter from "./src/routes/export.js";
import adminRouter from "./src/routes/admin.js";
import viewsRouter from "./src/routes/views.js";
import { errorHandler, notFound } from "./src/middleware/errorHandler.js";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(helmet());

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "http://localhost:8080,https://yourdomain.com")
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

app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
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

app.use("/api/export", exportRouter);
app.use("/api/admin", adminRouter);
app.use("/api/views", viewsRouter);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
  console.log(`   Mode:    ${process.env.NODE_ENV ?? "development"}`);
  console.log(`   Origins: ${allowedOrigins.join(", ")}\n`);
});

export default app;


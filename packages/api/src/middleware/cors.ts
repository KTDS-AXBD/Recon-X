import { cors } from "hono/cors";

const ALLOWED_ORIGINS = [
  "https://ai-foundry.minu.best",
  "http://localhost:5173",
  "http://localhost:4173",
];

export const corsMiddleware = cors({
  origin: (origin) => (ALLOWED_ORIGINS.includes(origin) ? origin : ""),
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-Organization-Id"],
  exposeHeaders: ["X-Request-Id"],
  maxAge: 86400,
  credentials: true,
});

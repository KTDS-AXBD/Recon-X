import type { Context, Next } from "hono";

const BLOCKED_PATTERNS = ["/internal/"];

export async function guardMiddleware(c: Context, next: Next) {
  const path = c.req.path;

  if (BLOCKED_PATTERNS.some((pattern) => path.includes(pattern))) {
    return c.json(
      { success: false, error: { code: "FORBIDDEN", message: "Internal endpoint" } },
      403,
    );
  }

  return next();
}
